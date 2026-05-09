/** Ролі порталу студента (спека: «руководитель команды» додатково до студента). */
export const ROLE_STUDENT = 'STUDENT'
export const ROLE_TEAM_LEADER = 'TEAM_LEADER'

export function hasStudentPortalAccess(roles) {
  const r = roles || []
  return r.includes(ROLE_STUDENT) || r.includes(ROLE_TEAM_LEADER)
}

export function hasTeamLeaderRole(roles) {
  return (roles || []).includes(ROLE_TEAM_LEADER)
}
