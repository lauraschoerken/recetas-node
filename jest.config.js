const path = require('path');
const dotenv = require('dotenv');

// Cargar variables de entorno de test ANTES de que Jest importe cualquier módulo
dotenv.config({ path: path.resolve(__dirname, '.env.test') });

module.exports = {
  preset: 'ts-jest',
  testEnvironment: 'node',
  roots: ['<rootDir>/src'],
  testMatch: ['**/*.test.ts'],
  moduleFileExtensions: ['ts', 'js', 'json'],
  collectCoverageFrom: [
    'src/**/*.ts',
    '!src/index.ts',
    '!src/**/*.d.ts'
  ],
  coverageDirectory: 'coverage',
  setupFilesAfterEnv: ['<rootDir>/src/tests/setup.ts'],
  globalSetup: '<rootDir>/src/tests/globalSetup.ts',
  globalTeardown: '<rootDir>/src/tests/globalTeardown.ts',
  testTimeout: 30000,
  verbose: true,
  // Ejecutar tests en serie para evitar conflictos de base de datos
  maxWorkers: 1
};
