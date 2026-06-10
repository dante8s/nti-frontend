import api from './axios'

export const authApi = {
  completeOrgInvite: (payload) => api.post('/api/auth/complete-org-invite', payload),
  completeTeamInvite: (payload) => api.post('/api/auth/complete-team-invite', payload),

  /**
   * Minimal data of the current user (userId, roles) from JWT.
   * Not in the `/api/auth` module, but needed to restore `user.id` in session after login without id in localStorage.
   */
  getSessionBrief: () => api.get('/api/profile/me/session'),
}
