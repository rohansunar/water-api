// Increase timeout for e2e tests
jest.setTimeout(30000);

// Mock MongoDB connection for testing
jest.mock('mongoose', () => ({
  connect: jest.fn().mockResolvedValue({}),
  connection: {
    readyState: 1,
    close: jest.fn().mockResolvedValue({}),
  },
  Schema: jest.fn(),
  model: jest.fn(),
}));
