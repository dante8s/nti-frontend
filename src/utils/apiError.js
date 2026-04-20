/**
 * Текст помилки з відповіді Spring (GlobalExceptionHandler: { error: "..." })
 * або інших форматів.
 */
export function apiErrorMessage(error, fallback = 'Помилка запиту') {
  const d = error?.response?.data
  if (d == null) return error?.message || fallback
  if (typeof d === 'string') return d
  if (typeof d.error === 'string') return d.error
  if (typeof d.message === 'string') return d.message
  return fallback
}
