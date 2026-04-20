import api from './axios'

export const programsApi = {
  // Публічні — без токена
  getAll: () => api.get('/api/public/programs'),

  getAllByType: (type) => api.get(`/api/public/programs-${type.toLowerCase()}`),

  getOne: (id) => api.get(`/api/public/programs/${id}`),

  getOneByType: (id, type) => api.get(`/api/public/programs-${type.toLowerCase()}/${id}`),

  getCallsByProgram: (programId) => api.get(`/api/public/programs/${programId}/calls`),

  getAllOpenCalls: () => api.get('/api/public/calls'),

  getCall: (id) => api.get(`/api/public/calls/${id}`),

  // Тільки ADMIN
  create: (data) => api.post('/api/admin/programs', data),

  update: (id, data) => api.put(`/api/admin/programs/${id}`, data),

  createCall: (programId, data) => api.post(`/api/admin/programs/${programId}/calls`, data),

  closeCall: (id) => api.patch(`/api/admin/calls/${id}/close`),
}
