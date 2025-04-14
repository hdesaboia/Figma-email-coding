/**
 * HTML to Figma Converter
 * 
 * This utility converts HTML email content into a Figma-like structure
 * for training purposes. It maintains the hierarchy and styling information
 * while mapping HTML elements to Figma components.
 */

const jsdom = require('jsdom');
const { JSDOM } = jsdom;

// Mapping of HTML elements to Figma component types
const ELEMENT_TO_COMPONENT = {
  'div': 'frame',
  'p': 'text',
  'h1': 'text',
  'h2': 'text',
  'h3': 'text',
  'h4': 'text',
  'h5': 'text',
  'h6': 'text',
  'img': 'image',
  'a': 'link',
  'button': 'button',
  'table': 'table',
  'tr': 'tableRow',
  'td': 'tableCell',
  'ul': 'list',
  'li': 'listItem'
};

// CSS properties to extract and map to Figma properties
const CSS_TO_FIGMA = {
  'width': 'width',
  'height': 'height',
  'margin': 'margin',
  'padding': 'padding',
  'background-color': 'backgroundColor',
  'color': 'color',
  'font-size': 'fontSize',
  'font-family': 'fontFamily',
  'font-weight': 'fontWeight',
  'text-align': 'textAlign',
  'line-height': 'lineHeight',
  'border': 'border',
  'border-radius': 'borderRadius'
};

/**
 * Converts HTML to Figma-like structure
 * @param {string} html - The HTML email content
 * @returns {Promise<Object>} Figma-like structure
 */
async function htmlToFigma(html) {
  try {
    const dom = new JSDOM(html);
    const document = dom.window.document;
    
    // Start with the body element
    const body = document.body;
    const figmaData = convertElementToFigma(body);
    
    return figmaData;
  } catch (error) {
    console.error('Error converting HTML to Figma:', error);
    throw error;
  }
}

/**
 * Converts an HTML element to Figma structure
 * @param {Element} element - The HTML element to convert
 * @returns {Object} Figma node structure
 */
function convertElementToFigma(element) {
  const nodeType = ELEMENT_TO_COMPONENT[element.tagName.toLowerCase()] || 'frame';
  
  // Get computed styles
  const styles = getComputedStyles(element);
  
  // Create base node
  const node = {
    id: generateId(),
    type: nodeType,
    name: element.tagName.toLowerCase(),
    children: [],
    style: mapStylesToFigma(styles),
    metadata: {
      originalTag: element.tagName.toLowerCase(),
      classes: Array.from(element.classList),
      attributes: getAttributes(element)
    }
  };
  
  // Handle text content
  if (element.textContent && !element.children.length) {
    node.characters = element.textContent.trim();
  }
  
  // Convert children
  Array.from(element.children).forEach(child => {
    const childNode = convertElementToFigma(child);
    node.children.push(childNode);
  });
  
  return node;
}

/**
 * Gets computed styles for an element
 * @param {Element} element - The HTML element
 * @returns {Object} Computed styles
 */
function getComputedStyles(element) {
  const styles = {};
  const computed = element.ownerDocument.defaultView.getComputedStyle(element);
  
  Object.keys(CSS_TO_FIGMA).forEach(cssProp => {
    const value = computed.getPropertyValue(cssProp);
    if (value) {
      styles[cssProp] = value;
    }
  });
  
  return styles;
}

/**
 * Maps CSS styles to Figma properties
 * @param {Object} styles - CSS styles
 * @returns {Object} Figma style properties
 */
function mapStylesToFigma(styles) {
  const figmaStyles = {};
  
  Object.entries(styles).forEach(([cssProp, value]) => {
    const figmaProp = CSS_TO_FIGMA[cssProp];
    if (figmaProp) {
      figmaStyles[figmaProp] = convertValueToFigma(cssProp, value);
    }
  });
  
  return figmaStyles;
}

/**
 * Converts CSS values to Figma format
 * @param {string} property - CSS property name
 * @param {string} value - CSS value
 * @returns {*} Figma-compatible value
 */
function convertValueToFigma(property, value) {
  // Handle different value types
  if (value.includes('px')) {
    return parseFloat(value);
  } else if (value.includes('rgb') || value.includes('#')) {
    return convertColorToFigma(value);
  } else if (property === 'font-size') {
    return parseFloat(value);
  }
  
  return value;
}

/**
 * Converts CSS color to Figma color format
 * @param {string} color - CSS color value
 * @returns {Object} Figma color object
 */
function convertColorToFigma(color) {
  // Simple conversion - in reality, this would need to handle
  // various color formats (hex, rgb, rgba, etc.)
  return {
    r: 0,
    g: 0,
    b: 0,
    a: 1
  };
}

/**
 * Gets element attributes
 * @param {Element} element - The HTML element
 * @returns {Object} Element attributes
 */
function getAttributes(element) {
  const attributes = {};
  Array.from(element.attributes).forEach(attr => {
    attributes[attr.name] = attr.value;
  });
  return attributes;
}

/**
 * Generates a unique ID for Figma nodes
 * @returns {string} Unique ID
 */
function generateId() {
  return Math.random().toString(36).substr(2, 9);
}

module.exports = {
  htmlToFigma
}; 