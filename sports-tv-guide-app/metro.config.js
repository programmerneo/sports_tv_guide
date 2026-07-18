// Learn more: https://docs.expo.dev/guides/customizing-metro/
const { getDefaultConfig } = require('expo/metro-config');
const path = require('path');

const config = getDefaultConfig(__dirname);

// zustand's ESM build (esm/*.mjs) uses `import.meta`, which is a parse-time
// SyntaxError in Expo's classic-script web bundle. On web, Metro resolves
// zustand through its `import` export condition and picks that ESM build,
// breaking `expo start --web`. Redirect zustand to its CommonJS build on web
// only — native keeps its normal (already CJS via the `react-native`
// condition) resolution, and no other package is affected.
const zustandDir = path.dirname(require.resolve('zustand/package.json'));

config.resolver.resolveRequest = (context, moduleName, platform) => {
  if (platform === 'web' && (moduleName === 'zustand' || moduleName.startsWith('zustand/'))) {
    const subpath = moduleName === 'zustand' ? 'index' : moduleName.slice('zustand/'.length);
    return {
      type: 'sourceFile',
      filePath: path.join(zustandDir, `${subpath}.js`),
    };
  }
  return context.resolveRequest(context, moduleName, platform);
};

module.exports = config;
