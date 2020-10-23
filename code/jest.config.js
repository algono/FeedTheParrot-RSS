const { defaults } = require('jest-config');
module.exports = {
  preset: 'ts-jest',
  testEnvironment: 'node',
  testResultsProcessor: 'jest-sonar-reporter',
  coverageDirectory: 'sonarqube/coverage',
  coveragePathIgnorePatterns: [
    ...defaults.coveragePathIgnorePatterns,
    '<rootDir>/tests/helpers/',
  ],
};
