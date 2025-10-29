#!/usr/bin/env ts-node

/**
 * Migration Utility: Frame to Mini App Conversion
 *
 * This script helps migrate existing Farcaster Frame applications
 * to the new Mini App format with proper validation and updates.
 */

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

// Types
interface FrameEmbed {
  version: "next" | "1";
  imageUrl: string;
  button: {
    title: string;
    action: {
      type: string;
      name?: string;
      url?: string;
      splashImageUrl?: string;
      splashBackgroundColor?: string;
    };
  };
}

interface MiniAppEmbed {
  version: "1";
  imageUrl: string;
  button: {
    title: string;
    action: {
      type: "launch_frame";
      name?: string;
      url?: string;
      splashImageUrl?: string;
      splashBackgroundColor?: string;
    };
  };
}

interface ManifestFile {
  accountAssociation?: any;
  frame?: any;
  miniApp?: any;
}

// Configuration
const PROJECT_ROOT = process.cwd();
const MANIFEST_PATH = path.join(PROJECT_ROOT, 'public', '.well-known', 'farcaster.json');

// Colors for console output
const colors = {
  red: '\x1b[31m',
  green: '\x1b[32m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  magenta: '\x1b[35m',
  cyan: '\x1b[36m',
  reset: '\x1b[0m',
  bold: '\x1b[1m',
};

function log(message: string, color: keyof typeof colors = 'reset') {
  console.log(`${colors[color]}${message}${colors.reset}`);
}

function logStep(step: number, message: string) {
  log(`\n${step}. ${message}`, 'blue');
}

function logSuccess(message: string) {
  log(`✅ ${message}`, 'green');
}

function logWarning(message: string) {
  log(`⚠️  ${message}`, 'yellow');
}

function logError(message: string) {
  log(`❌ ${message}`, 'red');
}

/**
 * Convert Frame embed to Mini App embed
 */
function convertFrameToMiniApp(frameEmbed: FrameEmbed): MiniAppEmbed {
  return {
    version: "1",
    imageUrl: frameEmbed.imageUrl,
    button: {
      title: frameEmbed.button.title,
      action: {
        type: "launch_frame",
        name: frameEmbed.button.action.name,
        url: frameEmbed.button.action.url,
        splashImageUrl: frameEmbed.button.action.splashImageUrl,
        splashBackgroundColor: frameEmbed.button.action.splashBackgroundColor,
      },
    },
  };
}

/**
 * Update manifest file from frame to miniApp format
 */
function updateManifest(): boolean {
  try {
    if (!fs.existsSync(MANIFEST_PATH)) {
      logWarning('Manifest file not found, skipping...');
      return true;
    }

    const manifestContent = fs.readFileSync(MANIFEST_PATH, 'utf8');
    const manifest: ManifestFile = JSON.parse(manifestContent);

    let updated = false;

    // Convert frame to miniApp if present
    if (manifest.frame && !manifest.miniApp) {
      manifest.miniApp = manifest.frame;
      delete manifest.frame;
      updated = true;
      logSuccess('Converted manifest from frame to miniApp format');
    }

    // Update version if needed
    if (manifest.miniApp && manifest.miniApp.version !== "1") {
      manifest.miniApp.version = "1";
      updated = true;
      logSuccess('Updated miniApp version to "1"');
    }

    if (updated) {
      fs.writeFileSync(MANIFEST_PATH, JSON.stringify(manifest, null, 2));
      logSuccess('Manifest file updated successfully');
    } else {
      log('Manifest already in correct format', 'cyan');
    }

    return true;
  } catch (error) {
    logError(`Failed to update manifest: ${error}`);
    return false;
  }
}

/**
 * Find and update meta tags in files
 */
function updateMetaTags(): boolean {
  const patterns = [
    'app/**/page.tsx',
    'app/**/layout.tsx',
    'pages/**/*.tsx',
    'components/**/*.tsx',
  ];

  let filesUpdated = 0;
  let totalFiles = 0;

  try {
    // Use glob pattern matching to find files
    const { glob } = require('glob');

    for (const pattern of patterns) {
      const files = glob.sync(pattern, { cwd: PROJECT_ROOT });

      for (const file of files) {
        const filePath = path.join(PROJECT_ROOT, file);
        const content = fs.readFileSync(filePath, 'utf8');

        totalFiles++;

        // Check if file contains frame-related meta tags
        if (content.includes('fc:frame') && !content.includes('fc:miniapp')) {
          let updatedContent = content;

          // Replace fc:frame with fc:miniapp (keeping fc:frame for backward compatibility)
          updatedContent = updatedContent.replace(
            /"fc:frame"/g,
            '"fc:miniapp"'
          );

          // Update version from "next" to "1"
          updatedContent = updatedContent.replace(
            /"version":"next"/g,
            '"version":"1"'
          );

          // Add backward compatibility
          if (!updatedContent.includes('"fc:frame"')) {
            updatedContent = updatedContent.replace(
              /"fc:miniapp":/g,
              '"fc:miniapp":$&,\n      "fc:frame":'
            );
          }

          if (updatedContent !== content) {
            fs.writeFileSync(filePath, updatedContent);
            filesUpdated++;
            log(`Updated: ${file}`, 'cyan');
          }
        }
      }
    }

    logSuccess(`Updated ${filesUpdated} out of ${totalFiles} files`);
    return true;
  } catch (error) {
    logError(`Failed to update meta tags: ${error}`);
    return false;
  }
}

/**
 * Update package.json dependencies
 */
function updateDependencies(): boolean {
  const packageJsonPath = path.join(PROJECT_ROOT, 'package.json');

  try {
    if (!fs.existsSync(packageJsonPath)) {
      logError('package.json not found');
      return false;
    }

    const packageContent = fs.readFileSync(packageJsonPath, 'utf8');
    const packageJson = JSON.parse(packageContent);

    let updated = false;
    const deps = packageJson.dependencies || {};

    // Remove old frame dependencies
    const oldDeps = [
      '@farcaster/frame-node',
      '@farcaster/frame-sdk',
      '@farcaster/frame-wagmi-connector',
      '@frames.js/debugger',
    ];

    for (const dep of oldDeps) {
      if (deps[dep]) {
        delete deps[dep];
        updated = true;
        log(`Removed: ${dep}`, 'yellow');
      }
    }

    // Add new Mini App SDK
    if (!deps['@farcaster/miniapp-sdk']) {
      deps['@farcaster/miniapp-sdk'] = '^0.0.61';
      updated = true;
      log('Added: @farcaster/miniapp-sdk', 'green');
    }

    if (updated) {
      fs.writeFileSync(packageJsonPath, JSON.stringify(packageJson, null, 2));
      logSuccess('Dependencies updated successfully');
      logWarning('Run "npm install" to install new dependencies');
    } else {
      log('Dependencies already up to date', 'cyan');
    }

    return true;
  } catch (error) {
    logError(`Failed to update dependencies: ${error}`);
    return false;
  }
}

/**
 * Generate migration report
 */
function generateReport(): void {
  log('\n' + '='.repeat(50), 'magenta');
  log('MIGRATION REPORT', 'bold');
  log('='.repeat(50), 'magenta');

  log('\nChecklist for manual updates:', 'yellow');
  log('□ Update imports from frame SDK to miniapp SDK');
  log('□ Replace frame context with miniapp context');
  log('□ Update notification handling');
  log('□ Test Mini App in Farcaster client');
  log('□ Verify manifest signing if needed');
  log('□ Update webhook event handlers');

  log('\nNext steps:', 'cyan');
  log('1. Run "npm install" to install new dependencies');
  log('2. Test the application in a Farcaster client');
  log('3. Update any custom frame-specific logic');
  log('4. Verify all Mini App functionality works correctly');

  log('\nUseful resources:', 'blue');
  log('- Mini App Documentation: https://miniapps.farcaster.xyz/');
  log('- Migration Guide: https://docs.base.org/mini-apps/quickstart/migrate-existing-apps');
  log('- SDK Reference: https://miniapps.farcaster.xyz/docs/sdk');
}

/**
 * Main migration function
 */
async function main() {
  log('🚀 Starting Frame to Mini App Migration', 'bold');
  log('=====================================\n', 'magenta');

  let success = true;

  // Step 1: Update manifest
  logStep(1, 'Updating manifest file...');
  if (!updateManifest()) {
    success = false;
  }

  // Step 2: Update dependencies
  logStep(2, 'Updating package.json dependencies...');
  if (!updateDependencies()) {
    success = false;
  }

  // Step 3: Update meta tags
  logStep(3, 'Updating meta tags in source files...');
  if (!updateMetaTags()) {
    success = false;
  }

  // Step 4: Generate report
  logStep(4, 'Generating migration report...');
  generateReport();

  if (success) {
    log('\n🎉 Migration completed successfully!', 'green');
  } else {
    log('\n⚠️  Migration completed with warnings. Please review the errors above.', 'yellow');
  }

  log('\nDone! 🏃‍♂️', 'bold');
}

// Run the migration
if (require.main === module) {
  main().catch((error) => {
    logError(`Migration failed: ${error}`);
    process.exit(1);
  });
}

export { main, updateManifest, updateDependencies, updateMetaTags };
