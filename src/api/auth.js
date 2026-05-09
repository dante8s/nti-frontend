import api from './axios'

export const authApi = {
  completeOrgInvite: (payload) => api.post('/api/auth/complete-org-invite', payload),
}
