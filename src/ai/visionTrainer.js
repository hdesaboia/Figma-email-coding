class VisionTrainer {
  constructor() {
    this.trainingFormat = {
      // What GPT-4V sees
      visual_input: {
        figma_screenshot: null,
        design_context: {
          email_type: "EM1 Baseline",
          viewport: "desktop/mobile",
          variations: ["WPH/non-WPH", "ENSO/non-ENSO"]
        }
      },
      
      // What the AI should understand
      design_analysis: {
        layout: {
          structure: "Header → Content → Footer",
          spacing: "24px between sections",
          responsive_behavior: "Stack on mobile"
        },
        components: {
          header: {
            type: "2024_Universal_Logo_Dynamic",
            reason: "Standard header with logo placement"
          },
          content: [
            {
              type: "Padding_24px_Section",
              reason: "Main content area with standard spacing"
            }
          ],
          footer: {
            type: "2024_White_footer",
            reason: "Standard footer with social icons"
          }
        },
        variations: {
          wph_handling: "Use WPH variant if approvedWPHPromo",
          enso_logic: "Include ENSO content based on hhProgramLaunchDate"
        }
      },
      
      // The correct output
      expected_output: {
        html_structure: "<!-- Generated HTML using components -->",
        component_usage: [
          {
            snippet: "2024_Universal_Logo_Dynamic",
            placement: "header",
            conditions: null
          },
          {
            snippet: "Padding_24px_Section",
            placement: "content",
            conditions: null
          }
        ],
        responsive_rules: {
          desktop: "Original layout",
          mobile: "Stacked layout"
        }
      }
    };
  }

  async generateTrainingData() {
    // For each email in our training set
    const trainingExamples = [];
    
    // Process each viewport (desktop/mobile)
    for (const viewport of ['desktop', 'mobile']) {
      // Process each variation (WPH/non-WPH, ENSO/non-ENSO)
      for (const variation of this.getVariations()) {
        const example = {
          ...this.trainingFormat,
          visual_input: {
            figma_screenshot: `email_${viewport}_${variation}.png`,
            design_context: {
              email_type: "EM1",
              viewport: viewport,
              variations: [variation]
            }
          }
        };
        
        trainingExamples.push(example);
      }
    }

    return trainingExamples;
  }

  getVariations() {
    return [
      'wph',
      'non_wph',
      'enso',
      'non_enso'
    ];
  }
} 