const childProcess = require('child_process');
const fs = require('fs');
const path = require('path');

function runCommand(command, cwd = process.cwd()) {
  console.log(`Running: ${command} in ${cwd}`);
  childProcess.execSync(command, { stdio: 'inherit', cwd });
}

try {
  const rootDir = path.join(__dirname, '..');
  
  // 1. Build the Next.js app in standalone mode
  console.log('--- Step 1: Building Next.js standalone application ---');
  runCommand('npm run build', rootDir);

  // 2. Copy static files & public files into standalone folder
  console.log('--- Step 2: Copying static resources into standalone directory ---');
  const standaloneDir = path.join(rootDir, '.next', 'standalone');
  
  // Copy public assets
  const publicSrc = path.join(rootDir, 'public');
  const publicDest = path.join(standaloneDir, 'public');
  if (fs.existsSync(publicSrc)) {
    console.log(`Copying ${publicSrc} to ${publicDest}...`);
    fs.cpSync(publicSrc, publicDest, { recursive: true, force: true });
  }

  // Copy .next/static compiled frontend chunks
  const staticSrc = path.join(rootDir, '.next', 'static');
  const staticDest = path.join(standaloneDir, '.next', 'static');
  if (fs.existsSync(staticSrc)) {
    console.log(`Copying ${staticSrc} to ${staticDest}...`);
    fs.cpSync(staticSrc, staticDest, { recursive: true, force: true });
  }

  // Copy .env if it exists
  const envSrc = path.join(rootDir, '.env');
  const envDest = path.join(standaloneDir, '.env');
  if (fs.existsSync(envSrc)) {
    console.log(`Copying ${envSrc} to ${envDest}...`);
    fs.copyFileSync(envSrc, envDest);
  }

  // 3. Package the application with electron-builder
  console.log('--- Step 3: Packaging with electron-builder ---');
  runCommand('npx electron-builder --win', rootDir);
  
  console.log('--- Desktop packaging completed successfully! ---');
} catch (error) {
  console.error('Desktop build failed:', error);
  process.exit(1);
}
