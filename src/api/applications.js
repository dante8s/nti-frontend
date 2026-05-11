import api from './axios'

export const applicationsApi = {

  getMy: () =>
    api.get('/api/applications/my'),

  getById: (id) =>
    api.get(`/api/applications/${id}`),

  getMyByCall: (callId) =>
    api.get(`/api/applications/my/by-call/${callId}`),

  createDraft: (callId) =>
    api.post('/api/applications', { callId }),

  updateDraft: (id, formData) =>
    api.put(`/api/applications/${id}`, { formData }),

  submit: (id) =>
    api.patch(`/api/applications/${id}/submit`),

  getDocumentStatus: (id) =>
    api.get(`/api/applications/${id}/documents/status`),

  // Прогрес завантаження як callback
  uploadDocument: (id, documentType, file, onProgress) => {
    const form = new FormData()
    form.append('file', file)
    return api.post(
      `/api/applications/${id}/documents/${documentType}`,
      form,
      {
        headers: { 'Content-Type': 'multipart/form-data' },
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
    )
}