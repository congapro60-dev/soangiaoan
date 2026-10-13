export function containsDraftRemoval(before, after) {
  if (Array.isArray(before)) {
    if (!Array.isArray(after) || after.length < before.length) return true;
    return before.some((item,index) => {
      const next = item && typeof item === 'object' && typeof item.id === 'string' ? after.find(candidate => candidate?.id === item.id) : after[index];
      return next === undefined || containsDraftRemoval(item,next);
    });
  }
  if (!before || typeof before !== 'object') return false;
  if (!after || typeof after !== 'object') return true;
  return Object.keys(before).some(key => !Object.hasOwn(after,key) || containsDraftRemoval(before[key],after[key]));
}
