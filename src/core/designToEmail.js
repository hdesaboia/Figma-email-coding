/**
 * Core module for converting Figma designs to HTML emails
 * 
 * This module orchestrates the entire conversion process:
 * 1. Design Analysis: Extract components and patterns from Figma
 * 2. Semantic Mapping: Map design elements to HTML components
 * 3. HTML Generation: Create semantic HTML structure
 * 4. Email Optimization: Ensure email client compatibility
 */

const { analyzeDesign } = require('./designAnalyzer');
const { generateHTML } = require('./htmlGenerator');
const { optimizeForEmail } = require('./emailOptimizer');

class DesignToEmailConverter {
  constructor(config = {}) {
    this.config = {
      figmaToken: config.figmaToken,
      preserveSemantics: config.preserveSemantics ?? true,
      optimizeForEmail: config.optimizeForEmail ?? true,
      ...config
    };
  }

  /**
   * Convert a Figma design to an HTML email
   * @param {string} figmaFileId - The ID of the Figma file to convert
   * @param {string} nodeId - The ID of the specific node to convert (optional)
   * @returns {Promise<{html: string, metadata: Object}>} The generated HTML and conversion metadata
   */
  async convert(figmaFileId, nodeId = null) {
    try {
      // 1. Analyze the Figma design
      const designAnalysis = await analyzeDesign(figmaFileId, nodeId, this.config);
      
      // 2. Generate semantic HTML
      const htmlStructure = await generateHTML(designAnalysis, this.config);
      
      // 3. Optimize for email clients
      const optimizedHTML = this.config.optimizeForEmail 
        ? await optimizeForEmail(htmlStructure, this.config)
        : htmlStructure;

      return {
        html: optimizedHTML,
        metadata: {
          designAnalysis,
          conversionTime: new Date(),
          config: this.config
        }
      };
    } catch (error) {
      console.error('Conversion failed:', error);
      throw new Error(`Failed to convert Figma design: ${error.message}`);
    }
  }
}

module.exports = DesignToEmailConverter; 