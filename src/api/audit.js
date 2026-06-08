import axios from '@/api/axios'

export const auditApi = {
  /** GET /api/applications/{id}/audit */
  getForApplication(applicationId) {
    return axios.get(`/api/applications/${applicationId}/audit`)
  },

  /** GET /api/admin/audit?entityType=&action= */
  getAll({ entityType, action } = {}) {
    const params = {}
    if (entityType) params.entityType = entityType
    if (action) params.action = action
    return axios.get('/api/admin/audit', { params })
  },
}