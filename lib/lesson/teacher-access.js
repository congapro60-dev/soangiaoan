export function canAccessTeacherSolutions({ user, isRootUser = false, systemHost = null } = {}) {
  return Boolean(user && (isRootUser || (systemHost?.role === 'host' && systemHost.revoked_at == null)));
}
