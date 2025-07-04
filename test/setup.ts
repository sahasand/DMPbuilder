import dotenv from 'dotenv';

// Load test environment variables
dotenv.config({ path: '.env.test' });

// Set test environment
process.env.NODE_ENV = 'test';
process.env.LOG_LEVEL = 'error'; // Reduce log noise in tests

// Mock console methods to reduce test output noise
global.console = {
  ...console,
  log: jest.fn(),
  debug: jest.fn(),
  info: jest.fn(),
  warn: jest.fn(),
  error: jest.fn(),
};

// Increase test timeout for CI environments
jest.setTimeout(30000);

// Global test utilities
global.beforeEach(() => {
  // Clear all mocks before each test
  jest.clearAllMocks();
});

// Mock external dependencies
jest.mock('@anthropic-ai/sdk', () => ({
  default: jest.fn().mockImplementation(() => ({
    messages: {
      create: jest.fn().mockResolvedValue({
        content: [{
          type: 'text',
          text: JSON.stringify({
            studyTitle: 'Mock Study',
            protocolNumber: 'MOCK-001',
            studyPhase: '2',
          }),
        }],
      }),
    },
  })),
}));

// Mock file system for tests
jest.mock('fs/promises', () => ({
  readFile: jest.fn(),
  writeFile: jest.fn(),
  mkdir: jest.fn(),
  stat: jest.fn(),
}));

// Export test utilities
export const mockProtocolPDF = Buffer.from('Mock Protocol PDF Content');
export const mockCRFPDF = Buffer.from('Mock CRF PDF Content');

export const createMockFile = (content: string): Buffer => {
  return Buffer.from(content);
};