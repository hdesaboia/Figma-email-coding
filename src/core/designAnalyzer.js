/**
 * Design Analyzer Module
 * 
 * This module is responsible for:
 * 1. Extracting components from Figma designs
 * 2. Identifying design patterns and relationships
 * 3. Analyzing layout structure and hierarchy
 * 4. Detecting email-specific components
 */

const { getFigmaFile } = require('../figma/api');
const { extractComponents } = require('./componentExtractor');
const { analyzeLayout } = require('./layoutAnalyzer');
const { detectPatterns } = require('./patternDetector');

/**
 * Analyze a Figma design and extract its components and structure
 * @param {string} fileId - Figma file ID
 * @param {string} nodeId - Specific node ID to analyze (optional)
 * @param {Object} config - Configuration options
 * @returns {Promise<Object>} Design analysis results
 */
async function analyzeDesign(fileId, nodeId = null, config = {}) {
  try {
    // 1. Fetch the Figma file data
    const figmaData = await getFigmaFile(fileId, nodeId, config.figmaToken);
    
    // 2. Extract components and their properties
    const components = await extractComponents(figmaData, config);
    
    // 3. Analyze the layout structure
    const layout = await analyzeLayout(figmaData, components, config);
    
    // 4. Detect common email patterns
    const patterns = await detectPatterns(components, layout, config);
    
    return {
      components,
      layout,
      patterns,
      metadata: {
        fileId,
        nodeId,
        timestamp: new Date(),
        figmaVersion: figmaData.version
      }
    };
  } catch (error) {
    console.error('Design analysis failed:', error);
    throw new Error(`Failed to analyze design: ${error.message}`);
  }
}

module.exports = {
  analyzeDesign
}; 