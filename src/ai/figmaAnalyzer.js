class FigmaAnalyzer {
  constructor(figmaAPI) {
    this.figmaAPI = figmaAPI;
  }

  async analyzeDesign(fileId, nodeId) {
    try {
      console.log('\nAnalyzing Figma design...');
      const data = await this.figmaAPI.getFile(fileId, nodeId);
      
      // Extract design patterns
      const patterns = this.extractPatterns(data);
      
      // Analyze component hierarchy
      const structure = this.analyzeStructure(data);
      
      // Identify variations
      const variations = this.findVariations(data);
      
      return {
        patterns,
        structure,
        variations
      };
    } catch (error) {
      console.error('Analysis Error:', error);
      throw error;
    }
  }

  extractPatterns(data) {
    // Analyze repeating elements, styles, and components
    const patterns = {
      colors: new Set(),
      components: new Set(),
      spacing: new Set(),
      typography: new Set()
    };

    const analyzeNode = (node) => {
      if (!node) return;

      // Extract styles
      if (node.fills) {
        node.fills.forEach(fill => {
          if (fill.type === 'SOLID') {
            patterns.colors.add(fill.color);
          }
        });
      }

      // Extract typography
      if (node.style) {
        patterns.typography.add({
          fontFamily: node.style.fontFamily,
          fontSize: node.style.fontSize,
          fontWeight: node.style.fontWeight
        });
      }

      // Extract components
      if (node.type === 'COMPONENT' || node.type === 'INSTANCE') {
        patterns.components.add({
          name: node.name,
          type: node.type
        });
      }

      // Analyze children
      if (node.children) {
        node.children.forEach(child => analyzeNode(child));
      }
    };

    // Start analysis from root
    if (data.nodes) {
      Object.values(data.nodes).forEach(node => {
        analyzeNode(node.document);
      });
    }

    return patterns;
  }

  analyzeStructure(data) {
    // Build component hierarchy and relationships
    const structure = {
      sections: [],
      layout: {},
      relationships: new Map()
    };

    const analyzeNode = (node, parent = null) => {
      if (!node) return;

      // Identify sections
      if (node.type === 'FRAME' && node.name.includes('Section')) {
        structure.sections.push({
          name: node.name,
          children: []
        });
      }

      // Analyze layout
      if (node.layoutMode) {
        structure.layout[node.name] = {
          mode: node.layoutMode,
          spacing: node.itemSpacing
        };
      }

      // Track parent-child relationships
      if (parent) {
        structure.relationships.set(node.id, parent.id);
      }

      // Analyze children
      if (node.children) {
        node.children.forEach(child => analyzeNode(child, node));
      }
    };

    // Start analysis from root
    if (data.nodes) {
      Object.values(data.nodes).forEach(node => {
        analyzeNode(node.document);
      });
    }

    return structure;
  }

  findVariations(data) {
    // Identify design variations and conditions
    const variations = {
      states: new Set(),
      conditions: new Set(),
      alternates: new Map()
    };

    const analyzeNode = (node) => {
      if (!node) return;

      // Look for variation markers in names
      if (node.name.includes('State=')) {
        variations.states.add(node.name.split('State=')[1]);
      }

      if (node.name.includes('If=')) {
        variations.conditions.add(node.name.split('If=')[1]);
      }

      // Track alternate versions
      if (node.name.includes('Version=')) {
        const baseName = node.name.split('Version=')[0];
        if (!variations.alternates.has(baseName)) {
          variations.alternates.set(baseName, []);
        }
        variations.alternates.get(baseName).push(node);
      }

      // Analyze children
      if (node.children) {
        node.children.forEach(child => analyzeNode(child));
      }
    };

    // Start analysis from root
    if (data.nodes) {
      Object.values(data.nodes).forEach(node => {
        analyzeNode(node.document);
      });
    }

    return variations;
  }
}

module.exports = FigmaAnalyzer; 