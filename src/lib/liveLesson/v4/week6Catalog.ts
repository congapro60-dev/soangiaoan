export const WEEK6_SOURCE_KEYS = [
  '10-6-39', '10-6-40', '10-6-41', '10-6-42', '10-6-43', '10-6-44', '10-6-45', '10-6-46',
  '11-6-34', '11-6-35', '11-6-36', '11-6-37', '11-6-38', '11-6-39', '11-6-40', '11-6-41',
  '12-6-34', '12-6-35', '12-6-36', '12-6-37', '12-6-38', '12-6-39', '12-6-40', '12-6-41',
] as const;

export type Week6SourceKey = typeof WEEK6_SOURCE_KEYS[number];

export const isWeek6SourceKey = (sourceKey: string): sourceKey is Week6SourceKey => (
  (WEEK6_SOURCE_KEYS as readonly string[]).includes(sourceKey)
);
