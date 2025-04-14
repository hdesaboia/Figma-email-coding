const FigmaAPI = require('../figma/api.js');
const IterableAPI = require('../iterable/api.js');

class FigmaMapper {
  constructor() {
    this.figma = new FigmaAPI();
    this.iterable = new IterableAPI();
    this.mappingSummary = {
      header: new Set(),
      content: new Set(),
      headlines: new Set(),
      bodyCopy: new Set(),
      buttons: new Set(),
      footer: new Set(),
      layout: new Set(),
      padding: new Set(),
      unmatched: new Set()
    };
    
    // Add debug logging
    this.debug = true;
  }

  async analyzeComponents() {
    try {
      console.log('\n=== Starting Component Analysis ===');

      const figmaData = await this.figma.getFile(
        '5dizNnH3l97v7YJN2dgaFl',
        '12951-6616'
      );

      const iterableData = await this.iterable.getTemplate('15852461');
      
      // Log all available snippets first
      console.log('\n=== Available Snippets ===');
      const snippets = this.extractSnippets(iterableData.html);
      snippets.forEach((info, name) => {
        console.log(`${info.type}: ${name}`);
      });

      // Process components
      this.processComponents(figmaData, snippets);
      
      return this.mappingSummary;
    } catch (error) {
      console.error('Analysis Error:', error);
      throw error;
    }
  }

  extractSnippets(html) {
    const snippets = new Map();
    
    // Match all snippet patterns
    const patterns = [
      /{{{ snippet "([^"]+)" }}}/g,    // Standard snippets
      /{{#if ([^}]+)}}/g,              // Conditional starts
      /{{else}}/g,                      // Conditional else
      /{{\/if}}/g,                      // Conditional ends
      /{{([^}]+)}}/g                    // Variable substitutions
    ];

    patterns.forEach(pattern => {
      let match;
      while ((match = pattern.exec(html)) !== null) {
        if (match[1]) {
          const name = match[1];
          const type = this.categorizeSnippet(name);
          snippets.set(name, { type, used: false });
          
          if (this.debug) {
            console.log(`Found snippet: ${name} (${type})`);
          }
        }
      }
    });

    return snippets;
  }

  processComponents(figmaData, snippets) {
    const processNode = (node) => {
      if (!node) return;

      if (node.type === 'COMPONENT' || node.type === 'INSTANCE' || node.type === 'FRAME') {
        const matches = this.findMatches(node, snippets);
        
        if (matches.length > 0) {
          matches.forEach(match => {
            this.mappingSummary[match.category].add(
              `${node.name} → ${match.snippet}`
            );
            snippets.get(match.snippet).used = true;
          });
        } else {
          this.mappingSummary.unmatched.add(node.name);
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
  }

  findMatches(node, snippets) {
    const matches = [];
    const nodeName = node.name.toLowerCase();

    // Check for content-specific components
    if (node.type === 'TEXT') {
      const contentMatches = this.findContentMatches(node, snippets);
      matches.push(...contentMatches);
    }

    // Check for layout properties
    if (node.layoutMode) {
      const layoutMatches = this.findLayoutMatches(node, snippets);
      matches.push(...layoutMatches);
    }

    // Check component name matches
    for (const [snippetName, snippetInfo] of snippets) {
      if (this.isRelevantMatch(nodeName, snippetName)) {
        matches.push({
          snippet: snippetName,
          category: snippetInfo.type
        });
      }
    }

    return matches;
  }

  findContentMatches(node, snippets) {
    if (this.debug) {
      console.log(`\nAnalyzing node: ${node.name}`);
    }

    const matches = [];
    const nodeName = node.name.toLowerCase();
    
    // Check for content types with detailed logging
    if (this.isHeadline(nodeName)) {
      if (this.debug) {
        console.log(`Found headline: ${node.name}`);
      }
      
      const headlineSnippet = this.findMatchingSnippet(snippets, 'headline', 
        nodeName.includes('mobile') ? 'mobile' : 'desktop');
      
      if (headlineSnippet) {
        matches.push({
          snippet: headlineSnippet,
          category: 'headlines',
          reason: `Headline match: ${node.name}`
        });
      }
    }

    if (this.isBodyCopy(nodeName)) {
      if (this.debug) {
        console.log(`Found body copy: ${node.name}`);
      }
      
      const bodySnippet = this.findMatchingSnippet(snippets, 'body',
        nodeName.includes('mobile') ? 'mobile' : 'desktop');
      
      if (bodySnippet) {
        matches.push({
          snippet: bodySnippet,
          category: 'bodyCopy',
          reason: `Body copy match: ${node.name}`
        });
      }
    }

    if (this.isButton(nodeName)) {
      if (this.debug) {
        console.log(`Found button: ${node.name}`);
      }
      
      const buttonSnippet = this.findMatchingSnippet(snippets, 'button',
        nodeName.includes('mobile') ? 'mobile' : 'desktop');
      
      if (buttonSnippet) {
        matches.push({
          snippet: buttonSnippet,
          category: 'buttons',
          reason: `Button match: ${node.name}`
        });
      }
    }

    if (this.debug && matches.length === 0) {
      console.log(`No matches found for: ${node.name}`);
    }

    return matches;
  }

  findMatchingSnippet(snippets, type, device) {
    if (this.debug) {
      console.log(`Looking for ${type} snippet for ${device}`);
    }

    for (const [snippetName, info] of snippets) {
      const name = snippetName.toLowerCase();
      
      // More flexible matching
      const isMatchingType = (
        (type === 'headline' && (name.includes('headline') || name.includes('title'))) ||
        (type === 'body' && (name.includes('body') || name.includes('copy') || name.includes('text'))) ||
        (type === 'button' && (name.includes('button') || name.includes('cta')))
      );
      
      const isMatchingDevice = (
        name.includes(device) || 
        (device === 'desktop' && name.includes('dt')) ||
        (device === 'mobile' && name.includes('mob'))
      );

      if (isMatchingType && isMatchingDevice) {
        if (this.debug) {
          console.log(`Found matching snippet: ${snippetName}`);
        }
        return snippetName;
      }
    }

    if (this.debug) {
      console.log(`No matching snippet found for ${type} (${device})`);
    }
    return null;
  }

  findLayoutMatches(node, snippets) {
    const matches = [];
    
    // Check for padding sections based on node properties
    for (const [snippetName, snippetInfo] of snippets) {
      if (snippetName.includes('Padding')) {
        // Match padding based on actual spacing values
        const paddingValue = this.getPaddingValue(node);
        if (paddingValue && snippetName.includes(paddingValue)) {
          matches.push({
            snippet: snippetName,
            category: 'padding'
          });
        }
      }
    }

    // Check for section types based on layout mode
    if (node.layoutMode) {
      for (const [snippetName, snippetInfo] of snippets) {
        if (snippetName.includes('Section') && 
            snippetName.includes(node.layoutMode.toLowerCase())) {
          matches.push({
            snippet: snippetName,
            category: 'layout'
          });
        }
      }
    }

    return matches;
  }

  getPaddingValue(node) {
    // Extract padding value from node properties
    if (node.paddingTop || node.paddingBottom || node.paddingLeft || node.paddingRight) {
      const padding = Math.max(
        node.paddingTop || 0,
        node.paddingBottom || 0,
        node.paddingLeft || 0,
        node.paddingRight || 0
      );
      return `${padding}px`;
    }
    return null;
  }

  isRelevantMatch(componentName, snippetName) {
    const cleanComp = componentName.replace(/[^a-z0-9]/g, '');
    const cleanSnippet = snippetName.toLowerCase().replace(/[^a-z0-9]/g, '');

    // Enhanced matching patterns
    return (
      // Previous matches
      (cleanComp.includes('header') && cleanSnippet.includes('header')) ||
      (cleanComp.includes('footer') && cleanSnippet.includes('footer')) ||
      (cleanComp.includes('logo') && cleanSnippet.includes('logo')) ||
      // Layout matches
      (cleanComp.includes('section') && cleanSnippet.includes('section')) ||
      (cleanComp.includes('padding') && cleanSnippet.includes('padding'))
    );
  }

  categorizeSnippet(name) {
    const n = name.toLowerCase();
    if (n.includes('headline') || n.includes('title')) return 'headlines';
    if (n.includes('body') || n.includes('copy')) return 'bodyCopy';
    if (n.includes('button') || n.includes('cta')) return 'buttons';
    if (n.includes('header') || n.includes('logo')) return 'header';
    if (n.includes('footer')) return 'footer';
    if (n.includes('padding') || n.includes('section')) return 'layout';
    return 'content';
  }

  isHeadline(nodeName) {
    const name = nodeName.toLowerCase();
    return (
      name.includes('headline') ||
      name.includes('title') ||
      name.includes('h1') ||
      name.includes('h2') ||
      // Match Figma's specific naming patterns
      name.includes('📱 mobile/headlines') ||
      name.includes('🖥️ desktop/headlines')
    );
  }

  isBodyCopy(nodeName) {
    const name = nodeName.toLowerCase();
    return (
      name.includes('body copy') ||
      name.includes('paragraph') ||
      name.includes('text block') ||
      // Match Figma's specific naming patterns
      name.includes('📱 mobile/body copy') ||
      name.includes('🖥️ desktop/body copy')
    );
  }

  isButton(nodeName) {
    const name = nodeName.toLowerCase();
    return (
      name.includes('button') ||
      name.includes('cta') ||
      // Match Figma's specific naming patterns
      name.includes('📱 mobile/buttons') ||
      name.includes('🖥️ desktop/buttons')
    );
  }

  printSummary() {
    console.log('\n=== Component Mapping Summary ===');
    
    // Print matched components by category with details
    Object.entries(this.mappingSummary).forEach(([category, matches]) => {
      if (matches.size > 0) {
        console.log(`\n${category.toUpperCase()} Components (${matches.size}):`);
        matches.forEach(match => {
          const [component, snippet] = match.split(' → ');
          console.log(`  ${component}`);
          if (snippet) {
            console.log(`    → ${snippet}`);
          }
        });
      }
    });

    // Print detailed statistics
    console.log('\n=== Detailed Statistics ===');
    console.log('Headers:', this.mappingSummary.header.size);
    console.log('Headlines:', this.mappingSummary.headlines.size);
    console.log('  - Desktop:', Array.from(this.mappingSummary.headlines).filter(h => h.includes('Desktop')).length);
    console.log('  - Mobile:', Array.from(this.mappingSummary.headlines).filter(h => h.includes('Mobile')).length);
    console.log('Body Copy:', this.mappingSummary.bodyCopy.size);
    console.log('  - Desktop:', Array.from(this.mappingSummary.bodyCopy).filter(b => b.includes('Desktop')).length);
    console.log('  - Mobile:', Array.from(this.mappingSummary.bodyCopy).filter(b => b.includes('Mobile')).length);
    console.log('Buttons:', this.mappingSummary.buttons.size);
    console.log('  - Desktop:', Array.from(this.mappingSummary.buttons).filter(b => b.includes('Desktop')).length);
    console.log('  - Mobile:', Array.from(this.mappingSummary.buttons).filter(b => b.includes('Mobile')).length);
    console.log('Layout:', this.mappingSummary.layout.size);
    console.log('Padding:', this.mappingSummary.padding.size);
    console.log('Footer:', this.mappingSummary.footer.size);
    console.log('Unmatched:', this.mappingSummary.unmatched.size);

    // Print remaining tasks
    console.log('\n=== Progress ===');
    console.log('1. ✓ Layout Components: Complete');
    console.log('2. ⏳ Content Components: In Progress');
    console.log('   ✓ Headlines detection');
    console.log('   ✓ Body copy detection');
    console.log('   ✓ Button detection');
    console.log('   - Social icons (Next)');
    console.log('3. ⏳ Special Components: Pending');
    console.log('   - Enso module');
    console.log('   - Mobile/Desktop variants');
    console.log('   - Conditional blocks');

    // Add debug summary
    if (this.debug) {
      console.log('\n=== Debug Information ===');
      console.log('Components analyzed:', this.totalComponentsAnalyzed);
      console.log('Snippets found:', this.totalSnippetsFound);
      console.log('Failed matches:', this.totalFailedMatches);
    }
  }
}

module.exports = FigmaMapper; 