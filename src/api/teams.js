import api from './axios'

const MOCK_ENABLED = import.meta.env.VITE_ENABLE_AUTH_MOCK === 'true'

const TEAM_KEY = 'mock_teams'
const INVITE_KEY = 'mock_team_invites'

function ok(data) {
  return Promise.resolve({ data })
}

function getItems(key) {
  return JSON.parse(localStorage.getItem(key) || '[]')
}

function setItems(key, data) {
  localStorage.setItem(key, JSON.stringify(data))
}

function getCurrentUser() {
  return JSON.parse(localStorage.getItem('user') || 'null')
}

/** Mock: призначити роль TEAM_LEADER лідеру команди й синхронізувати mock_users. */
function grantMockTeamLeaderRole(leaderId) {
  const u = getCurrentUser()
  if (!u || Number(u.id) !== Number(leaderId)) return

  const next = [...(u.roles || [])]
  if (!next.includes('STUDENT')) next.push('STUDENT')
  if (!next.includes('TEAM_LEADER')) next.push('TEAM_LEADER')
  u.roles = next
  localStorage.setItem('user', JSON.stringify(u))

  const mockUsers = JSON.parse(localStorage.getItem('mock_users') || '[]')
  const idx = mockUsers.findIndex((row) => row.id === u.id)
  if (idx >= 0) {
    mockUsers[idx].roles = next
    localStorage.setItem('mock_users', JSON.stringify(mockUsers))
  }
}

function buildMember(teamId, userId, role = 'MEMBER', inviteStatus = 'ACCEPTED') {
  const uid = Number(userId)
  return {
    id: Date.now() + Math.floor(Math.random() * 10000),
    teamId: teamId != null ? Number(teamId) : null,
    userId: uid,
    role,
    inviteStatus,
    memberDisplayName: `Учасник #${uid}`,
  }
}

export const teamsApi = {
  getMyTeam: (userId) => {
    if (!MOCK_ENABLED) return api.get(`/api/teams/user/${userId}`)

    const user = getCurrentUser()
    const teams = getItems(TEAM_KEY)
    const found = teams.find((team) => team.members?.some((m) => m.userId === user?.id)) || null
    return ok(found)
  },

  create: (payload) => {
    if (!MOCK_ENABLED) return api.post('/api/teams', payload)

    const teams = getItems(TEAM_KEY)
    const id = Date.now()
    const leaderId = Number(payload.leaderId)
    const team = {
      id,
      name: payload.name,
      leaderId,
      maxCapacity: Number(payload.maxCapacity) || 5,
      description: payload.description || '',
      competencies: payload.competencies || '',
      members: [buildMember(id, leaderId, 'LEADER', 'ACCEPTED')],
      createdAt: new Date().toISOString(),
    }
    teams.unshift(team)
    setItems(TEAM_KEY, teams)
    grantMockTeamLeaderRole(leaderId)
    return ok(team)
  },

  invite: (teamId, userId) => {
    if (!MOCK_ENABLED) {
      return api.post(`/api/teams/${teamId}/invite`, null, {
        params: { userId },
      })
    }

    const currentUser = getCurrentUser()
    const teams = getItems(TEAM_KEY)
    const team = teams.find((t) => t.id === Number(teamId))
    const roles = currentUser?.roles || []
    const isSuperAdmin = roles.includes('SUPER_ADMIN')
    const isLeaderOfThisTeam = Number(team?.leaderId) === Number(currentUser?.id)
    if (!team || (!isLeaderOfThisTeam && !isSuperAdmin)) {
      return Promise.reject({
        response: {
          data: { message: 'Лише лідер команди може надсилати запрошення.' },
        },
      })
    }

    const invites = getItems(INVITE_KEY)
    const duplicatePending = invites.some(
      (i) =>
        i.teamId === Number(teamId)
        && i.userId === Number(userId)
        && i.inviteStatus === 'PENDING',
    )
    if (duplicatePending) {
      return Promise.reject({
        response: {
          data: { message: 'Цьому користувачу вже надіслано запрошення.' },
        },
      })
    }
    invites.unshift({
      id: Date.now(),
      teamId: Number(teamId),
      userId: Number(userId),
      inviteStatus: 'PENDING',
      createdAt: new Date().toISOString(),
    })
    setItems(INVITE_KEY, invites)
    return ok({ success: true })
  },

  getPendingInvites: (userId) => {
    if (!MOCK_ENABLED) return api.get(`/api/teams/invites/${userId}`)

    const invites = getItems(INVITE_KEY).filter(
      (invite) => invite.userId === Number(userId) && invite.inviteStatus === 'PENDING',
    )
    return ok(invites)
  },

  respondInvite: (teamId, userId, accepted) => {
    if (!MOCK_ENABLED) {
      return api.patch(`/api/teams/${teamId}/respond`, null, {
        params: { userId, accepted },
      })
    }

    const invites = getItems(INVITE_KEY)
    const teams = getItems(TEAM_KEY)
    const idx = invites.findIndex(
      (item) =>
        Number(item.teamId) === Number(teamId)
        && Number(item.userId) === Number(userId)
        && item.inviteStatus === 'PENDING',
    )
    if (idx < 0) return ok(null)
    const currentUser = getCurrentUser()
    if (Number(currentUser?.id) !== Number(invites[idx].userId)) {
      return Promise.reject({
        response: {
          data: { message: 'Ви не можете обробляти це запрошення.' },
        },
      })
    }

    invites[idx].inviteStatus = accepted ? 'ACCEPTED' : 'DECLINED'
    if (accepted) {
      const team = teams.find((t) => t.id === invites[idx].teamId)
      if (team) {
        const alreadyInTeam = team.members?.some((m) => m.userId === invites[idx].userId)
        if (!alreadyInTeam) {
          team.members.push(
            buildMember(team.id, invites[idx].userId, 'MEMBER', 'ACCEPTED'),
          )
        }
      }
      setItems(TEAM_KEY, teams)
    }
    setItems(INVITE_KEY, invites)
    return ok(invites[idx])
  },
}
