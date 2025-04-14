/**
 * AI Trainer Module
 * 
 * This module is responsible for:
 * - Processing Iterable HTML emails to extract patterns
 * - Generating training data for the AI model
 * - Creating input-output pairs for training
 * - Tracking pattern success rates
 */

const fs = require('fs').promises;
const path = require('path');
const { htmlToFigma } = require('../utils/htmlToFigma');
const { extractComponents } = require('../core/componentExtractor');
const { detectPatterns } = require('../core/patternDetector');
const { analyzeLayout } = require('../core/layoutAnalyzer');

// Training data configuration
const TRAINING_CONFIG = {
  minExamplesPerPattern: 10,
  maxExamplesPerPattern: 100,
  validationSplit: 0.2,
  testSplit: 0.1
};

// Pattern success tracking
const patternSuccessRates = new Map();

/**
 * Processes an Iterable HTML email to generate training data
 * @param {string} html - The HTML email content
 * @param {Object} metadata - Additional metadata about the email
 * @returns {Promise<Object>} Training example
 */
async function processEmailForTraining(html, metadata) {
  try {
    // Convert HTML to Figma-like structure
    const figmaData = await htmlToFigma(html);
    
    // Extract components from the structure
    const components = await extractComponents(figmaData);
    
    // Analyze layout and relationships
    const layout = await analyzeLayout(figmaData, components);
    
    // Detect patterns in the email
    const patterns = await detectPatterns(components, layout);
    
    // Create training example
    const trainingExample = {
      input: {
        components,
        layout,
        patterns
      },
      output: {
        html,
        metadata
      },
      metadata: {
        processedAt: new Date().toISOString(),
        patternCount: patterns.detected.length,
        componentCount: components.length
      }
    };
    
    // Update pattern success rates
    updatePatternSuccessRates(patterns.detected);
    
    return trainingExample;
  } catch (error) {
    console.error('Error processing email for training:', error);
    throw error;
  }
}

/**
 * Updates pattern success rates based on new detections
 * @param {Array} detectedPatterns - Array of detected patterns
 */
function updatePatternSuccessRates(detectedPatterns) {
  detectedPatterns.forEach(pattern => {
    const currentRate = patternSuccessRates.get(pattern.type) || { success: 0, total: 0 };
    currentRate.total++;
    if (pattern.confidence >= 0.8) {
      currentRate.success++;
    }
    patternSuccessRates.set(pattern.type, currentRate);
  });
}

/**
 * Generates training dataset from processed examples
 * @param {Array} trainingExamples - Array of processed training examples
 * @returns {Object} Training dataset with splits
 */
function generateTrainingDataset(trainingExamples) {
  // Shuffle examples
  const shuffled = [...trainingExamples].sort(() => Math.random() - 0.5);
  
  // Calculate split indices
  const testSize = Math.floor(shuffled.length * TRAINING_CONFIG.testSplit);
  const valSize = Math.floor(shuffled.length * TRAINING_CONFIG.validationSplit);
  
  // Create splits
  const testSet = shuffled.slice(0, testSize);
  const valSet = shuffled.slice(testSize, testSize + valSize);
  const trainSet = shuffled.slice(testSize + valSize);
  
  return {
    train: trainSet,
    validation: valSet,
    test: testSet,
    metadata: {
      totalExamples: shuffled.length,
      trainSize: trainSet.length,
      valSize: valSet.length,
      testSize: testSet.length,
      patternSuccessRates: Object.fromEntries(patternSuccessRates)
    }
  };
}

/**
 * Saves training dataset to file
 * @param {Object} dataset - The training dataset
 * @param {string} outputPath - Path to save the dataset
 */
async function saveTrainingDataset(dataset, outputPath) {
  try {
    await fs.mkdir(path.dirname(outputPath), { recursive: true });
    await fs.writeFile(
      outputPath,
      JSON.stringify(dataset, null, 2)
    );
    console.log(`Training dataset saved to ${outputPath}`);
  } catch (error) {
    console.error('Error saving training dataset:', error);
    throw error;
  }
}

/**
 * Loads and processes multiple Iterable HTML emails
 * @param {Array} emails - Array of email objects with HTML and metadata
 * @param {string} outputPath - Path to save the training dataset
 */
async function processEmailBatch(emails, outputPath) {
  try {
    console.log(`Processing ${emails.length} emails for training...`);
    
    const trainingExamples = await Promise.all(
      emails.map(email => processEmailForTraining(email.html, email.metadata))
    );
    
    const dataset = generateTrainingDataset(trainingExamples);
    await saveTrainingDataset(dataset, outputPath);
    
    return dataset;
  } catch (error) {
    console.error('Error processing email batch:', error);
    throw error;
  }
}

module.exports = {
  processEmailForTraining,
  processEmailBatch,
  generateTrainingDataset,
  saveTrainingDataset
}; 