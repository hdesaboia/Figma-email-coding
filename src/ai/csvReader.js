const fs = require('fs');
const csv = require('csv-parse');
const path = require('path');

class CSVReader {
  static async readEmailPairs(filePath) {
    try {
      console.log(`Reading CSV from: ${filePath}`);
      
      return new Promise((resolve, reject) => {
        const results = [];
        
        fs.createReadStream(filePath)
          .pipe(csv.parse({ columns: true, skip_empty_lines: true }))
          .on('data', (data) => {
            results.push(data);
            // Log the first row's structure
            if (results.length === 1) {
              console.log('\nCSV Columns:', Object.keys(data));
              console.log('\nFirst Row Data:', data);
            }
          })
          .on('end', () => {
            console.log(`\nFound ${results.length} rows`);
            resolve(results);
          })
          .on('error', (error) => {
            reject(error);
          });
      });
    } catch (error) {
      console.error('CSV Reading Error:', error);
      throw error;
    }
  }
}

module.exports = CSVReader; 