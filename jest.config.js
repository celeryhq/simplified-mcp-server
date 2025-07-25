export default {
  preset: 'ts-jest/presets/default-esm',
  extensionsToTreatAsEsm: ['.ts'],
  testEnvironment: 'node',
  roots: ['<rootDir>/src', '<rootDir>/tests'],
  testMatch: [
    '**/__tests__/**/*.ts',
    '**/?(*.)+(spec|test).ts'
  ],
  transform: {
    '^.+\\.ts$': ['ts-jest', {
      useESM: true
    }]
  },
  transformIgnorePatterns: [
    'node_modules/(?!(@modelcontextprotocol)/)'
  ],
  collectCoverageFrom: [
    'src/**/*.ts',
    '!src/**/*.d.ts',
    '!src/**/__tests__/**',
    '!src/**/*.test.ts'
  ],
  coverageDirectory: 'coverage',
  coverageReporters: ['text', 'lcov', 'html'],
  moduleNameMapper: {
    '^(\\.{1,2}/.*)\\.js$': '$1',
    '^@modelcontextprotocol/sdk/server/index\\.js$': '<rootDir>/tests/__mocks__/@modelcontextprotocol/sdk/server/index.js',
    '^@modelcontextprotocol/sdk/server/stdio\\.js$': '<rootDir>/tests/__mocks__/@modelcontextprotocol/sdk/server/stdio.js',
    '^@modelcontextprotocol/sdk/types\\.js$': '<rootDir>/tests/__mocks__/@modelcontextprotocol/sdk/types.js'
  }
};