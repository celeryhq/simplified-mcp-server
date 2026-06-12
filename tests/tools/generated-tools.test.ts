import { generatedToolGroups } from '../../src/tools/generated/index.js';
import { createOpenAPITool } from '../../src/tools/openapi-tool-factory.js';
import { TOOL_GROUP_KEYS } from '../../src/tools/tool-groups.js';
import { ToolRegistry } from '../../src/tools/registry.js';

describe('generated tools', () => {
  it('produces one group per known key', () => {
    expect(Object.keys(generatedToolGroups).sort()).toEqual([...TOOL_GROUP_KEYS].sort());
  });

  it('registers every generated tool without validation errors and with unique names', () => {
    const registry = new ToolRegistry();
    let count = 0;
    for (const descriptors of Object.values(generatedToolGroups)) {
      for (const d of descriptors) {
        registry.registerTool(createOpenAPITool(d)); // throws on invalid/duplicate
        count++;
      }
    }
    expect(count).toBeGreaterThanOrEqual(100);
    expect(registry.getToolCount()).toBe(count);
  });

  it('includes known social-media tools that replace the old hand-written ones', () => {
    const names = generatedToolGroups.social_media.map((d) => d.name);
    expect(names).toContain('get_social_media_accounts');
    expect(names).toContain('create_social_media_post');
  });
});
