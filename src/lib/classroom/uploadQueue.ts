export const appendPendingFiles = (
  existing: readonly File[],
  incoming: readonly File[],
  maxFiles: number,
): File[] => {
  const limit = Number.isFinite(maxFiles) && maxFiles > 0 ? Math.floor(maxFiles) : 0;
  return [...existing, ...incoming].slice(0, limit);
};

export const removePendingFile = (files: readonly File[], index: number): File[] => {
  if (!Number.isInteger(index) || index < 0 || index >= files.length) {
    return [...files];
  }

  return files.filter((_, fileIndex) => fileIndex !== index);
};
