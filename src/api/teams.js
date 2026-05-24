import api from './axios'

export const teamsApi = {
  getMyTeam: (userId) => api.get(`/api/teams/user/${userId}`),

  /** Команда, в якій користувач лідер або учасник (для комісії / адміна). */
  getTeamForUser: (userId) => api.get(`/api/teams/user/${userId}`),

  create: (payload) => api.post('/api/teams', payload),

  invite: (teamId, payload) => {
    const params =
      typeof payload === 'object' && payload !== null
        ? payload
        : { userId: payload }
    return api.post(`/api/teams/${teamId}/invite`, null, { params })
  },

  /** Запрошення поточного користувача (id з JWT). */
  getMyPendingInvites: () => api.get('/api/teams/me/invites'),

  getPendingInvites: (userId) => api.get(`/api/teams/invites/${userId}`),

  respondInvite: (teamId, userId, accepted) =>
    api.patch(`/api/teams/${teamId}/respond`, null, {
      params: { userId, accepted },
    }),

  deleteTeam: (teamId) => api.delete(`/api/teams/${teamId}`),

  removeMember: (teamId, memberUserId) =>
    api.delete(`/api/teams/${teamId}/members/${memberUserId}`),

  getRemovalNotice: (userId) =>
    api.get(`/api/teams/user/${userId}/removal-notice`),
}
