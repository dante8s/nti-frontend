import api from './axios'

export const notesApi = {
  create: (data) => api.post('/api/consultation-notes', data),

  getByApplication: (applicationId) =>
    api.get('/api/consultation-notes', { params: { applicationId } }),

  update: (id, data) => api.put(`/api/consultation-notes/${id}`, data),

  delete: (id) => api.delete(`/api/consultation-notes/${id}`),
}

