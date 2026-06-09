import api from './axios'

export const applicationsApi = {

  getMy: () =>
    api.get('/api/applications/my'),

  getById: (id) =>
    api.get(`/api/applications/${id}`),

  getOne: (id) => api.get(`/api/applications/${id}`),

  getMyByCall: (callId) =>
    api.get(`/api/applications/my/by-call/${callId}`),


  getByCall: (callId) => api.get(`/api/applications/by-call/${callId}`),
  createDraft: (callId) =>
    api.post('/api/applications', { callId }),

  updateDraft: (id, formData) =>
    api.put(`/api/applications/${id}`, { formData }),

  submit: (id) =>
    api.patch(`/api/applications/${id}/submit`),

  getDocumentStatus: (id) =>
    api.get(`/api/applications/${id}/documents/status`),

  fetchDocumentBlob: (applicationId, documentType, disposition = 'inline') =>
    api.get(`/api/applications/${applicationId}/documents/${documentType}`, {
      params: { disposition },
      responseType: 'blob',
    }),

  downloadDocument: (applicationId, documentType) =>
    api.get(`/api/applications/${applicationId}/documents/${documentType}`, {
      params: { disposition: 'attachment' },
      responseType: 'blob',
    }),

  uploadDocument: (id, documentType, file, onProgress) => {
    const form = new FormData()
    form.append('file', file)
    return api.post(
      `/api/applications/${id}/documents/${documentType}`,
      form,
      {
        onUploadProgress: (e) => {
          if (onProgress && e.total) {
            onProgress(Math.round(
              (e.loaded * 100) / e.total
            ))
          }
        }
      }
    )
  },

  // Для адміна — тільки не чернетки
  getAll: () =>
    api.get('/api/admin/applications'),

  changeStatus: (id, status, comment) =>
    api.patch(
      `/api/admin/applications/${id}/status`,
      { status, comment }
    ),

  setProductOwner: (applicationId, userId) =>
    api.patch(`/api/applications/${applicationId}/product-owner`, null, { params: { userId } }),

  // Завершити проект — лідер
  completeProject: (id) =>
    api.patch(`/api/applications/${id}/complete`),

  // Завершити проект — адмін
  completeProjectAdmin: (id) =>
    api.patch(`/api/admin/applications/${id}/complete`),

  // Історія проектів поточного користувача
  getMyProjects: () =>
    api.get('/api/applications/my/projects'),

  // Запити на завершення — для адміна
  getCompletionRequests: () =>
    api.get('/api/admin/applications/completion-requests'),

  approveCompletion: (id) =>
    api.patch(`/api/admin/applications/${id}/approve-completion`),

  rejectCompletion: (id) =>
    api.patch(`/api/admin/applications/${id}/reject-completion`),
}

