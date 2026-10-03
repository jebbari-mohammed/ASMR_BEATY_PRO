/** @type {import('ts-jest').JestConfigWithTsJest} */
module.exports = {
  preset: 'ts-jest',
  testEnvironment: 'node',
  roots: ['<rootDir>/src'],
  testMatch: ['**/__tests__/**/*.test.ts'],
  transform: {
    '^.+\\.tsx?$': ['ts-jest', { tsconfig: { module: 'CommonJS', moduleResolution: 'Node', rootDir: '.', ignoreDeprecations: '6.0', jsx: 'react-jsx', esModuleInterop: true, skipLibCheck: true }, isolatedModules: true }]
  },
  moduleFileExtensions: ['ts', 'js', 'json', 'node']
};
