export const WEEK5_SOURCE_KEYS = [
  '10-5-31', '10-5-32', '10-5-33', '10-5-34', '10-5-35', '10-5-36', '10-5-37', '10-5-38',
  '11-5-26', '11-5-27', '11-5-28', '11-5-29', '11-5-30', '11-5-31', '11-5-32', '11-5-33',
  '12-5-26', '12-5-27', '12-5-28', '12-5-29', '12-5-30', '12-5-31', '12-5-32', '12-5-33',
] as const;

export type Week5SourceKey = typeof WEEK5_SOURCE_KEYS[number];

export const isWeek5SourceKey = (sourceKey: string): sourceKey is Week5SourceKey => (
  (WEEK5_SOURCE_KEYS as readonly string[]).includes(sourceKey)
);
