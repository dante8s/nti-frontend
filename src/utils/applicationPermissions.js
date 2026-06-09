export function isProgramAApplication(application) {
  const type = application?.programType ?? application?.call?.program?.type ?? ''
  return String(type).toUpperCase() === 'PROGRAM_A'
}

export function isProgramBApplication(application) {
  const type = application?.programType ?? application?.call?.program?.type ?? ''
  return String(type).toUpperCase() === 'PROGRAM_B'
}

export function getApplicantId(application) {
  if (!application) return null
  return application.applicantId ?? application.applicant?.id ?? null
}

export function isProgramATeamLeader(application, userId) {
  const applicantId = getApplicantId(application)
  if (applicantId == null || userId == null) return false
  return Number(applicantId) === Number(userId)
}

/**
 * Program A team members (non-leaders) get read-only milestone access.
 * Admins always retain full access.
 */
export function isProgramAReadOnly(application, userId, isAdmin) {
  if (!isProgramAApplication(application)) return false
  if (isAdmin) return false

  const applicantId = getApplicantId(application)
  if (applicantId == null || userId == null) {
    // Backend currently only lets the applicant view as STUDENT; treat as writable until applicantId is present.
    return false
  }

  return !isProgramATeamLeader(application, userId)
}

/** Program B team leaders should not see milestone creation controls. */
export function isProgramBTeamLeader(application, userId, roles) {
  if (!isProgramBApplication(application)) return false
  const roleList = Array.isArray(roles) ? roles : []
  if (roleList.includes('TEAM_LEADER')) return true
  return isProgramATeamLeader(application, userId)
}

export const MENTORSHIP_APPROVED_ONLY_HINT =
  'Mentorship can only be assigned to approved applications.'

export function canAssignMentorshipToApplication(application, hasActiveMentorship = false) {
  if (!application || application.status !== 'APPROVED') return false
  return !hasActiveMentorship
}

export function mentorshipAssignErrorMessage(error, fallback = 'Failed to assign mentor.') {
  if (error?.response?.status === 409) {
    const message = error.response?.data?.error || error.response?.data?.message
    if (typeof message === 'string' && message.trim()) return message
    return MENTORSHIP_APPROVED_ONLY_HINT
  }

  const data = error?.response?.data
  if (typeof data === 'string' && data.trim()) return data
  if (typeof data?.error === 'string' && data.error.trim()) return data.error
  if (typeof data?.message === 'string' && data.message.trim()) return data.message
  return fallback
}
