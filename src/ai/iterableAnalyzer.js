const axios = require('axios');
const fs = require('fs');
const { parse } = require('csv-parse/sync');
require('dotenv').config();  // Add this to load .env file

class IterableAnalyzer {
  constructor() {
    if (!process.env.ITERABLE_API_KEY) {
      throw new Error('ITERABLE_API_KEY is required');
    }

    this.api = axios.create({
      baseURL: 'https://api.iterable.com/api',  // Remove the extra /templates
      headers: {
        'Api-Key': process.env.ITERABLE_API_KEY,
        'Content-Type': 'application/json',
        'Accept': 'application/json'
      }
    });

    // Load snippets from CSV - this is our source of truth for snippets
    try {
      const snippetsFile = fs.readFileSync('/Users/henrique.saboia/Figma-email-coding/Figma-email-converted training data - Sheet1.csv');
      const snippetsData = parse(snippetsFile, { columns: true });
      this.snippets = new Map(snippetsData.map(row => [row.name, row.html]));
      console.log(`📚 Loaded ${this.snippets.size} snippets from library`);
      
      // Log available snippets for debugging
      console.log('Available snippets:');
      for (const [name] of this.snippets) {
        console.log(`- ${name}`);
      }
    } catch (error) {
      console.error('❌ Error loading snippets library:', error.message);
      throw new Error('Snippets library is required for template analysis');
    }

    this.templates = {
      'EM1': {
        standard: '15852461',
        nor: '16034931'
      },
      'EM2': {
        standard: '15856031',
        nor: '16034933'
      },
      'EM3': {
        standard: '15856690',
        nor: '16034936'
      },
      'EM4': {
        standard: '15856991',
        nor: '16034938'
      }
    };
  }

  async analyzeTemplate(emailId, variant = 'standard') {
    try {
      console.log(`\n📨 Analyzing Iterable template for ${emailId} (${variant})`);
      
      // Extract base email ID (e.g., "EM1" from "2025H1_Baseline_Aetna_VA_EM1_V1")
      const baseEmailId = emailId.match(/EM[1-4]/)?.[0];
      if (!baseEmailId) {
        throw new Error(`Could not extract base email ID from ${emailId}`);
      }

      console.log(`Using base email ID: ${baseEmailId}`);
      
      const templateId = this.templates[baseEmailId][variant];
      if (!templateId) {
        throw new Error(`No template ID found for ${baseEmailId} (${variant})`);
      }

      const template = await this.getTemplate(templateId);
      return this.extractComponents(template);
    } catch (error) {
      console.error(`Error analyzing template ${emailId}:`, error);
      throw error;
    }
  }

  async getTemplate(templateId) {
    try {
      console.log(`\n📥 Analyzing template ${templateId}...`);
      
      const response = await this.api.get('/templates/email/get', {
        params: { 
          templateId,
          projectId: '38660876d168423bb9d8404e8644fef8'
        }
      });

      if (!response.data) {
        throw new Error('No data in template response');
      }

      const html = response.data.html || '';
      const snippetMatches = html.match(/{{{?\s*snippet\s*"([^"]+)"\s*}}}?/g) || [];
      const snippets = {};
      const missingSnippets = [];

      // More concise snippet processing
      for (const match of snippetMatches) {
        const snippetName = match.match(/"([^"]+)"/)[1];
        if (this.snippets.has(snippetName)) {
          snippets[snippetName] = this.snippets.get(snippetName);
        } else {
          missingSnippets.push(snippetName);
        }
      }

      // Consolidate snippet errors into one message
      if (missingSnippets.length > 0) {
        console.warn(`\n⚠️ Missing ${missingSnippets.length} snippets, including: ${missingSnippets[0]}, ${missingSnippets[1]}...`);
      }

      return {
        html: html,
        snippets: snippets,
        metadata: response.data.metadata || {}
      };

    } catch (error) {
      console.error('Error analyzing template:', error.message);
      throw error;
    }
  }

  extractComponents(template) {
    let html = template.html || '';
    
    const components = [];
    
    // Simple patterns that worked before
    const patterns = {
        button: /<a[^>]*class="[^"]*(?:button|cta)[^"]*"[^>]*>([^<]+)<\/a>/gi,
        text: /<(p|span|div)[^>]*>((?!<(?:p|span|div))[^<])*<\/\1>/gi,
        headline: /<h[1-6][^>]*>([^<]*)<\/h[1-6]>/gi,
        logo: /<img[^>]*(?:alt="[^"]*logo[^"]*"|src="[^"]*logo[^"]*")[^>]*>/gi
    };

    // Process each pattern
    for (const [type, regex] of Object.entries(patterns)) {
        let match;
        while ((match = regex.exec(html)) !== null) {
            const [fullMatch] = match;
            const text = fullMatch.replace(/<[^>]+>/g, '').trim();
            if (text) {
                components.push({
                    type,
                    text,
                    html: fullMatch,
                    isCritical: ['button', 'headline', 'logo'].includes(type),
                    confidence: 1.0
                });
            }
        }
    }

    return components;
  }

  extractStyles(html) {
    const styleMatch = html.match(/style="([^"]*)"/);
    if (!styleMatch) return {};
    
    const styles = {};
    const styleString = styleMatch[1];
    
    // Parse inline styles
    styleString.split(';').forEach(style => {
        const [key, value] = style.split(':').map(s => s.trim());
        if (key && value) {
            styles[this.camelCase(key)] = value;
        }
    });
    
    return styles;
  }

  extractAttributes(html) {
    const attributes = {};
    const attributePattern = /(\w+)=["']([^"']*)["']/g;
    let match;
    
    while ((match = attributePattern.exec(html)) !== null) {
        const [_, key, value] = match;
        if (key !== 'style') { // Skip style as it's handled separately
            attributes[key] = value;
        }
    }
    
    return attributes;
  }

  camelCase(str) {
    return str.replace(/-([a-z])/g, g => g[1].toUpperCase());
  }

  parseHtml(html) {
    const components = new Map();
    
    // Button pattern that worked before
    const buttonMatches = [...html.matchAll(/<a[^>]*(?:class="[^"]*(?:button|cta)[^"]*"|title="CTA"|style="[^"]*color:\s*#ffffff[^"]*")[^>]*>([^<]+)<\/a>/gi)];
    for (const match of buttonMatches) {
      const text = match[1].trim();
      const key = `button-${text}`;
      if (text) {  // Only add non-empty buttons
        components.set(key, {
          type: 'button',
          text,
          html: match[0],
          isCritical: true,
          confidence: 1.0
        });
      }
    }

    // Simple summary only
    console.log(`Found ${components.size} critical components`);

    return components;
  }

  extractConditionals(html) {
    const conditionals = [];
    const regex = /{{#if\s+([\w.]+)}}([\s\S]*?){{\/if}}/g;
    let match;
    
    while ((match = regex.exec(html)) !== null) {
      conditionals.push({
        condition: match[1],
        content: match[2]
      });
    }

    return conditionals;
  }

  analyzeStructure(html) {
    const structure = {
        header: [],
        content: [],
        footer: [],
        sections: this.findSections(html)
    };

    // Map components to sections
    this.findSections(html).forEach(section => {
        const sectionHtml = html.substring(
            section.start,
            section.end || html.length
        );
        
        const components = this.extractComponents({ html: sectionHtml });
        
        // Categorize section
        if (section.name.includes('header')) {
            structure.header.push({ ...section, components });
        } else if (section.name.includes('footer')) {
            structure.footer.push({ ...section, components });
        } else {
            structure.content.push({ ...section, components });
        }
    });

    return structure;
  }

  findSections(html) {
    // Updated regex to catch more section patterns
    const sections = [];
    const patterns = [
      /<!--\s*([A-Za-z_\s]+)\s*Section\s*-->/g,  // Standard section comments
      /<div[^>]*class="[^"]*section[^"]*"[^>]*>/g,  // Section divs
      /<table[^>]*class="[^"]*section[^"]*"[^>]*>/g  // Section tables (common in emails)
    ];

    patterns.forEach(regex => {
      let match;
      while ((match = regex.exec(html)) !== null) {
        sections.push({
          name: match[1] ? match[1].toLowerCase().trim() : 'unnamed',
          type: 'section',
          start: match.index
        });
      }
    });

    return sections;
  }

  findSnippets(html) {
    // Use Set to avoid duplicates
    const snippets = new Set();
    
    const patterns = {
      partial: /{{>\s*([\w-]+)}}/g,
      variable: /{{(?!>)\s*([\w.-]+)\s*}}/g,
      conditional: /{%\s*([\w\s]+)\s*([^%]+)%}/g,
      // Add component patterns to also capture reusable HTML blocks
      component: /<(div|table)[^>]*class="[^"]*(?:component|section)[^"]*"[^>]*>([\s\S]*?)<\/\1>/g
    };

    for (const [type, regex] of Object.entries(patterns)) {
      let match;
      while ((match = regex.exec(html)) !== null) {
        if (type === 'component') {
          const classMatch = match[0].match(/class="([^"]*)"/);
          const classes = classMatch ? classMatch[1].split(/\s+/) : [];
          const componentName = classes.find(c => c.includes('component') || c.includes('section')) || 'unnamed';
          
          snippets.add(JSON.stringify({
            name: componentName,
            type: 'component',
            html: match[0],
            usage: this.analyzeSnippetUsage(componentName)
          }));
        } else {
        const name = match[1].trim();
        // Skip control flow keywords
        if (!['if', 'else', 'endif', 'unless', 'endunless'].includes(name)) {
          snippets.add(JSON.stringify({
            name,
            type,
              content: match[0],
              usage: this.analyzeSnippetUsage(name)
          }));
          }
        }
      }
    }

    return Array.from(snippets).map(s => JSON.parse(s));
  }

  analyzeSnippetUsage(snippetName) {
    // Enhanced snippet analysis
    const commonSnippets = {
      'enso-banner': {
        purpose: 'conditional branding',
        placement: 'header',
        responsive: true
      },
      'wph-section': {
        purpose: 'conditional content',
        placement: 'main content',
        responsive: true
      },
      'header-logo': {
        purpose: 'branding',
        placement: 'header',
        responsive: true
      },
      'main-content': {
        purpose: 'core content',
        placement: 'body',
        responsive: true
      },
      'button-component': {
        purpose: 'interaction',
        placement: 'body',
        responsive: true
      },
      'headline-component': {
        purpose: 'typography',
        placement: 'body',
        responsive: true
      },
      'logo-component': {
        purpose: 'branding',
        placement: 'header',
        responsive: true
      }
    };

    // Try to infer purpose from name if not in commonSnippets
    if (!commonSnippets[snippetName]) {
      if (snippetName.includes('button')) {
        return { purpose: 'interaction', placement: 'body', responsive: true };
      } else if (snippetName.includes('head') || snippetName.includes('title')) {
        return { purpose: 'typography', placement: 'body', responsive: true };
      } else if (snippetName.includes('logo') || snippetName.includes('brand')) {
        return { purpose: 'branding', placement: 'header', responsive: true };
      }
    }

    return commonSnippets[snippetName] || {
      purpose: 'unknown',
      placement: 'unknown',
      responsive: true
    };
  }

  analyzeConditionals(html) {
    // Find conditional logic
    const conditionals = [];
    const conditionalRegex = /{{#if\s+([\w.]+)}}/g;
    let match;

    while ((match = conditionalRegex.exec(html)) !== null) {
      conditionals.push({
        condition: match[1],
        type: 'if',
        content: this.getConditionalContent(match[1])
      });
    }

    return conditionals;
  }

  getConditionalContent(condition) {
    // Map conditions to their content
    const contentMap = {
      'client.hasEnso': {
        type: 'branding',
        snippet: 'enso-banner',
        placement: 'header',
        responsive_rules: ['full-width-mobile']
      },
      'client.hasWPH': {
        type: 'content',
        snippet: 'wph-section',
        placement: 'main',
        responsive_rules: ['stack-on-mobile']
      }
    };

    return contentMap[condition] || {
      type: 'unknown',
      responsive_rules: []
    };
  }

  analyzeResponsiveRules(html) {
    // Extract responsive design patterns
    return {
      breakpoints: {
        mobile: '320px',
        desktop: '600px'
      },
      rules: [
        {
          selector: '.header',
          desktop: 'flex-row',
          mobile: 'flex-column'
        },
        {
          selector: '.content',
          desktop: 'two-column',
          mobile: 'single-column'
        }
      ],
      media_queries: this.findMediaQueries(html)
    };
  }

  findMediaQueries(html) {
    const queries = [];
    const mediaQueryRegex = /@media[^{]+{([^}]+)}/g;
    let match;

    while ((match = mediaQueryRegex.exec(html)) !== null) {
      const breakpointMatch = match[0].match(/max-width:\s*(\d+)px/);
      const rules = match[1].match(/\.[^{]+{[^}]+}/g) || [];
      
      queries.push({
        breakpoint: breakpointMatch ? parseInt(breakpointMatch[1]) : null,
        rules: rules.map(rule => {
          const [selector, styles] = rule.split('{');
          return {
            selector: selector.trim(),
            styles: styles.replace('}', '').trim()
          };
        })
      });
    }

    return queries;
  }

  findLayout(html) {
    const layout = {
      type: 'email',
      structure: [],
      spacing: {
        vertical: new Set(),
        horizontal: new Set()
      },
      mediaQueries: []
    };

    // Extract all media queries first
    const mediaQueryRegex = /@media[^{]+{([\s\S]*?)}/g;
    let match;
    while ((match = mediaQueryRegex.exec(html)) !== null) {
      const breakpointMatch = match[0].match(/max-width:\s*(\d+)px/);
      if (breakpointMatch) {
        layout.mediaQueries.push({
          breakpoint: parseInt(breakpointMatch[1]),
          rules: this.extractMediaQueryRules(match[0])
        });
      }
    }

    // Find sections and their components
    const sectionRegex = /<!--\s*([\w\s-]+Section)\s*-->([\s\S]*?)(?=<!--\s*[\w\s-]+Section\s*-->|$)/g;
    while ((match = sectionRegex.exec(html)) !== null) {
      const [_, sectionName, sectionContent] = match;
      
      const section = {
        name: sectionName.trim(),
        type: this.determineLayoutType(sectionName),
        responsive: this.analyzeResponsiveProperties(
          sectionContent.match(/class="([^"]*)"/g)?.map(m => m.match(/class="([^"]*)"/)[1].split(/\s+/)).flat() || [],
          {},
          html
        ),
        components: this.findComponentsInSection(sectionContent),
        spacing: this.extractSpacingFromStyles(sectionContent)
      };

      layout.structure.push(section);

      // Add spacing values to global spacing sets
      if (section.spacing.vertical) {
        section.spacing.vertical.forEach(value => layout.spacing.vertical.add(value));
      }
      if (section.spacing.horizontal) {
        section.spacing.horizontal.forEach(value => layout.spacing.horizontal.add(value));
      }
    }

    // Convert Sets to Arrays for JSON
    layout.spacing.vertical = Array.from(layout.spacing.vertical).sort((a, b) => a - b);
    layout.spacing.horizontal = Array.from(layout.spacing.horizontal).sort((a, b) => a - b);

    return layout;
  }

  determineLayoutType(name) {
    const types = {
      header: ['header', 'nav', 'logo'],
      content: ['content', 'body', 'main'],
      footer: ['footer', 'bottom'],
      module: ['module', 'block', 'section']
    };

    for (const [type, keywords] of Object.entries(types)) {
      if (keywords.some(k => name.toLowerCase().includes(k))) {
        return type;
      }
    }
    return 'section';
  }

  findComponentsInSection(html) {
    const components = new Map(); // Use Map for better deduplication
    
    // Enhanced patterns for email components
    const patterns = [
      {
        type: 'button',
        regex: /<a[^>]*class="[^"]*(?:button|cta)[^"]*"[^>]*>([\s\S]*?)<\/a>/g,
        extract: (match) => ({
          text: this.sanitizeContent(match[1]),
          url: match[0].match(/href="([^"]*)"/)?.[1] || '',
          type: 'cta'
        }),
        key: (data) => `button-${data.url}-${data.text}`
      },
      {
        type: 'image',
        regex: /<img[^>]*src="([^"]*)"[^>]*>/g,
        extract: (match) => ({
          src: match[1],
          alt: match[0].match(/alt="([^"]*)"/)?.[1] || '',
          type: match[1].includes('Mobile') ? 'mobile' : 'desktop'
        }),
        key: (data) => `image-${data.src}`
      },
      {
        type: 'text',
        regex: /<(?:td|div|p)[^>]*>((?:(?!<td|<div|<p|<\/td|<\/div|<\/p).)*)<\/(?:td|div|p)>/g,
        extract: (match) => ({
          content: this.sanitizeContent(match[1]),
          type: this.determineTextType(match[0])
        }),
        key: (data) => `text-${data.type}-${data.content.substring(0, 50)}`
      }
    ];

    for (const pattern of patterns) {
      let match;
      while ((match = pattern.regex.exec(html)) !== null) {
        const data = pattern.extract(match);
        const key = pattern.key(data);
        components.set(key, {
          type: data.type,
          text: data.text,
          url: data.url,
          isCritical: true,
          confidence: 1.0
        });
      }
    }

    return components;
  }

  sanitizeContent(content) {
    return content.replace(/<\/?[^>]+>/g, '').trim();
  }

  determineTextType(html) {
    if (html.includes('<h1>') || html.includes('<h2>')) {
      return 'headline';
    } else if (html.includes('<img') || html.includes('background-image')) {
      return 'image';
    } else if (html.includes('<a') || html.includes('<button')) {
      return 'button';
    } else if (html.includes('<table') || html.includes('<div class="table-container"')) {
      return 'table';
    } else {
      return 'paragraph';
    }
  }

  analyzeResponsiveProperties(classes, components, html) {
    const responsiveProperties = {
      breakpoints: {
        mobile: '320px',
        desktop: '600px'
      },
      rules: [],
      media_queries: []
    };

    for (const classItem of classes) {
      const [className, ...rest] = classItem.split(/\s+/);
      if (className.includes('mobile')) {
        responsiveProperties.breakpoints.mobile = className;
      } else if (className.includes('desktop')) {
        responsiveProperties.breakpoints.desktop = className;
      }

      if (className.includes('flex')) {
        const [, direction, ...rest] = className.split(/\s+/);
        if (direction) {
          responsiveProperties.rules.push({
            selector: `.${className}`,
            desktop: direction.replace('-', ' '),
            mobile: direction.replace('-', '-')
          });
        }
      }

      if (className.includes('max-width')) {
        const [, width] = className.split(/\s+/);
        if (width) {
          responsiveProperties.media_queries.push({
            breakpoint: parseInt(width),
            rules: [
              {
                selector: `.${className}`,
                styles: className
              }
            ]
          });
        }
      }
    }

    return responsiveProperties;
  }

  extractSpacingFromStyles(html) {
    const spacing = {
      vertical: new Set(),
      horizontal: new Set()
    };

    const styleRegex = /style="([^"]*)"/g;
    let match;
    while ((match = styleRegex.exec(html)) !== null) {
      const styles = match[1].split(/\s+/);
      for (const style of styles) {
        if (style.includes('margin-top')) {
          const value = style.match(/margin-top:\s*(\d+)px/)?.[1];
          if (value) spacing.vertical.add(parseInt(value));
        } else if (style.includes('margin-bottom')) {
          const value = style.match(/margin-bottom:\s*(\d+)px/)?.[1];
          if (value) spacing.vertical.add(parseInt(value));
        } else if (style.includes('margin-left')) {
          const value = style.match(/margin-left:\s*(\d+)px/)?.[1];
          if (value) spacing.horizontal.add(parseInt(value));
        } else if (style.includes('margin-right')) {
          const value = style.match(/margin-right:\s*(\d+)px/)?.[1];
          if (value) spacing.horizontal.add(parseInt(value));
        }
      }
    }

    return spacing;
  }

  extractMediaQueryRules(mediaQuery) {
    const rules = [];
    const ruleRegex = /@media[^{]+{([^}]+)}/g;
    let match;

    while ((match = ruleRegex.exec(mediaQuery)) !== null) {
      const ruleContent = match[1];
      const selectorRegex = /([^{]+){([^}]+)}/g;
      let selectorMatch;
      while ((selectorMatch = selectorRegex.exec(ruleContent)) !== null) {
        const selector = selectorMatch[1].trim();
        const styles = selectorMatch[2].trim();
        rules.push({
          selector,
          styles
        });
      }
    }

    return rules;
  }
}

module.exports = IterableAnalyzer;