/**
 * Mock for @modelcontextprotocol/sdk/types.js
 */

// Mock MCP types and schemas
const ListToolsRequestSchema = {
  method: 'tools/list',
  type: 'request'
};

const CallToolRequestSchema = {
  method: 'tools/call',
  type: 'request'
};

const MCPError = jest.fn().mockImplementation((code, message, data) => ({
  code,
  message,
  data
}));

// Mock tool response types
const createMockToolResponse = (content) => ({
  content: Array.isArray(content) ? content : [{ type: 'text', text: String(content) }]
});

const createMockErrorResponse = (code, message, data) => ({
  error: {
    code,
    message,
    data
  }
});

// Mock server capabilities
const createMockCapabilities = () => ({
  tools: {},
  resources: {},
  prompts: {},
  logging: {}
});

// Mock server info
const createMockServerInfo = (name, version) => ({
  name,
  version,
  protocolVersion: '2024-11-05'
});

module.exports = {
  ListToolsRequestSchema,
  CallToolRequestSchema,
  MCPError,
  createMockToolResponse,
  createMockErrorResponse,
  createMockCapabilities,
  createMockServerInfo
};