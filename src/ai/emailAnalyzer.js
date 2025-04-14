const FigmaAPI = require('../figma/api.js');
const IterableAPI = require('../iterable/api.js');

class EmailAnalyzer {
  constructor() {
    this.figma = new FigmaAPI();
    this.iterable = new IterableAPI();
  }

  async analyzeEM1() {
    try {
      console.log('\n=== Analyzing EM1 ===');
      
      // Get Figma design
      const figmaDesign = await this.figma.getFile(
        '5dizNnH3l97v7YJN2dgaFl',  // Figma file ID
        '12951-6616'                // EM1 node ID
      );

      // Get Iterable template
      const iterableTemplate = await this.iterable.getTemplate('15852461');

      // Analyze relationships
      console.log('\nAnalyzing component relationships...');
      
      const analysis = {
        components: this.analyzeFigmaComponents(figmaDesign),
        snippets: this.analyzeIterableSnippets(iterableTemplate),
        patterns: this.findPatterns(figmaDesign, iterableTemplate)
      };

      console.log('\n=== Analysis Results ===');
      this.printResults(analysis);

      return analysis;
    } catch (error) {
      console.error('Analysis Error:', error);
      throw error;
    }
  }

  analyzeFigmaComponents(figmaData) {
    const components = [];
    
    const processNode = (node, depth = 0) => {
      if (!node) return;

      // Track components and their properties
      if (node.type === 'COMPONENT' || node.type === 'INSTANCE' || node.type === 'FRAME') {
        components.push({
          name: node.name,
          type: node.type,
          depth: depth,
          properties: {
            layout: node.layoutMode,
            styles: node.styles,
            constraints: node.constraints
          }
        });
      }

      // Process children
      if (node.children) {
        node.children.forEach(child => processNode(child, depth + 1));
      }
    };

    if (figmaData.nodes) {
      Object.values(figmaData.nodes).forEach(node => {
        processNode(node.document);
      });
    }

    return components;
  }

  analyzeIterableSnippets(template) {
    const snippets = {
      components: [],
      conditionals: [],
      variables: []
    };

    if (template.html) {
      // Find component snippets
      const componentMatches = template.html.match(/{{snippets\.[^}]+}}/g) || [];
      snippets.components = componentMatches.map(match => ({
        name: match.match(/{{snippets\.([^}]+)}}/)[1],
        fullMatch: match
      }));

      // Find conditionals
      const conditionalMatches = template.html.match(/{%[^%]+%}/g) || [];
      snippets.conditionals = conditionalMatches.map(match => ({
        logic: match.trim(),
        type: match.includes('if') ? 'condition' : 'loop'
      }));

      // Find variables
      const variableMatches = template.html.match(/{{[^}]+}}/g) || [];
      snippets.variables = variableMatches
        .filter(match => !match.includes('snippets.'))
        .map(match => ({
          name: match.replace(/{{|}}/g, '').trim(),
          fullMatch: match
        }));
    }

    return snippets;
  }

  findPatterns(figmaData, template) {
    const patterns = {
      componentToSnippet: [],
      variationHandling: [],
      commonStructures: []
    };

    // Analyze component naming patterns
    if (figmaData.nodes) {
      Object.values(figmaData.nodes).forEach(node => {
        this.analyzeComponentPatterns(node.document, template.html, patterns);
      });
    }

    return patterns;
  }

  analyzeComponentPatterns(node, templateHtml, patterns) {
    if (!node) return;

    // Look for naming patterns that match snippet usage
    if (node.name && templateHtml) {
      const cleanName = node.name.toLowerCase().replace(/[^a-z0-9]/g, '');
      const snippetMatch = templateHtml.match(new RegExp(`{{snippets.[^}]*${cleanName}[^}]*}}`, 'i'));
      
      if (snippetMatch) {
        patterns.componentToSnippet.push({
          figmaComponent: node.name,
          iterableSnippet: snippetMatch[0]
        });
      }
    }

    // Look for variation patterns
    if (node.name && (node.name.includes('variant') || node.name.includes('state'))) {
      patterns.variationHandling.push({
        component: node.name,
        type: node.type,
        properties: node.styles || {}
      });
    }

    // Analyze children
    if (node.children) {
      node.children.forEach(child => this.analyzeComponentPatterns(child, templateHtml, patterns));
    }
  }

  printResults(analysis) {
    console.log('\n=== Figma Components Analysis ===');
    
    // Group components by type
    const groupedComponents = analysis.components.reduce((acc, comp) => {
      const type = comp.type;
      if (!acc[type]) acc[type] = [];
      acc[type].push(comp);
      return acc;
    }, {});

    // Print components by type
    Object.entries(groupedComponents).forEach(([type, components]) => {
      console.log(`\n${type} Components (${components.length}):`);
      components.forEach(comp => {
        console.log(`${'  '.repeat(comp.depth)}- ${comp.name}`);
        if (comp.properties.layout) {
          console.log(`${'  '.repeat(comp.depth + 1)}Layout: ${comp.properties.layout}`);
        }
      });
    });

    console.log('\n=== Summary ===');
    console.log('Total Components:', analysis.components.length);
    console.log('Component Types:', Object.keys(groupedComponents).join(', '));
  }
}

module.exports = EmailAnalyzer; 