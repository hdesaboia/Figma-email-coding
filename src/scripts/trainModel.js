/**
 * Model Training Script
 * 
 * This script:
 * - Loads the training dataset
 * - Trains the AI model
 * - Evaluates model performance
 * - Saves the trained model
 */

const fs = require('fs').promises;
const path = require('path');
const { OpenAI } = require('openai');

// Configuration
const CONFIG = {
  modelName: 'gpt-4',
  trainingEpochs: 3,
  batchSize: 10,
  learningRate: 0.0001,
  outputDir: path.join(__dirname, '../../models'),
  datasetPath: path.join(__dirname, '../../data/training/training_dataset.json')
};

/**
 * Main function to train the model
 */
async function main() {
  try {
    console.log('Starting model training...');
    
    // Initialize OpenAI client
    const openai = new OpenAI({
      apiKey: process.env.OPENAI_API_KEY
    });
    
    // Load training dataset
    console.log('Loading training dataset...');
    const dataset = await loadDataset();
    console.log(`Loaded ${dataset.examples.length} training examples`);
    
    // Prepare training data
    console.log('Preparing training data...');
    const trainingData = prepareTrainingData(dataset.examples);
    
    // Train the model
    console.log('Training model...');
    const model = await trainModel(openai, trainingData);
    
    // Evaluate model
    console.log('Evaluating model...');
    const evaluation = await evaluateModel(model, dataset.examples.slice(0, 10));
    
    // Save model and evaluation
    console.log('Saving model and evaluation...');
    await saveModel(model, evaluation);
    
    console.log(`
Model training complete!
Training examples: ${dataset.examples.length}
Evaluation score: ${evaluation.score}
Model saved to: ${CONFIG.outputDir}
    `);
    
  } catch (error) {
    console.error('Error in model training:', error);
    process.exit(1);
  }
}

/**
 * Loads the training dataset
 * @returns {Promise<Object>} Training dataset
 */
async function loadDataset() {
  try {
    const data = await fs.readFile(CONFIG.datasetPath, 'utf8');
    return JSON.parse(data);
  } catch (error) {
    console.error('Error loading dataset:', error);
    throw error;
  }
}

/**
 * Prepares training data for the model
 * @param {Array} examples - Training examples
 * @returns {Array} Prepared training data
 */
function prepareTrainingData(examples) {
  return examples.map(example => ({
    input: {
      components: example.input.components,
      layout: example.input.layout,
      patterns: example.input.patterns
    },
    output: example.output.html
  }));
}

/**
 * Trains the model
 * @param {Object} openai - OpenAI client
 * @param {Array} trainingData - Prepared training data
 * @returns {Promise<Object>} Trained model
 */
async function trainModel(openai, trainingData) {
  try {
    // Fine-tune the model
    const fineTune = await openai.fineTuning.jobs.create({
      training_file: trainingData,
      model: CONFIG.modelName,
      hyperparameters: {
        n_epochs: CONFIG.trainingEpochs,
        batch_size: CONFIG.batchSize,
        learning_rate_multiplier: CONFIG.learningRate
      }
    });
    
    // Wait for training to complete
    let status;
    do {
      const job = await openai.fineTuning.jobs.retrieve(fineTune.id);
      status = job.status;
      console.log(`Training status: ${status}`);
      await new Promise(resolve => setTimeout(resolve, 5000));
    } while (status !== 'succeeded' && status !== 'failed');
    
    if (status === 'failed') {
      throw new Error('Model training failed');
    }
    
    return {
      id: fineTune.id,
      model: fineTune.fine_tuned_model
    };
  } catch (error) {
    console.error('Error training model:', error);
    throw error;
  }
}

/**
 * Evaluates the model
 * @param {Object} model - Trained model
 * @param {Array} examples - Evaluation examples
 * @returns {Promise<Object>} Evaluation results
 */
async function evaluateModel(model, examples) {
  try {
    let totalScore = 0;
    const results = [];
    
    for (const example of examples) {
      const generated = await model.generate(example.input);
      const score = calculateScore(generated, example.output);
      
      results.push({
        input: example.input,
        expected: example.output,
        generated,
        score
      });
      
      totalScore += score;
    }
    
    return {
      score: totalScore / examples.length,
      results
    };
  } catch (error) {
    console.error('Error evaluating model:', error);
    throw error;
  }
}

/**
 * Calculates score for generated HTML
 * @param {string} generated - Generated HTML
 * @param {string} expected - Expected HTML
 * @returns {number} Score between 0 and 1
 */
function calculateScore(generated, expected) {
  // Simple string similarity for now
  // In reality, this should use a more sophisticated comparison
  const maxLength = Math.max(generated.length, expected.length);
  const diff = Math.abs(generated.length - expected.length);
  return 1 - (diff / maxLength);
}

/**
 * Saves the trained model and evaluation
 * @param {Object} model - Trained model
 * @param {Object} evaluation - Evaluation results
 */
async function saveModel(model, evaluation) {
  try {
    await fs.mkdir(CONFIG.outputDir, { recursive: true });
    
    // Save model info
    await fs.writeFile(
      path.join(CONFIG.outputDir, 'model.json'),
      JSON.stringify(model, null, 2)
    );
    
    // Save evaluation
    await fs.writeFile(
      path.join(CONFIG.outputDir, 'evaluation.json'),
      JSON.stringify(evaluation, null, 2)
    );
  } catch (error) {
    console.error('Error saving model:', error);
    throw error;
  }
}

// Run the script
main(); 