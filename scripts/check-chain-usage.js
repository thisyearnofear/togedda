#!/usr/bin/env node

/**
 * Script to check for deprecated chain-specific function usage
 * Helps identify files that need migration to dual-chain-service.ts
 */

const fs = require('fs');
const path = require('path');

// Deprecated functions that should be migrated
const DEPRECATED_FUNCTIONS = [
  'getUserVote',
  'getFeeInfo', 
  'getAllPredictions',
  'getPrediction'
];

// Files to exclude from checking
const EXCLUDE_FILES = [
  'prediction-market-v2.ts', // The deprecated file itself
  'check-chain-usage.js',    // This script
  'node_modules',
  '.git',
  '.next',
  'dist',
  'build'
];

function shouldExclude(filePath) {
  return EXCLUDE_FILES.some(exclude => filePath.includes(exclude));
}

function checkFile(filePath) {
  if (shouldExclude(filePath)) return [];
  
  try {
    const content = fs.readFileSync(filePath, 'utf8');
    const issues = [];
    
    // Check for imports from prediction-market-v2
    if (content.includes('from "@/lib/prediction-market-v2"') || 
        content.includes('from \'@/lib/prediction-market-v2\'')) {
      issues.push({
        type: 'import',
        message: 'Imports from deprecated prediction-market-v2.ts'
      });
    }
    
    // Check for deprecated function usage
    DEPRECATED_FUNCTIONS.forEach(func => {
      const regex = new RegExp(`\\b${func}\\s*\\(`, 'g');
      const matches = content.match(regex);
      if (matches) {
        issues.push({
          type: 'function',
          message: `Uses deprecated function: ${func}()`,
          count: matches.length
        });
      }
    });
    
    return issues;
  } catch (error) {
    return [];
  }
}

function scanDirectory(dir) {
  const results = {};
  
  function scan(currentDir) {
    const items = fs.readdirSync(currentDir);
    
    for (const item of items) {
      const fullPath = path.join(currentDir, item);
      const stat = fs.statSync(fullPath);
      
      if (stat.isDirectory() && !shouldExclude(fullPath)) {
        scan(fullPath);
      } else if (stat.isFile() && (item.endsWith('.ts') || item.endsWith('.tsx'))) {
        const issues = checkFile(fullPath);
        if (issues.length > 0) {
          results[fullPath] = issues;
        }
      }
    }
  }
  
  scan(dir);
  return results;
}

function main() {
  console.log('🔍 Checking for deprecated chain function usage...\n');
  
  const results = scanDirectory('.');
  const fileCount = Object.keys(results).length;
  
  if (fileCount === 0) {
    console.log('✅ No deprecated chain function usage found!');
    console.log('All files are using the chain-aware dual-chain-service.ts');
    return;
  }
  
  console.log(`⚠️  Found ${fileCount} files with deprecated usage:\n`);
  
  Object.entries(results).forEach(([filePath, issues]) => {
    console.log(`📄 ${filePath}`);
    issues.forEach(issue => {
      const count = issue.count ? ` (${issue.count} times)` : '';
      console.log(`   ${issue.type === 'import' ? '📦' : '🔧'} ${issue.message}${count}`);
    });
    console.log('');
  });
  
  console.log('🔧 Migration Steps:');
  console.log('1. Replace imports: prediction-market-v2 → dual-chain-service');
  console.log('2. Add chain parameter to function calls');
  console.log('3. Use getChainUserVote, getChainFeeInfo, etc.');
  console.log('4. See CHAIN_MIGRATION_GUIDE.md for details');
  console.log('');
  console.log('💡 Run this script again after migration to verify fixes.');
}

if (require.main === module) {
  main();
}

module.exports = { checkFile, scanDirectory };
