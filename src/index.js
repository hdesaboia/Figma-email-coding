const TrainingDataGenerator = require('./ai/trainingDataGenerator.js');
const IterableAnalyzer = require('./ai/iterableAnalyzer.js');

async function main() {
  try {
    console.log('🚀 Starting analysis of EM1...');
    
    // Analyze just EM1 first
    const analyzer = new IterableAnalyzer();
    const analysis = await analyzer.analyzeTemplate('EM1');
    
    // Save the analysis
    const fs = require('fs').promises;
    await fs.writeFile(
      './training_data/gpt4v/EM1_analysis.json',
      JSON.stringify(analysis, null, 2)
    );
    
    console.log('\n✅ Analysis complete! Check EM1_analysis.json');
  } catch (error) {
    console.error('❌ Error:', error.message);
  }
}

main(); 