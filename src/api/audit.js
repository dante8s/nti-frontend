// src/api/audit.js
import axios from '@/api/axios' // або твій http-клієнт

export const auditApi = {
  /** GET /api/applications/{id}/audit */
  getForApplication(applicationId) {
    return axios.get(`/api/applications/${applicationId}/audit`)
  },
}