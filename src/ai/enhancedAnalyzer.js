const FigmaAPI = require('../figma/api.js');
const IterableAPI = require('../iterable/api.js');

class EnhancedAnalyzer {
  constructor() {
    this.figma = new FigmaAPI();
    this.iterable = new IterableAPI();
  }

  async analyzeComplete() {
    try {
      console.log('\n=== Starting Enhanced Analysis ===');

      // 1. Enhanced Component Analysis
      const figmaData = await this.figma.getFile(
        '5dizNnH3l97v7YJN2dgaFl',  // Figma file ID
        '12951-6616'                // EM1 node ID
      );

      // 2. Get Iterable Template
      const iterableTemplate = await this.iterable.getTemplate('15852461');

      // 3. Perform all analyses
      const analysis = {
        components: this.analyzeComponentRelationships(figmaData),
        snippets: this.mapToIterableSnippets(figmaData, iterableTemplate),
        patterns: this.createPatternMap(figmaData, iterableTemplate)
      };

      this.printEnhancedResults(analysis);
      return analysis;

    } catch (error) {
      console.error('Analysis Error:', error);
      throw error;
    }
  }

  analyzeComponentRelationships(figmaData) {
    const relationships = {
      desktop: {},
      mobile: {},
      variations: {},
      hierarchy: new Map()
    };

    const processNode = (node, parent = null) => {
      if (!node) return;

      // Track component relationships
      if (node.type === 'COMPONENT' || node.type === 'INSTANCE' || node.type === 'FRAME') {
        const componentInfo = {
          name: node.name,
          type: node.type,
          parent: parent?.name,
          children: [],
          properties: {
            layout: node.layoutMode,
            styles: node.styles,
            constraints: node.constraints
          }
        };

        // Categorize by device type
        if (node.name.includes('Desktop')) {
          relationships.desktop[node.name] = componentInfo;
        } else if (node.name.includes('Mobile')) {
          relationships.mobile[node.name] = componentInfo;
        }

        // Track variations
        if (node.name.includes('variant') || node.name.includes('state')) {
          const baseName = node.name.split('variant')[0] || node.name.split('state')[0];
          if (!relationships.variations[baseName]) {
            relationships.variations[baseName] = [];
          }
          relationships.variations[baseName].push(componentInfo);
        }

        // Track hierarchy
        if (parent) {
          relationships.hierarchy.set(node.id, parent.id);
          const parentInfo = relationships.desktop[parent.name] || relationships.mobile[parent.name];
          if (parentInfo) {
            parentInfo.children.push(node.name);
          }
        }
      }

      // Process children
      if (node.children) {
        node.children.forEach(child => processNode(child, node));
      }
    };

    if (figmaData.nodes) {
      Object.values(figmaData.nodes).forEach(node => {
        processNode(node.document);
      });
    }

    return relationships;
  }

  mapToIterableSnippets(figmaData, iterableTemplate) {
    const mappings = {
      components: new Map(),
      conditionals: new Map(),
      variables: new Set()
    };

    // Extract Iterable snippets
    const snippetMatches = iterableTemplate.html.match(/{{snippets\.[^}]+}}/g) || [];
    const conditionalMatches = iterableTemplate.html.match(/{%[^%]+%}/g) || [];
    const variableMatches = iterableTemplate.html.match(/{{[^}]+}}/g) || [];

    // Map Figma components to snippets
    const processNode = (node) => {
      if (!node) return;

      if (node.type === 'COMPONENT' || node.type === 'INSTANCE') {
        // Find matching snippet
        const matchingSnippet = snippetMatches.find(snippet => 
          this.isRelated(node.name, snippet)
        );

        if (matchingSnippet) {
          mappings.components.set(node.name, matchingSnippet);
        }

        // Check for conditional logic
        const matchingConditional = conditionalMatches.find(conditional =>
          this.isRelated(node.name, conditional)
        );

        if (matchingConditional) {
          mappings.conditionals.set(node.name, matchingConditional);
        }
      }

      // Process children
      if (node.children) {
        node.children.forEach(child => processNode(child));
      }
    };

    if (figmaData.nodes) {
      Object.values(figmaData.nodes).forEach(node => {
        processNode(node.document);
      });
    }

    // Track variables
    variableMatches.forEach(variable => {
      if (!variable.includes('snippets.')) {
        mappings.variables.add(variable);
      }
    });

    return mappings;
  }

  createPatternMap(figmaData, iterableTemplate) {
    const patterns = {
      layout: new Map(),
      content: new Map(),
      conditional: new Map()
    };

    // Analyze layout patterns
    const processLayoutPatterns = (node) => {
      if (!node) return;

      if (node.type === 'COMPONENT' || node.type === 'INSTANCE' || node.type === 'FRAME') {
        patterns.layout.set(node.name, {
          type: node.type,
          layout: node.layoutMode,
          spacing: node.itemSpacing,
          padding: node.padding
        });
      }

      // Process children
      if (node.children) {
        node.children.forEach(child => processLayoutPatterns(child));
      }
    };

    // Analyze content patterns
    const processContentPatterns = (node) => {
      if (!node) return;

      if (node.type === 'TEXT') {
        patterns.content.set(node.name, {
          type: 'text',
          characters: node.characters,
          style: node.style
        });
      } else if (node.fills && node.fills.some(fill => fill.type === 'IMAGE')) {
        patterns.content.set(node.name, {
          type: 'image',
          constraints: node.constraints
        });
      }

      // Process children
      if (node.children) {
        node.children.forEach(child => processContentPatterns(child));
      }
    };

    // Process all patterns
    if (figmaData.nodes) {
      Object.values(figmaData.nodes).forEach(node => {
        processLayoutPatterns(node.document);
        processContentPatterns(node.document);
      });
    }

    return patterns;
  }

  isRelated(figmaName, templateElement) {
    const clean = (str) => str.toLowerCase().replace(/[^a-z0-9]/g, '');
    const cleanFigma = clean(figmaName);
    const cleanTemplate = clean(templateElement);
    return cleanFigma.includes(cleanTemplate) || cleanTemplate.includes(cleanFigma);
  }

  printEnhancedResults(analysis) {
    console.log('\n=== Enhanced Analysis Results ===');

    // Component Relationships
    console.log('\n1. Component Relationships:');
    console.log('Desktop Components:', Object.keys(analysis.components.desktop).length);
    console.log('Mobile Components:', Object.keys(analysis.components.mobile).length);
    console.log('Variation Sets:', Object.keys(analysis.components.variations).length);

    // Snippet Mappings
    console.log('\n2. Iterable Mappings:');
    console.log('Component to Snippet Mappings:', analysis.snippets.components.size);
    console.log('Conditional Logic Mappings:', analysis.snippets.conditionals.size);
    console.log('Variables Found:', analysis.snippets.variables.size);

    // Pattern Map
    console.log('\n3. Pattern Analysis:');
    console.log('Layout Patterns:', analysis.patterns.layout.size);
    console.log('Content Patterns:', analysis.patterns.content.size);
    console.log('Conditional Patterns:', analysis.patterns.conditional.size);
  }
}

module.exports = EnhancedAnalyzer; 