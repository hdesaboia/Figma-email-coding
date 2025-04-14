require('dotenv').config();
const axios = require('axios');

class IterableAPI {
  constructor() {
    this.api = axios.create({
      baseURL: 'https://api.iterable.com/api',
      headers: {
        'Api-Key': process.env.ITERABLE_API_KEY,
        'Content-Type': 'application/json'
      }
    });
  }

  async compareTemplates() {
    try {
      console.log('Fetching templates for comparison...');
      
      // Get both templates
      const masterTemplate = await this.getTemplate(14952092, 'Master Template');
      const finalTemplate = await this.getTemplate(15541232, 'EM1 Baseline');
      
      // Compare them
      this.analyzeTemplateRelationship(masterTemplate, finalTemplate);
      
      return { masterTemplate, finalTemplate };
    } catch (error) {
      console.error('Comparison Error:', error.message);
      throw error;
    }
  }

  async getTemplate(templateId) {
    try {
      console.log(`\nFetching Iterable template ${templateId}...`);
      const response = await this.api.get('/templates/email/get', {
        params: { templateId }
      });

      // Analyze HTML content
      const html = response.data.html;
      
      console.log('\n=== Template Analysis ===');
      console.log('HTML Length:', html.length);

      // Look for snippet patterns
      const snippetMatches = html.match(/{{[^}]+}}/g) || [];
      console.log('\nFound Snippets:', snippetMatches.length);
      snippetMatches.slice(0, 10).forEach(snippet => {
        console.log('- ', snippet);
      });

      // Look for conditional patterns
      const conditionalMatches = html.match(/{%[^%]+%}/g) || [];
      console.log('\nFound Conditionals:', conditionalMatches.length);
      conditionalMatches.slice(0, 10).forEach(conditional => {
        console.log('- ', conditional);
      });

      // Look for HTML comments (often indicate sections)
      const commentMatches = html.match(/<!--[^>]+-->/g) || [];
      console.log('\nFound Comments:', commentMatches.length);
      commentMatches.slice(0, 10).forEach(comment => {
        console.log('- ', comment);
      });

      return response.data;
    } catch (error) {
      console.error('Template Error:', {
        status: error.response?.status,
        message: error.message
      });
      throw error;
    }
  }

  analyzeTemplateRelationship(master, final) {
    console.log('\n=== Template Comparison Analysis ===');
    
    // Compare components used
    console.log('\nComponents from Master Template used in Final:');
    const masterComponents = this.findComponents(master.html);
    const finalComponents = this.findComponents(final.html);
    
    // Show which components were used
    masterComponents.forEach(comp => {
      if (final.html.includes(comp)) {
        console.log(`- Found: ${comp}`);
      }
    });

    // Show snippets used
    console.log('\nSnippets Used:');
    const snippets = final.html.match(/\{\{.*?\}\}/g) || [];
    snippets.forEach(snippet => {
      console.log(`- ${snippet}`);
    });

    // Show conditional logic
    console.log('\nConditional Logic Used:');
    const conditionals = final.html.match(/\{%.*?%\}/g) || [];
    conditionals.forEach(conditional => {
      console.log(`- ${conditional}`);
    });
  }

  findComponents(html) {
    // Find component markers in HTML
    const components = new Set();
    
    // Look for commented components
    const comments = html.match(/<!--[\s\S]*?-->/g) || [];
    comments.forEach(comment => {
      if (comment.includes('component') || comment.includes('section')) {
        components.add(comment.trim());
      }
    });
    
    // Look for div-based components
    const divs = html.match(/<div[^>]*class="[^"]*component[^"]*"[^>]*>/g) || [];
    divs.forEach(div => {
      const className = div.match(/class="([^"]*)"/);
      if (className) {
        components.add(className[1]);
      }
    });

    return Array.from(components);
  }

  async getMasterTemplate() {
    try {
      console.log('\nFetching master template...');
      const response = await this.api.get('/templates/email/get', {
        params: { templateId: 14952092 }
      });

      if (!response.data.html) {
        throw new Error('No HTML content found in template');
      }

      // Extract sections and their content
      const sections = this.parseSections(response.data.html);
      
      console.log('\n=== Master Template Sections ===');
      Object.keys(sections).forEach(sectionName => {
        console.log(`\nSection: ${sectionName}`);
        console.log('Length:', sections[sectionName].length);
        console.log('Preview:', sections[sectionName].substring(0, 100) + '...');
      });

      return sections;
    } catch (error) {
      console.error('Template Error:', {
        status: error.response?.status,
        message: error.message
      });
      throw error;
    }
  }

  parseSections(html) {
    const sections = {};
    const sectionRegex = /<!--\s*([^>]+)\s*-->([\s\S]*?)(?=<!--\s*[^>]+\s*-->|$)/g;
    let match;

    while ((match = sectionRegex.exec(html)) !== null) {
      const [_, sectionName, content] = match;
      sections[sectionName.trim()] = content.trim();
    }

    return sections;
  }

  findComponent(html, name) {
    const regex = new RegExp(`{{snippets.${name}[^}]*}}`, 'g');
    return html.match(regex) || [];
  }

  analyzeComponentLibrary(html) {
    // Look for table-based components
    const tables = html.match(/<table[^>]*>([\s\S]*?)<\/table>/g) || [];
    console.log('\nTable Components Found:', tables.length);
    
    // Look for div-based components
    const divs = html.match(/<div[^>]*class="[^"]*component[^"]*"[^>]*>/g) || [];
    console.log('Div Components Found:', divs.length);
    
    // Look for HTML comments that might mark components
    const comments = html.match(/<!--[\s\S]*?-->/g) || [];
    console.log('\nComponent Comments:');
    comments.forEach(comment => {
      if (comment.includes('component') || comment.includes('section')) {
        console.log('-', comment.trim());
      }
    });

    // Look for all snippets (including nested ones)
    const snippetPattern = /\{\{([^}]+)\}\}/g;
    const snippets = new Set();
    let match;
    while ((match = snippetPattern.exec(html)) !== null) {
      snippets.add(match[0]);
    }
    
    console.log('\nAll Snippets Found:');
    Array.from(snippets).forEach(snippet => {
      console.log('-', snippet);
    });

    // Look for specific component types we need
    console.log('\nSearching for Required Components:');
    const componentTypes = {
      header: html.match(/header/gi) || [],
      logo: html.match(/logo/gi) || [],
      hero: html.match(/hero/gi) || [],
      content: html.match(/content-block/gi) || [],
      incentive: html.match(/incentive/gi) || [],
      wph: html.match(/wph/gi) || [],
      footer: html.match(/footer/gi) || []
    };

    Object.entries(componentTypes).forEach(([type, matches]) => {
      console.log(`- ${type}: ${matches.length} matches`);
    });
  }

  async listTemplates() {
    try {
      console.log('Fetching template list...');
      const response = await this.api.get('/templates');
      
      console.log('\n=== Available Templates ===');
      if (response.data && response.data.templates) {
        response.data.templates.forEach(template => {
          console.log(`- ${template.name} (ID: ${template.templateId})`);
        });
      }
      
      return response.data;
    } catch (error) {
      console.error('Error listing templates:', error.message);
      throw error;
    }
  }

  // Add a method to verify API connection
  async verifyConnection() {
    try {
      console.log('Verifying Iterable API connection...');
      console.log('Using API Key:', this.maskApiKey(process.env.ITERABLE_API_KEY));
      
      // Try a simpler endpoint - get metadata
      const response = await this.api.get('/metadata');
      
      console.log('Response:', {
        status: response.status,
        headers: response.headers
      });
      
      return true;
    } catch (error) {
      console.error('Connection Error Details:', {
        message: error.message,
        status: error.response?.status,
        data: error.response?.data,
        headers: error.config?.headers
      });
      return false;
    }
  }

  maskApiKey(key) {
    if (!key) return 'No key found';
    return `${key.substring(0, 4)}...${key.substring(key.length - 4)}`;
  }
}

class EmailGenerator {
  constructor(sections) {
    this.sections = sections;
  }

  generateEmail() {
    return `
<!DOCTYPE html PUBLIC "-//W3C//DTD XHTML 1.0 Transitional//EN" "http://www.w3.org/TR/xhtml1/DTD/xhtml1-transitional.dtd">
<html xmlns="http://www.w3.org/1999/xhtml" xmlns:v="urn:schemas-microsoft-com:vml" xmlns:o="urn:schemas-microsoft-com:office:office">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Hinge Health</title>
  ${this.sections['HH_Header_Section'] || '<!-- Header Section Not Found -->'}
</head>
<body style="margin: 0; padding: 0; background-color: #ffffff;">
  <!-- Preheader -->
  ${this.sections['Desktop_preheader_Section'] || ''}

  <!-- Logo and Header -->
  ${this.sections['Desktop_app_bullet_section'] || ''}
  ${this.sections['Padding_3_24px_Section'] || ''}

  <!-- Main Content -->
  ${this.sections['Desktop_app_download_steps_section'] || ''}

  <!-- Care Team -->
  ${this.sections['Desktop_care_team_image_Section'] || ''}

  <!-- Questions -->
  ${this.sections['Desktop_questions_Section'] || ''}

  <!-- Footer -->
  ${this.sections['Desktop_footer_Section'] || ''}
  ${this.sections['Desktop_disclaimer_Section'] || ''}
</body>
</html>`;
  }
}

// Make sure we're exporting correctly
module.exports = IterableAPI; 