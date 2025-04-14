const fs = require('fs');
const csv = require('csv-parse');

class SnippetHandler {
  constructor() {
    this.snippets = new Map();
    this.snippetFile = '/Users/henrique.saboia/Downloads/Iterable Snippets Library - ID BASE_SFDC_2024 Master Template Snippets .csv';
  }

  async loadSnippets() {
    console.log('Loading snippets from CSV...');
    
    try {
      const fileContent = await fs.promises.readFile(this.snippetFile, 'utf-8');
      
      return new Promise((resolve, reject) => {
        csv.parse(fileContent, {
          columns: true,
          skip_empty_lines: true
        }, (err, records) => {
          if (err) {
            console.error('Error parsing CSV:', err);
            reject(err);
            return;
          }

          records.forEach(record => {
            this.snippets.set(record['Snippet Name'], {
              name: record['Snippet Name'],
              lastChecked: record['When last checked in ID Instance?'],
              link: record['Link'],
              idBasedLink: record['ID Based LInk'],
              sandboxLink: record['Sandbox ID Link'],
              dynamicLogic: record['Dynamic Logics'],
              notes: record['Additional Notes'],
              status: record['Status']
            });
          });

          console.log(`Loaded ${this.snippets.size} snippets`);
          resolve(this.snippets);
        });
      });
    } catch (error) {
      console.error('Error reading snippet file:', error);
      throw error;
    }
  }

  getSnippet(name) {
    return this.snippets.get(name);
  }

  listAllSnippets() {
    return Array.from(this.snippets.keys());
  }
}

module.exports = SnippetHandler; 