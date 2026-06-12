/**
 * Canonical list of OpenAPI tool group keys (one per spec file).
 * Kept here — not in generated code — so config can reference it without
 * depending on generator output.
 */
export const TOOL_GROUP_KEYS = [
  'social_media',
  'smp_pm',
  'celeryhq',
  'image_tools',
  'video_tools',
  'audio_tools',
  'comments',
  'agent_notification',
] as const;

export type ToolGroupKey = (typeof TOOL_GROUP_KEYS)[number];
