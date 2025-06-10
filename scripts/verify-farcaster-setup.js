#!/usr/bin/env node

const https = require('https');
const fs = require('fs');
const path = require('path');

// Get the domain from command line arguments or use default
const domain = process.argv[2] || 'imperfectminiapp.vercel.app';

console.log(`🔍 Verifying Farcaster Mini App setup for: ${domain}`);
console.log('=' .repeat(60));

// Check manifest file
function checkManifest() {
  return new Promise((resolve, reject) => {
    const url = `https://${domain}/.well-known/farcaster.json`;
    console.log(`📄 Checking manifest: ${url}`);
    
    https.get(url, (res) => {
      let data = '';
      
      res.on('data', (chunk) => {
        data += chunk;
      });
      
      res.on('end', () => {
        if (res.statusCode === 200) {
          try {
            const manifest = JSON.parse(data);
            console.log('✅ Manifest found and valid JSON');
            
            // Check required fields
            const required = ['accountAssociation', 'frame'];
            const missing = required.filter(field => !manifest[field]);
            
            if (missing.length > 0) {
              console.log(`❌ Missing required fields: ${missing.join(', ')}`);
              resolve(false);
              return;
            }
            
            // Check frame fields
            const frameRequired = ['version', 'name', 'iconUrl', 'homeUrl'];
            const frameMissing = frameRequired.filter(field => !manifest.frame[field]);
            
            if (frameMissing.length > 0) {
              console.log(`❌ Missing frame fields: ${frameMissing.join(', ')}`);
              resolve(false);
              return;
            }
            
            console.log(`✅ Frame name: ${manifest.frame.name}`);
            console.log(`✅ Frame version: ${manifest.frame.version}`);
            console.log(`✅ Home URL: ${manifest.frame.homeUrl}`);
            
            resolve(true);
          } catch (error) {
            console.log(`❌ Invalid JSON: ${error.message}`);
            resolve(false);
          }
        } else {
          console.log(`❌ Manifest not found (${res.statusCode})`);
          resolve(false);
        }
      });
    }).on('error', (error) => {
      console.log(`❌ Error fetching manifest: ${error.message}`);
      resolve(false);
    });
  });
}

// Check required assets
function checkAssets() {
  const assets = [
    '/logo.png',
    '/splash.png', 
    '/og.png',
    '/hero.png'
  ];
  
  return Promise.all(assets.map(asset => {
    return new Promise((resolve) => {
      const url = `https://${domain}${asset}`;
      console.log(`🖼️  Checking asset: ${asset}`);
      
      https.get(url, (res) => {
        if (res.statusCode === 200) {
          console.log(`✅ ${asset} found`);
          resolve(true);
        } else {
          console.log(`❌ ${asset} not found (${res.statusCode})`);
          resolve(false);
        }
      }).on('error', () => {
        console.log(`❌ ${asset} error`);
        resolve(false);
      });
    });
  }));
}

// Check frame metadata
function checkFrameMetadata() {
  return new Promise((resolve) => {
    const url = `https://${domain}`;
    console.log(`🏠 Checking frame metadata: ${url}`);
    
    https.get(url, (res) => {
      let data = '';
      
      res.on('data', (chunk) => {
        data += chunk;
      });
      
      res.on('end', () => {
        if (res.statusCode === 200) {
          const hasFrameMeta = data.includes('fc:frame');
          const hasFrameImage = data.includes('fc:frame:image');
          const hasFrameButton = data.includes('fc:frame:button');
          
          if (hasFrameMeta && hasFrameImage && hasFrameButton) {
            console.log('✅ Frame metadata found in HTML');
            resolve(true);
          } else {
            console.log('❌ Missing frame metadata in HTML');
            console.log(`   fc:frame: ${hasFrameMeta ? '✅' : '❌'}`);
            console.log(`   fc:frame:image: ${hasFrameImage ? '✅' : '❌'}`);
            console.log(`   fc:frame:button: ${hasFrameButton ? '✅' : '❌'}`);
            resolve(false);
          }
        } else {
          console.log(`❌ Cannot fetch homepage (${res.statusCode})`);
          resolve(false);
        }
      });
    }).on('error', (error) => {
      console.log(`❌ Error fetching homepage: ${error.message}`);
      resolve(false);
    });
  });
}

// Main verification
async function verify() {
  console.log('\n🔍 Starting verification...\n');
  
  const manifestOk = await checkManifest();
  console.log('');
  
  const assetsOk = await checkAssets();
  console.log('');
  
  const metadataOk = await checkFrameMetadata();
  console.log('');
  
  console.log('=' .repeat(60));
  console.log('📊 VERIFICATION SUMMARY');
  console.log('=' .repeat(60));
  console.log(`Manifest: ${manifestOk ? '✅ PASS' : '❌ FAIL'}`);
  console.log(`Assets: ${assetsOk.every(Boolean) ? '✅ PASS' : '❌ FAIL'}`);
  console.log(`Metadata: ${metadataOk ? '✅ PASS' : '❌ FAIL'}`);
  
  const allPassed = manifestOk && assetsOk.every(Boolean) && metadataOk;
  console.log(`\nOverall: ${allPassed ? '✅ READY FOR FARCASTER' : '❌ NEEDS FIXES'}`);
  
  if (!allPassed) {
    console.log('\n💡 Next steps:');
    if (!manifestOk) console.log('   - Fix manifest file issues');
    if (!assetsOk.every(Boolean)) console.log('   - Upload missing assets');
    if (!metadataOk) console.log('   - Add frame metadata to HTML');
    console.log('   - Re-run this script after fixes');
  }
}

verify().catch(console.error);
