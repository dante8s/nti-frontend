/** Відповідає переходам ApplicationService.ALLOWED (бекенд). */
export const STATUS_LABELS_UK = {
  DRAFT:                'Чернетка',
  SUBMITTED:            'Подано',
  FORMALLY_VERIFIED:    'Формально перевірено',
  IN_REVIEW:            'На розгляді',
  NEEDS_REVISION:       'Потрібні зміни',
  APPROVED:             'Схвалено',
  REJECTED:             'Відхилено',
  ONBOARDING:           'Онбординг',
  ACTIVE:               'Активний',
  SUSPENDED:            'Призупинено',
  COMPLETION_REQUESTED:   'Запит на завершення',
  COMPLETION_PO_APPROVED: 'Завершення схвалено (PO)',
  COMPLETED:              'Завершено',
  ARCHIVED:               'Архівовано',
}

export function statusLabel(status) {
  return STATUS_LABELS_UK[status] || status
}

/** Наступні статуси для зміни адміном (точно відповідає ALLOWED на бекенді). */
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
