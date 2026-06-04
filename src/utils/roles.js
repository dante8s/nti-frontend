import { unref } from 'vue'

function roleList(roles) {
  const raw = unref(roles)
  return Array.isArray(raw) ? raw : []
}

/** Доступ до студентського кабінету: заявки, профіль, команда. */
export function hasStudentPortalAccess(roles) {
  return roleList(roles).some((r) => r === 'STUDENT' || r === 'TEAM_LEADER')
}

/** Окремий акцент у UI для лідера команди (якщо роль з’явиться в JWT / user). */
export function hasTeamLeaderRole(roles) {
  return roleList(roles).includes('TEAM_LEADER')
}
