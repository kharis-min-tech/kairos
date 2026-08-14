const path = require('path');

const workspaceRoot = path.resolve(__dirname, '../..');

module.exports = {
  preset: 'jest-expo',
  setupFiles: ['<rootDir>/jest.setup.ts'],
  moduleNameMapper: {
    '^@/(.*)$': '<rootDir>/$1',
    '^@kairos/api-client$': path.join(workspaceRoot, 'packages/api-client/src/index.ts'),
    '^@kairos/api-client/(.*)$': path.join(workspaceRoot, 'packages/api-client/src/$1'),
    '^@kairos/core$': path.join(workspaceRoot, 'packages/core/src/index.ts'),
    '^@kairos/core/(.*)$': path.join(workspaceRoot, 'packages/core/src/$1'),
    '^@kairos/types$': path.join(workspaceRoot, 'packages/types/src/index.ts'),
    '^@kairos/types/(.*)$': path.join(workspaceRoot, 'packages/types/src/$1'),
    '^@kairos/ui-native$': path.join(workspaceRoot, 'packages/ui-native/src/index.ts'),
    '^@kairos/ui-native/(.*)$': path.join(workspaceRoot, 'packages/ui-native/src/$1'),
  },
  testPathIgnorePatterns: ['/node_modules/', '/.expo/'],
  transformIgnorePatterns: [
    'node_modules/(?!((jest-)?react-native|@react-native(-community)?|expo(nent)?|@expo(nent)?/.*|@expo-google-fonts/.*|react-navigation|@react-navigation/.*|@unimodules/.*|unimodules|sentry-expo|native-base|react-native-svg|@kairos/.*))',
  ],
};
