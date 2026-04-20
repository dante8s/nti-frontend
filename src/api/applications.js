import api from './axios'

export const applicationsApi = {
  create: (data) => api.post('/api/applications', data),

  submit: (id) => api.patch(`/api/applications/${id}/submit`),

  getMy: () => api.get('/api/applications/my'),

  getOne: (id) => api.get(`/api/applications/${id}`),

  // ADMIN
  getAll: () => api.get('/api/admin/applications'),

  changeStatus: (id, status, comment) =>
    api.patch(`/api/admin/applications/${id}/status`, {
      status,
      comment,
    }),
}
