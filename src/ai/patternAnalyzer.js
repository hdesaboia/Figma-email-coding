const FigmaAPI = require('../figma/api.js');
const IterableAPI = require('../iterable/api.js');

class PatternAnalyzer {
  constructor() {
    this.figma = new FigmaAPI();
    this.iterable = new IterableAPI();
  }

  async analyzeEmail(emailData) {
    try {
      console.log(`\n=== Analyzing ${emailData['Email Name']} ===`);

      // 1. Get Figma Design
      console.log('\nFetching Figma components...');
      const figmaDesign = await this.figma.getFile(
        emailData['Figma File ID'],
        emailData['Figma Node ID']
      );

      // 2. Get Iterable Template
      console.log('\nFetching Iterable template...');
      const iterableTemplate = await this.iterable.getTemplate(
        emailData['Iterable Template ID']
      );

      // 3. Analyze Patterns
      console.log('\nAnalyzing patterns...');
      const patterns = await this.findPatterns(figmaDesign, iterableTemplate);

      return patterns;
    } catch (error) {
      console.error('Analysis Error:', error);
      throw error;
    }
  }

  async findPatterns(figmaDesign, iterableTemplate) {
    const patterns = {
      components: [],
      styles: [],
      variations: [],
      relationships: []
    };

    // Analyze Figma components
    if (figmaDesign.nodes) {
      Object.values(figmaDesign.nodes).forEach(node => {
        this.analyzeFigmaNode(node.document, patterns);
      });
    }

    // Analyze Iterable template
    if (iterableTemplate.html) {
      this.analyzeIterableTemplate(iterableTemplate.html, patterns);
    }

    return patterns;
  }

  analyzeFigmaNode(node, patterns, parentName = '') {
    if (!node) return;

    // Track component hierarchy
    if (node.type === 'COMPONENT' || node.type === 'INSTANCE') {
      patterns.components.push({
        name: node.name,
        type: node.type,
        parent: parentName,
        styles: node.styles || {},
        layout: node.layoutMode || null
      });
    }

    // Track styles
    if (node.styles) {
      patterns.styles.push({
        component: node.name,
        styles: node.styles
      });
    }

    // Track variations
    if (node.name.includes('variant') || node.name.includes('state')) {
      patterns.variations.push({
        name: node.name,
        type: node.type,
        parent: parentName
      });
    }

    // Recursively analyze children
    if (node.children) {
      node.children.forEach(child => {
        this.analyzeFigmaNode(child, patterns, node.name);
      });
    }
  }

  analyzeIterableTemplate(html, patterns) {
    // Find snippets
    const snippets = html.match(/{{snippets\.[^}]+}}/g) || [];
    snippets.forEach(snippet => {
      patterns.relationships.push({
        type: 'snippet',
        name: snippet.match(/{{snippets\.([^}]+)}}/)[1]
      });
    });

    // Find conditionals
    const conditionals = html.match(/{%[^%]+%}/g) || [];
    conditionals.forEach(conditional => {
      patterns.relationships.push({
        type: 'conditional',
        logic: conditional.trim()
      });
    });

    // Find sections
    const sections = html.match(/<!--\s*([^>]+)\s*-->/g) || [];
    sections.forEach(section => {
      patterns.relationships.push({
        type: 'section',
        name: section.replace(/<!--\s*|\s*-->/g, '').trim()
      });
    });
  }
}

module.exports = PatternAnalyzer; 