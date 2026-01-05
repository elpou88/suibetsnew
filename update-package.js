/**
 * Script to update the suibets-platform.tar.gz package with latest changes
 * Only updates specific files that have been modified
 */

import { execSync } from 'child_process';
import { statSync } from 'fs';

// Files we've modified
const modifiedFiles = [
  'server/db.ts',
  '.env.example',
  'WALRUS_DEPLOYMENT.md',
  'DEPLOYMENT.md'
];

try {
  console.log('Creating temporary directory...');
  execSync('mkdir -p temp_package');

  console.log('Extracting current package...');
  execSync('tar -xzf suibets-platform.tar.gz -C temp_package');

  console.log('Updating modified files...');
  for (const file of modifiedFiles) {
    console.log(`Updating ${file}...`);
    execSync(`cp ${file} temp_package/${file}`);
  }

  console.log('Creating updated package...');
  execSync('tar -czf suibets-platform-updated.tar.gz -C temp_package .');

  console.log('Cleaning up...');
  execSync('rm -rf temp_package');

  console.log('Package updated successfully: suibets-platform-updated.tar.gz');
  
  // Get file size
  const stats = statSync('suibets-platform-updated.tar.gz');
  console.log(`Package size: ${(stats.size / (1024 * 1024)).toFixed(2)}MB`);
} catch (error) {
  console.error('Error updating package:', error.message);
  process.exit(1);
}