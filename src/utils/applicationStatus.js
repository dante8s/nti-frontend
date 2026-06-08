/** Відповідає переходам ApplicationService.ALLOWED (бекенд). */
export const STATUS_LABELS_UK = {
  DRAFT: 'Чернетка',
  SUBMITTED: 'Подано',
  IN_REVIEW: 'На розгляді',
  NEEDS_REVISION: 'Потрібні зміни',
  APPROVED: 'Схвалено',
  REJECTED: 'Відхилено',
  COMPLETION_REQUESTED: 'Запит на завершення',
  COMPLETED: 'Завершено',
}

export function statusLabel(status) {
  return STATUS_LABELS_UK[status] || status
}

/** Наступні статуси для зміни адміном (відповідає переходам на бекенді). */
export function adminAllowedNextStatuses(current) {
  if (current === 'SUBMITTED') return ['IN_REVIEW']
  if (current === 'IN_REVIEW') {
    return ['APPROVED', 'REJECTED', 'NEEDS_REVISION']
  }
  if (current === 'APPROVED') return []
  return []
}
