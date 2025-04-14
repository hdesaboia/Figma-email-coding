const FigmaAPI = require('../figma/api.js');
const IterableAPI = require('../iterable/api.js');

class SnippetAnalyzer {
  constructor() {
    this.figma = new FigmaAPI();
    this.iterable = new IterableAPI();
  }

  async analyzeSnippets() {
    try {
      console.log('\n=== Enhanced Snippet Analysis ===');

      // Get both templates
      const figmaData = await this.figma.getFile(
        '5dizNnH3l97v7YJN2dgaFl',  // Figma file ID
        '12951-6616'                // EM1 node ID
      );

      const iterableTemplate = await this.iterable.getTemplate('15852461');

      // Analyze snippets and their usage
      const snippetAnalysis = this.findSnippets(iterableTemplate.html);
      console.log('\n1. Snippet Categories Found:');
      Object.entries(snippetAnalysis.categories).forEach(([category, snippets]) => {
        console.log(`\n${category}:`, snippets.length);
        snippets.forEach(s => console.log(`  - ${s}`));
      });

      // Map Figma components to snippets
      const mappings = this.mapComponentsToSnippets(figmaData, snippetAnalysis.allSnippets);
      console.log('\n2. Component to Snippet Mappings:');
      mappings.forEach(mapping => {
        console.log(`\nFigma: ${mapping.component}`);
        console.log(`Snippet: ${mapping.snippet}`);
        if (mapping.reason) console.log(`Match: ${mapping.reason}`);
      });

      return { snippetAnalysis, mappings };

    } catch (error) {
      console.error('Analysis Error:', error);
      throw error;
    }
  }

  findSnippets(html) {
    const snippetAnalysis = {
      categories: {
        layout: [],
        content: [],
        styling: [],
        dynamic: [],
        footer: [],
        header: []
      },
      allSnippets: new Set()
    };

    // Updated regex to match {{{ snippet "NAME" }}} format
    const snippetRegex = /{{{ snippet "([^"]+)" }}}/g;
    let match;

    while ((match = snippetRegex.exec(html)) !== null) {
      const snippet = match[1];
      snippetAnalysis.allSnippets.add(snippet);

      // Categorize snippets
      if (snippet.includes('Padding') || snippet.includes('Section')) {
        snippetAnalysis.categories.layout.push(snippet);
      } else if (snippet.includes('CSS')) {
        snippetAnalysis.categories.styling.push(snippet);
      } else if (snippet.includes('footer')) {
        snippetAnalysis.categories.footer.push(snippet);
      } else if (snippet.includes('Logo') || snippet.includes('Header')) {
        snippetAnalysis.categories.header.push(snippet);
      } else if (snippet.includes('Dynamic')) {
        snippetAnalysis.categories.dynamic.push(snippet);
      } else {
        snippetAnalysis.categories.content.push(snippet);
      }
    }

    // Also look for conditional logic with {{#if }} format
    const conditionalRegex = /{{#if ([^}]+)}}/g;
    while ((match = conditionalRegex.exec(html)) !== null) {
      snippetAnalysis.categories.dynamic.push(`Conditional: ${match[1]}`);
    }

    return snippetAnalysis;
  }

  mapComponentsToSnippets(figmaData, snippets) {
    const mappings = [];

    const processNode = (node) => {
      if (!node) return;

      if (node.type === 'COMPONENT' || node.type === 'INSTANCE' || node.type === 'FRAME') {
        // Look for direct matches
        const matchingSnippets = this.findMatchingSnippets(node.name, snippets);
        
        if (matchingSnippets.length > 0) {
          matchingSnippets.forEach(snippet => {
            mappings.push({
              component: node.name,
              snippet: snippet,
              reason: 'Direct name match'
            });
          });
        }

        // Look for semantic matches
        const semanticMatches = this.findSemanticMatches(node, snippets);
        semanticMatches.forEach(match => {
          mappings.push({
            component: node.name,
            snippet: match.snippet,
            reason: match.reason
          });
        });
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

    return mappings;
  }

  findMatchingSnippets(componentName, snippets) {
    const matches = [];
    const cleanName = componentName.toLowerCase().replace(/[^a-z0-9]/g, '');

    snippets.forEach(snippet => {
      const cleanSnippet = snippet.toLowerCase().replace(/[^a-z0-9]/g, '');
      if (cleanSnippet.includes(cleanName) || cleanName.includes(cleanSnippet)) {
        matches.push(snippet);
      }
    });

    return matches;
  }

  findSemanticMatches(node, snippets) {
    const matches = [];

    // Match by component type and context
    if (node.name.includes('Logo')) {
      snippets.forEach(snippet => {
        if (snippet.includes('Logo')) {
          matches.push({
            snippet,
            reason: 'Logo component match'
          });
        }
      });
    }

    if (node.name.includes('Header')) {
      snippets.forEach(snippet => {
        if (snippet.includes('Header')) {
          matches.push({
            snippet,
            reason: 'Header component match'
          });
        }
      });
    }

    // Match by layout type
    if (node.layoutMode) {
      snippets.forEach(snippet => {
        if (snippet.includes('Section') && snippet.includes(node.layoutMode)) {
          matches.push({
            snippet,
            reason: `Layout mode match: ${node.layoutMode}`
          });
        }
      });
    }

    return matches;
  }
}

module.exports = SnippetAnalyzer; 