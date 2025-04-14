/**
 * Training Data Processing Script
 * 
 * This script:
 * - Fetches Iterable HTML emails
 * - Processes them into training examples
 * - Generates a training dataset
 * - Saves the dataset for model training
 */

const fs = require('fs').promises;
const path = require('path');
const { processEmailBatch } = require('../ai/aiTrainer');
const { fetchIterableEmails } = require('../utils/iterableApi');

// Configuration
const CONFIG = {
  outputDir: path.join(__dirname, '../../data/training'),
  batchSize: 10,
  maxEmails: 1000,
  minPatternCount: 3
};

/**
 * Main function to process training data
 */
async function main() {
  try {
    console.log('Starting training data processing...');
    
    // Create output directory
    await fs.mkdir(CONFIG.outputDir, { recursive: true });
    
    // Fetch Iterable emails
    console.log('Fetching Iterable emails...');
    const emails = await fetchIterableEmails(CONFIG.maxEmails);
    console.log(`Fetched ${emails.length} emails`);
    
    // Process emails in batches
    const batches = [];
    for (let i = 0; i < emails.length; i += CONFIG.batchSize) {
      const batch = emails.slice(i, i + CONFIG.batchSize);
      batches.push(batch);
    }
    
    console.log(`Processing ${batches.length} batches...`);
    
    // Process each batch
    const allExamples = [];
    for (const [index, batch] of batches.entries()) {
      console.log(`Processing batch ${index + 1}/${batches.length}...`);
      
      try {
        const examples = await processEmailBatch(
          batch,
          path.join(CONFIG.outputDir, `batch_${index}.json`)
        );
        
        allExamples.push(...examples.train);
        console.log(`Processed ${examples.train.length} examples in batch ${index + 1}`);
      } catch (error) {
        console.error(`Error processing batch ${index + 1}:`, error);
      }
    }
    
    // Filter examples with sufficient patterns
    const filteredExamples = allExamples.filter(example => 
      example.metadata.patternCount >= CONFIG.minPatternCount
    );
    
    // Save final dataset
    const dataset = {
      examples: filteredExamples,
      metadata: {
        totalProcessed: emails.length,
        totalExamples: filteredExamples.length,
        batchesProcessed: batches.length,
        minPatternCount: CONFIG.minPatternCount,
        processedAt: new Date().toISOString()
      }
    };
    
    const outputPath = path.join(CONFIG.outputDir, 'training_dataset.json');
    await fs.writeFile(
      outputPath,
      JSON.stringify(dataset, null, 2)
    );
    
    console.log(`
Training data processing complete!
Total emails processed: ${emails.length}
Total examples generated: ${filteredExamples.length}
Dataset saved to: ${outputPath}
    `);
    
  } catch (error) {
    console.error('Error in training data processing:', error);
    process.exit(1);
  }
}

// Run the script
main(); 