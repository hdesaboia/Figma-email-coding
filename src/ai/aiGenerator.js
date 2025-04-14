/**
 * AI Generator Module
 * 
 * This module is responsible for:
 * - Using the trained AI model to generate HTML
 * - Incorporating pattern detection for validation
 * - Handling complex cases and edge cases
 * - Ensuring email client compatibility
 */

const { validateHTML } = require('../core/htmlValidator');
const { detectPatterns } = require('../core/patternDetector');
const { analyzeLayout } = require('../core/layoutAnalyzer');

// Model configuration
const MODEL_CONFIG = {
  maxTokens: 2048,
  temperature: 0.7,
  topP: 0.9,
  frequencyPenalty: 0.5,
  presencePenalty: 0.5
};

// HTML generation configuration
const GENERATION_CONFIG = {
  minConfidence: 0.8,
  maxRetries: 3,
  validationTimeout: 5000
};

/**
 * Generates HTML from Figma design using AI
 * @param {Object} figmaData - The Figma design data
 * @param {Object} model - The trained AI model
 * @param {Object} config - Optional configuration
 * @returns {Promise<Object>} Generated HTML and metadata
 */
async function generateHTML(figmaData, model, config = {}) {
  try {
    // Merge configs
    const mergedConfig = { ...GENERATION_CONFIG, ...config };
    
    // Analyze layout and components
    const layout = await analyzeLayout(figmaData);
    const patterns = await detectPatterns(figmaData.components, layout);
    
    // Prepare prompt for AI
    const prompt = createGenerationPrompt(figmaData, layout, patterns);
    
    // Generate HTML with retries
    let attempts = 0;
    let generatedHTML;
    let validationResult;
    
    while (attempts < mergedConfig.maxRetries) {
      // Generate HTML using AI model
      generatedHTML = await model.generate(prompt, MODEL_CONFIG);
      
      // Validate generated HTML
      validationResult = await validateHTML(generatedHTML);
      
      if (validationResult.isValid) {
        break;
      }
      
      attempts++;
      if (attempts < mergedConfig.maxRetries) {
        console.log(`Retry ${attempts + 1}/${mergedConfig.maxRetries} due to validation errors`);
      }
    }
    
    // Prepare result
    const result = {
      html: generatedHTML,
      metadata: {
        attempts: attempts + 1,
        validation: validationResult,
        patterns: patterns.detected,
        confidence: calculateConfidence(patterns, validationResult),
        timestamp: new Date().toISOString()
      }
    };
    
    return result;
  } catch (error) {
    console.error('Error generating HTML:', error);
    throw error;
  }
}

/**
 * Creates a prompt for the AI model
 * @param {Object} figmaData - The Figma design data
 * @param {Object} layout - Layout analysis results
 * @param {Object} patterns - Detected patterns
 * @returns {string} AI prompt
 */
function createGenerationPrompt(figmaData, layout, patterns) {
  const promptParts = [
    'Generate HTML email code for the following Figma design:',
    `\nComponents: ${JSON.stringify(figmaData.components)}`,
    `\nLayout: ${JSON.stringify(layout.hierarchy)}`,
    `\nPatterns: ${JSON.stringify(patterns.detected)}`,
    '\nRequirements:',
    '- Use table-based layout for maximum email client compatibility',
    '- Include all necessary inline styles',
    '- Ensure responsive design for mobile devices',
    '- Follow email HTML best practices',
    '- Include proper DOCTYPE and meta tags',
    '- Use semantic HTML where possible'
  ];
  
  return promptParts.join('\n');
}

/**
 * Calculates confidence score for generated HTML
 * @param {Object} patterns - Detected patterns
 * @param {Object} validation - Validation results
 * @returns {number} Confidence score
 */
function calculateConfidence(patterns, validation) {
  // Pattern confidence (weight: 0.6)
  const patternConfidence = patterns.detected.reduce((acc, pattern) => {
    return acc + pattern.confidence;
  }, 0) / patterns.detected.length;
  
  // Validation confidence (weight: 0.4)
  const validationConfidence = validation.warnings.length === 0 ? 1 : 0.8;
  
  return (patternConfidence * 0.6) + (validationConfidence * 0.4);
}

/**
 * Handles complex cases in HTML generation
 * @param {Object} component - The complex component
 * @param {Object} model - The trained AI model
 * @returns {Promise<string>} Generated HTML for the component
 */
async function handleComplexCase(component, model) {
  try {
    const prompt = createComplexCasePrompt(component);
    const generatedHTML = await model.generate(prompt, {
      ...MODEL_CONFIG,
      temperature: 0.5 // Lower temperature for more deterministic output
    });
    
    return generatedHTML;
  } catch (error) {
    console.error('Error handling complex case:', error);
    throw error;
  }
}

/**
 * Creates a prompt for complex component generation
 * @param {Object} component - The complex component
 * @returns {string} AI prompt
 */
function createComplexCasePrompt(component) {
  return `Generate HTML for a complex email component with the following properties:
Type: ${component.type}
Styles: ${JSON.stringify(component.style)}
Children: ${component.children.length}
Metadata: ${JSON.stringify(component.metadata)}
Requirements:
- Use nested tables if needed
- Ensure proper spacing and alignment
- Include fallbacks for email clients
- Maintain accessibility`;
}

module.exports = {
  generateHTML,
  handleComplexCase
}; 