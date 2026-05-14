import api from './axios'

export const teamsApi = {
  getMyTeam: (userId) => api.get(`/api/teams/user/${userId}`),

  create: (payload) => api.post('/api/teams', payload),

  invite: (teamId, userId) =>
    api.post(`/api/teams/${teamId}/invite`, null, {
      params: { userId },
    }),

  getPendingInvites: (userId) => api.get(`/api/teams/invites/${userId}`),

  respondInvite: (teamId, userId, accepted) =>
    api.patch(`/api/teams/${teamId}/respond`, null, {
      params: { userId, accepted },
    }),
}
