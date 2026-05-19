import { computed } from 'vue'
import { useAuthStore } from '@/stores/auth'

export function useCommissionAuth() {
  const auth = useAuthStore()
  const roles = computed(() => auth.roles || [])

  const isReadOnlyCommission = computed(
    () =>
      roles.value.includes('EVALUATOR')
      && !roles.value.includes('SUPER_EVALUATOR')
      && !roles.value.includes('ADMIN')
      && !roles.value.includes('SUPER_ADMIN'),
  )

  const canScoreAndDecide = computed(() =>
    roles.value.some((r) => ['SUPER_EVALUATOR', 'ADMIN', 'SUPER_ADMIN'].includes(r)),
  )

  return { auth, roles, isReadOnlyCommission, canScoreAndDecide }
}
