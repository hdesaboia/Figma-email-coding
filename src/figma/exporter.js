const FigmaAPI = require('./api.js');
const fs = require('fs').promises;
const axios = require('axios');

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
    
    this.trainingData = [
      {
        name: '2025H1_Baseline_Aetna_VA_EM1_V1',
        figmaId: '5dizNnH3l97v7YJN2dgaFl',
        nodeId: '12951-6616',
        iterableId: '15852461',
        variant: 'standard'
      },
      {
        name: '2025H1_Baseline_Aetna_VA_EM2_V1',
        figmaId: '5dizNnH3l97v7YJN2dgaFl',
        nodeId: '12951-6075',
        iterableId: '15856031',
        variant: 'standard'
      },
      {
        name: '2025H1_Baseline_Aetna_VA_EM3_V1',
        figmaId: '5dizNnH3l97v7YJN2dgaFl',
        nodeId: '12951-5740',
        iterableId: '15856690',
        variant: 'standard'
      },
      {
        name: '2025H1_Baseline_Aetna_VA_EM4_V1',
        figmaId: '5dizNnH3l97v7YJN2dgaFl',
        nodeId: '12951-5658',
        iterableId: '15856991',
        variant: 'standard'
      },
      {
        name: '2025H1_Baseline_Aetna_VA_EM1_V1_NOR',
        figmaId: '5dizNnH3l97v7YJN2dgaFl',
        nodeId: '12951-6616',
        iterableId: '16034931',
        variant: 'nor'
      },
      {
        name: '2025H1_Baseline_Aetna_VA_EM2_V1_NOR',
        figmaId: '5dizNnH3l97v7YJN2dgaFl',
        nodeId: '12951-6075',
        iterableId: '16034933',
        variant: 'nor'
      },
      {
        name: '2025H1_Baseline_Aetna_VA_EM3_V1_NOR',
        figmaId: '5dizNnH3l97v7YJN2dgaFl',
        nodeId: '12951-5740',
        iterableId: '16034936',
        variant: 'nor'
      },
      {
        name: '2025H1_Baseline_Aetna_VA_EM4_V1_NOR',
        figmaId: '5dizNnH3l97v7YJN2dgaFl',
        nodeId: '12951-5658',
        iterableId: '16034938',
        variant: 'nor'
      }
    ];
  }

  async exportAllScreenshots() {
    try {
      console.log('\n=== Exporting All Email Variations ===');

      for (const email of this.trainingData) {
        console.log(`\n📧 Processing ${email.name}...`);
        
        // First get the frame structure
        const frames = await this.getEmailFrames(email);
        
        // Export each viewport if we found the frames
        for (const [viewport, settings] of Object.entries(this.variations)) {
          if (frames[viewport]) {
            await this.exportSingleScreenshot(email, viewport, settings, frames[viewport]);
          } else {
            console.warn(`⚠️ No ${viewport} frame found for ${email.name}`);
          }
        }
      }

      console.log('\n✅ All screenshots exported successfully!');
      
    } catch (error) {
      console.error('\n❌ Export Error:', error.message);
      throw error;
    }
  }

  async getEmailFrames(email) {
    try {
      console.log('\nDEBUG: Getting frames for', email.name);
      const response = await this.figma.getFile(email.figmaId, email.nodeId);
      
      const frames = { desktop: null, mobile: null };

      if (response.nodes) {
        const nodeId = email.nodeId.replace('-', ':');
        const node = response.nodes[nodeId];
        
        console.log('DEBUG: Node structure:', {
          name: node?.document?.name,
          children: node?.document?.children?.map(c => ({
            name: c.name,
            type: c.type,
            children: c.children?.length
          }))
        });

        if (node && node.document) {
          // Look through all children recursively
          await this.findAllFrames(node.document, frames);
        }
      }

      return frames;
    } catch (error) {
      console.error(`Failed to get frames for ${email.name}:`, error.message);
      return { desktop: null, mobile: null };
    }
  }

  async findAllFrames(node, frames) {
    if (!node) return;

    // First check if this is a group containing our target frames
    if (node.type === 'GROUP') {
      const name = node.name.toLowerCase();
      console.log('DEBUG: Checking group:', node.name);

      // Check if this is a desktop or mobile group
      if (name.includes('desktop')) {
        console.log('DEBUG: Found desktop group, getting main frame...');
        // Get the main frame from within the group
        const mainFrame = await this.getMainFrameFromGroup(node);
        if (mainFrame) {
          frames.desktop = mainFrame.id;
          console.log('DEBUG: Found desktop frame:', mainFrame.id);
        }
      } else if (name.includes('mobile')) {
        console.log('DEBUG: Found mobile group, getting main frame...');
        // Get the main frame from within the group
        const mainFrame = await this.getMainFrameFromGroup(node);
        if (mainFrame) {
          frames.mobile = mainFrame.id;
          console.log('DEBUG: Found mobile frame:', mainFrame.id);
        }
      }
    }

    // Always check children recursively
    if (node.children) {
      for (const child of node.children) {
        await this.findAllFrames(child, frames);
      }
    }
  }

  async getMainFrameFromGroup(group) {
    if (!group.children) return null;

    // Create a container frame
    const containerFrame = {
      id: group.id,
      name: group.name,
      type: 'FRAME',
      width: group.name.toLowerCase().includes('desktop') ? 600 : 320,
      height: 0, // Will be calculated
      children: group.children.filter(child => 
        child.type === 'INSTANCE' || 
        child.type === 'FRAME'
      )
    };

    // Calculate total height based on components
    let totalHeight = 0;
    for (const child of containerFrame.children) {
      if (child.absoluteBoundingBox) {
        totalHeight += child.absoluteBoundingBox.height;
      }
    }
    containerFrame.height = totalHeight;

    console.log('DEBUG: Created container frame:', {
      name: containerFrame.name,
      width: containerFrame.width,
      height: containerFrame.height,
      components: containerFrame.children.length
    });

    return containerFrame;
  }

  async exportSingleScreenshot(email, viewport, settings, frameId) {
    try {
      console.log(`\n📱 Exporting ${viewport} version...`);
      
      // Get image URL for specific frame
      const response = await this.figma.api.get('/images/' + email.figmaId, {
        params: {
          ids: frameId,
          format: 'png',
          ...settings
        }
      });

      const imageUrl = response.data.images[frameId];
      if (!imageUrl) {
        throw new Error(`No image URL returned for ${viewport}`);
      }

      // Download image
      console.log('⬇️ Downloading...');
      const imageResponse = await axios.get(imageUrl, {
        responseType: 'arraybuffer'
      });

      // Save with organized naming
      const dir = './training_data/screenshots';
      await fs.mkdir(dir, { recursive: true });
      
      const filename = `${email.name}_${viewport}_${email.variant}.png`;
      const outputPath = `${dir}/${filename}`;
      
      await fs.writeFile(outputPath, imageResponse.data);
      console.log('💾 Saved:', filename);

      // Save metadata
      const metadataPath = outputPath.replace('.png', '.json');
      await fs.writeFile(
        metadataPath,
        JSON.stringify({
          email: email.name,
          variant: email.variant,
          viewport,
          figmaId: email.figmaId,
          nodeId: email.nodeId,
          frameId: frameId,
          iterableId: email.iterableId,
          exportSettings: settings,
          timestamp: new Date().toISOString()
        }, null, 2)
      );
    } catch (error) {
      console.error(`❌ Failed to export ${viewport}:`, error.message);
      throw error;
    }
  }
}

module.exports = FigmaExporter; 