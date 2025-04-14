const FigmaAPI = require('../figma/api.js');
const IterableAPI = require('../iterable/api.js');

class DataCollector {
  constructor() {
    this.figma = new FigmaAPI();
    this.iterable = new IterableAPI();
  }

  async collectTrainingData() {
    try {
      console.log('\n=== Collecting Training Data ===');

      // First pair: Email 1 Non-Incentive
      const email1Data = await this.collectEmailPair(
        '5dizNnH3l97v7YJN2dgaFl',  // Figma file ID
        '8004-3408',               // Figma node ID
        '14952092',                // Master template ID
        '15541232'                 // Final email template ID
      );

      console.log('\nData Collection Results:');
      console.log('- Figma components found:', Object.keys(email1Data.figma.components || {}).length);
      console.log('- Template snippets found:', Object.keys(email1Data.template.snippets || {}).length);
      console.log('- Relationships mapped:', email1Data.relationships.length);

      return email1Data;

    } catch (error) {
      console.error('Data Collection Error:', error);
      throw error;
    }
  }

  async collectEmailPair(figmaFileId, figmaNodeId, masterTemplateId, finalTemplateId) {
    // Get Figma design data
    console.log('\nFetching Figma design...');
    const figmaData = await this.figma.getFile(figmaFileId, figmaNodeId);

    // Get master template
    console.log('Fetching master template...');
    const masterTemplate = await this.iterable.getMasterTemplate();

    // Get final template
    console.log('Fetching final template...');
    const finalTemplate = await this.iterable.getTemplate(finalTemplateId);

    // Analyze relationships
    const relationships = this.analyzeRelationships(figmaData, masterTemplate, finalTemplate);

    return {
      figma: figmaData,
      masterTemplate,
      finalTemplate,
      relationships
    };
  }

  analyzeRelationships(figmaData, masterTemplate, finalTemplate) {
    const relationships = [];

    // Log analysis start
    console.log('\nAnalyzing component relationships...');

    if (figmaData.nodes) {
      Object.values(figmaData.nodes).forEach(node => {
        this.findComponentRelationships(node.document, masterTemplate, finalTemplate, relationships);
      });
    }

    return relationships;
  }

  findComponentRelationships(node, masterTemplate, finalTemplate, relationships) {
    if (!node) return;

    // Look for components in Figma that match template snippets
    if (node.type === 'COMPONENT' || node.type === 'INSTANCE') {
      relationships.push({
        figmaComponent: {
          name: node.name,
          type: node.type,
          id: node.id
        },
        masterSnippet: this.findMatchingSnippet(node, masterTemplate),
        finalImplementation: this.findImplementation(node, finalTemplate)
      });
    }

    // Recursively check children
    if (node.children) {
      node.children.forEach(child => {
        this.findComponentRelationships(child, masterTemplate, finalTemplate, relationships);
      });
    }
  }

  findMatchingSnippet(figmaNode, masterTemplate) {
    // Look for matching snippets in master template
    // This is a simplified version - we'll need to make this smarter
    const snippets = masterTemplate.html.match(/{{snippets\.[^}]+}}/g) || [];
    return snippets.find(snippet => {
      const snippetName = snippet.match(/{{snippets\.([^}]+)}}/)[1];
      return this.isRelated(figmaNode.name, snippetName);
    });
  }

  findImplementation(figmaNode, finalTemplate) {
    // Find how the component was implemented in final template
    // This is a simplified version - we'll need to make this smarter
    const htmlChunks = finalTemplate.html.split('<!--');
    return htmlChunks.find(chunk => this.isRelated(figmaNode.name, chunk));
  }

  isRelated(figmaName, templateName) {
    // Simple name matching - we'll need to make this smarter
    const cleanFigma = figmaName.toLowerCase().replace(/[^a-z0-9]/g, '');
    const cleanTemplate = templateName.toLowerCase().replace(/[^a-z0-9]/g, '');
    return cleanFigma.includes(cleanTemplate) || cleanTemplate.includes(cleanFigma);
  }
}

module.exports = DataCollector; 