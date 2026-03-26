const fs = require('fs');
const path = require('path');

const appJson = require('./app.json');

const config = appJson.expo;

// Only include googleServicesFile when the file exists
const googleServicesPath = path.resolve(__dirname, 'google-services.json');
if (!fs.existsSync(googleServicesPath)) {
  delete config.android.googleServicesFile;
}

module.exports = () => ({ expo: config });
