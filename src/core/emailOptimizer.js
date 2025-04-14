/**
 * Email Optimizer Module
 * 
 * This module is responsible for:
 * 1. Ensuring email client compatibility
 * 2. Optimizing HTML for different email clients
 * 3. Adding necessary email-specific attributes
 * 4. Handling email-specific quirks and workarounds
 */

const { applyEmailClientFixes } = require('./emailClientFixes');
const { optimizeImages } = require('./imageOptimizer');
const { inlineStyles } = require('./styleInliner');

/**
 * Optimize HTML for email clients
 * @param {string} html - The HTML to optimize
 * @param {Object} config - Configuration options
 * @returns {Promise<string>} Optimized HTML
 */
async function optimizeForEmail(html, config = {}) {
  try {
    // 1. Apply email client-specific fixes
    let optimizedHTML = await applyEmailClientFixes(html, config);
    
    // 2. Optimize images for email
    optimizedHTML = await optimizeImages(optimizedHTML, config);
    
    // 3. Inline styles (required for email)
    optimizedHTML = await inlineStyles(optimizedHTML, config);
    
    // 4. Add email-specific meta tags and attributes
    optimizedHTML = addEmailMetadata(optimizedHTML, config);
    
    return optimizedHTML;
  } catch (error) {
    console.error('Email optimization failed:', error);
    throw new Error(`Failed to optimize HTML for email: ${error.message}`);
  }
}

/**
 * Add email-specific metadata to HTML
 * @param {string} html - The HTML to modify
 * @param {Object} config - Configuration options
 * @returns {string} HTML with email metadata
 */
function addEmailMetadata(html, config) {
  // Add viewport meta tag
  const viewportMeta = '<meta name="viewport" content="width=device-width, initial-scale=1.0">';
  
  // Add email-specific meta tags
  const emailMeta = `
    <meta http-equiv="Content-Type" content="text/html; charset=utf-8">
    <meta name="format-detection" content="telephone=no">
  `.trim();
  
  // Insert meta tags after opening head tag
  return html.replace(
    /<head[^>]*>/i,
    `$&${viewportMeta}${emailMeta}`
  );
}

module.exports = {
  optimizeForEmail
}; 