/** Corresponds to ApplicationService.ALLOWED transitions (backend). */
export const STATUS_LABELS_UK = {
  DRAFT:                'Draft',
  SUBMITTED:            'Submitted',
  FORMALLY_VERIFIED:    'Formally verified',
  IN_REVIEW:            'Under review',
  NEEDS_REVISION:       'Needs revision',
  APPROVED:             'Approved',
  REJECTED:             'Rejected',
  ONBOARDING:           'Onboarding',
  ACTIVE:               'Active',
  SUSPENDED:            'Suspended',
  COMPLETION_REQUESTED:   'Completion requested',
  COMPLETION_PO_APPROVED: 'Completion approved (PO)',
  COMPLETED:              'Completed',
  ARCHIVED:               'Archived',
}

export function statusLabel(status) {
  return STATUS_LABELS_UK[status] || status
}

/** Next statuses for admin transition (exactly matches ALLOWED on the backend). */
export function adminAllowedNextStatuses(current) {
  const ALLOWED = {
    DRAFT:                ['SUBMITTED'],
    SUBMITTED:            ['FORMALLY_VERIFIED'],
    FORMALLY_VERIFIED:    ['IN_REVIEW'],
    IN_REVIEW:            ['APPROVED', 'REJECTED', 'NEEDS_REVISION'],
    NEEDS_REVISION:       ['SUBMITTED'],
    APPROVED:             ['ONBOARDING', 'COMPLETION_REQUESTED'],
    ONBOARDING:           ['ACTIVE'],
    ACTIVE:                 ['SUSPENDED', 'ARCHIVED'],
    SUSPENDED:              ['ACTIVE', 'ARCHIVED'],
    COMPLETION_REQUESTED:   ['COMPLETED', 'APPROVED'],
    COMPLETION_PO_APPROVED: ['COMPLETED', 'APPROVED'],
  }
  return ALLOWED[current] ?? []
}
