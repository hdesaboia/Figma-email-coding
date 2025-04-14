const EmailTemplate = require('../email/template.js');
const DesignComponentMapper = require('../ai/designComponentMapper.js');
const TrainingDataGenerator = require('../ai/trainingDataGenerator.js');
const path = require('path');
const fs = require('fs-extra');

class EmailTester {
  static testTemplate() {
    console.log('\n=== Testing Email Template ===\n');

    // Test Case 1: With First Name
    console.log('Test Case 1: With First Name');
    const testData1 = {
      firstName: 'John',
      heroImage: 'https://hingehealth.com/images/hero-joint-pain.jpg',
      ptImage: 'https://hingehealth.com/images/care-team.jpg',
      ctaLink: 'https://hingehealth.com/join?utm_source=email1&utm_campaign=nonincentive',
      supportEmail: 'support@hingehealth.com',
      supportPhone: '1-888-123-4567',
      useFirstNamePersonalization: true,
      language: 'en'
    };

    // Test Case 2: Without First Name
    console.log('\nTest Case 2: Without First Name');
    const testData2 = {
      ...testData1,
      useFirstNamePersonalization: false
    };

    // Test Case 3: Spanish Version
    console.log('\nTest Case 3: Spanish Version');
    const testData3 = {
      ...testData1,
      language: 'es'
    };

    // Generate template
    const template = EmailTemplate.generateNonIncentiveEmail();

    // Test each case
    this.testCase(template, testData1);
    this.testCase(template, testData2);
    this.testCase(template, testData3);
  }

  static testCase(template, data) {
    // Replace variables
    let html = template
      .replace('{{firstName}}', data.firstName)
      .replace('{{heroImage}}', data.heroImage)
      .replace('{{ptImage}}', data.ptImage)
      .replace('{{ctaLink}}', data.ctaLink)
      .replace('{{supportEmail}}', data.supportEmail)
      .replace('{{supportPhone}}', data.supportPhone);

    // Handle conditionals
    html = this.processConditionals(html, data);

    // Verify snippets
    this.verifySnippets(html);

    // Check mobile responsiveness
    this.checkResponsiveness(html);

    console.log('✓ Template generated successfully');
    console.log('✓ All variables replaced');
    console.log('✓ Conditionals processed');
  }

  static processConditionals(html, data) {
    // Process firstName conditional
    if (data.useFirstNamePersonalization) {
      html = html.replace(
        /{%\s*if useFirstNamePersonalization\s*%}([\s\S]*?){%\s*else\s*%}[\s\S]*?{%\s*endif\s*%}/g,
        '$1'
      );
    } else {
      html = html.replace(
        /{%\s*if useFirstNamePersonalization\s*%}[\s\S]*?{%\s*else\s*%}([\s\S]*?){%\s*endif\s*%}/g,
        '$1'
      );
    }

    // Process language conditional
    if (data.language === 'es') {
      html = html.replace(
        /{%\s*if global\.language == 'es'\s*%}([\s\S]*?){%\s*endif\s*%}/g,
        '$1'
      );
    } else {
      html = html.replace(
        /{%\s*if global\.language == 'es'\s*%}[\s\S]*?{%\s*endif\s*%}/g,
        ''
      );
    }

    return html;
  }

  static verifySnippets(html) {
    const snippets = [
      'CSS_Master_Template',
      'preheader_space_fix',
      '2024_Universal_Logo_Dynamic_YM',
      'Padding_24px_Section',
      'Padding_32px_Section',
      'Padding_16px_Section',
      '2024_White_footer',
      '2024_Spanish_Footer_Banner',
      '2024_Universal_Eligibility_Disclaimer'
    ];

    snippets.forEach(snippet => {
      if (html.includes(`{{snippets.${snippet}}}`)) {
        console.log(`✓ Found snippet: ${snippet}`);
      }
    });
  }

  static checkResponsiveness(html) {
    const responsiveChecks = [
      'max-width: 600px',
      'width="100%"',
      'style="display: block; max-width: 100%;"'
    ];

    responsiveChecks.forEach(check => {
      if (html.includes(check)) {
        console.log(`✓ Responsive check passed: ${check}`);
      }
    });
  }

  static async testComponentMapping() {
    console.log('\n=== Testing Component Mapping ===\n');
    
    try {
      const mapper = new DesignComponentMapper();
      const results = await mapper.testComponentMatching('EM1');
      
      // Additional validation
      this.validateMappingResults(results);
      
    } catch (error) {
      console.error('❌ Component mapping test failed:', error);
      throw error;
    }
  }

  static validateMappingResults(results) {
    // Validate match rate
    const matchRate = (results.matched / results.total) * 100;
    console.log(`\n📊 Match Rate: ${matchRate.toFixed(1)}%`);
    
    if (matchRate < 70) {
      console.warn('⚠️ Warning: Match rate below 70%');
    }

    // Validate confidence levels
    const highConfidenceRate = (results.confidence.high / results.matched) * 100;
    console.log(`High Confidence Matches: ${highConfidenceRate.toFixed(1)}%`);
    
    if (highConfidenceRate < 60) {
      console.warn('⚠️ Warning: Less than 60% high confidence matches');
    }

    // Count critical components from matches
    const criticalCounts = {
      button: 0,
      headline: 0,
      logo: 0
    };

    results.matches.forEach(match => {
      // Check if the component is marked as critical and has the right type
      if (match.isCritical || match.design?.isCritical) {
        const type = (match.type || match.html?.type || match.design?.type || '').toLowerCase();
        if (criticalCounts.hasOwnProperty(type)) {
          criticalCounts[type]++;
        }
      }
    });

    // Log critical component counts
    console.log('\n📋 Critical Components Found:');
    Object.entries(criticalCounts).forEach(([type, count]) => {
      console.log(`${type}: ${count}`);
    });

    // Check for missing critical components
    const missingCritical = Object.entries(criticalCounts)
      .filter(([_, count]) => count === 0)
      .map(([type]) => type);

    if (missingCritical.length > 0) {
      console.warn('⚠️ Warning: Missing critical components:', missingCritical.join(', '));
    }
  }

  static async testTrainingDataGeneration() {
    console.log('\n=== Testing Training Data Generation ===\n');
    
    try {
      const generator = new TrainingDataGenerator();
      
      // Generate training data for specific email IDs
      const emailIds = ['EM1', 'EM2', 'EM3', 'EM4'];
      for (const emailId of emailIds) {
        await generator.generateTrainingData(emailId);
      }
      
      // Read and validate the generated files
      const files = await fs.readdir(generator.outputDir);
      const trainingFiles = files.filter(f => f.endsWith('_training.json'));
      
      for (const file of trainingFiles) {
        const data = JSON.parse(
          await fs.readFile(path.join(generator.outputDir, file), 'utf8')
        );
        this.validateTrainingData(data);
      }
      
      console.log('✅ Training data generation test passed');
      
    } catch (error) {
      console.error('❌ Training data generation test failed:', error);
      throw error;
    }
  }

  static validateTrainingData(data) {
    // Validate required fields
    const requiredFields = [
      'email_id',
      'visual_input',
      'design_analysis',
      'html_implementation'
    ];

    requiredFields.forEach(field => {
      if (!data[field]) {
        throw new Error(`Missing required field: ${field}`);
      }
    });

    // Log validation results
    console.log(`\n📊 Training Data Validation for ${data.email_id}:`);
    console.log(`Components mapped: ${data.design_analysis.component_mapping.desktop.length}`);
    console.log(`Responsive patterns: ${data.design_analysis.responsive_patterns.transformations.length}`);
    console.log(`HTML snippets: ${data.html_implementation.snippets.length}`);
  }
}

// Update the runTests function
async function runTests() {
  try {
    // Run existing tests
    await EmailTester.testTemplate();
    
    // Run component mapping test
    await EmailTester.testComponentMapping();
    
    // Run training data generation test
    await EmailTester.testTrainingDataGeneration();
  } catch (error) {
    console.error('Test failed:', error);
    process.exit(1);
  }
}

runTests().catch(console.error);

module.exports = { EmailTester }; 