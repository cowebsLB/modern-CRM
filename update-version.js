#!/usr/bin/env node

/**
 * 🔥 Auto-Update Version Script
 * 
 * This script automatically:
 * 1. Increments the service worker version
 * 2. Updates cache version in SW
 * 3. Updates script versions in HTML
 * 4. Creates new versioned SW file
 * 
 * Run this whenever you make changes to ensure users get updates!
 */

const fs = require('fs');
const path = require('path');

// Get current timestamp for versioning
const now = new Date();
const version = `${now.getFullYear()}${String(now.getMonth() + 1).padStart(2, '0')}${String(now.getDate()).padStart(2, '0')}${String(now.getHours()).padStart(2, '0')}${String(now.getMinutes()).padStart(2, '0')}`;

console.log('🚀 Updating CRM version to:', version);

// 1. Update service worker cache version
const swPath = './sw.js';
let swContent = fs.readFileSync(swPath, 'utf8');

// Update cache name
swContent = swContent.replace(
    /const CACHE_NAME = 'modern-crm-v[\d\.]+';/,
    `const CACHE_NAME = 'modern-crm-v${version}';`
);

// Update install log
swContent = swContent.replace(
    /console\.log\('Service Worker v[\d\.]+: Installing\.\.\.'\);/,
    `console.log('Service Worker v${version}: Installing...');`
);

// Update activate log
swContent = swContent.replace(
    /console\.log\('Service Worker v[\d\.]+: Activating\.\.\.'\);/,
    `console.log('Service Worker v${version}: Activating...');`
);

fs.writeFileSync(swPath, swContent);

// 2. Create versioned service worker file
const versionedSwPath = `./sw-v${version}.js`;
fs.writeFileSync(versionedSwPath, swContent);

// 3. Update main.js to reference new versioned SW
const mainJsPath = './js/main.js';
let mainJsContent = fs.readFileSync(mainJsPath, 'utf8');

mainJsContent = mainJsContent.replace(
    /navigator\.serviceWorker\.register\('sw-v[\d]+\.js'\)/,
    `navigator.serviceWorker.register('sw-v${version}.js')`
);

fs.writeFileSync(mainJsPath, mainJsContent);

// 4. Update HTML script versions
const htmlPath = './index.html';
let htmlContent = fs.readFileSync(htmlPath, 'utf8');

htmlContent = htmlContent.replace(
    /src="js\/([^"]+)\.js\?v=\d+"/g,
    `src="js/$1.js?v=${version}"`
);

fs.writeFileSync(htmlPath, htmlContent);

console.log('✅ Version updated successfully!');
console.log('📁 Files updated:');
console.log('  - sw.js (cache version)');
console.log(`  - ${versionedSwPath} (new versioned worker)`);
console.log('  - js/main.js (worker registration)');
console.log('  - index.html (script versions)');
console.log('');
console.log('🔥 Users will now get the latest version automatically!');
console.log('💡 Tip: Run this script every time you make changes.');
