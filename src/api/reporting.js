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
    openCalls: 4,
    totalApplications: 96,
    applicationsDraft: 5,
    applicationsSubmitted: 40,
    applicationsInReview: 12,
    applicationsNeedsRevision: 4,
    applicationsApproved: 27,
    applicationsRejected: 8,
    activePartnerOrganizations: 11,
    totalOrganizations: 14,
    totalStudentProfiles: 80,
    profileWithCv: 55,
    completeProfiles: 48,
    averageGrade: 4.2,
    totalTeams: 18,
    eligibleTeams: 12,
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

function mockStudentDash() {
  return {
    summary: {
      applicationCount: 2,
      pendingApprovalMilestones: 1,
      overdueOrAttentionMilestones: 0,
      teamCount: 1,
    },
    applications: [],
    teams: [],
  }
}

function mockFirmDash() {
  return {
    summary: {
      programCount: 1,
      applicationCount: 12,
      mentorshipCount: 3,
      openCallCount: 1,
    },
    organizations: [],
  }
}

export const reportingApi = {
  getStats: () => {
    if (!MOCK_ENABLED) return api.get('/api/reporting/stats')
    return ok(mockStats())
  },

  getStudentDashboard: () => {
    if (!MOCK_ENABLED) return api.get('/api/reporting/dashboard/student')
    return ok(mockStudentDash())
  },

  getFirmDashboard: () => {
    if (!MOCK_ENABLED) return api.get('/api/reporting/dashboard/firm')
    return ok(mockFirmDash())
  },

  getPrCheck: (callId) => {
    if (!MOCK_ENABLED) return api.get(`/api/reporting/pr-check/${callId}`)
    return ok(mockPrChecks(callId))
  },

  /** Експорт заявок за фільтром: csv | xlsx | pdf | docx */
  exportApplications: (params, format) => {
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

  /** Excel з оцінками по конкретному виклику (як раніше). */
  exportEvaluationWorkbook: (callId) => {
    if (!MOCK_ENABLED) {
      return api.get(`/api/reporting/export/${callId}`, { responseType: 'blob' })
    }
    return ok(blobFromText('mock xlsx', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'))
  },
}
