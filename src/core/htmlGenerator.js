/**
 * HTML Generator Module
 * 
 * This module is responsible for:
 * 1. Converting design components to semantic HTML
 * 2. Maintaining proper HTML structure and hierarchy
 * 3. Applying email-specific HTML patterns
 * 4. Ensuring accessibility and semantic correctness
 */

const { generateComponentHTML } = require('./componentGenerator');
const { applyEmailPatterns } = require('./emailPatterns');
const { validateHTML } = require('./htmlValidator');

/**
 * Generate HTML from design analysis
 * @param {Object} designAnalysis - Results from design analyzer
 * @param {Object} config - Configuration options
 * @returns {Promise<string>} Generated HTML
 */
async function generateHTML(designAnalysis, config = {}) {
  try {
    const { components, layout, patterns } = designAnalysis;
    
    // 1. Generate HTML for each component
    const componentHTML = await Promise.all(
      components.map(component => 
        generateComponentHTML(component, layout, config)
      )
    );
    
    // 2. Apply email-specific patterns
    const patternedHTML = await applyEmailPatterns(
      componentHTML.join('\n'),
      patterns,
      config
    );
    
    // 3. Validate the generated HTML
    const validation = await validateHTML(patternedHTML, config);
    if (!validation.isValid) {
      console.warn('HTML validation warnings:', validation.warnings);
    }
    
    return patternedHTML;
  } catch (error) {
    console.error('HTML generation failed:', error);
    throw new Error(`Failed to generate HTML: ${error.message}`);
  }
}

module.exports = {
  generateHTML
}; 