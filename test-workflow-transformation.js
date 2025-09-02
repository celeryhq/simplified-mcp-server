#!/usr/bin/env node

/**
 * Test script for workflow transformation with real workflow data
 */

import { SimpleWorkflowDiscoveryService } from './dist/services/workflow-discovery-simple.js';
import { createLogger } from './dist/utils/logger.js';

// Mock API client for testing transformation
class MockAPIClient {
  async get(endpoint, params) {
    // Return the real workflow data you provided
    return {
      data: {
        count: 1,
        results: [
          {
            "id": 561,
            "title": "MCP workflow check competitor",
            "description": "Fetch competitor page and return summary",
            "inputs": {
              "properties": {
                "competitor_page": {
                  "title": "Competitor Page",
                  "type": "string"
                }
              },
              "required": ["competitor_page"],
              "title": "",
              "type": "object"
            }
          }
        ]
      }
    };
  }
}

async function testWorkflowTransformation() {
  console.log('🔄 Testing Workflow Transformation with Real Data...\n');

  try {
    // Create mock API client and logger
    const apiClient = new MockAPIClient();
    const logger = createLogger('debug');

    // Create workflow discovery service
    const discoveryService = new SimpleWorkflowDiscoveryService(apiClient, logger, {
      enabled: true,
      filterPatterns: []
    });

    console.log('1. Testing workflow transformation...');
    const workflows = await discoveryService.listWorkflows();
    console.log(`   Transformed ${workflows.length} workflow(s)\n`);

    if (workflows.length === 0) {
      console.log('❌ No workflows were transformed');
      return;
    }

    console.log('2. Transformed Workflow Details:');
    workflows.forEach((workflow, index) => {
      console.log(`   ${index + 1}. ${workflow.name}`);
      console.log(`      ID: ${workflow.id}`);
      console.log(`      Description: ${workflow.description}`);
      console.log(`      Category: ${workflow.category}`);
      console.log(`      Version: ${workflow.version}`);
      console.log(`      Execution Type: ${workflow.executionType}`);
      
      console.log(`      Input Schema:`);
      console.log(`        Type: ${workflow.inputSchema.type}`);
      console.log(`        Properties: ${Object.keys(workflow.inputSchema.properties).join(', ')}`);
      console.log(`        Required: ${workflow.inputSchema.required.join(', ') || 'none'}`);
      
      console.log(`      Property Details:`);
      Object.entries(workflow.inputSchema.properties).forEach(([key, prop]) => {
        const propObj = prop;
        console.log(`        - ${key}:`);
        console.log(`          Type: ${propObj.type}`);
        console.log(`          Title: ${propObj.title || 'none'}`);
        if (propObj.description) {
          console.log(`          Description: ${propObj.description}`);
        }
      });
      
      if (workflow.metadata) {
        console.log(`      Metadata:`);
        console.log(`        Original ID: ${workflow.metadata.originalId}`);
        console.log(`        Original Title: ${workflow.metadata.originalTitle}`);
        console.log(`        Source: ${workflow.metadata.source}`);
        if (workflow.metadata.originalInputs) {
          console.log(`        Original Inputs: ${JSON.stringify(workflow.metadata.originalInputs, null, 10)}`);
        }
      }
      console.log('');
    });

    console.log('3. Testing MCP Tool Name Generation:');
    workflows.forEach((workflow, index) => {
      const mcpToolName = `workflow-${workflow.name}`;
      console.log(`   ${index + 1}. Original: "${workflow.metadata?.originalTitle}"`);
      console.log(`      Sanitized: "${workflow.name}"`);
      console.log(`      MCP Tool Name: "${mcpToolName}"`);
      console.log('');
    });

    console.log('4. Testing Input Schema Validation:');
    workflows.forEach((workflow, index) => {
      console.log(`   ${index + 1}. ${workflow.name}:`);
      
      // Check if required fields are properly extracted
      const hasRequiredFields = workflow.inputSchema.required.length > 0;
      console.log(`      Has Required Fields: ${hasRequiredFields ? '✅' : '❌'}`);
      
      // Check if properties are properly extracted
      const hasProperties = Object.keys(workflow.inputSchema.properties).length > 0;
      console.log(`      Has Properties: ${hasProperties ? '✅' : '❌'}`);
      
      // Check if schema is valid JSON Schema
      const isValidSchema = workflow.inputSchema.type === 'object' && 
                           typeof workflow.inputSchema.properties === 'object';
      console.log(`      Valid JSON Schema: ${isValidSchema ? '✅' : '❌'}`);
      
      console.log('');
    });

    console.log('✅ Workflow transformation test completed successfully!');

  } catch (error) {
    console.error('❌ Test failed:', error.message);
    if (error.stack) {
      console.error('   Stack:', error.stack);
    }
  }
}

// Run the test
testWorkflowTransformation().catch(console.error);