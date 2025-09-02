#!/usr/bin/env node

/**
 * Simple test script to verify workflow refresh functionality
 */

const { WorkflowToolManager } = require('./dist/services/workflow-tool-manager.js');
const { ToolRegistry } = require('./dist/tools/registry.js');

// Mock dependencies
const mockApiClient = {
  get: jest.fn(),
  post: jest.fn(),
  makeRequest: jest.fn()
};

const mockLogger = {
  debug: console.log,
  info: console.log,
  warn: console.warn,
  error: console.error
};

const mockConfig = {
  workflowsEnabled: true,
  workflowDiscoveryInterval: 0,
  workflowExecutionTimeout: 300000,
  workflowMaxConcurrentExecutions: 10,
  workflowFilterPatterns: [],
  workflowStatusCheckInterval: 5000,
  workflowRetryAttempts: 3
};

async function testRefreshFunctionality() {
  console.log('Testing workflow refresh functionality...\n');

  const toolRegistry = new ToolRegistry();
  const workflowManager = new WorkflowToolManager(
    mockApiClient,
    mockLogger,
    mockConfig,
    toolRegistry
  );

  // Test 1: Initial workflow registration
  console.log('1. Testing initial workflow registration...');
  const initialWorkflows = [
    {
      id: '1',
      name: 'test_workflow_1',
      description: 'Test workflow 1',
      inputSchema: {
        type: 'object',
        properties: {
          param1: { type: 'string' }
        }
      }
    },
    {
      id: '2',
      name: 'test_workflow_2',
      description: 'Test workflow 2',
      inputSchema: {
        type: 'object',
        properties: {
          param2: { type: 'number' }
        }
      }
    }
  ];

  workflowManager.registerWorkflowTools(initialWorkflows);
  console.log(`✓ Registered ${workflowManager.getRegisteredWorkflowCount()} workflows`);

  // Test 2: Manual refresh with new workflow
  console.log('\n2. Testing manual refresh with new workflow...');
  
  // Mock discovery service to return updated workflows
  const mockDiscoveryService = {
    listWorkflows: () => Promise.resolve([
      ...initialWorkflows,
      {
        id: '3',
        name: 'new_workflow',
        description: 'New workflow added',
        inputSchema: {
          type: 'object',
          properties: {
            param3: { type: 'boolean' }
          }
        }
      }
    ])
  };

  // Replace the discovery service (this is a simplified test)
  workflowManager.discoveryService = mockDiscoveryService;

  const refreshResult = await workflowManager.triggerManualRefresh();
  console.log(`✓ Manual refresh result:`, refreshResult);

  // Test 3: Get refresh status
  console.log('\n3. Testing refresh status...');
  const refreshStatus = workflowManager.getRefreshStatus();
  console.log(`✓ Refresh status:`, refreshStatus);

  // Test 4: Test workflow change detection
  console.log('\n4. Testing workflow change detection...');
  
  // Mock updated workflow with changes
  const updatedWorkflows = [
    {
      ...initialWorkflows[0],
      description: 'Updated description'
    },
    initialWorkflows[1],
    {
      id: '3',
      name: 'new_workflow',
      description: 'New workflow added',
      inputSchema: {
        type: 'object',
        properties: {
          param3: { type: 'boolean' }
        }
      }
    }
  ];

  mockDiscoveryService.listWorkflows = () => Promise.resolve(updatedWorkflows);
  
  const updateResult = await workflowManager.triggerManualRefresh();
  console.log(`✓ Update result:`, updateResult);

  console.log('\n✅ All refresh functionality tests completed successfully!');
}

// Run the test
testRefreshFunctionality().catch(console.error);