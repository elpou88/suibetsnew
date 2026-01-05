/**
 * Script to prepare the SuiBets Platform for download and deployment to Walrus
 * 
 * This script:
 * 1. Copies all necessary files
 * 2. Excludes development files, node_modules, etc.
 * 3. Creates a walrus-ready structure
 * 4. Includes deployment instructions
 */

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Create the download directory structure
const DOWNLOAD_DIR = 'suibets-platform-download';
if (!fs.existsSync(DOWNLOAD_DIR)) {
  fs.mkdirSync(DOWNLOAD_DIR);
}

// Create the directory structure
const directories = [
  'client',
  'client/src',
  'client/src/components',
  'client/src/pages',
  'client/src/context',
  'client/src/lib',
  'client/src/hooks',
  'client/src/types',
  'server',
  'shared',
  'move',
  'scripts',
  'public'
];

directories.forEach(dir => {
  const dirPath = path.join(DOWNLOAD_DIR, dir);
  if (!fs.existsSync(dirPath)) {
    fs.mkdirSync(dirPath, { recursive: true });
  }
});

// Copy the important configuration files
const configFiles = [
  'package.json',
  'package-lock.json',
  'tsconfig.json',
  'tailwind.config.ts',
  'vite.config.ts',
  'postcss.config.js',
  'theme.json',
  'README.md'
];

configFiles.forEach(file => {
  if (fs.existsSync(file)) {
    fs.copyFileSync(file, path.join(DOWNLOAD_DIR, file));
  }
});

// Copy directories recursively
function copyDir(src, dest) {
  if (!fs.existsSync(src)) {
    return;
  }
  
  fs.mkdirSync(dest, { recursive: true });
  
  const entries = fs.readdirSync(src, { withFileTypes: true });
  
  for (const entry of entries) {
    const srcPath = path.join(src, entry.name);
    const destPath = path.join(dest, entry.name);
    
    // Skip node_modules, dist, .git, etc.
    if (entry.name === 'node_modules' || 
        entry.name === 'dist' || 
        entry.name === '.git' ||
        entry.name === '.next' ||
        entry.name === '.cache') {
      continue;
    }
    
    if (entry.isDirectory()) {
      copyDir(srcPath, destPath);
    } else {
      fs.copyFileSync(srcPath, destPath);
    }
  }
}

// Copy main directories
copyDir('client', path.join(DOWNLOAD_DIR, 'client'));
copyDir('server', path.join(DOWNLOAD_DIR, 'server'));
copyDir('shared', path.join(DOWNLOAD_DIR, 'shared'));
copyDir('move', path.join(DOWNLOAD_DIR, 'move'));
copyDir('scripts', path.join(DOWNLOAD_DIR, 'scripts'));
copyDir('public', path.join(DOWNLOAD_DIR, 'public'));

// Create a .env.example file
const envExample = `# SuiBets Platform Environment Variables

# Sports API Keys
API_SPORTS_KEY=your_api_key_here
SPORTSDATA_API_KEY=your_api_key_here
BOXING_API_KEY=your_api_key_here

# Blockchain Integration
WURLUS_API_KEY=your_wurlus_key_here
WAL_APP_API_KEY=your_walapp_key_here

# Database Connection (if needed)
DATABASE_URL=your_database_url_here

# Other Configuration
NODE_ENV=production
`;

fs.writeFileSync(path.join(DOWNLOAD_DIR, '.env.example'), envExample);

// Create a deployment instructions file
const deploymentInstructions = `# SuiBets Platform Deployment Guide

## Requirements

- Node.js v18+ 
- Walrus CLI
- Sui CLI (for blockchain operations)
- Sports API keys

## Deployment Steps

### 1. Install Walrus CLI

\`\`\`bash
npm install -g @walrus-app/cli
\`\`\`

### 2. Configure Environment

Copy .env.example to .env and add your API keys:

\`\`\`bash
cp .env.example .env
\`\`\`

Edit the .env file with your actual API keys.

### 3. Install Dependencies

\`\`\`bash
npm install
\`\`\`

### 4. Deploy with Walrus

\`\`\`bash
walrus deploy
\`\`\`

### 5. Configure Network

\`\`\`bash
walrus config set network testnet
# or for production:
# walrus config set network mainnet
\`\`\`

### 6. Start the Application

\`\`\`bash
npm run dev
\`\`\`

## Features Included in this Platform

- Multi-language support (10 languages)
- Odds format conversion
- Settings that apply throughout the app
- Blockchain wallet integration
- Support for all 14 sports with proper market formatting
- Comprehensive DeFi staking with outcome yield farming
- Live events section with accordion-style categories

## Technical Support

For support, contact us at support@walrus-app.io
`;

fs.writeFileSync(path.join(DOWNLOAD_DIR, 'DEPLOYMENT.md'), deploymentInstructions);

// Create a walrus.json configuration file
const walrusConfig = {
  "name": "suibets-platform",
  "version": "1.3.2",
  "description": "Sports betting platform on the Sui blockchain",
  "scripts": {
    "dev": "npm run dev",
    "build": "npm run build",
    "start": "npm run start"
  },
  "blockchain": {
    "type": "sui",
    "network": "testnet"
  },
  "dependencies": {
    "api-keys": [
      "API_SPORTS_KEY",
      "WURLUS_API_KEY",
      "WAL_APP_API_KEY"
    ]
  }
};

fs.writeFileSync(path.join(DOWNLOAD_DIR, 'walrus.json'), JSON.stringify(walrusConfig, null, 2));

console.log('SuiBets platform prepared for download!');
console.log(`All files are available in the '${DOWNLOAD_DIR}' directory.`);
console.log('Use this directory to deploy to Walrus.');