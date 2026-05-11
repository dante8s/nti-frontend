import api from './axios'

export const milestonesApi = {
  create: (data) => api.post('/api/milestones', data),

  getAll: (params = {}) => api.get('/api/milestones', { params }),

  getOne: (id) => api.get(`/api/milestones/${id}`),

  update: (id, data) => api.put(`/api/milestones/${id}`, data),

  delete: (id) => api.delete(`/api/milestones/${id}`),

  changeStatus: (id, status) => api.patch(`/api/milestones/${id}/status`, { status }),

  getPendingApproval: () => api.get('/api/milestones/pending-approval'),
}

