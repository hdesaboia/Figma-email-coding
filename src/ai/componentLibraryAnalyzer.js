const FigmaAPI = require('../figma/api.js');
const IterableAPI = require('../iterable/api.js');

class ComponentLibraryAnalyzer {
  constructor() {
    this.figma = new FigmaAPI();
    this.iterable = new IterableAPI();
    this.debug = true;

    // Define known library components
    this.libraryPatterns = {
      layout: {
        padding: [
          'Padding_16px_Section',
          'Padding_24px_Section',
          'Padding_32px_Section'
        ]
      },
      header: {
        preheader: ['preheader_space_fix'],
        logo: ['2024_Universal_Logo_Dynamic_YM and MG_WPH']
      },
      content: {
        disclaimers: [
          '2024_privacy_disclaimer',
          '2024_universal_Enso_disclaimer',
          '2024_universal_eligibility_disclaimer_dynamic'
        ]
      },
      footer: {
        banners: ['2024_Spanish_Footer_Banner'],
        main: ['2024_White_footer']
      },
      dynamic: {
        personalization: ['useFirstNamePersonalization', 'firstName'],
        conditionals: ['approvedWPHPromo'],
        enso: ['enso', 'hhProgramLaunchDate']
      }
    };
  }

  async analyzeComponents() {
    try {
      console.log('\n=== Analyzing Components Against Library ===');

      // Get library and EM1 data
      const libraryData = await this.iterable.getTemplate('14952092');
      const em1Data = await this.iterable.getTemplate('15852461');
      
      // Extract actual snippets from library
      const librarySnippets = this.extractLibrarySnippets(libraryData.html);
      
      if (this.debug) {
        console.log('\nFound Library Snippets:', librarySnippets.size);
      }

      // Get Figma components
      const figmaData = await this.figma.getFile(
        '5dizNnH3l97v7YJN2dgaFl',
        '12951-6616'
      );

      // Map components
      const mappings = this.mapComponents(figmaData, librarySnippets, em1Data.html);
      
      this.printAnalysis(mappings);
      
      return mappings;
    } catch (error) {
      console.error('Analysis Error:', error);
      throw error;
    }
  }

  extractLibrarySnippets(html) {
    const snippets = new Map();
    
    // Extract snippets with their context
    const snippetRegex = /{{{ snippet "([^"]+)" }}}/g;
    let match;
    while ((match = snippetRegex.exec(html)) !== null) {
      const name = match[1];
      snippets.set(name, {
        category: this.categorizeSnippet(name),
        subCategory: this.getSubCategory(name),
        context: this.extractContext(html, match.index)
      });
    }

    return snippets;
  }

  categorizeSnippet(name) {
    const n = name.toLowerCase();
    
    // Check against known patterns
    for (const [category, patterns] of Object.entries(this.libraryPatterns)) {
      for (const [subCategory, snippets] of Object.entries(patterns)) {
        if (snippets.some(s => n.includes(s.toLowerCase()))) {
          return category;
        }
      }
    }

    // Fallback categorization
    if (n.includes('padding')) return 'layout';
    if (n.includes('logo') || n.includes('header')) return 'header';
    if (n.includes('footer')) return 'footer';
    if (n.includes('disclaimer') || n.includes('copy')) return 'content';
    return 'other';
  }

  getSubCategory(name) {
    const n = name.toLowerCase();
    
    // Check for specific sub-categories
    if (n.includes('padding')) return 'padding';
    if (n.includes('logo')) return 'logo';
    if (n.includes('disclaimer')) return 'disclaimers';
    if (n.includes('footer')) return 'footer';
    if (n.includes('enso')) return 'enso';
    if (n.includes('wph')) return 'wph';
    return 'general';
  }

  extractContext(html, position) {
    // Get surrounding HTML comments
    const beforeContext = html.substring(Math.max(0, position - 200), position);
    const afterContext = html.substring(position, Math.min(html.length, position + 200));
    
    const contextInfo = {
      section: null,
      conditional: null,
      device: null
    };

    // Extract section from comments
    const sectionMatch = beforeContext.match(/<!--\s*([^>]+)\s*-->/);
    if (sectionMatch) {
      contextInfo.section = sectionMatch[1].trim();
    }

    // Extract conditional logic
    const conditionalMatch = beforeContext.match(/{{#if ([^}]+)}}/);
    if (conditionalMatch) {
      contextInfo.conditional = conditionalMatch[1].trim();
    }

    // Determine device context
    if (beforeContext.toLowerCase().includes('mobile')) {
      contextInfo.device = 'mobile';
    } else if (beforeContext.toLowerCase().includes('desktop')) {
      contextInfo.device = 'desktop';
    }

    return contextInfo;
  }

  mapComponents(figmaData, librarySnippets, em1Html) {
    const mappings = new Map();

    const processNode = (node) => {
      if (!node) return;

      if (node.type === 'COMPONENT' || node.type === 'INSTANCE' || node.type === 'FRAME') {
        const match = this.findMatchingSnippet(node, librarySnippets);
        if (match) {
          mappings.set(node.name, {
            snippet: match.snippet,
            category: match.category,
            subCategory: match.subCategory,
            context: match.context,
            properties: this.extractProperties(node)
          });
        }
      }

      if (node.children) {
        node.children.forEach(child => processNode(child));
      }
    };

    if (figmaData.nodes) {
      Object.values(figmaData.nodes).forEach(node => {
        processNode(node.document);
      });
    }

    return mappings;
  }

  findMatchingSnippet(node, librarySnippets) {
    const nodeName = node.name.toLowerCase();
    
    // Try to find exact matches first
    for (const [snippetName, info] of librarySnippets) {
      const cleanSnippet = snippetName.toLowerCase();
      
      if (this.isMatchingComponent(nodeName, cleanSnippet)) {
        return {
          snippet: snippetName,
          ...info
        };
      }
    }

    // Try to find pattern matches
    return this.findPatternMatch(node, librarySnippets);
  }

  isMatchingComponent(nodeName, snippetName) {
    // Check for direct matches
    if (nodeName.includes(snippetName) || snippetName.includes(nodeName)) {
      return true;
    }

    // Check for padding matches
    if (nodeName.includes('padding') && snippetName.includes('padding')) {
      const nodeValue = nodeName.match(/(\d+)/);
      const snippetValue = snippetName.match(/(\d+)/);
      return nodeValue && snippetValue && nodeValue[1] === snippetValue[1];
    }

    return false;
  }

  findPatternMatch(node, librarySnippets) {
    const nodeName = node.name.toLowerCase();
    
    // Check against known patterns
    for (const [category, patterns] of Object.entries(this.libraryPatterns)) {
      for (const [subCategory, snippets] of Object.entries(patterns)) {
        const match = snippets.find(s => 
          this.isMatchingPattern(nodeName, s.toLowerCase())
        );
        
        if (match) {
          return {
            snippet: match,
            category,
            subCategory,
            context: { device: nodeName.includes('mobile') ? 'mobile' : 'desktop' }
          };
        }
      }
    }

    return null;
  }

  isMatchingPattern(nodeName, pattern) {
    // Pattern-specific matching logic
    if (pattern.includes('padding')) {
      return nodeName.includes('padding') && 
             this.matchesPaddingValue(nodeName, pattern);
    }
    
    if (pattern.includes('logo')) {
      return nodeName.includes('logo') || nodeName.includes('header');
    }
    
    if (pattern.includes('footer')) {
      return nodeName.includes('footer');
    }
    
    return false;
  }

  matchesPaddingValue(nodeName, pattern) {
    const nodeMatch = nodeName.match(/(\d+)/);
    const patternMatch = pattern.match(/(\d+)/);
    return nodeMatch && patternMatch && nodeMatch[1] === patternMatch[1];
  }

  extractProperties(node) {
    return {
      layout: node.layoutMode || null,
      padding: {
        top: node.paddingTop || 0,
        bottom: node.paddingBottom || 0,
        left: node.paddingLeft || 0,
        right: node.paddingRight || 0
      },
      style: node.style || null
    };
  }

  printAnalysis(mappings) {
    console.log('\n=== Component Mapping Results ===');

    // Group by category
    const groupedMappings = new Map();
    mappings.forEach((value, key) => {
      if (!groupedMappings.has(value.category)) {
        groupedMappings.set(value.category, new Map());
      }
      groupedMappings.get(value.category).set(key, value);
    });

    // Print results by category
    groupedMappings.forEach((components, category) => {
      console.log(`\n${category.toUpperCase()} Components (${components.size}):`);
      components.forEach((value, component) => {
        console.log(`\n${component}:`);
        console.log(`  Snippet: ${value.snippet}`);
        console.log(`  Sub-Category: ${value.subCategory}`);
        if (value.context.device) {
          console.log(`  Device: ${value.context.device}`);
        }
        if (value.context.conditional) {
          console.log(`  Conditional: ${value.context.conditional}`);
        }
      });
    });

    // Print statistics
    console.log('\n=== Statistics ===');
    console.log('Total Mapped Components:', mappings.size);
    groupedMappings.forEach((components, category) => {
      console.log(`${category}: ${components.size}`);
    });
  }
}

module.exports = ComponentLibraryAnalyzer; 