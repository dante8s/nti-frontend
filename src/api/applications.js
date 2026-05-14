import api from './axios'

export const applicationsApi = {
  /** Тіло лише { callId } — сумісно з бекендом. */
  create: (data) => api.post('/api/applications', { callId: data.callId }),

  createDraft(callId) {
    return this.create({ callId })
  },
  updateDraft(id, formData) {
    return this.update(id, formData)
  },

  getMyByCall: (callId) => api.get(`/api/applications/my/by-call/${callId}`),

  update: (id, formData) => {
    const body =
      typeof formData === 'string' ? { formData } : { formData: JSON.stringify(formData) }
    return api.put(`/api/applications/${id}`, body)
  },

  submit: (id) => api.patch(`/api/applications/${id}/submit`),

  getMy: () => api.get('/api/applications/my'),

  getOne: (id) => api.get(`/api/applications/${id}`),

  getById: (id) => api.get(`/api/applications/${id}`),

  getDocumentStatus: (applicationId) =>
    api.get(`/api/applications/${applicationId}/documents/status`),

  /**
   * Blob документа: inline (перегляд PDF) або attachment (зберегти файл).
   */
  fetchDocumentBlob: (applicationId, documentType, disposition = 'inline') =>
    api.get(`/api/applications/${applicationId}/documents/${documentType}`, {
      params: { disposition },
      responseType: 'blob',
    }),

  downloadDocument: (applicationId, documentType) =>
    applicationsApi.fetchDocumentBlob(applicationId, documentType, 'attachment'),

  uploadDocument: (applicationId, documentType, file, onProgress) => {
    const fd = new FormData()
    fd.append('file', file)
    return api.post(`/api/applications/${applicationId}/documents/${documentType}`, fd, {
      onUploadProgress: (e) => {
        if (onProgress && e.lengthComputable) {
          onProgress(Math.round((e.loaded * 100) / e.total))
        }
      },
    })
  },

  getAll: () => api.get('/api/admin/applications'),

  changeStatus: (id, status, comment) =>
    api.patch(`/api/admin/applications/${id}/status`, {
      status,
      comment,
    }),
}
