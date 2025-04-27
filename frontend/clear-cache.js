// clear-cache.js
const fs = require('fs');
const path = require('path');
const { exec } = require('child_process');

// Path to the Angular cache directory
const cachePath = path.join(__dirname, '.angular', 'cache');

console.log('Attempting to clear Angular cache...');

// Check if the cache directory exists
if (fs.existsSync(cachePath)) {
  try {
    // On Windows, use rmdir /s /q to force delete
    if (process.platform === 'win32') {
      exec(`rmdir /s /q "${cachePath}"`, (error, stdout, stderr) => {
        if (error) {
          console.error(`Error deleting cache: ${error.message}`);
          console.log('Trying alternative method...');
          
          // Try to rename the directory first (can help with locked files)
          const tempDir = `${cachePath}_old_${Date.now()}`;
          try {
            fs.renameSync(cachePath, tempDir);
            console.log(`Renamed cache directory to ${tempDir}`);
            console.log('Please delete this directory manually when possible.');
            console.log('You can now run ng serve or ng build again.');
          } catch (renameErr) {
            console.error(`Failed to rename directory: ${renameErr.message}`);
            console.log('Please try closing all applications that might be using the cache files.');
            console.log('Then run this script again or delete the cache directory manually.');
          }
          return;
        }
        console.log('Angular cache cleared successfully!');
      });
    } else {
      // For non-Windows platforms
      exec(`rm -rf "${cachePath}"`, (error, stdout, stderr) => {
        if (error) {
          console.error(`Error deleting cache: ${error.message}`);
          return;
        }
        console.log('Angular cache cleared successfully!');
      });
    }
  } catch (err) {
    console.error(`Error: ${err.message}`);
  }
} else {
  console.log('Cache directory does not exist. No action needed.');
}
