import api from './axios'

export const authApi = {
  completeOrgInvite: (payload) => api.post('/api/auth/complete-org-invite', payload),
  completeTeamInvite: (payload) => api.post('/api/auth/complete-team-invite', payload),

  /**
   * Мінімальні дані поточного користувача (userId, ролі) з JWT.
   * Не в модулі `/api/auth`, але потрібен для відновлення `user.id` у сесії після логіну без id у localStorage.
   */
  getSessionBrief: () => api.get('/api/profile/me/session'),
}
