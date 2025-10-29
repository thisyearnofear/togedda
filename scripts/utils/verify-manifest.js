#!/usr/bin/env node

const https = require('https');
const fs = require('fs');
const path = require('path');

// Get the domain from command line arguments or use default
const domain = process.argv[2] || 'togedda.vercel.app';

console.log(`Verifying Farcaster manifest for domain: ${domain}`);

// Paths to check
const paths = [
  '/.well-known/farcaster.json',
  '/.well-known/farcaster/manifest.json'
];

// Function to fetch a URL and return the response
function fetchUrl(url) {
  return new Promise((resolve, reject) => {
    https.get(url, (res) => {
      let data = '';
      
      // A chunk of data has been received
      res.on('data', (chunk) => {
        data += chunk;
      });
      
      // The whole response has been received
      res.on('end', () => {
        if (res.statusCode === 200) {
          try {
            const jsonData = JSON.parse(data);
            resolve({
              statusCode: res.statusCode,
              headers: res.headers,
              data: jsonData
            });
          } catch (e) {
            reject(new Error(`Failed to parse JSON: ${e.message}`));
          }
        } else {
          reject(new Error(`Request failed with status code: ${res.statusCode}`));
        }
      });
    }).on('error', (err) => {
      reject(err);
    });
  });
}

// Verify each path
async function verifyPaths() {
  for (const path of paths) {
    const url = `https://${domain}${path}`;
    console.log(`\nChecking ${url}...`);
    
    try {
      const response = await fetchUrl(url);
      console.log(`✅ Success! Status code: ${response.statusCode}`);
      
      // Verify the manifest structure
      if (response.data.frame && response.data.frame.version === '1') {
        console.log('✅ Valid manifest structure found');
        
        // Check for account association
        if (response.data.accountAssociation) {
          console.log('✅ Account association found');
        } else {
          console.log('❌ No account association found');
        }
        
        // Check required fields
        const requiredFields = ['name', 'iconUrl', 'homeUrl'];
        const missingFields = requiredFields.filter(field => !response.data.frame[field]);
        
        if (missingFields.length === 0) {
          console.log('✅ All required fields present');
        } else {
          console.log(`❌ Missing required fields: ${missingFields.join(', ')}`);
        }
      } else {
        console.log('❌ Invalid manifest structure');
      }
    } catch (error) {
      console.log(`❌ Error: ${error.message}`);
    }
  }
}

// Run the verification
verifyPaths().catch(err => {
  console.error('Verification failed:', err);
  process.exit(1);
});
