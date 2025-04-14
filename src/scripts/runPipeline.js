/**
 * Training Pipeline Automation Script
 * 
 * This script automates the entire training pipeline:
 * 1. Loads environment variables
 * 2. Processes training data
 * 3. Trains the model
 * 4. Generates a report
 */

const fs = require('fs').promises;
const path = require('path');
const { exec } = require('child_process');
const { promisify } = require('util');
const execAsync = promisify(exec);

// Configuration
const CONFIG = {
  envFile: path.join(__dirname, '../../.env'),
  dataDir: path.join(__dirname, '../../data'),
  modelsDir: path.join(__dirname, '../../models'),
  reportsDir: path.join(__dirname, '../../reports'),
  trainingScript: path.join(__dirname, 'processTrainingData.js'),
  modelScript: path.join(__dirname, 'trainModel.js')
};

/**
 * Main function to run the pipeline
 */
async function main() {
  try {
    console.log('Starting training pipeline...');
    
    // Load environment variables
    console.log('Loading environment variables...');
    await loadEnv();
    
    // Create necessary directories
    console.log('Creating directories...');
    await createDirectories();
    
    // Process training data
    console.log('Processing training data...');
    const trainingData = await processTrainingData();
    
    // Train model
    console.log('Training model...');
    const model = await trainModel();
    
    // Generate report
    console.log('Generating report...');
    await generateReport(trainingData, model);
    
    console.log(`
Pipeline completed successfully!
Training data: ${trainingData.outputPath}
Model: ${model.outputPath}
Report: ${path.join(CONFIG.reportsDir, 'training_report.html')}
    `);
    
  } catch (error) {
    console.error('Error in training pipeline:', error);
    process.exit(1);
  }
}

/**
 * Loads environment variables from .env file
 */
async function loadEnv() {
  try {
    const envContent = await fs.readFile(CONFIG.envFile, 'utf8');
    const envVars = envContent.split('\n')
      .filter(line => line && !line.startsWith('#'))
      .reduce((acc, line) => {
        const [key, value] = line.split('=');
        acc[key.trim()] = value.trim();
        return acc;
      }, {});
    
    // Set environment variables
    Object.entries(envVars).forEach(([key, value]) => {
      process.env[key] = value;
    });
    
    // Verify required variables
    const requiredVars = ['ITERABLE_API_KEY', 'OPENAI_API_KEY'];
    const missingVars = requiredVars.filter(varName => !process.env[varName]);
    
    if (missingVars.length > 0) {
      throw new Error(`Missing required environment variables: ${missingVars.join(', ')}`);
    }
  } catch (error) {
    console.error('Error loading environment variables:', error);
    throw error;
  }
}

/**
 * Creates necessary directories
 */
async function createDirectories() {
  const directories = [
    CONFIG.dataDir,
    path.join(CONFIG.dataDir, 'training'),
    CONFIG.modelsDir,
    CONFIG.reportsDir
  ];
  
  await Promise.all(
    directories.map(dir => fs.mkdir(dir, { recursive: true }))
  );
}

/**
 * Processes training data
 * @returns {Promise<Object>} Training data information
 */
async function processTrainingData() {
  try {
    const { stdout, stderr } = await execAsync(`node ${CONFIG.trainingScript}`);
    
    if (stderr) {
      console.warn('Training data processing warnings:', stderr);
    }
    
    // Extract output path from stdout
    const outputMatch = stdout.match(/Dataset saved to: (.+)/);
    if (!outputMatch) {
      throw new Error('Could not determine training data output path');
    }
    
    return {
      outputPath: outputMatch[1],
      stdout,
      stderr
    };
  } catch (error) {
    console.error('Error processing training data:', error);
    throw error;
  }
}

/**
 * Trains the model
 * @returns {Promise<Object>} Model information
 */
async function trainModel() {
  try {
    const { stdout, stderr } = await execAsync(`node ${CONFIG.modelScript}`);
    
    if (stderr) {
      console.warn('Model training warnings:', stderr);
    }
    
    // Extract output path from stdout
    const outputMatch = stdout.match(/Model saved to: (.+)/);
    if (!outputMatch) {
      throw new Error('Could not determine model output path');
    }
    
    return {
      outputPath: outputMatch[1],
      stdout,
      stderr
    };
  } catch (error) {
    console.error('Error training model:', error);
    throw error;
  }
}

/**
 * Generates a report of the training pipeline
 * @param {Object} trainingData - Training data information
 * @param {Object} model - Model information
 */
async function generateReport(trainingData, model) {
  try {
    const report = `
<!DOCTYPE html>
<html>
<head>
  <title>Training Pipeline Report</title>
  <style>
    body { font-family: Arial, sans-serif; margin: 20px; }
    h1 { color: #333; }
    .section { margin-bottom: 20px; }
    .success { color: green; }
    .warning { color: orange; }
    .error { color: red; }
  </style>
</head>
<body>
  <h1>Training Pipeline Report</h1>
  
  <div class="section">
    <h2>Environment</h2>
    <p>Environment variables loaded successfully</p>
  </div>
  
  <div class="section">
    <h2>Training Data</h2>
    <p>Output path: ${trainingData.outputPath}</p>
    ${trainingData.stderr ? `<p class="warning">Warnings: ${trainingData.stderr}</p>` : ''}
  </div>
  
  <div class="section">
    <h2>Model Training</h2>
    <p>Output path: ${model.outputPath}</p>
    ${model.stderr ? `<p class="warning">Warnings: ${model.stderr}</p>` : ''}
  </div>
  
  <div class="section">
    <h2>Timestamps</h2>
    <p>Pipeline started: ${new Date().toISOString()}</p>
  </div>
</body>
</html>
    `;
    
    const reportPath = path.join(CONFIG.reportsDir, 'training_report.html');
    await fs.writeFile(reportPath, report);
    
    return reportPath;
  } catch (error) {
    console.error('Error generating report:', error);
    throw error;
  }
}

// Run the pipeline
main(); 