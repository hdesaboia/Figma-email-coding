const fs = require('fs');
const EmailTemplate = require('../email/template.js');

function renderTestEmail() {
  try {
    // Test data with real-looking content
    const testData = {
      firstName: 'John',
      heroImage: 'https://via.placeholder.com/600x300?text=Joint+Pain+Relief+Hero+Image',
      ptImage: 'https://via.placeholder.com/300x200?text=Care+Team+Image',
      ctaLink: 'https://hingehealth.com/join?utm_source=email1&utm_campaign=nonincentive',
      supportEmail: 'support@hingehealth.com',
      supportPhone: '1-888-123-4567',
      unsubscribeUrl: '#unsubscribe'
    };

    console.log('Generating email template...');
    let html = EmailTemplate.generateNonIncentiveEmail();

    // Replace all variables
    html = html
      .replace('{{firstName}}', testData.firstName)
      .replace('{{heroImage}}', testData.heroImage)
      .replace('{{ptImage}}', testData.ptImage)
      .replace('{{ctaLink}}', testData.ctaLink)
      .replace('{{supportEmail}}', testData.supportEmail)
      .replace('{{supportPhone}}', testData.supportPhone)
      .replace('{{unsubscribeUrl}}', testData.unsubscribeUrl);

    // Save to preview file
    fs.writeFileSync('preview.html', html);
    console.log('\nPreview file created: preview.html');
    console.log('Open this file in your browser to see the email!');
  } catch (error) {
    console.error('Error generating preview:', error);
  }
}

renderTestEmail(); 