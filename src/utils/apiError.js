/**
 * Error text from the Spring response (GlobalExceptionHandler: { error: "..." })
 * or other formats.
 */
export function apiErrorMessage(error, fallback = 'Request error') {
  const d = error?.response?.data
  if (d == null) return error?.message || fallback
  if (typeof d === 'string') return d
  if (typeof d.error === 'string') return d.error
  if (typeof d.message === 'string') return d.message
  return fallback
}
