const fs = require('fs').promises;
const path = require('path');
const IterableAnalyzer = require('./iterableAnalyzer.js');
const DesignComponentMapper = require('./designComponentMapper.js');
const FigmaAPI = require('../figma/api.js');

class TrainingDataGenerator {
  constructor() {
    this.screenshotsDir = './training_data/screenshots';
    this.outputDir = './training_data/gpt4v';
    
    // Update with real Figma file ID
    this.figmaFileId = '5dizNnH3l97v7YJN2dgaFl';
    
    // Use the correct, working node IDs from FigmaExporter
    this.templates = {
      'EM1': { figmaNode: '12951-6616' },
      'EM2': { figmaNode: '12951-6075' },
      'EM3': { figmaNode: '12951-5740' },
      'EM4': { figmaNode: '12951-5658' }
    };
    
    // Define responsive patterns
    this.responsivePatterns = {
      layout: {
        header: {
          desktop: "side-by-side logo and text",
          mobile: "stacked logo above text",
          rules: ["stack-on-mobile", "center-align-mobile"]
        },
        content: {
          desktop: "multi-column layout with side margins",
          mobile: "single column full width",
          rules: ["full-width-on-mobile", "stack-columns"]
        },
        spacing: {
          desktop: "consistent horizontal spacing",
          mobile: "reduced padding, maintain readability",
          rules: ["reduce-padding-mobile", "adjust-margins"]
        }
      },
      components: {
        buttons: {
          desktop: "fixed width with padding",
          mobile: "full width with increased tap area",
          rules: ["full-width-buttons-mobile", "increase-tap-target"]
        },
        images: {
          desktop: "fixed width within columns",
          mobile: "full width responsive",
          rules: ["fluid-images-mobile", "maintain-aspect-ratio"]
        }
      }
    };

    // Define conditional content rules
    this.conditionalContent = {
      enso: {
        type: "snippet",
        condition: "{{client.hasEnso}}",
        placement: "after_header",
        responsive_rules: {
          desktop: "contained width with brand colors",
          mobile: "full width, maintain branding",
          fallback: "apply standard banner responsive rules"
        }
      },
      wph: {
        type: "snippet",
        condition: "{{client.hasWPH}}",
        placement: "before_footer",
        responsive_rules: {
          desktop: "boxed content with custom styling",
          mobile: "full width, preserve styling",
          fallback: "maintain padding, full width container"
        }
      }
    };

    this.figmaData = {
      screenshotsDir: './training_data/screenshots',
      outputDir: './training_data/gpt4v'
    };
    
    this.iterableData = {
      templateIds: {
        'EM1': '15852461',
        'EM2': '15856031',
        'EM3': '15856690',
        'EM4': '15856991'
      }
    };

    this.figmaAPI = new FigmaAPI();
    this.iterableAnalyzer = new IterableAnalyzer();
    this.mapper = new DesignComponentMapper();
  }

  async generateTrainingData() {
    try {
      console.log('\n=== Generating GPT-4V Training Data ===');

      // Get all screenshots
      const screenshots = await this.getScreenshots();
      
      // Process each email
      for (const emailId of Object.keys(screenshots)) {
        console.log(`\nProcessing email: ${emailId}`);
        
        // Extract base email ID (e.g., "EM1" from full ID)
        const baseEmailId = emailId.match(/EM[1-4]/)?.[0];
        
        const trainingData = await this.processEmail(emailId, screenshots[emailId]);
        
        // Add the required email_id field at root level
        trainingData.email_id = baseEmailId;
        
        // Save training data
        const outputPath = path.join(this.outputDir, `${emailId}_training.json`);
        await fs.writeFile(outputPath, JSON.stringify(trainingData, null, 2));
        
        console.log(`✅ Training data saved to: ${outputPath}`);
      }

    } catch (error) {
      console.error('Error generating training data:', error);
      throw error;
    }
  }

  async getScreenshots() {
    try {
      console.log('\nReading screenshots directory...');
      const files = await fs.readdir(this.screenshotsDir);
      const screenshots = {};

      for (const file of files) {
        if (file.endsWith('.png')) {
          console.log('\nProcessing file:', file);
          
          const info = this.parseFilename(file);
          if (!info) {
            console.warn('Skipping file due to parsing error:', file);
            continue;
          }

          // Initialize the email structure if needed
          if (!screenshots[info.emailId]) {
            screenshots[info.emailId] = {
              desktop: {},
              mobile: {}
            };
          }

          try {
            const metadata = await this.getMetadata(file);
            
            screenshots[info.emailId][info.viewport][info.variation] = {
              path: path.join(this.screenshotsDir, file),
              metadata
            };

            console.log('Successfully processed:', {
              emailId: info.emailId,
              viewport: info.viewport,
              variation: info.variation
            });
          } catch (error) {
            console.warn('Error processing file:', file, error);
            continue;
          }
        }
      }

      const emailCount = Object.keys(screenshots).length;
      console.log('\nProcessed screenshots for', emailCount, 'emails');
      
      return screenshots;
    } catch (error) {
      console.error('Error reading screenshots:', error);
      throw error;
    }
  }

  parseFilename(filename) {
    try {
      console.log('\nParsing filename:', filename);
      // Remove .png and split
      const parts = filename.replace('.png', '').split('_');
      
      // Get the base parts of the email ID
      const baseEmailId = parts.slice(0, 6).join('_');  // 2025H1_Baseline_Aetna_VA_EM1_V1
      
      // Find viewport (desktop/mobile)
      const viewport = parts.find(part => 
        part.toLowerCase() === 'desktop' || 
        part.toLowerCase() === 'mobile'
      );

      // Find variation (standard/nor)
      const variation = parts.includes('nor') ? 'nor' : 'standard';

      console.log('Parsed components:', {
        baseEmailId,
        viewport,
        variation
      });

      if (!viewport) {
        console.warn('Could not find viewport in:', filename);
        return null;
      }

      return {
        emailId: baseEmailId,
        viewport: viewport.toLowerCase(),
        variation
      };
    } catch (error) {
      console.error('Error parsing filename:', filename, error);
      return null;
    }
  }

  async getMetadata(filename) {
    try {
      const metadataPath = path.join(
        this.screenshotsDir, 
        filename.replace('.png', '.json')
      );
      
      const exists = await fs.access(metadataPath)
        .then(() => true)
        .catch(() => false);
      
      if (!exists) {
        console.warn('Metadata file not found:', metadataPath);
        return {};
      }

      const data = await fs.readFile(metadataPath, 'utf8');
      return JSON.parse(data);
    } catch (error) {
      console.warn('Error reading metadata for:', filename, error);
      return {};
    }
  }

  async processEmail(emailId, screenshots) {
    // Get component mappings for both viewports
    const desktopMappings = await this.getComponentMappings(emailId, 'desktop');
    const mobileMappings = await this.getComponentMappings(emailId, 'mobile');
    
    // Get HTML structure and snippets
    const htmlAnalysis = await this.analyzeHTMLStructure(emailId);
    
    // Get responsive patterns
    const responsivePatterns = await this.detectResponsivePatterns(emailId);

    return {
      email_id: emailId,
      visual_input: screenshots,
      design_analysis: {
        component_mapping: {
          desktop: desktopMappings.components || [],
          mobile: mobileMappings.components || []
        },
        responsive_patterns: {
          transformations: responsivePatterns
        }
      },
      html_implementation: {
        snippets: Object.values(htmlAnalysis.snippets || {}),
        base_structure: htmlAnalysis.base_structure,
        conditional_logic: htmlAnalysis.conditional_logic
      }
    };
  }

  listAvailableScreenshots(screenshots) {
    const available = {
      desktop: Object.keys(screenshots.desktop),
      mobile: Object.keys(screenshots.mobile)
    };
    console.log('Available screenshots:', available);
    return available;
  }

  identifyMissingScreenshots(screenshots) {
    const allVariations = ['standard', 'nor'];
    const missing = {
      desktop: allVariations.filter(v => !screenshots.desktop[v]),
      mobile: allVariations.filter(v => !screenshots.mobile[v])
    };
    console.log('Missing screenshots:', missing);
    return missing;
  }

  async detectPatterns(screenshots) {
    return {
      content: this.detectContentPatterns(screenshots),
      layout: this.detectLayoutPatterns(screenshots),
      responsive: this.detectResponsivePatterns(screenshots),
      buttons: this.detectContentPatterns(screenshots).filter(p => p.type === 'button')  // Use existing content patterns for buttons
    };
  }

  analyzeLayout(screenshot) {
    return {
      width: screenshot.metadata.exportSettings.width,
      components: screenshot.metadata.components || [],
      structure: {
        header: "top",
        content: "middle",
        footer: "bottom"
      }
    };
  }

  detectHeaderPattern(screenshots) {
    return {
      desktop: {
        type: "flex",
        direction: "row",
        spacing: "space-between"
      },
      mobile: {
        type: "flex",
        direction: "column",
        spacing: "center"
      }
    };
  }

  // ... similar methods for content, buttons, images

  async inferMissingPatterns(screenshots) {
    // We'll implement pattern inference in the next step
    return {};
  }

  async analyzeConditionalContent(screenshots) {
    // We'll implement conditional content analysis in the next step
    return {};
  }

  async generateExamples(screenshots, iterableAnalysis) {
    // We'll implement example generation in the next step
    return [];
  }

  async analyzeHTMLStructure(emailId) {
    // Extract base email ID first (e.g., "EM1" from "2025H1_Baseline_Aetna_VA_EM1_V1")
    const baseEmailId = emailId.match(/EM[1-4]/)?.[0];
    if (!baseEmailId) {
      throw new Error(`Could not extract base email ID from ${emailId}`);
    }

    const templateId = this.iterableData.templateIds[baseEmailId];
    if (!templateId) {
      throw new Error(`No template ID found for ${baseEmailId}`);
    }

    const template = await this.iterableAnalyzer.getTemplate(templateId);
    const analysis = this.iterableAnalyzer.extractComponents(template);
    
    return {
      base_structure: analysis.structure,
      snippets: analysis.snippets,
      conditional_logic: analysis.conditionals
    };
  }

  async getComponentAnnotations(emailId) {
    try {
      console.log('Getting component annotations for', emailId);
      
      // Extract base email ID (e.g., "EM1" from "2025H1_Baseline_Aetna_VA_EM1_V1")
      const baseEmailId = emailId.match(/EM[1-4]/)?.[0];
      if (!baseEmailId) {
        throw new Error(`Could not extract base email ID from ${emailId}`);
      }
      
      // Get Figma node using base email ID
      const figmaNode = this.templates[baseEmailId]?.figmaNode;
      if (!figmaNode) {
        throw new Error(`No Figma node found for ${baseEmailId}`);
      }
      
      const components = await this.figmaAPI.getComponents(
        this.figmaFileId,
        figmaNode
      );
      
      return this.processComponents(components);
    } catch (error) {
      console.error('Error getting component annotations:', error.message);
      throw error;
    }
  }

  async getFigmaScreenshots(emailId) {
    try {
      console.log(`Getting Figma screenshots for email ${emailId}`);
      // ... rest of the function implementation
    } catch (error) {
      console.error('Error getting screenshots:', error);
      throw error;
    }
  }

  processComponents(components) {
    if (!components || (!components.desktop && !components.mobile)) {
      console.warn('No components found in Figma data');
      return [];
    }

    const processedComponents = [];

    // Process desktop components
    if (components.desktop) {
      components.desktop.forEach(component => {
        processedComponents.push({
          ...component,
          viewport: 'desktop'
        });
      });
    }

    // Process mobile components
    if (components.mobile) {
      components.mobile.forEach(component => {
        processedComponents.push({
          ...component,
          viewport: 'mobile'
        });
      });
    }

    console.log(`Processed ${processedComponents.length} components from Figma`);
    return processedComponents;
  }

  async getComponentMappings(emailId, viewport) {
    try {
      // Get Figma components
      const figmaComponents = await this.getComponentAnnotations(emailId);
      
      // Filter components by viewport
      const viewportComponents = figmaComponents.filter(
        component => component.viewport === viewport
      );
      
      // Get HTML components
      const baseEmailId = emailId.match(/EM[1-4]/)?.[0];
      const templateId = this.iterableData.templateIds[baseEmailId];
      const template = await this.iterableAnalyzer.getTemplate(templateId);
      const htmlComponents = this.iterableAnalyzer.extractComponents(template);
      
      // Use testComponentMatching instead of matchComponents
      const mappingResults = await this.mapper.testComponentMatching(baseEmailId);
      
      return {
        components: mappingResults.matches,
        match_rate: mappingResults.matchRate,
        confidence_levels: mappingResults.confidence
      };
    } catch (error) {
      console.error(`Error mapping components for ${emailId} ${viewport}:`, error);
      return {
        components: [],
        match_rate: 0,
        confidence_levels: { high: 0, medium: 0, low: 0 }
      };
    }
  }

  async detectResponsivePatterns(emailId) {
    try {
      return [
        {
          type: 'layout',
          desktop: {
            type: 'multi-column',
            description: 'Content arranged in multiple columns'
          },
          mobile: {
            type: 'single-column',
            description: 'Content stacked vertically'
          },
          confidence: 1.0
        },
        {
          type: 'button',
          desktop: {
            type: 'fixed-width',
            description: 'Buttons maintain consistent width'
          },
          mobile: {
            type: 'full-width',
            description: 'Buttons expand to full container width'
          },
          confidence: 1.0
        },
        {
          type: 'image',
          desktop: {
            type: 'fixed-width',
            description: 'Images maintain aspect ratio with fixed width'
          },
          mobile: {
            type: 'fluid-width',
            description: 'Images scale to container width'
          },
          confidence: 1.0
        }
      ];
    } catch (error) {
      console.error(`Error detecting responsive patterns for ${emailId}:`, error);
      return [];
    }
  }

  async generateTrainingData(emailId) {
    const data = {
        template: {
            id: emailId
        },
        patterns: {
            layout: [],
            snippets: [],
            components: []
        },
        metadata: {
            totalComponents: 0,
            snippetUsage: {},
            componentTypes: {},
            sections: []
        }
    };

    // Get template analysis from iterableAnalyzer
    const templateAnalysis = await this.iterableAnalyzer.analyzeTemplate(emailId);
    
    // Get Figma components
    const figmaComponents = await this.getComponentAnnotations(emailId);
    
    // Map components
    const mappingResults = await this.mapper.mapComponents(figmaComponents, templateAnalysis);

    // Build the training data structure
    data.template.components = mappingResults.matches;
    data.template.structure = templateAnalysis.structure;
    data.template.snippets = templateAnalysis.snippets;

    // Calculate metadata
    data.metadata.totalComponents = mappingResults.total;
    data.metadata.componentTypes = this.categorizeComponents(mappingResults.matches);
    data.metadata.snippetUsage = this.analyzeSnippetUsage(templateAnalysis.snippets);
    
    // Get layout patterns
    const layoutAnalysis = await this.detectResponsivePatterns(emailId);
    data.patterns.layout = layoutAnalysis.patterns;
    
    return data;
  }

  categorizeComponents(components) {
    return components.reduce((acc, component) => {
        const type = component.type.toLowerCase();
        acc[type] = (acc[type] || 0) + 1;
        return acc;
    }, {});
  }

  analyzeSnippetUsage(snippets) {
    return snippets.reduce((acc, snippet) => {
        acc[snippet.name] = {
            count: 1,
            type: snippet.type
        };
        return acc;
    }, {});
  }
}

module.exports = TrainingDataGenerator;
