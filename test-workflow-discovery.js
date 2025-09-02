#!/usr/bin/env node

/**
 * Test script for workflow discovery with real API endpoint
 */

import { SimplifiedAPIClient } from './dist/api/client.js';
import { SimpleWorkflowDiscoveryService } from './dist/services/workflow-discovery-simple.js';
import { createLogger } from './dist/utils/logger.js';
import dotenv from 'dotenv';

// Load environment variables
dotenv.config();

async function testWorkflowDiscovery() {
  console.log('🔍 Testing Workflow Discovery with Real API...\n');

  // Check required environment variables
  if (!process.env.SIMPLIFIED_API_TOKEN) {
    console.error('❌ SIMPLIFIED_API_TOKEN is required');
    process.exit(1);
  }

  console.log(`Using API Token: ${process.env.SIMPLIFIED_API_TOKEN.substring(0, 10)}...`);
  console.log(`Using API Base URL: ${process.env.SIMPLIFIED_API_BASE_URL || 'https://api.simplified.com'}`);
  console.log('');

  try {
    // Create API client
    const apiClient = new SimplifiedAPIClient({
      baseUrl: process.env.SIMPLIFIED_API_BASE_URL || 'https://api.simplified.com',
      apiToken: process.env.SIMPLIFIED_API_TOKEN,
      timeout: 30000,
      retryAttempts: 3,
      retryDelay: 1000
    });

    // Create logger
    const logger = createLogger('debug');

    // Create workflow config
    const workflowConfig = {
      enabled: true,
      discoveryInterval: 0, // Disabled for testing
      executionTimeout: 300000,
      maxConcurrentExecutions: 10,
      filterPatterns: [],
      statusCheckInterval: 5000,
      retryAttempts: 3
    };

    // Create workflow discovery service
    const discoveryService = new SimpleWorkflowDiscoveryService(apiClient, logger, {
      enabled: true,
      filterPatterns: []
    });

    console.log('1. Testing API connection...');
    const isAvailable = await discoveryService.testConnection();
    console.log(`   Connection status: ${isAvailable ? '✅ Available' : '❌ Not available'}\n`);

    if (!isAvailable) {
      console.log('❌ Cannot connect to workflows API. Check your API token and network connection.');
      return;
    }

    console.log('2. Discovering workflows...');
    const workflows = await discoveryService.listWorkflows();
    console.log(`   Found ${workflows.length} workflows\n`);

    if (workflows.length === 0) {
      console.log('ℹ️  No workflows found. This could mean:');
      console.log('   - No active workflows in your account');
      console.log('   - API endpoint returned empty results');
      console.log('   - All workflows were filtered out');
      return;
    }

    console.log('3. Workflow Details:');
    workflows.forEach((workflow, index) => {
      console.log(`   ${index + 1}. ${workflow.name}`);
      console.log(`      ID: ${workflow.id}`);
      console.log(`      Description: ${workflow.description}`);
      console.log(`      Category: ${workflow.category}`);
      console.log(`      Version: ${workflow.version}`);
      console.log(`      Execution Type: ${workflow.executionType}`);
      console.log(`      Input Schema Properties: ${Object.keys(workflow.inputSchema.properties).join(', ')}`);
      console.log(`      Required Fields: ${workflow.inputSchema.required?.join(', ') || 'none'}`);
      
      // Show detailed input schema
      if (Object.keys(workflow.inputSchema.properties).length > 0) {
        console.log(`      Input Schema Details:`);
        Object.entries(workflow.inputSchema.properties).forEach(([key, prop]) => {
          const propObj = prop;
          console.log(`        - ${key}: ${propObj.type || 'unknown'} ${propObj.title ? `(${propObj.title})` : ''}`);
        });
      }
      if (workflow.metadata) {
        console.log(`      Metadata: ${JSON.stringify(workflow.metadata, null, 8)}`);
      }
      console.log('');
    });

    console.log('4. Testing cache functionality...');
    const cacheStats = discoveryService.getCacheStats();
    console.log(`   Cached workflows: ${cacheStats.cachedCount}`);
    console.log(`   Cache age: ${cacheStats.cacheAge}ms`);
    console.log(`   Cache valid: ${cacheStats.isValid}\n`);

    console.log('5. Testing cached retrieval...');
    const cachedWorkflows = await discoveryService.listWorkflows();
    console.log(`   Retrieved ${cachedWorkflows.length} workflows from cache\n`);

    console.log('6. Testing cache refresh...');
    const refreshedWorkflows = await discoveryService.refreshWorkflows();
    console.log(`   Refreshed ${refreshedWorkflows.length} workflows\n`);

    console.log('✅ Workflow discovery test completed successfully!');

  } catch (error) {
    console.error('❌ Test failed:', error.message);
    if (error.details) {
      console.error('   Details:', JSON.stringify(error.details, null, 2));
    }
    console.error('   Stack:', error.stack);
  }
}

// Run the test
testWorkflowDiscovery().catch(console.error);