#!/usr/bin/env node

/**
 * Example showing how the discovered workflow would be used as an MCP tool
 */

console.log('📋 MCP Tool Usage Example\n');

// This is what the workflow discovery service produces
const discoveredWorkflow = {
  id: "561",
  name: "mcp-workflow-check-competitor",
  description: "Fetch competitor page and return summary",
  category: "workflow",
  version: "1.0.0",
  inputSchema: {
    type: "object",
    properties: {
      competitor_page: {
        title: "Competitor Page",
        type: "string"
      }
    },
    required: ["competitor_page"]
  },
  executionType: "async",
  metadata: {
    originalId: 561,
    originalTitle: "MCP workflow check competitor",
    source: "simplified-api"
  }
};

console.log('1. Discovered Workflow:');
console.log(`   Name: ${discoveredWorkflow.name}`);
console.log(`   Description: ${discoveredWorkflow.description}`);
console.log(`   Required Parameters: ${discoveredWorkflow.inputSchema.required.join(', ')}`);
console.log('');

console.log('2. MCP Tool Registration:');
const mcpToolName = `workflow-${discoveredWorkflow.name}`;
console.log(`   Tool Name: ${mcpToolName}`);
console.log(`   Tool Description: ${discoveredWorkflow.description}`);
console.log(`   Input Schema: ${JSON.stringify(discoveredWorkflow.inputSchema, null, 2)}`);
console.log('');

console.log('3. Example MCP Tool Call:');
const exampleToolCall = {
  name: mcpToolName,
  arguments: {
    competitor_page: "https://competitor.com/pricing"
  }
};
console.log(`   ${JSON.stringify(exampleToolCall, null, 2)}`);
console.log('');

console.log('4. What happens when this tool is called:');
console.log(`   1. MCP server receives tool call for "${mcpToolName}"`);
console.log(`   2. Server extracts workflow ID: ${discoveredWorkflow.id}`);
console.log(`   3. Server validates parameters against schema`);
console.log(`   4. Server calls Simplified API to execute workflow ${discoveredWorkflow.id}`);
console.log(`   5. Server polls for workflow completion`);
console.log(`   6. Server returns workflow results to MCP client`);
console.log('');

console.log('5. Expected API calls:');
console.log(`   Discovery: GET /api/v1/service/workflows/mcp`);
console.log(`   (No query parameters)`);
console.log('');
console.log(`   Execution: POST /api/v1/service/workflows/mcp/${discoveredWorkflow.id}/execute`);
console.log(`   Body: ${JSON.stringify(exampleToolCall.arguments, null, 2)}`);
console.log('');
console.log(`   Status: GET /api/v1/service/workflows/{execution_id}/status`);
console.log(`   (Polled until completion)`);
console.log('');

console.log('6. Example MCP Tool Response:');
const exampleResponse = {
  content: [
    {
      type: "text",
      text: JSON.stringify({
        success: true,
        data: {
          workflowId: "561",
          executionId: "exec-123-456",
          status: "COMPLETED",
          results: {
            summary: "Competitor analysis completed",
            findings: {
              pricing_model: "freemium",
              key_features: ["feature1", "feature2"],
              competitive_advantages: ["advantage1", "advantage2"]
            },
            execution_time: "45 seconds"
          }
        }
      }, null, 2)
    }
  ]
};
console.log(`   ${JSON.stringify(exampleResponse, null, 2)}`);
console.log('');

console.log('✅ This shows how your workflow becomes a fully functional MCP tool!');
console.log('');
console.log('🔧 Next steps:');
console.log('   1. Set your real API token in .env');
console.log('   2. Test with: node test-workflow-discovery.js');
console.log('   3. Integrate with your MCP server');
console.log('   4. Implement workflow execution logic');