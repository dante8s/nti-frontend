import { OrgStatus } from '@/stores/organization'

export const ORG_MEMBERSHIP_CONFLICT_MESSAGE =
  'This user is already a member of an organization and cannot join another.'

export const PROPOSAL_ORG_NOT_APPROVED_HINT =
  'Proposals can only be added once your organization status is APPROVED.'

/** Organization is approved for Program B proposals (ACTIVE = approved in backend). */
export function isOrganizationApproved(status) {
  return status === OrgStatus.ACTIVE
}

export function userHasOrganizationMembership(organizations) {
  return Array.isArray(organizations) && organizations.length > 0
}

export function isOrgMembershipConflictError(error) {
  const message = error?.response?.data?.message
    || error?.response?.data?.error
    || (typeof error?.response?.data === 'string' ? error.response.data : '')
  if (typeof message !== 'string') return false
  const lower = message.toLowerCase()
  return lower.includes('already a member') || lower.includes('cannot join another')
}
