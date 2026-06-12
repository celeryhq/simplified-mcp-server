import { TOOL_GROUP_KEYS } from '../../src/tools/tool-groups.js';

describe('TOOL_GROUP_KEYS', () => {
  it('lists all 8 spec group keys', () => {
    expect([...TOOL_GROUP_KEYS].sort()).toEqual(
      [
        'agent_notification', 'audio_tools', 'celeryhq', 'comments',
        'image_tools', 'smp_pm', 'social_media', 'video_tools',
      ].sort()
    );
  });
});
