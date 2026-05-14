import api from './axios'

export const milestonesApi = {
  create: (data) => api.post('/api/milestones', data),

  getAll: (params = {}) => api.get('/api/milestones', { params }),

  getOne: (id) => api.get(`/api/milestones/${id}`),

  update: (id, data) => api.put(`/api/milestones/${id}`, data),

  delete: (id) => api.delete(`/api/milestones/${id}`),

  getComments: (milestoneId) => api.get(`/api/milestones/${milestoneId}/comments`),

  addComment: (milestoneId, content) =>
    api.post(`/api/milestones/${milestoneId}/comments`, { content }),

  deleteComment: (milestoneId, commentId) =>
    api.delete(`/api/milestones/${milestoneId}/comments/${commentId}`),

  getAttachments: (milestoneId) => api.get(`/api/milestones/${milestoneId}/attachments`),

  addAttachment: (milestoneId, file) => {
    const formData = new FormData()
    formData.append('file', file)
    return api.post(`/api/milestones/${milestoneId}/attachments`, formData)
  },

  deleteAttachment: (milestoneId, attachmentId) =>
    api.delete(`/api/milestones/${milestoneId}/attachments/${attachmentId}`),

  getAttachmentFile: (milestoneId, attachmentId, inline = false) =>
    api.get(`/api/milestones/${milestoneId}/attachments/${attachmentId}/file`, {
      params: { inline },
      responseType: 'blob',
    }),

  changeStatus: (id, status) => api.patch(`/api/milestones/${id}/status`, { status }),

  getPendingApproval: () => api.get('/api/milestones/pending-approval'),
}

