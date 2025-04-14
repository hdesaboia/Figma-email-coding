const axios = require('axios');
const fs = require('fs');

class FigmaAPI {
  constructor() {
    if (!process.env.FIGMA_ACCESS_TOKEN) {
      throw new Error('FIGMA_ACCESS_TOKEN is required');
    }

    this.api = axios.create({
      baseURL: 'https://api.figma.com/v1',
      headers: {
        'X-Figma-Token': process.env.FIGMA_ACCESS_TOKEN
      }
    });
  }

  async getFile(fileId, nodeId = null) {
    try {
      if (!fileId) throw new Error('fileId is required');
      
      const url = nodeId 
        ? `/files/${fileId}/nodes?ids=${nodeId}`
        : `/files/${fileId}`;
      
      const response = await this.api.get(url);
      return response.data;
    } catch (error) {
      throw new Error(`Failed to fetch Figma file: ${error.message}`);
    }
  }

  async getComponents(fileId, nodeId) {
    try {
      if (!fileId || !nodeId) {
        throw new Error('fileId and nodeId are required');
      }

      // Convert hyphen to colon for API call
      const apiNodeId = nodeId.replace('-', ':');
      const response = await this.api.get(`/files/${fileId}/nodes?ids=${apiNodeId}`);
      console.log('Successfully fetched Figma data');
      
      const components = {
        desktop: [],
        mobile: []
      };

      if (response.data.nodes) {
        const node = response.data.nodes[apiNodeId];
        if (node && node.document) {
          this.findEmailComponents(node.document, components);
        } else {
          console.error('Invalid node structure:', node);
        }
      }

      return components;
    } catch (error) {
      console.error('Error fetching Figma data:', error.response?.status, error.response?.statusText);
      throw error;
    }
  }

  extractComponents(data) {
    const components = {
      desktop: [],
      mobile: []
    };

    const processNode = (node) => {
      if (!node) return;

      // Determine viewport
      const viewport = node.name?.includes('📱') ? 'mobile' : 'desktop';

      // Extract component data if it's a valid component
      if (this.isValidComponent(node)) {
        components[viewport].push(this.parseComponent(node));
      }

      // Process children recursively
      if (node.children) {
        node.children.forEach(child => processNode(child));
      }
    };

    // Start processing from root nodes
    if (data.nodes) {
      Object.values(data.nodes).forEach(node => {
        processNode(node.document);
      });
    }

    return components;
  }

  isValidComponent(node) {
    return ['TEXT', 'INSTANCE', 'FRAME', 'RECTANGLE'].includes(node.type);
  }

  parseComponent(node) {
    return {
      id: node.id,
      type: node.type,
      name: node.name || 'Unnamed',
      text: node.characters || '',
      viewport: node.name?.includes('📱') ? 'mobile' : 'desktop',
      properties: {
        styles: node.style || {},
        size: node.type !== 'TEXT' ? {
          width: node.width,
          height: node.height
        } : null,
        fills: node.fills || []
      }
    };
  }

  async getEmailComponents(fileId, emailName) {
    console.log(`Looking for email design: ${emailName}`);
    
    try {
      const response = await this.api.get(`/files/${fileId}/nodes`);
      console.log('Successfully fetched Figma data');
      
      const components = {
        name: emailName,
        sections: [],
        elements: []
      };

      if (response.data.nodes) {
        Object.entries(response.data.nodes).forEach(([id, node]) => {
          console.log('Processing node:', node.document.name);
          this.findEmailComponents(node.document, components);
        });
      }

      return components;
    } catch (error) {
      console.error('Error fetching Figma data:', error.response?.status, error.response?.statusText);
      throw error;
    }
  }

  findEmailComponents(node, components) {
    // Process this node
    if (node.type === 'TEXT' || node.type === 'INSTANCE' || node.type === 'FRAME' || node.type === 'RECTANGLE') {
      const viewport = node.name?.includes('📱') ? 'mobile' : 'desktop';
      components[viewport].push(this.parseComponent(node));
    }
    
    // Process children recursively
    if (node.children) {
      node.children.forEach(child => {
        this.findEmailComponents(child, components);
      });
    }
  }

  async getEmailVersion(fileId, nodeId, versionName = 'Non-Incentive Clients') {
    try {
      console.log(`\nAnalyzing ${versionName} version...`);
      const data = await this.getFile(fileId, nodeId);
      
      console.log('\n=== Email Components ===');
      if (data.nodes) {
        Object.entries(data.nodes).forEach(([id, node]) => {
          // Find the main frame first
          const mainFrame = this.findMainEmailFrame(node.document);
          if (mainFrame) {
            console.log('\nFound main email frame:', mainFrame.name);
            // Now find the specific version
            const versionFrame = this.findVersionFrame(mainFrame, versionName);
            if (versionFrame) {
              this.analyzeVersionComponents(versionFrame);
            }
          }
        });
      }
    } catch (error) {
      console.error('Error:', error.message);
      throw error;
    }
  }

  findMainEmailFrame(node) {
    // Look for the main frame containing the email template name
    if (node.type === 'FRAME' && node.name.includes('Baseline')) {
      return node;
    }
    if (node.children) {
      for (const child of node.children) {
        const found = this.findMainEmailFrame(child);
        if (found) return found;
      }
    }
    return null;
  }

  findVersionFrame(node, versionName) {
    // Look for the specific version frame
    if (node.type === 'FRAME' && 
        node.name === versionName && 
        !node.name.includes('WPH')) {
      return node;
    }
    if (node.children) {
      for (const child of node.children) {
        const found = this.findVersionFrame(child, versionName);
        if (found) return found;
      }
    }
    return null;
  }

  analyzeVersionComponents(frame) {
    console.log('\nAnalyzing Components:');
    
    const components = this.extractComponents(frame);
    
    components.forEach((comp, index) => {
      console.log(`\nComponent ${index + 1}:`);
      console.log(`Type: ${comp.type}`);
      console.log(`Name: ${comp.name || 'Unnamed'}`);
      
      if (comp.type === 'TEXT') {
        console.log(`Content: "${comp.characters}"`);
      }
      if (comp.type === 'RECTANGLE' || comp.type === 'FRAME') {
        if (comp.fills) {
          const hasImage = comp.fills.some(fill => fill.type === 'IMAGE');
          if (hasImage) {
            console.log('Contains Image');
          }
        }
      }
    });
  }

  async analyzeNonIncentiveVersion(fileId, nodeId) {
    const data = await this.getFile(fileId, nodeId);
    
    console.log('\n=== Analyzing Non-Incentive Version ===');
    
    if (data.nodes) {
      Object.entries(data.nodes).forEach(([id, node]) => {
        // Log the full node structure first
        console.log('\nDocument structure:', node.document.name);
        this.printNodeStructure(node.document);
      });
    }
  }

  async exportImage(nodeId, settings) {
    try {
      console.log(`Exporting image for node: ${nodeId}`);
      
      // First, get the export URL
      const response = await this.api.get(`/images/${nodeId}`, {
        params: {
          format: settings.format || 'PNG',
          scale: settings.scale || 2,
          ...settings
        }
      });

      if (!response.data.images) {
        throw new Error('No image URL returned from Figma');
      }

      // Download the image
      console.log('Getting image from:', response.data.images[nodeId]);
      const imageResponse = await axios.get(response.data.images[nodeId], {
        responseType: 'arraybuffer'
      });

      return Buffer.from(imageResponse.data, 'binary');
    } catch (error) {
      console.error('Export Error:', error.response?.status, error.response?.statusText);
      console.error('Error details:', error.response?.data || error.message);
      throw error;
    }
  }

  async getImageExports(fileId, nodeId, settings = {}) {
    try {
      console.log('\nPreparing image exports...');
      
      // Get node data first
      const fileData = await this.getFile(fileId, nodeId);
      if (!fileData.nodes || !fileData.nodes[nodeId]) {
        throw new Error('Node not found');
      }

      const node = fileData.nodes[nodeId].document;
      console.log('Found node:', node.name);

      // Export settings for different viewports
      const exportSettings = {
        desktop: {
          format: 'PNG',
          scale: 2,
          width: 600
        },
        mobile: {
          format: 'PNG',
          scale: 2,
          width: 320
        }
      };

      // Export both desktop and mobile versions
      const exports = {};
      for (const [viewport, settings] of Object.entries(exportSettings)) {
        console.log(`\nExporting ${viewport} version...`);
        exports[viewport] = await this.exportImage(nodeId, settings);
      }

      return exports;
    } catch (error) {
      console.error('Export preparation failed:', error);
      throw error;
    }
  }

  async testImageExport(fileId = '5dizNnH3l97v7YJN2dgaFl', nodeId = '12951-6616') {
    try {
      console.log('\n=== Testing Figma Image Export ===');
      console.log('File ID:', fileId);
      console.log('Node ID:', nodeId);

      // Convert nodeId format for the API
      const apiNodeId = nodeId.replace('-', ':');

      // Get the image URL
      const response = await this.api.get('/images/' + fileId, {
        params: {
          ids: apiNodeId,  // Use the converted ID
          format: 'png',
          scale: 2
        }
      });

      console.log('\nAPI Response:', JSON.stringify(response.data, null, 2));

      // Check for image URL using the correct format
      const imageUrl = response.data.images[apiNodeId];
      if (!imageUrl) {
        throw new Error('No image URL in response');
      }

      console.log('\nFound image URL:', imageUrl);

      // Create directory if it doesn't exist
      const dir = './training_data';
      await fs.promises.mkdir(dir, { recursive: true });

      // Download the image
      console.log('\nDownloading image...');
      const imageResponse = await axios.get(imageUrl, {
        responseType: 'arraybuffer'
      });

      // Save to file
      const outputPath = `${dir}/test_export.png`;
      await fs.promises.writeFile(outputPath, imageResponse.data);

      console.log('Success! Test image saved to:', outputPath);
      return { success: true, path: outputPath };

    } catch (error) {
      console.error('\nTest Export Failed:', error.message);
      if (error.response) {
        console.error('API Response:', {
          status: error.response.status,
          data: error.response.data
        });
      }
      return { success: false, error };
    }
  }
}

class FigmaExporter {
  constructor() {
    this.figma = new FigmaAPI();
    this.variations = {
      desktop: {
        width: 600,
        scale: 2
      },
      mobile: {
        width: 320,
        scale: 2
      }
    };
    
    // Training data from spreadsheet
    this.trainingData = [
      {
        name: '2025H1_Baseline_Aetna_VA_EM1_V1',
        figmaId: '5dizNnH3l97v7YJN2dgaFl',
        nodeId: '12951-6616',
        iterableId: '15852461',
        client: 'Aetna'
      },
      {
        name: '2025H1_Baseline_Aetna_VA_EM2_V1',
        figmaId: '5dizNnH3l97v7YJN2dgaFl',
        nodeId: '12951-6075',
        iterableId: '15856031',
        client: 'Aetna'
      },
      {
        name: '2025H1_Baseline_Aetna_VA_EM3_V1',
        figmaId: '5dizNnH3l97v7YJN2dgaFl',
        nodeId: '12951-5740',
        iterableId: '15856690',
        client: 'Aetna'
      },
      {
        name: '2025H1_Baseline_Aetna_VA_EM4_V1',
        figmaId: '5dizNnH3l97v7YJN2dgaFl',
        nodeId: '12951-5658',
        iterableId: '15856991',
        client: 'Aetna'
      },
      {
        name: '2025H1_Baseline_BCBSTN_VA_EM1_V1_NOR',
        figmaId: '5dizNnH3l97v7YJN2dgaFl',
        nodeId: '12951-6616',
        iterableId: '17252057',
        client: 'BCBSTN'
      },
      {
        name: '2025H1_Baseline_BCBSTN_VA_EM2_V1_NOR',
        figmaId: '5dizNnH3l97v7YJN2dgaFl',
        nodeId: '12951-6075',
        iterableId: '17252156',
        client: 'BCBSTN'
      },
      {
        name: '2025H1_Baseline_BCBSTN_VA_EM3_V1_NOR',
        figmaId: '5dizNnH3l97v7YJN2dgaFl',
        nodeId: '12951-5740',
        iterableId: '17252190',
        client: 'BCBSTN'
      },
      {
        name: '2025H1_Baseline_BCBSTN_VA_EM4_V1_NOR',
        figmaId: '5dizNnH3l97v7YJN2dgaFl',
        nodeId: '12951-5658',
        iterableId: '17252222',
        client: 'BCBSTN'
      }
    ];
  }

  async exportAllScreenshots() {
    try {
      console.log('\n=== Exporting All Email Variations ===');

      for (const email of this.trainingData) {
        console.log(`\nProcessing ${email.name}...`);
        
        // Export each viewport
        for (const [viewport, settings] of Object.entries(this.variations)) {
          console.log(`\nExporting ${viewport} version...`);
          
          // Convert nodeId format for API
          const apiNodeId = email.nodeId.replace('-', ':');
          
          // Get image URL
          const response = await this.figma.api.get('/images/' + email.figmaId, {
            params: {
              ids: apiNodeId,
              format: 'png',
              ...settings
            }
          });

          const imageUrl = response.data.images[apiNodeId];
          if (!imageUrl) {
            throw new Error(`No image URL for ${email.name} ${viewport}`);
          }

          // Download image
          console.log('Downloading...');
          const imageResponse = await axios.get(imageUrl, {
            responseType: 'arraybuffer'
          });

          // Save with organized naming
          const dir = './training_data/screenshots';
          await fs.promises.mkdir(dir, { recursive: true });
          
          const filename = `${email.name}_${email.client}_${viewport}.png`;
          const outputPath = `${dir}/${filename}`;
          
          await fs.promises.writeFile(outputPath, imageResponse.data);
          console.log('Saved:', filename);

          // Save metadata
          const metadataPath = outputPath.replace('.png', '.json');
          await fs.promises.writeFile(
            metadataPath,
            JSON.stringify({
              email: email.name,
              client: email.client,
              viewport,
              figmaId: email.figmaId,
              nodeId: email.nodeId,
              iterableId: email.iterableId,
              exportSettings: settings,
              timestamp: new Date().toISOString()
            }, null, 2)
          );
        }
      }

      console.log('\n✅ All screenshots exported successfully!');
      
    } catch (error) {
      console.error('\nExport Error:', error.message);
      if (error.response) {
        console.error('API Response:', {
          status: error.response.status,
          data: error.response.data
        });
      }
      throw error;
    }
  }
}

module.exports = FigmaAPI; 