import api from './axios'

export const emailTemplatesApi = {
  getAll: () => api.get('/api/admin/email-templates'),
  update: (id, data) => api.put(`/api/admin/email-templates/${id}`, data),
}
