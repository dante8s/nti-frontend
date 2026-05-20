import api from './axios'

export const reportingApi = {
  getStats: () => api.get('/api/reporting/stats'),

  getTeams: (params) => api.get('/api/reporting/teams', { params }),

  getStudentDashboard: () => api.get('/api/reporting/dashboard/student'),

  getFirmDashboard: () => api.get('/api/reporting/dashboard/firm'),

  getPrCheck: (callId) => api.get(`/api/reporting/pr-check/${callId}`),

  /** Експорт заявок: reportType=applications (за замовчуванням) */
  exportApplications: (params, format) =>
    api.get('/api/reporting/export', {
      params: { ...params, format, reportType: 'applications' },
      responseType: 'blob',
    }),

  /** Експорт команд та викликів */
  exportTeams: (params, format) =>
    api.get('/api/reporting/export', {
      params: { ...params, format, reportType: 'teams' },
      responseType: 'blob',
    }),

  /** Excel з оцінками по конкретному виклику. */
  exportEvaluationWorkbook: (callId) =>
    api.get(`/api/reporting/export/${callId}`, { responseType: 'blob' }),
}
