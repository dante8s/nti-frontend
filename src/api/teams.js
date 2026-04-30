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

function buildMember(userId, role = 'MEMBER', inviteStatus = 'ACCEPTED') {
  return {
    id: Date.now() + Math.floor(Math.random() * 10000),
    userId,
    role,
    inviteStatus,
  }
}

export const teamsApi = {
  getMyTeam: () => {
    if (!MOCK_ENABLED) return api.get('/api/teams/my')

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
      members: [buildMember(leaderId, 'LEADER', 'ACCEPTED')],
      createdAt: new Date().toISOString(),
    }
    teams.unshift(team)
    setItems(TEAM_KEY, teams)
    return ok(team)
  },

  invite: (teamId, userId) => {
    if (!MOCK_ENABLED) return api.post(`/api/teams/${teamId}/invites`, { userId })

    const invites = getItems(INVITE_KEY)
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
    if (!MOCK_ENABLED) return api.get('/api/teams/invites/pending', { params: { userId } })

    const invites = getItems(INVITE_KEY).filter(
      (invite) => invite.userId === Number(userId) && invite.inviteStatus === 'PENDING',
    )
    return ok(invites)
  },

  respondInvite: (inviteId, accepted) => {
    if (!MOCK_ENABLED) return api.patch(`/api/teams/invites/${inviteId}`, { accepted })

    const invites = getItems(INVITE_KEY)
    const teams = getItems(TEAM_KEY)
    const idx = invites.findIndex((item) => item.id === Number(inviteId))
    if (idx < 0) return ok(null)

    invites[idx].inviteStatus = accepted ? 'ACCEPTED' : 'DECLINED'
    if (accepted) {
      const team = teams.find((t) => t.id === invites[idx].teamId)
      if (team) {
        const alreadyInTeam = team.members?.some((m) => m.userId === invites[idx].userId)
        if (!alreadyInTeam) {
          team.members.push(buildMember(invites[idx].userId, 'MEMBER', 'ACCEPTED'))
        }
      }
      setItems(TEAM_KEY, teams)
    }
    setItems(INVITE_KEY, invites)
    return ok(invites[idx])
  },
}
