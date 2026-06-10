import api from './axios'

export const reportingApi = {
  getStats: () => api.get('/api/reporting/stats'),

  getTeams: (params) => api.get('/api/reporting/teams', { params }),

  getStudentDashboard: () => api.get('/api/reporting/dashboard/student'),

  getFirmDashboard: () => api.get('/api/reporting/dashboard/firm'),

  getPrCheck: (callId) => api.get(`/api/reporting/pr-check/${callId}`),

  /** Export applications: reportType=applications (default) */
  exportApplications: (params, format) =>
    api.get('/api/reporting/export', {
      params: { ...params, format, reportType: 'applications' },
      responseType: 'blob',
    }),

  /** Export teams and calls */
  exportTeams: (params, format) =>
    api.get('/api/reporting/export', {
      params: { ...params, format, reportType: 'teams' },
      responseType: 'blob',
    }),

  /** Excel with evaluation scores for a specific call. */
  exportEvaluationWorkbook: (callId) =>
    api.get(`/api/reporting/export/${callId}`, { responseType: 'blob' }),
}
