/**
 * Mock for @modelcontextprotocol/sdk/server/stdio.js
 */

const StdioServerTransport = jest.fn().mockImplementation(() => ({
  start: jest.fn().mockResolvedValue(undefined),
  close: jest.fn().mockResolvedValue(undefined),
  send: jest.fn().mockResolvedValue(undefined)
}));

module.exports = { StdioServerTransport };