import api from './axios'

export const organizationsApi = {
  // Public — no token
  getPublicAll: () => api.get('/api/public/organizations'),

  // Authenticated (CRUD)
  create: (data) => api.post('/api/organizations', data),

  getAll: () => api.get('/api/organizations'),

  getMy: () => api.get('/api/organizations/my'),

  getOne: (id) => api.get(`/api/organizations/${id}`),

  update: (id, data) => api.put(`/api/organizations/${id}`, data),

  delete: (id) => api.delete(`/api/organizations/${id}`),

  // Authenticated (Membership)
  getMembers: (id) => api.get(`/api/organizations/${id}/members`),

  addMember: (id, data) => api.post(`/api/organizations/${id}/members`, data),

  inviteMember: (orgId, email) => api.post(`/api/organizations/${orgId}/invite-member`, { email }),

  transferOwnership: (id, memberId) =>
    api.patch(`/api/organizations/${id}/transfer-ownership/${memberId}`),

  removeMember: (id, memberId) => api.delete(`/api/organizations/${id}/members/${memberId}`),

  // Authenticated (Admin/Owner ops)
  changeStatus: (id, status) =>
    api.patch(`/api/organizations/${id}/status`, null, { params: { status } }),

  // Program B requirements
  getRequirements: (programId) => api.get(`/api/program-b-requirements/${programId}`),

  uploadSpecification: (programId, file) => {
    const formData = new FormData()
    formData.append('file', file)
    return api.post(`/api/program-b-requirements/${programId}/specification`, formData)
  },

  uploadBudget: (programId, file) => {
    const formData = new FormData()
    formData.append('file', file)
    return api.post(`/api/program-b-requirements/${programId}/budget`, formData)
  },

  getSpecificationFile: (programId, inline = false) =>
    api.get(`/api/requirements/${programId}/specification`, {
      params: { inline },
      responseType: 'blob',
    }),

  getBudgetFile: (programId, inline = false) =>
    api.get(`/api/requirements/${programId}/budget`, {
      params: { inline },
      responseType: 'blob',
    }),
}

