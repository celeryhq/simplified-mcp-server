import {
  buildRequest,
  createOpenAPITool,
  type OpenAPIToolDescriptor,
} from '../../src/tools/openapi-tool-factory.js';

const descriptor: OpenAPIToolDescriptor = {
  name: 'create_task',
  description: 'Create a task',
  category: 'smp_pm',
  method: 'POST',
  path: '/api/v1/pm/boards/{board_id}/tasks',
  paramLocations: {
    board_id: 'path',
    expand: 'query',
    Organization: 'header',
    title: 'body',
    status: 'body',
  },
  headerNames: { Organization: 'Organization' },
  inputSchema: { type: 'object', properties: {}, required: ['board_id', 'status'] },
};

describe('buildRequest', () => {
  it('routes params to path, query, header, and body', () => {
    const r = buildRequest(
      descriptor,
      { board_id: 'b1', expand: 'tags', Organization: 7, title: 'Hi', status: 's1' },
      {}
    );
    expect(r.endpoint).toBe('/api/v1/pm/boards/b1/tasks?expand=tags');
    expect(r.headers).toEqual({ Organization: '7' });
    expect(r.body).toEqual({ title: 'Hi', status: 's1' });
  });

  it('omits body for GET and skips null/undefined params', () => {
    const get: OpenAPIToolDescriptor = { ...descriptor, method: 'GET', path: '/api/v1/pm/tasks' };
    const r = buildRequest(get, { expand: undefined, status: null }, {});
    expect(r.endpoint).toBe('/api/v1/pm/tasks');
    expect(r.body).toBeUndefined();
  });

  it('falls back to context for Organization/Space scoping headers', () => {
    const r = buildRequest(descriptor, { board_id: 'b1', status: 's1' }, { organizationId: 42 });
    expect(r.headers).toEqual({ Organization: '42' });
  });

  it('applies scoping fallback when the property name differs from the header name', () => {
    const remapped: OpenAPIToolDescriptor = {
      ...descriptor,
      paramLocations: { board_id: 'path', org_id: 'header', status: 'body' },
      headerNames: { org_id: 'Organization' },
    };
    // caller omits org_id -> fallback should inject the Organization header
    const r = buildRequest(remapped, { board_id: 'b1', status: 's1' }, { organizationId: 99 });
    expect(r.headers).toEqual({ Organization: '99' });

    // caller provides org_id -> caller value wins, no fallback
    const r2 = buildRequest(remapped, { board_id: 'b1', org_id: 5, status: 's1' }, { organizationId: 99 });
    expect(r2.headers).toEqual({ Organization: '5' });
  });

  it('throws when a required path param is missing', () => {
    expect(() => buildRequest(descriptor, { status: 's1' }, {})).toThrow(/path parameter/i);
  });
});

describe('createOpenAPITool', () => {
  it('calls makeRequest and wraps a success response', async () => {
    const calls: any[] = [];
    const apiClient: any = {
      makeRequest: async (...args: any[]) => {
        calls.push(args);
        return { status: 200, statusText: 'OK', data: { id: 'x' } };
      },
    };
    const tool = createOpenAPITool(descriptor, { organizationId: 42 });
    const res = await tool.handler({ board_id: 'b1', status: 's1' }, apiClient);
    expect(calls[0][0]).toBe('/api/v1/pm/boards/b1/tasks');
    expect(calls[0][1]).toBe('POST');
    expect(calls[0][3]).toEqual({ headers: { Organization: '42' } });
    expect(JSON.parse(res.content[0].text)).toEqual({ success: true, data: { id: 'x' } });
  });

  it('wraps thrown errors as a failure response', async () => {
    const apiClient: any = { makeRequest: async () => { throw new Error('boom'); } };
    const tool = createOpenAPITool(descriptor, {});
    const res = await tool.handler({ board_id: 'b1', status: 's1' }, apiClient);
    expect(res.isError).toBe(true);
    expect(JSON.parse(res.content[0].text)).toEqual({ success: false, error: 'boom' });
  });
});
