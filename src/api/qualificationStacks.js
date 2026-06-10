import api from './axios'

export const qualificationApi = {
  getAll: () => api.get('/api/public/qualification-stacks'),
  getByKey: (key) => api.get(`/api/public/qualification-stacks/${key}`),

  // admin
  getAllAdmin: () => api.get('/api/admin/qualification-stacks'),
  addSubject: (stackId, subjectName) =>
    api.post(`/api/admin/qualification-stacks/${stackId}/subjects`, { subjectName }),
  removeSubject: (stackId, subjectId) =>
    api.delete(`/api/admin/qualification-stacks/${stackId}/subjects/${subjectId}`),
}
