/**
 * Layout Analyzer Module
 * 
 * This module is responsible for:
 * 1. Analyzing component positions and relationships
 * 2. Identifying layout patterns and structures
 * 3. Detecting responsive breakpoints
 * 4. Mapping component hierarchies
 */

const { COMPONENT_TYPES } = require('./componentExtractor');

// Common email layout patterns
const LAYOUT_PATTERNS = {
  SINGLE_COLUMN: 'singleColumn',
  TWO_COLUMN: 'twoColumn',
  THREE_COLUMN: 'threeColumn',
  HERO: 'hero',
  FOOTER: 'footer',
  HEADER: 'header',
  CONTENT: 'content'
};

// Layout detection thresholds
const LAYOUT_THRESHOLDS = {
  COLUMN_GAP: 20, // Minimum gap between columns
  SECTION_GAP: 40, // Minimum gap between sections
  RESPONSIVE_BREAKPOINT: 600 // Mobile breakpoint in pixels
};

/**
 * Analyze layout structure from Figma data and components
 * @param {Object} figmaData - The Figma file data
 * @param {Array} components - Extracted components
 * @param {Object} config - Configuration options
 * @returns {Promise<Object>} Layout analysis results
 */
async function analyzeLayout(figmaData, components, config = {}) {
  try {
    // 1. Build component hierarchy
    const hierarchy = buildComponentHierarchy(components);
    
    // 2. Analyze component positions and relationships
    const relationships = analyzeComponentRelationships(components);
    
    // 3. Identify layout patterns
    const patterns = identifyLayoutPatterns(components, relationships);
    
    // 4. Detect responsive breakpoints
    const breakpoints = detectBreakpoints(components, patterns);
    
    return {
      hierarchy,
      relationships,
      patterns,
      breakpoints,
      metadata: {
        analysisTime: new Date(),
        totalComponents: components.length,
        figmaVersion: figmaData.version
      }
    };
  } catch (error) {
    console.error('Layout analysis failed:', error);
    throw new Error(`Failed to analyze layout: ${error.message}`);
  }
}

/**
 * Build component hierarchy
 * @param {Array} components - Extracted components
 * @returns {Object} Component hierarchy
 */
function buildComponentHierarchy(components) {
  const hierarchy = {
    root: null,
    levels: {},
    relationships: {}
  };
  
  // First pass: Create level map
  components.forEach(component => {
    const level = getComponentLevel(component, components);
    if (!hierarchy.levels[level]) {
      hierarchy.levels[level] = [];
    }
    hierarchy.levels[level].push(component.id);
  });
  
  // Second pass: Build relationships
  components.forEach(component => {
    const parent = findParentComponent(component, components);
    if (parent) {
      if (!hierarchy.relationships[parent.id]) {
        hierarchy.relationships[parent.id] = [];
      }
      hierarchy.relationships[parent.id].push(component.id);
    } else {
      hierarchy.root = component.id;
    }
  });
  
  return hierarchy;
}

/**
 * Get component level in hierarchy
 * @param {Object} component - The component to analyze
 * @param {Array} allComponents - All components
 * @returns {number} Component level
 */
function getComponentLevel(component, allComponents) {
  let level = 0;
  let current = component;
  
  while (current.parent) {
    const parent = allComponents.find(c => c.id === current.parent);
    if (!parent) break;
    level++;
    current = parent;
  }
  
  return level;
}

/**
 * Find parent component
 * @param {Object} component - The component to analyze
 * @param {Array} allComponents - All components
 * @returns {Object|null} Parent component or null
 */
function findParentComponent(component, allComponents) {
  if (!component.parent) return null;
  return allComponents.find(c => c.id === component.parent) || null;
}

/**
 * Analyze component relationships
 * @param {Array} components - Extracted components
 * @returns {Object} Component relationships
 */
function analyzeComponentRelationships(components) {
  const relationships = {
    adjacent: {},
    nested: {},
    siblings: {}
  };
  
  // Sort components by position
  const sortedComponents = [...components].sort((a, b) => {
    if (a.properties.position.y !== b.properties.position.y) {
      return a.properties.position.y - b.properties.position.y;
    }
    return a.properties.position.x - b.properties.position.x;
  });
  
  // Analyze relationships
  for (let i = 0; i < sortedComponents.length; i++) {
    const current = sortedComponents[i];
    const next = sortedComponents[i + 1];
    
    if (next) {
      // Check for adjacent components
      if (isAdjacent(current, next)) {
        if (!relationships.adjacent[current.id]) {
          relationships.adjacent[current.id] = [];
        }
        relationships.adjacent[current.id].push(next.id);
      }
      
      // Check for sibling components
      if (current.parent === next.parent) {
        if (!relationships.siblings[current.id]) {
          relationships.siblings[current.id] = [];
        }
        relationships.siblings[current.id].push(next.id);
      }
    }
    
    // Check for nested components
    if (current.children && current.children.length > 0) {
      relationships.nested[current.id] = current.children;
    }
  }
  
  return relationships;
}

/**
 * Check if components are adjacent
 * @param {Object} comp1 - First component
 * @param {Object} comp2 - Second component
 * @returns {boolean} Whether components are adjacent
 */
function isAdjacent(comp1, comp2) {
  const pos1 = comp1.properties.position;
  const pos2 = comp2.properties.position;
  
  // Check vertical adjacency
  if (Math.abs(pos1.y - pos2.y) < LAYOUT_THRESHOLDS.SECTION_GAP) {
    // Check horizontal adjacency
    const gap = Math.abs(
      (pos1.x + pos1.width) - pos2.x
    );
    return gap < LAYOUT_THRESHOLDS.COLUMN_GAP;
  }
  
  return false;
}

/**
 * Identify layout patterns
 * @param {Array} components - Extracted components
 * @param {Object} relationships - Component relationships
 * @returns {Array} Identified layout patterns
 */
function identifyLayoutPatterns(components, relationships) {
  const patterns = [];
  
  // Analyze each component group
  Object.entries(relationships.siblings).forEach(([parentId, siblingIds]) => {
    const siblings = [parentId, ...siblingIds].map(id => 
      components.find(c => c.id === id)
    );
    
    // Check for column patterns
    const columnPattern = detectColumnPattern(siblings);
    if (columnPattern) {
      patterns.push({
        type: columnPattern,
        components: siblings.map(c => c.id),
        metadata: {
          detectedAt: new Date(),
          confidence: calculatePatternConfidence(siblings, columnPattern)
        }
      });
    }
    
    // Check for section patterns
    const sectionPattern = detectSectionPattern(siblings);
    if (sectionPattern) {
      patterns.push({
        type: sectionPattern,
        components: siblings.map(c => c.id),
        metadata: {
          detectedAt: new Date(),
          confidence: calculatePatternConfidence(siblings, sectionPattern)
        }
      });
    }
  });
  
  return patterns;
}

/**
 * Detect column pattern in components
 * @param {Array} components - Components to analyze
 * @returns {string|null} Detected pattern or null
 */
function detectColumnPattern(components) {
  if (components.length === 1) return LAYOUT_PATTERNS.SINGLE_COLUMN;
  if (components.length === 2) return LAYOUT_PATTERNS.TWO_COLUMN;
  if (components.length === 3) return LAYOUT_PATTERNS.THREE_COLUMN;
  return null;
}

/**
 * Detect section pattern in components
 * @param {Array} components - Components to analyze
 * @returns {string|null} Detected pattern or null
 */
function detectSectionPattern(components) {
  const types = components.map(c => c.type);
  
  // Check for hero section
  if (types.includes(COMPONENT_TYPES.HEADLINE) && 
      types.includes(COMPONENT_TYPES.IMAGE)) {
    return LAYOUT_PATTERNS.HERO;
  }
  
  // Check for header
  if (types.includes(COMPONENT_TYPES.LOGO) && 
      types.includes(COMPONENT_TYPES.BUTTON)) {
    return LAYOUT_PATTERNS.HEADER;
  }
  
  // Check for footer
  if (types.some(t => t === COMPONENT_TYPES.TEXT) && 
      !types.includes(COMPONENT_TYPES.HEADLINE)) {
    return LAYOUT_PATTERNS.FOOTER;
  }
  
  return null;
}

/**
 * Calculate pattern detection confidence
 * @param {Array} components - Components in pattern
 * @param {string} pattern - Detected pattern
 * @returns {number} Confidence score (0-1)
 */
function calculatePatternConfidence(components, pattern) {
  // Base confidence on component alignment and spacing
  let confidence = 0.5;
  
  // Check component alignment
  const aligned = checkComponentAlignment(components);
  if (aligned) confidence += 0.2;
  
  // Check consistent spacing
  const consistentSpacing = checkConsistentSpacing(components);
  if (consistentSpacing) confidence += 0.3;
  
  return Math.min(confidence, 1);
}

/**
 * Check if components are properly aligned
 * @param {Array} components - Components to check
 * @returns {boolean} Whether components are aligned
 */
function checkComponentAlignment(components) {
  if (components.length < 2) return true;
  
  const first = components[0];
  return components.every(comp => 
    Math.abs(comp.properties.position.y - first.properties.position.y) < 5
  );
}

/**
 * Check for consistent spacing between components
 * @param {Array} components - Components to check
 * @returns {boolean} Whether spacing is consistent
 */
function checkConsistentSpacing(components) {
  if (components.length < 2) return true;
  
  const gaps = [];
  for (let i = 0; i < components.length - 1; i++) {
    const current = components[i];
    const next = components[i + 1];
    gaps.push(next.properties.position.x - 
      (current.properties.position.x + current.properties.position.width));
  }
  
  const avgGap = gaps.reduce((a, b) => a + b, 0) / gaps.length;
  return gaps.every(gap => 
    Math.abs(gap - avgGap) < LAYOUT_THRESHOLDS.COLUMN_GAP
  );
}

/**
 * Detect responsive breakpoints
 * @param {Array} components - Extracted components
 * @param {Array} patterns - Layout patterns
 * @returns {Object} Breakpoint information
 */
function detectBreakpoints(components, patterns) {
  const breakpoints = {
    mobile: LAYOUT_THRESHOLDS.RESPONSIVE_BREAKPOINT,
    tablet: 768,
    desktop: 1024
  };
  
  // Analyze patterns for breakpoint hints
  patterns.forEach(pattern => {
    if (pattern.type === LAYOUT_PATTERNS.TWO_COLUMN || 
        pattern.type === LAYOUT_PATTERNS.THREE_COLUMN) {
      const components = pattern.components;
      const totalWidth = components.reduce((width, comp) => 
        width + comp.properties.position.width, 0);
      
      // Adjust breakpoints based on content width
      if (totalWidth > breakpoints.desktop) {
        breakpoints.desktop = Math.ceil(totalWidth * 1.1);
      }
    }
  });
  
  return breakpoints;
}

module.exports = {
  analyzeLayout,
  LAYOUT_PATTERNS
}; 