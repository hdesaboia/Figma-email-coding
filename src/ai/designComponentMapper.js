const FigmaAPI = require('../figma/api');
const IterableAnalyzer = require('./iterableAnalyzer');
require('dotenv').config();

class DesignComponentMapper {
  constructor() {
    // Validate required environment variables
    if (!process.env.FIGMA_ACCESS_TOKEN) {
      throw new Error('FIGMA_ACCESS_TOKEN is required in .env file');
    }

    this.figma = new FigmaAPI();
    this.figmaFileId = '5dizNnH3l97v7YJN2dgaFl';

    this.templates = {
      'EM1': { figmaNode: '12951-6616', type: 'standard' },
      'EM2': { figmaNode: '12951-6075', type: 'standard' },
      'EM3': { figmaNode: '12951-5740', type: 'standard' },
      'EM4': { figmaNode: '12951-5658', type: 'standard' }
    };

    this.iterableAnalyzer = new IterableAnalyzer();

    // Define critical components that must be matched
    this.criticalComponents = ['button', 'headline', 'logo'];
    
    // Component type definitions with patterns and confidence scores
    this.componentTypes = {
      text: {
        patterns: [/<(p|span)[^>]*>(.*?)<\/\1>/g, /<div[^>]*>((?!<div)[^<])*<\/div>/g],
        confidence: 0.7
      },
      button: {
        patterns: [/<a[^>]*class="[^"]*(?:button|cta)[^"]*"[^>]*>.*?<\/a>/g],
        confidence: 0.8
      },
      headline: {
        patterns: [/<h[1-6][^>]*>.*?<\/h[1-6]>/g],
        confidence: 0.9
      },
      image: {
        patterns: [/<img[^>]*src="[^"]*"[^>]*>/g],
        confidence: 0.8
      },
      logo: {
        patterns: [/<img[^>]*(?:logo|brand)[^>]*>/g],
        confidence: 0.9
      }
    };

    this.viewportPatterns = {
      DESKTOP: /🖥️\s*Desktop/i,
      MOBILE: /📱\s*Mobile/i
    };
  }

  async analyzeEmailSet() {
    const analysis = {};
    
    for (const [emailId, variants] of Object.entries(this.templates)) {
      console.log(`\nAnalyzing ${emailId}...`);
      
      // Get Figma design data
      const figmaData = await this.getFigmaDesign(emailId);
      
      // Get HTML implementations for both variants
      const standardHtml = await this.iterableAnalyzer.analyzeTemplate(emailId, 'standard');
      const norHtml = await this.iterableAnalyzer.analyzeTemplate(emailId, 'nor');
      
      analysis[emailId] = {
        design: figmaData,
        implementations: {
          standard: standardHtml,
          nor: norHtml
        },
        patterns: this.mapDesignToImplementation(figmaData, standardHtml, norHtml)
      };
    }

    return analysis;
  }

  async getFigmaDesign(emailId) {
    try {
      console.log(`\nFetching Figma design for ${emailId}...`);
      
      const template = this.templates[emailId];
      if (!template) {
        throw new Error(`No template found for ${emailId}`);
      }
      
      const figmaData = await this.figma.getComponents(
        this.figmaFileId,
        template.figmaNode
      );

      // Initialize components array
      const components = [];
      
      // Process both desktop and mobile components
      if (figmaData.desktop) {
        figmaData.desktop.forEach(node => {
          this.findEmailComponents(node, emailId, components);
        });
      }
      
      if (figmaData.mobile) {
        figmaData.mobile.forEach(node => {
          this.findEmailComponents(node, emailId, components);
        });
      }

      console.log('Components collected:', {
        total: components.length,
        types: components.reduce((acc, comp) => {
          acc[comp.type] = (acc[comp.type] || 0) + 1;
          return acc;
        }, {})
      });

      return { components, layout: figmaData.sections };
    } catch (error) {
      console.error('Error fetching Figma design:', error);
      throw error;
    }
  }

  findEmailComponents(node, emailName, components) {
    if (!node || !node.type) return;

    // Extract components based on type and name
    if (node.type === 'TEXT') {
      components.push({
        type: 'text',
        content: node.text || '',
        name: node.name,
        style: node.properties?.styles || {},
        isCritical: false
      });
    } 
    else if (node.type === 'INSTANCE' && node.name?.toLowerCase().includes('button')) {
      components.push({
        type: 'button',
        content: node.text || node.name,
        style: {
          backgroundColor: node.properties?.fills?.[0]?.color,
          borderRadius: node.properties?.size?.borderRadius
        },
        isCritical: true  // Mark as critical
      });
    }
    else if (node.type === 'RECTANGLE') {
      if (node.name?.toLowerCase().includes('logo')) {
        components.push({
          type: 'logo',
          name: node.name,
          style: {
            width: node.properties?.size?.width,
            height: node.properties?.size?.height
          },
          isCritical: true  // Mark as critical
        });
      }
      else if (node.properties?.fills?.some(f => f.type === 'IMAGE')) {
        components.push({
          type: 'image',
          name: node.name,
          style: {
            width: node.properties?.size?.width,
            height: node.properties?.size?.height
          },
          isCritical: false
        });
      }
    }
    else if (node.type === 'FRAME' && node.name?.toLowerCase().includes('headline')) {
      components.push({
        type: 'headline',
        content: node.text || node.name,
        style: node.properties?.styles || {},
        isCritical: true  // Mark as critical
      });
    }
  }

  async getHtmlImplementation(emailId) {
    try {
      console.log(`Getting HTML implementation for ${emailId}`);
      
      // Get the template info
      const template = this.templates[emailId];
      if (!template) {
        throw new Error(`No template found for ${emailId}`);
      }

      // Get HTML from Iterable
      const analysis = await this.iterableAnalyzer.analyzeTemplate(emailId);
      
      return {
        structure: analysis.structure,
        snippets: analysis.snippets,
        conditionals: analysis.conditionals,
        responsive: analysis.responsive
      };

    } catch (error) {
      console.error(`Error getting HTML implementation: ${error.message}`);
      throw error;
    }
  }

  mapToHtml(components, htmlData) {
    console.log('Mapping components to HTML:', {
      components: components.length,
      htmlStructure: htmlData.structure ? 'present' : 'missing'
    });

    const mappings = [];
    let totalComponents = components.length;
    let matchedComponents = 0;

    components.forEach(component => {
      const match = this.findHtmlMatch(component, htmlData);
      if (match) {
        matchedComponents++;
        mappings.push({ component, html: match });
      }
    });

    const matchRate = (matchedComponents / totalComponents) * 100;
    console.log(`Match rate: ${matchRate.toFixed(2)}%`);

    return {
      mappings,
      stats: {
        total: totalComponents,
        matched: matchedComponents,
        rate: matchRate,
        confidence: {
          high: mappings.filter(m => m.html.confidence >= 0.8).length,
          medium: mappings.filter(m => m.html.confidence >= 0.5 && m.html.confidence < 0.8).length,
          low: mappings.filter(m => m.html.confidence < 0.5).length
        }
      }
    };
  }

  analyzeFigmaNode(node) {
    if (!node) {
      throw new Error('No node data provided to analyzeFigmaNode');
    }

    console.log('Analyzing node:', {
      type: node.type,
      name: node.name,
      hasChildren: !!node.children
    });

    return {
      components: this.extractComponents(node),
      layout: this.extractLayout(node),
      styles: this.extractStyles(node)
    };
  }

  mapDesignToImplementation(figmaData, standardHtml, norHtml) {
    return {
      components: this.mapComponents(figmaData.components, standardHtml, norHtml),
      layout: this.mapLayout(figmaData.layout, standardHtml, norHtml),
      styles: this.mapStyles(figmaData.styles, standardHtml, norHtml),
      variations: this.analyzeVariations(standardHtml, norHtml)
    };
  }

  mapComponents(components, htmlData) {
    console.log('Starting component mapping...');
    
    // Ensure components is an array
    const componentArray = Array.isArray(components) ? components : [];
    
    const results = {
      total: componentArray.length,
      matched: 0,
      matches: [],
      confidence: {
        high: 0,
        medium: 0,
        low: 0
      }
    };

    componentArray.forEach(component => {
      const match = this.findHtmlMatch(component, htmlData);
      if (match) {
        results.matched++;
        results.matches.push({
          type: component.type,    // Use Figma type
          isCritical: component.isCritical || match.isCritical || ['button', 'headline', 'logo'].includes(component.type.toLowerCase()),
          design: component,
          html: match.html
        });

        // Track confidence levels
        if (match.html.confidence >= 0.8) results.confidence.high++;
        else if (match.html.confidence >= 0.5) results.confidence.medium++;
        else results.confidence.low++;
      }
    });

    const matchRate = (results.matched / results.total) * 100;
    console.log(`Match rate: ${matchRate.toFixed(2)}%`);

    return results;
  }

  findHtmlMatch(component, htmlData) {
    // Simple type matching that worked before
    const type = component.type.toLowerCase();
    const text = (component.text || '').toLowerCase();
    
    // Get the HTML components array from the correct structure
    const htmlComponents = Array.isArray(htmlData) ? htmlData : 
                          htmlData.structure || [];
    
    return htmlComponents.find(html => {
      const htmlType = html.type.toLowerCase();
      const htmlText = (html.text || '').toLowerCase();
      
      return htmlType === type && htmlText === text;
    });
  }

  normalizeType(type) {
    // Normalize common type variations
    const typeMap = {
      'heading': 'headline',
      'header': 'headline',
      'h1': 'headline',
      'h2': 'headline',
      'h3': 'headline',
      'paragraph': 'text',
      'p': 'text',
      'cta': 'button',
      'link': 'button',
      'img': 'image'
    };
    return typeMap[type] || type;
  }

  calculateMatchQuality(component, match) {
    const metrics = {
      // Type match is a prerequisite (1.0)
      typeSimilarity: 1.0,
      
      // Text similarity (if applicable)
      textSimilarity: this.calculateTextSimilarity(
        component.text || '',
        match.text || ''
      ),
      
      // Style similarity (if available)
      styleSimilarity: this.compareStyles(
        component.styles || {},
        match.styles || {}
      ),
      
      // Critical component bonus
      criticalBonus: ['button', 'headline', 'logo'].includes(this.normalizeType(component.type)) ? 0.2 : 0
    };
    
    // Calculate weighted average
    const weights = {
      typeSimilarity: 0.4,
      textSimilarity: 0.4,
      styleSimilarity: 0.1,
      criticalBonus: 0.1
    };
    
    const confidence = Object.entries(metrics).reduce(
      (sum, [key, value]) => sum + (value * weights[key]),
      0
    );
    
    return {
      confidence,
      metrics
    };
  }

  compareStyles(style1 = {}, style2 = {}) {
    const styleKeys = ['color', 'fontSize', 'fontWeight', 'textAlign'];
    let matches = 0;
    let total = 0;
    
    for (const key of styleKeys) {
        if (style1[key] || style2[key]) {
            total++;
            if (style1[key] === style2[key]) {
                matches++;
            }
        }
    }
    
    return total > 0 ? matches / total : 0;
  }

  calculateTextSimilarity(text1, text2) {
    const normalize = text => text.toLowerCase().replace(/[^\w\s]/g, '').trim();
    const words1 = normalize(text1).split(/\s+/);
    const words2 = normalize(text2).split(/\s+/);
    const commonWords = words1.filter(word => words2.includes(word));
    return commonWords.length / Math.max(words1.length, words2.length);
  }

  extractHtmlComponents(htmlData) {
    console.log('Extracting HTML components from data:', {
      hasStructure: !!htmlData?.structure,
      hasSnippets: !!htmlData?.snippets,
      hasConditionals: !!htmlData?.conditionals
    });

    const components = [];

    // Extract from structure
    if (htmlData?.structure) {
      this.extractFromNode(htmlData.structure, components);
    }

    // Extract from snippets
    if (htmlData?.snippets) {
      Object.values(htmlData.snippets).forEach(snippet => {
        this.extractFromNode(snippet, components);
      });
    }

    console.log(`Found ${components.length} HTML components`);
    return components;
  }

  extractFromNode(node, components) {
    if (!node) return;

    // Extract component based on node type
    if (node.type) {
      components.push({
        type: node.type,
        content: node.content || node.text,
        styles: node.styles || {},
        attributes: node.attributes || {}
      });
    }

    // Process children
    if (node.children) {
      node.children.forEach(child => this.extractFromNode(child, components));
    }

    // Process sections
    if (node.sections) {
      node.sections.forEach(section => this.extractFromNode(section, components));
    }

    // Process elements
    if (node.elements) {
      node.elements.forEach(element => this.extractFromNode(element, components));
    }
  }

  parseHtmlContent(content) {
    const components = [];

    // Parse text content
    const textMatches = content.match(/<(h[1-6]|p)[^>]*>(.*?)<\/\1>/g) || [];
    textMatches.forEach(match => {
      components.push({
        type: 'text',
        content: match.replace(/<[^>]+>/g, '').trim(),
        html: match
      });
    });

    // Parse buttons/CTAs
    const buttonMatches = content.match(/<a[^>]*class="[^"]*button[^"]*"[^>]*>(.*?)<\/a>/g) || [];
    buttonMatches.forEach(match => {
      components.push({
        type: 'button',
        content: match.replace(/<[^>]+>/g, '').trim(),
        html: match
      });
    });

    // Parse images
    const imageMatches = content.match(/<img[^>]*src="([^"]*)"[^>]*>/g) || [];
    imageMatches.forEach(match => {
      components.push({
        type: 'image',
        src: match.match(/src="([^"]*)"/)?.[1],
        html: match
      });
    });

    return components;
  }

  calculateMatchConfidence(matches) {
    if (!matches || matches.length === 0) {
      return { low: 0, medium: 0, high: 0 };
    }

    return {
      low: matches.filter(m => m.confidence < 0.5).length,
      medium: matches.filter(m => m.confidence >= 0.5 && m.confidence < 0.8).length,
      high: matches.filter(m => m.confidence >= 0.8).length
    };
  }

  isMatchingComponent(design, html) {
    const designData = this.extractComponentData(design);
    const htmlData = this.extractHtmlData(html);

    console.log('Comparing cleaned components:', {
      design: designData,
      html: htmlData
    });

    // Compare based on content first
    if (designData.text && htmlData.content) {
      const similarity = this.calculateTextSimilarity(
        designData.text,
        htmlData.content
      );
      if (similarity > 0.7) {
        return true;
      }
    }

    // Then compare based on type and styles
    return this.compareTypeAndStyles(designData, htmlData);
  }

  extractComponentData(node) {
    // Extract actual text content
    const text = node.characters || node.content || node.name;
    
    // Extract actual styles
    const styles = {
      fontSize: node.style?.fontSize,
      fontWeight: node.style?.fontWeight,
      color: node.fills?.[0]?.color,
      ...node.style
    };

    return {
      type: node.type,
      name: node.name,
      text: text,
      styles: styles,
      children: node.children
    };
  }

  extractHtmlData(node) {
    return {
      type: this.determineHtmlType(node),
      content: node.content || node.text || node.innerHTML,
      styles: node.styles || {},
      attributes: node.attributes || {}
    };
  }

  determineHtmlType(node) {
    // Map HTML types more accurately
    if (node.type === 'section' && node.content) {
      return 'text';
    }
    if (node.type === 'variable') {
      return 'text';
    }
    return node.type;
  }

  compareTypeAndStyles(designData, htmlData) {
    // Compare based on type
    if (designData.type !== htmlData.type) {
      return false;
    }

    // Compare based on styles
    let styleMatch = 0;
    for (const [key, designValue] of Object.entries(designData.styles)) {
      if (designValue && htmlData.styles[key]) {
        styleMatch++;
      }
    }

    return styleMatch > 0;
  }

  compareTextComponent(design, html) {
    // Match text components with text, headlines, or paragraphs
    if (!['text', 'headline', 'paragraph'].includes(html.type)) {
      return false;
    }

    const designText = design.characters?.toLowerCase().trim() || '';
    const htmlText = html.content?.toLowerCase().trim() || '';

    // Handle template variables
    const templatePattern = htmlText
      .replace(/{{[^}]+}}/g, '.*')
      .replace(/[^\w\s]/g, '.*');

    const designPattern = designText
      .replace(/[^\w\s]/g, '.*');

    const templateRegex = new RegExp(templatePattern, 'i');
    const designRegex = new RegExp(designPattern, 'i');

    return templateRegex.test(designText) || designRegex.test(htmlText);
  }

  isButtonComponent(design) {
    return (
      (design.type === 'RECTANGLE' || design.type === 'INSTANCE') &&
      (design.name?.toLowerCase().includes('button') ||
       design.name?.toLowerCase().includes('cta') ||
       (design.fills?.some(f => f.type === 'SOLID') && design.cornerRadius > 0))
    );
  }

  compareButtonComponent(design, html) {
    if (html.type !== 'button' && !html.content?.toLowerCase().includes('button')) {
      return false;
    }

    // Compare button properties
    const designProps = {
      backgroundColor: this.getBackgroundColor(design),
      borderRadius: design.cornerRadius,
      text: design.characters || ''
    };

    const htmlProps = {
      backgroundColor: html.styles?.backgroundColor,
      borderRadius: html.styles?.borderRadius,
      text: html.content || ''
    };

    return this.compareProperties(designProps, htmlProps);
  }

  isImageComponent(design) {
    return (
      design.type === 'IMAGE' ||
      (design.type === 'RECTANGLE' && design.fills?.some(f => f.type === 'IMAGE')) ||
      design.name?.toLowerCase().includes('logo') ||
      design.name?.toLowerCase().includes('icon')
    );
  }

  compareImageComponent(design, html) {
    if (html.type !== 'image' && !html.type?.toLowerCase().includes('img')) {
      return false;
    }

    // Compare image properties
    const designProps = {
      width: design.width,
      height: design.height,
      src: design.fills?.[0]?.imageRef
    };

    const htmlProps = {
      width: html.styles?.width,
      height: html.styles?.height,
      src: html.attributes?.src
    };

    return this.compareProperties(designProps, htmlProps);
  }

  compareFrameComponent(design, html) {
    if (html.type !== 'section' && html.type !== 'div') {
      return false;
    }

    // Compare frame/section properties
    const designProps = {
      width: design.width,
      height: design.height,
      childCount: design.children?.length || 0
    };

    const htmlProps = {
      width: html.styles?.width,
      height: html.styles?.height,
      childCount: html.children?.length || 0
    };

    return this.compareProperties(designProps, htmlProps);
  }

  compareProperties(designProps, htmlProps) {
    let matchCount = 0;
    let totalProps = 0;

    for (const [key, designValue] of Object.entries(designProps)) {
      if (designValue && htmlProps[key]) {
        matchCount++;
      }
      totalProps++;
    }

    return matchCount / totalProps >= 0.5; // At least 50% of properties should match
  }

  getBackgroundColor(design) {
    const fill = design.fills?.find(f => f.type === 'SOLID');
    if (fill?.color) {
      const { r, g, b } = fill.color;
      return `rgb(${Math.round(r * 255)}, ${Math.round(g * 255)}, ${Math.round(b * 255)})`;
    }
    return null;
  }

  async testComponentMatching(emailId) {
    try {
      console.log(`\n🧪 Testing component matching for ${emailId}...`);
      
      // Get Figma design
      console.log('\nFetching Figma design...');
      const figmaData = await this.getFigmaDesign(emailId);
      
      // Get HTML implementation
      console.log('\nFetching HTML implementation...');
      const htmlData = await this.getHtmlImplementation(emailId);
      
      // Map components
      return this.mapComponents(figmaData.components, htmlData);
    } catch (error) {
      console.error('❌ Component matching test failed:', error);
      throw error;
    }
  }

  compareComponents(design, html) {
    if (!html) {
      return {
        match: false,
        confidence: 0,
        details: { reason: 'No HTML component found' }
      };
    }

    switch (design.type) {
      case 'TEXT':
        return this.compareText(design, html);
      case 'RECTANGLE':
        return this.compareButton(design, html);
      case 'IMAGE':
        return this.compareImage(design, html);
      default:
        return {
          match: false,
          confidence: 0,
          details: { reason: `Unsupported component type: ${design.type}` }
        };
    }
  }

  getComponentContent(component) {
    switch (component.type) {
      case 'TEXT':
        return component.characters || '';
      case 'IMAGE':
        return component.name || '';
      case 'RECTANGLE':
        return component.name || '';
      default:
        return '';
    }
  }

  printTestResults(results) {
    console.log('\n📈 Test Summary:');
    console.log(`Total Components: ${results.total}`);
    console.log(`Matched Components: ${results.matched}`);
    console.log(`Match Rate: ${(results.matched / results.total * 100).toFixed(2)}%`);
    console.log('\nConfidence Levels:');
    console.log(`High: ${results.confidence.high} (${((results.confidence.high / results.matched) * 100).toFixed(1)}%)`);
    console.log(`Medium: ${results.confidence.medium} (${((results.confidence.medium / results.matched) * 100).toFixed(1)}%)`);
    console.log(`Low: ${results.confidence.low} (${((results.confidence.low / results.matched) * 100).toFixed(1)}%)`);
  }

  // Add this method to get Figma components
  async getFigmaComponents(emailId) {
    try {
      console.log(`Getting Figma components for ${emailId}...`);
      
      const template = this.templates[emailId];
      if (!template) {
        throw new Error(`No template found for ${emailId}`);
      }

      const figmaData = await this.figma.getComponents(
        this.figmaFileId,
        template.figmaNode
      );

      const components = [];
      
      // Process both desktop and mobile components
      if (figmaData.desktop) {
        figmaData.desktop.forEach(node => {
          this.findEmailComponents(node, emailId, components);
        });
      }
      
      if (figmaData.mobile) {
        figmaData.mobile.forEach(node => {
          this.findEmailComponents(node, emailId, components);
        });
      }

      return components;
    } catch (error) {
      console.error(`Error getting Figma components: ${error.message}`);
      throw error;
    }
  }

  // Add this method to get Iterable template
  async getIterableTemplate(emailId) {
    try {
      console.log(`Getting Iterable template for ${emailId}...`);
      
      const template = this.templates[emailId];
      if (!template) {
        throw new Error(`No template found for ${emailId}`);
      }

      // Use the standard template ID by default
      const templateId = template.standard;
      return await this.iterableAnalyzer.getTemplate(templateId);
    } catch (error) {
      console.error(`Error getting Iterable template: ${error.message}`);
      throw error;
    }
  }
}

module.exports = DesignComponentMapper;