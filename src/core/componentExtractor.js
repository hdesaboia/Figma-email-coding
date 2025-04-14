/**
 * Component Extractor Module
 * 
 * This module is responsible for:
 * 1. Identifying components in Figma designs
 * 2. Extracting component properties and metadata
 * 3. Handling snippet expansion and reuse
 * 4. Categorizing components by type
 */

const { expandSnippets } = require('./snippetExpander');

// Component type definitions
const COMPONENT_TYPES = {
  BUTTON: 'button',
  HEADLINE: 'headline',
  TEXT: 'text',
  IMAGE: 'image',
  LOGO: 'logo',
  DIVIDER: 'divider',
  SPACER: 'spacer'
};

// Regex patterns for component detection
const COMPONENT_PATTERNS = {
  [COMPONENT_TYPES.BUTTON]: /<a[^>]*class="[^"]*button[^"]*"[^>]*>/i,
  [COMPONENT_TYPES.HEADLINE]: /<h[1-6][^>]*>/i,
  [COMPONENT_TYPES.TEXT]: /<p[^>]*>/i,
  [COMPONENT_TYPES.IMAGE]: /<img[^>]*>/i,
  [COMPONENT_TYPES.LOGO]: /<img[^>]*class="[^"]*logo[^"]*"[^>]*>/i,
  [COMPONENT_TYPES.DIVIDER]: /<hr[^>]*>/i,
  [COMPONENT_TYPES.SPACER]: /<div[^>]*class="[^"]*spacer[^"]*"[^>]*>/i
};

/**
 * Extract components from Figma data
 * @param {Object} figmaData - The Figma file data
 * @param {Object} config - Configuration options
 * @returns {Promise<Array>} Array of extracted components
 */
async function extractComponents(figmaData, config = {}) {
  try {
    // 1. Expand any snippets in the design
    const expandedData = await expandSnippets(figmaData, config);
    
    // 2. Extract raw components from Figma nodes
    const rawComponents = extractRawComponents(expandedData);
    
    // 3. Process and categorize components
    const processedComponents = processComponents(rawComponents);
    
    // 4. Add metadata and relationships
    const components = addMetadata(processedComponents, expandedData);
    
    return components;
  } catch (error) {
    console.error('Component extraction failed:', error);
    throw new Error(`Failed to extract components: ${error.message}`);
  }
}

/**
 * Extract raw components from Figma nodes
 * @param {Object} figmaData - The Figma file data
 * @returns {Array} Raw component data
 */
function extractRawComponents(figmaData) {
  const components = [];
  const nodes = figmaData.document.children;
  
  function processNode(node, parent = null) {
    // Skip if node is not visible
    if (node.visible === false) return;
    
    // Check if node is a component or instance
    if (node.type === 'COMPONENT' || node.type === 'INSTANCE') {
      components.push({
        id: node.id,
        name: node.name,
        type: node.type,
        parent: parent?.id,
        properties: extractProperties(node),
        children: []
      });
    }
    
    // Process children recursively
    if (node.children) {
      node.children.forEach(child => processNode(child, node));
    }
  }
  
  nodes.forEach(node => processNode(node));
  return components;
}

/**
 * Extract properties from a Figma node
 * @param {Object} node - The Figma node
 * @returns {Object} Node properties
 */
function extractProperties(node) {
  return {
    position: {
      x: node.x,
      y: node.y,
      width: node.width,
      height: node.height
    },
    style: {
      backgroundColor: node.backgroundColor,
      textColor: node.textColor,
      fontSize: node.fontSize,
      fontFamily: node.fontFamily,
      // Add more style properties as needed
    },
    constraints: node.constraints,
    // Add more properties as needed
  };
}

/**
 * Process and categorize components
 * @param {Array} rawComponents - Raw component data
 * @returns {Array} Processed components
 */
function processComponents(rawComponents) {
  return rawComponents.map(component => {
    // Determine component type based on name and properties
    const type = determineComponentType(component);
    
    return {
      ...component,
      type,
      metadata: {
        isCritical: isCriticalComponent(type),
        isReusable: isReusableComponent(component),
        // Add more metadata as needed
      }
    };
  });
}

/**
 * Determine component type based on properties
 * @param {Object} component - The component to analyze
 * @returns {string} Component type
 */
function determineComponentType(component) {
  const name = component.name.toLowerCase();
  
  // Check for explicit type indicators in name
  for (const [type, pattern] of Object.entries(COMPONENT_PATTERNS)) {
    if (name.includes(type.toLowerCase())) {
      return type;
    }
  }
  
  // Default to text if no specific type is found
  return COMPONENT_TYPES.TEXT;
}

/**
 * Check if component is critical for email functionality
 * @param {string} type - Component type
 * @returns {boolean} Whether component is critical
 */
function isCriticalComponent(type) {
  const criticalTypes = [
    COMPONENT_TYPES.BUTTON,
    COMPONENT_TYPES.HEADLINE,
    COMPONENT_TYPES.LOGO
  ];
  return criticalTypes.includes(type);
}

/**
 * Check if component is reusable (snippet candidate)
 * @param {Object} component - The component to check
 * @returns {boolean} Whether component is reusable
 */
function isReusableComponent(component) {
  // Components with specific naming patterns are considered reusable
  return component.name.toLowerCase().includes('snippet') ||
         component.name.toLowerCase().includes('reusable');
}

/**
 * Add metadata and relationships to components
 * @param {Array} components - Processed components
 * @param {Object} figmaData - The Figma file data
 * @returns {Array} Components with metadata
 */
function addMetadata(components, figmaData) {
  return components.map(component => ({
    ...component,
    metadata: {
      ...component.metadata,
      figmaVersion: figmaData.version,
      extractionTime: new Date(),
      // Add more metadata as needed
    }
  }));
}

module.exports = {
  extractComponents,
  COMPONENT_TYPES
}; 