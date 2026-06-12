import { toSnakeCase, specToDescriptors } from '../../scripts/generate-tools.js';

describe('toSnakeCase', () => {
  it('converts camelCase operationIds to snake_case', () => {
    expect(toSnakeCase('getSocialMediaAccounts')).toBe('get_social_media_accounts');
    expect(toSnakeCase('createTask')).toBe('create_task');
  });
});

const spec = {
  components: {
    parameters: {
      OrgHeader: { in: 'header', name: 'Organization', required: false, schema: { type: 'integer' }, description: 'Org' },
    },
    schemas: {
      TaskCreateRequest: {
        type: 'object',
        required: ['status'],
        properties: {
          status: { type: 'string', description: 'Status UUID' },
          title: { type: 'string' },
        },
      },
    },
  },
  paths: {
    '/api/v1/pm/boards/{board_id}/tasks': {
      parameters: [{ $ref: '#/components/parameters/OrgHeader' }],
      post: {
        operationId: 'createTask',
        summary: 'Create a task',
        parameters: [
          { in: 'path', name: 'board_id', required: true, schema: { type: 'string' } },
          { in: 'query', name: 'expand', required: false, schema: { type: 'string' } },
        ],
        requestBody: {
          required: true,
          content: { 'application/json': { schema: { $ref: '#/components/schemas/TaskCreateRequest' } } },
        },
      },
    },
  },
};

describe('specToDescriptors', () => {
  const [d] = specToDescriptors(spec as any, 'smp_pm');

  it('derives name, method, path, and category', () => {
    expect(d.name).toBe('create_task');
    expect(d.method).toBe('POST');
    expect(d.path).toBe('/api/v1/pm/boards/{board_id}/tasks');
    expect(d.category).toBe('smp_pm');
  });

  it('routes params across path/query/header/body and resolves $refs', () => {
    expect(d.paramLocations).toEqual({
      Organization: 'header',
      board_id: 'path',
      expand: 'query',
      status: 'body',
      title: 'body',
    });
    expect(d.headerNames).toEqual({ Organization: 'Organization' });
  });

  it('merges every param into a flat inputSchema with unioned required', () => {
    expect(Object.keys(d.inputSchema.properties).sort()).toEqual(
      ['Organization', 'board_id', 'expand', 'status', 'title']
    );
    expect(d.inputSchema.required!.sort()).toEqual(['board_id', 'status']);
  });
});
