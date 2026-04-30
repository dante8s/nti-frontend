import api from './axios'

const MOCK_ENABLED = import.meta.env.VITE_ENABLE_AUTH_MOCK === 'true'

function ok(data) {
  return Promise.resolve({ data })
}

function blobFromText(content, mime) {
  return new Blob([content], { type: mime })
}

function mockStats() {
  return {
    activeCalls: 4,
    submittedApplications: 96,
    approvedProjects: 27,
    activeTeams: 18,
    activePartners: 11,
  }
}

function mockPrChecks(callId) {
  const checks = [
    {
      name: 'All required documents uploaded',
      passed: true,
      message: 'No missing mandatory files.',
    },
    {
      name: 'All applications processed',
      passed: Number(callId) % 2 === 0,
      message:
        Number(callId) % 2 === 0
          ? 'Every application has a decision.'
          : 'Some applications are still in review.',
    },
    {
      name: 'Evaluation completeness',
      passed: true,
      message: 'Each application has at least one score submitted.',
    },
  ]
  return { allPassed: checks.every((x) => x.passed), checks }
}

export const reportingApi = {
  getStats: () => {
    if (!MOCK_ENABLED) return api.get('/api/reporting/stats')
    return ok(mockStats())
  },

  getPrCheck: (callId) => {
    if (!MOCK_ENABLED) return api.get(`/api/reporting/check-pr/${callId}`)
    return ok(mockPrChecks(callId))
  },

  exportReport: (params, format) => {
    if (!MOCK_ENABLED) {
      return api.get('/api/reporting/export', {
        params: { ...params, format },
        responseType: 'blob',
      })
    }

    const stamp = new Date().toISOString()
    const content = [
      `NTI ${format.toUpperCase()} report`,
      `generatedAt=${stamp}`,
      `role=${params.role || 'all'}`,
      `program=${params.program || 'all'}`,
      `status=${params.status || 'all'}`,
      `callId=${params.callId || 'all'}`,
    ].join('\n')
    const mime = format === 'csv' ? 'text/csv' : 'application/octet-stream'
    return ok(blobFromText(content, mime))
  },
}
