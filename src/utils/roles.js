import { unref } from 'vue'

function roleList(roles) {
  const raw = unref(roles)
  return Array.isArray(raw) ? raw : []
}

/** Access to the student portal: applications, profile, team. */
export function hasStudentPortalAccess(roles) {
  return roleList(roles).some((r) => r === 'STUDENT' || r === 'TEAM_LEADER')
}

/** Separate UI highlight for team leader (if the role appears in JWT / user). */
export function hasTeamLeaderRole(roles) {
  return roleList(roles).includes('TEAM_LEADER')
}

export function isGlobalAdmin(roles) {
  return roleList(roles).some((r) => r === 'ADMIN' || r === 'SUPER_ADMIN')
}

export function isSuperAdmin(roles) {
  return roleList(roles).includes('SUPER_ADMIN')
}
