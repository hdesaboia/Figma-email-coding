/**
 * Snippet Expander Module
 * 
 * This module is responsible for:
 * 1. Detecting snippets in Figma designs
 * 2. Expanding snippets into their full component structure
 * 3. Maintaining snippet relationships and metadata
 * 4. Handling nested snippets
 */

// Regex pattern for snippet detection
const SNIPPET_PATTERN = /{{\s*([^}]+)\s*}}/g;

/**
 * Expand snippets in Figma data
 * @param {Object} figmaData - The Figma file data
 * @param {Object} config - Configuration options
 * @returns {Promise<Object>} Expanded Figma data
 */
async function expandSnippets(figmaData, config = {}) {
  try {
    // 1. Find all snippets in the design
    const snippets = findSnippets(figmaData);
    
    // 2. Expand each snippet
    const expandedData = await expandSnippetInstances(figmaData, snippets, config);
    
    // 3. Update relationships and metadata
    const finalData = updateSnippetMetadata(expandedData, snippets);
    
    return finalData;
  } catch (error) {
    console.error('Snippet expansion failed:', error);
    throw new Error(`Failed to expand snippets: ${error.message}`);
  }
}

/**
 * Find all snippets in Figma data
 * @param {Object} figmaData - The Figma file data
 * @returns {Array} Found snippets
 */
function findSnippets(figmaData) {
  const snippets = [];
  const nodes = figmaData.document.children;
  
  function processNode(node) {
    // Check if node is a snippet instance
    if (isSnippetInstance(node)) {
      snippets.push({
        id: node.id,
        name: node.name,
        sourceId: node.componentId,
        properties: extractSnippetProperties(node)
      });
    }
    
    // Process children recursively
    if (node.children) {
      node.children.forEach(processNode);
    }
  }
  
  nodes.forEach(processNode);
  return snippets;
}

/**
 * Check if a node is a snippet instance
 * @param {Object} node - The Figma node
 * @returns {boolean} Whether node is a snippet instance
 */
function isSnippetInstance(node) {
  return node.type === 'INSTANCE' && 
         node.name.toLowerCase().includes('snippet');
}

/**
 * Extract snippet properties from a node
 * @param {Object} node - The Figma node
 * @returns {Object} Snippet properties
 */
function extractSnippetProperties(node) {
  return {
    overrides: node.overrides || {},
    constraints: node.constraints,
    // Add more properties as needed
  };
}

/**
 * Expand snippet instances in Figma data
 * @param {Object} figmaData - The Figma file data
 * @param {Array} snippets - Found snippets
 * @param {Object} config - Configuration options
 * @returns {Promise<Object>} Expanded Figma data
 */
async function expandSnippetInstances(figmaData, snippets, config) {
  // Create a deep copy of the data to modify
  const expandedData = JSON.parse(JSON.stringify(figmaData));
  
  // Process each snippet
  for (const snippet of snippets) {
    // Find the source component
    const sourceComponent = findComponentById(expandedData, snippet.sourceId);
    if (!sourceComponent) {
      console.warn(`Source component not found for snippet: ${snippet.name}`);
      continue;
    }
    
    // Create expanded version of the component
    const expandedComponent = createExpandedComponent(sourceComponent, snippet);
    
    // Replace the snippet instance with the expanded component
    replaceNode(expandedData, snippet.id, expandedComponent);
  }
  
  return expandedData;
}

/**
 * Find a component by ID in Figma data
 * @param {Object} figmaData - The Figma file data
 * @param {string} componentId - The component ID to find
 * @returns {Object|null} Found component or null
 */
function findComponentById(figmaData, componentId) {
  let found = null;
  
  function searchNode(node) {
    if (node.id === componentId) {
      found = node;
      return;
    }
    
    if (node.children) {
      node.children.forEach(searchNode);
    }
  }
  
  figmaData.document.children.forEach(searchNode);
  return found;
}

/**
 * Create an expanded version of a component
 * @param {Object} sourceComponent - The source component
 * @param {Object} snippet - The snippet instance
 * @returns {Object} Expanded component
 */
function createExpandedComponent(sourceComponent, snippet) {
  // Create a deep copy of the source component
  const expanded = JSON.parse(JSON.stringify(sourceComponent));
  
  // Apply overrides from the snippet instance
  if (snippet.properties.overrides) {
    applyOverrides(expanded, snippet.properties.overrides);
  }
  
  // Update metadata
  expanded.metadata = {
    ...expanded.metadata,
    isExpandedSnippet: true,
    sourceSnippetId: snippet.id,
    expansionTime: new Date()
  };
  
  return expanded;
}

/**
 * Apply overrides to a component
 * @param {Object} component - The component to modify
 * @param {Object} overrides - The overrides to apply
 */
function applyOverrides(component, overrides) {
  // Apply overrides recursively
  function applyToNode(node) {
    if (overrides[node.id]) {
      Object.assign(node, overrides[node.id]);
    }
    
    if (node.children) {
      node.children.forEach(applyToNode);
    }
  }
  
  applyToNode(component);
}

/**
 * Replace a node in Figma data
 * @param {Object} figmaData - The Figma file data
 * @param {string} nodeId - The ID of the node to replace
 * @param {Object} newNode - The new node
 */
function replaceNode(figmaData, nodeId, newNode) {
  function replaceInNode(node) {
    if (node.children) {
      const index = node.children.findIndex(child => child.id === nodeId);
      if (index !== -1) {
        node.children[index] = newNode;
        return;
      }
      
      node.children.forEach(replaceInNode);
    }
  }
  
  figmaData.document.children.forEach(replaceInNode);
}

/**
 * Update snippet metadata in expanded data
 * @param {Object} figmaData - The expanded Figma data
 * @param {Array} snippets - The original snippets
 * @returns {Object} Updated Figma data
 */
function updateSnippetMetadata(figmaData, snippets) {
  // Add snippet tracking metadata
  figmaData.metadata = {
    ...figmaData.metadata,
    expandedSnippets: snippets.map(s => ({
      id: s.id,
      name: s.name,
      sourceId: s.sourceId
    })),
    expansionTime: new Date()
  };
  
  return figmaData;
}

module.exports = {
  expandSnippets
}; 