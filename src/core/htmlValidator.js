/**
 * HTML Validator Module
 * 
 * This module is responsible for:
 * 1. Validating HTML structure and syntax
 * 2. Checking email client compatibility
 * 3. Verifying accessibility standards
 * 4. Ensuring responsive design support
 */

// Email client compatibility rules
const EMAIL_CLIENT_RULES = {
  // CSS properties that need vendor prefixes
  VENDOR_PREFIXES: [
    'background',
    'border-radius',
    'box-shadow',
    'transform',
    'transition'
  ],
  
  // Unsupported HTML elements
  UNSUPPORTED_ELEMENTS: [
    'video',
    'audio',
    'canvas',
    'svg',
    'iframe'
  ],
  
  // Required email-specific attributes
  REQUIRED_ATTRIBUTES: {
    table: ['cellpadding', 'cellspacing', 'border'],
    img: ['alt', 'width', 'height'],
    a: ['href']
  }
};

// Accessibility rules
const ACCESSIBILITY_RULES = {
  MIN_CONTRAST_RATIO: 4.5,
  MIN_FONT_SIZE: 12,
  REQUIRED_ALT_TEXT: true
};

/**
 * Validate HTML for email
 * @param {string} html - The HTML to validate
 * @param {Object} config - Configuration options
 * @returns {Promise<Object>} Validation results
 */
async function validateHTML(html, config = {}) {
  try {
    // 1. Validate basic HTML structure
    const structureValidation = validateStructure(html);
    
    // 2. Check email client compatibility
    const compatibilityValidation = validateCompatibility(html);
    
    // 3. Verify accessibility
    const accessibilityValidation = validateAccessibility(html);
    
    // 4. Check responsive design
    const responsiveValidation = validateResponsive(html);
    
    // Combine all validation results
    const results = {
      isValid: structureValidation.isValid &&
               compatibilityValidation.isValid &&
               accessibilityValidation.isValid &&
               responsiveValidation.isValid,
      warnings: [
        ...structureValidation.warnings,
        ...compatibilityValidation.warnings,
        ...accessibilityValidation.warnings,
        ...responsiveValidation.warnings
      ],
      errors: [
        ...structureValidation.errors,
        ...compatibilityValidation.errors,
        ...compatibilityValidation.errors,
        ...responsiveValidation.errors
      ],
      metadata: {
        validationTime: new Date(),
        htmlLength: html.length,
        elementCount: countElements(html)
      }
    };
    
    return results;
  } catch (error) {
    console.error('HTML validation failed:', error);
    throw new Error(`Failed to validate HTML: ${error.message}`);
  }
}

/**
 * Validate HTML structure
 * @param {string} html - The HTML to validate
 * @returns {Object} Structure validation results
 */
function validateStructure(html) {
  const results = {
    isValid: true,
    warnings: [],
    errors: []
  };
  
  // Check for required email structure
  if (!html.includes('<!DOCTYPE html>')) {
    results.errors.push('Missing DOCTYPE declaration');
    results.isValid = false;
  }
  
  if (!html.includes('<html')) {
    results.errors.push('Missing HTML tag');
    results.isValid = false;
  }
  
  if (!html.includes('<body')) {
    results.errors.push('Missing body tag');
    results.isValid = false;
  }
  
  // Check for nested tables (common email requirement)
  const tableCount = (html.match(/<table/g) || []).length;
  if (tableCount === 0) {
    results.warnings.push('No tables found - email layout may be unstable');
  }
  
  // Check for inline styles
  const styleTagCount = (html.match(/<style/g) || []).length;
  if (styleTagCount > 0) {
    results.warnings.push('External styles found - should be inlined for email');
  }
  
  return results;
}

/**
 * Validate email client compatibility
 * @param {string} html - The HTML to validate
 * @returns {Object} Compatibility validation results
 */
function validateCompatibility(html) {
  const results = {
    isValid: true,
    warnings: [],
    errors: []
  };
  
  // Check for unsupported elements
  EMAIL_CLIENT_RULES.UNSUPPORTED_ELEMENTS.forEach(element => {
    if (html.includes(`<${element}`)) {
      results.errors.push(`Unsupported element found: ${element}`);
      results.isValid = false;
    }
  });
  
  // Check for required attributes
  Object.entries(EMAIL_CLIENT_RULES.REQUIRED_ATTRIBUTES).forEach(([tag, attributes]) => {
    const regex = new RegExp(`<${tag}[^>]*>`, 'g');
    const matches = html.match(regex) || [];
    
    matches.forEach(match => {
      attributes.forEach(attr => {
        if (!match.includes(`${attr}=`)) {
          results.errors.push(`Missing required attribute: ${attr} on ${tag}`);
          results.isValid = false;
        }
      });
    });
  });
  
  // Check for CSS properties that need vendor prefixes
  EMAIL_CLIENT_RULES.VENDOR_PREFIXES.forEach(property => {
    const regex = new RegExp(`${property}:`, 'g');
    if (html.match(regex)) {
      results.warnings.push(`Consider adding vendor prefixes for: ${property}`);
    }
  });
  
  return results;
}

/**
 * Validate accessibility
 * @param {string} html - The HTML to validate
 * @returns {Object} Accessibility validation results
 */
function validateAccessibility(html) {
  const results = {
    isValid: true,
    warnings: [],
    errors: []
  };
  
  // Check for alt text on images
  const imgTags = html.match(/<img[^>]*>/g) || [];
  imgTags.forEach(img => {
    if (!img.includes('alt=') && ACCESSIBILITY_RULES.REQUIRED_ALT_TEXT) {
      results.errors.push('Image missing alt text');
      results.isValid = false;
    }
  });
  
  // Check for sufficient color contrast
  // Note: This is a simplified check - real implementation would need color parsing
  const colorRegex = /(?:color|background-color):\s*([^;]+)/g;
  const colors = html.match(colorRegex) || [];
  if (colors.length > 0) {
    results.warnings.push('Consider checking color contrast ratios');
  }
  
  // Check for minimum font size
  const fontSizeRegex = /font-size:\s*(\d+)px/g;
  const fontSizes = html.match(fontSizeRegex) || [];
  fontSizes.forEach(size => {
    const pxSize = parseInt(size.match(/\d+/)[0]);
    if (pxSize < ACCESSIBILITY_RULES.MIN_FONT_SIZE) {
      results.warnings.push(`Font size ${pxSize}px may be too small`);
    }
  });
  
  return results;
}

/**
 * Validate responsive design
 * @param {string} html - The HTML to validate
 * @returns {Object} Responsive validation results
 */
function validateResponsive(html) {
  const results = {
    isValid: true,
    warnings: [],
    errors: []
  };
  
  // Check for viewport meta tag
  if (!html.includes('viewport')) {
    results.warnings.push('Missing viewport meta tag');
  }
  
  // Check for media queries
  const mediaQueryCount = (html.match(/@media/g) || []).length;
  if (mediaQueryCount === 0) {
    results.warnings.push('No media queries found - may not be responsive');
  }
  
  // Check for fluid images
  const imgTags = html.match(/<img[^>]*>/g) || [];
  imgTags.forEach(img => {
    if (!img.includes('width=') || !img.includes('height=')) {
      results.warnings.push('Image missing fixed dimensions - may cause layout shifts');
    }
  });
  
  return results;
}

/**
 * Count HTML elements
 * @param {string} html - The HTML to analyze
 * @returns {Object} Element counts
 */
function countElements(html) {
  return {
    tables: (html.match(/<table/g) || []).length,
    images: (html.match(/<img/g) || []).length,
    links: (html.match(/<a/g) || []).length,
    paragraphs: (html.match(/<p/g) || []).length,
    divs: (html.match(/<div/g) || []).length
  };
}

module.exports = {
  validateHTML
}; 