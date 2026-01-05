#!/usr/bin/env node

/**
 * SuiBets Platform Vercel Deployment Helper
 * 
 * This script helps prepare and deploy the SuiBets platform to Vercel.
 * It sets up the necessary environment variables and triggers the deployment.
 */

const { execSync } = require('child_process');
const fs = require('fs');
const readline = require('readline');

// Create readline interface for user input
const rl = readline.createInterface({
  input: process.stdin,
  output: process.stdout
});

console.log('\n🚀 SuiBets Platform - Vercel Deployment Helper\n');
console.log('This script will help you deploy the SuiBets platform to Vercel.\n');

// Function to prompt for environment variables
const promptForEnvVars = () => {
  return new Promise((resolve) => {
    const envVars = {};

    console.log('Please provide the following environment variables:\n');

    rl.question('Database URL (e.g., postgresql://user:pass@host:port/db): ', (dbUrl) => {
      envVars.DATABASE_URL = dbUrl;

      rl.question('API Sports Key: ', (apiKey) => {
        envVars.API_SPORTS_KEY = apiKey;

        rl.question('Walrus API Key (optional): ', (walrusKey) => {
          envVars.WALRUS_API_KEY = walrusKey || '';

          console.log('\nEnvironment variables collected. Thank you!\n');
          resolve(envVars);
        });
      });
    });
  });
};

// Function to deploy to Vercel
const deployToVercel = (envVars) => {
  try {
    console.log('Setting up environment variables for Vercel...\n');
    
    // Create .env file for local development
    const envContent = Object.entries(envVars)
      .map(([key, value]) => `${key}=${value}`)
      .join('\n');
    
    fs.writeFileSync('.env', envContent);
    console.log('✅ Created .env file\n');

    // Check if vercel CLI is installed
    try {
      execSync('vercel --version', { stdio: 'ignore' });
    } catch (err) {
      console.log('⚠️ Vercel CLI not found. Installing it...');
      execSync('npm install -g vercel', { stdio: 'inherit' });
      console.log('✅ Vercel CLI installed\n');
    }

    // Set Vercel environment variables
    console.log('Setting Vercel environment variables...');
    Object.entries(envVars).forEach(([key, value]) => {
      if (value) {
        execSync(`vercel env add ${key} ${value}`, { stdio: 'inherit' });
      }
    });
    console.log('✅ Environment variables set\n');

    // Deploy to Vercel
    console.log('Deploying to Vercel...');
    execSync('vercel --prod', { stdio: 'inherit' });
    console.log('✅ Deployment completed!\n');

  } catch (error) {
    console.error('\n❌ Deployment failed with error:', error.message);
    console.log('\nPlease try deploying manually using:');
    console.log('  vercel');
  } finally {
    rl.close();
  }
};

// Main function
const main = async () => {
  try {
    const envVars = await promptForEnvVars();
    deployToVercel(envVars);
  } catch (error) {
    console.error('\n❌ An error occurred:', error.message);
    rl.close();
  }
};

// Run the script
main();