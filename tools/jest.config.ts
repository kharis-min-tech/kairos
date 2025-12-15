/* eslint-disable */
export default {
  displayName: 'tools',
  preset: '../jest.preset.js',
  testEnvironment: 'node',
  transform: {
    '^.+\\.[tj]s$': ['ts-jest', { tsconfig: '<rootDir>/tsconfig.json' }],
  },
  moduleFileExtensions: ['ts', 'js'],
  coverageDirectory: '../coverage/tools',
  testMatch: ['<rootDir>/**/*.spec.ts'],
  testTimeout: 180000,
  setupFilesAfterEnv: ['<rootDir>/test-setup.ts'],
};
