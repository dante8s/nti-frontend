import { defineStore } from 'pinia'
import { ref } from 'vue'
import { programsApi } from '@/api/programs'
import { applicationsApi } from '@/api/applications'

export const useProgramStore = defineStore('program', () => {
  const programs = ref([])
  const myPrograms = ref([])
  const pendingPrograms = ref([])
  const callsByProgram = ref({})
  const applicationsByCall = ref({})
  const loading = ref(false)
  const error = ref(null)

  function normalizeProgram(rawProgram) {
    if (!rawProgram || typeof rawProgram !== 'object') return rawProgram
    return {
      ...rawProgram,
      organizationId: rawProgram.organizationId ?? rawProgram.organization_id ?? null,
      organizationName: rawProgram.organizationName ?? rawProgram.organization_name ?? '',
      createdAt: rawProgram.createdAt || rawProgram.created_at || null,
      updatedAt: rawProgram.updatedAt || rawProgram.updated_at || rawProgram.createdAt || null,
      adminComment:
        rawProgram.adminComment
        || rawProgram.admin_comment
        || rawProgram.reviewComment
        || rawProgram.comment
        || '',
    }
  }

  function normalizePrograms(rawList) {
    if (!Array.isArray(rawList)) return []
    return rawList.map(normalizeProgram)
  }

  function upsertProgram(listRef, updatedProgram) {
    const normalized = normalizeProgram(updatedProgram)
    if (!normalized?.id) return
    const index = listRef.value.findIndex((item) => item?.id === normalized.id)
    if (index === -1) {
      listRef.value = [normalized, ...listRef.value]
      return
    }
    listRef.value.splice(index, 1, normalized)
  }

  function removeProgram(listRef, programId) {
    listRef.value = listRef.value.filter((item) => item?.id !== programId)
  }

  async function withRequest(requestFn) {
    loading.value = true
    error.value = null
    try {
      return await requestFn()
    } catch (err) {
      error.value = err?.response?.data?.message || err?.message || 'Request failed'
      throw err
    } finally {
      loading.value = false
    }
  }

  async function submitProgramB(data) {
    return withRequest(async () => {
      const response = await programsApi.submitProgramB(data)
      const submitted = normalizeProgram(response.data)
      upsertProgram(myPrograms, submitted)
      upsertProgram(programs, submitted)
      return submitted
    })
  }

  async function updateProgramB(id, data) {
    return withRequest(async () => {
      const response = await programsApi.updateProgramB(id, data)
      const updated = normalizeProgram(response.data)
      upsertProgram(programs, updated)
      upsertProgram(myPrograms, updated)
      upsertProgram(pendingPrograms, updated)
      return updated
    })
  }

  async function submitForReview(id) {
    return withRequest(async () => {
      const response = await programsApi.submitForReview(id)
      const submitted = normalizeProgram(response.data)
      upsertProgram(programs, submitted)
      upsertProgram(myPrograms, submitted)
      upsertProgram(pendingPrograms, submitted)
      return submitted
    })
  }

  async function getMyPrograms() {
    return withRequest(async () => {
      const response = await programsApi.getMyPrograms()
      myPrograms.value = normalizePrograms(response.data)
      return myPrograms.value
    })
  }

  async function fetchMyPrograms() {
    return getMyPrograms()
  }

  async function getPendingReview() {
    return withRequest(async () => {
      const response = await programsApi.getPendingReview()
      pendingPrograms.value = normalizePrograms(response.data)
      return pendingPrograms.value
    })
  }

  async function reviewProgram(id, reviewData) {
    return withRequest(async () => {
      const response = await programsApi.reviewProgram(id, reviewData)
      const reviewed = normalizeProgram(response.data)
      upsertProgram(programs, reviewed)
      upsertProgram(myPrograms, reviewed)
      if (reviewed?.status === 'PENDING_REVIEW') upsertProgram(pendingPrograms, reviewed)
      else removeProgram(pendingPrograms, id)
      return reviewed
    })
  }

  async function fetchCallsForProgram(programId) {
    if (!programId) return []
    return withRequest(async () => {
      const response = await programsApi.getAllCallsByProgram(programId)
      const calls = Array.isArray(response.data) ? response.data : []
      callsByProgram.value = {
        ...callsByProgram.value,
        [programId]: calls,
      }
      return calls
    })
  }

  async function fetchApplicationsForCall(callId) {
    if (!callId) return []
    return withRequest(async () => {
      const response = await applicationsApi.getByCall(callId)
      const applications = Array.isArray(response.data) ? response.data : []
      applicationsByCall.value = {
        ...applicationsByCall.value,
        [callId]: applications,
      }
      return applications
    })
  }

  return {
    programs,
    myPrograms,
    pendingPrograms,
    callsByProgram,
    applicationsByCall,
    loading,
    error,
    submitProgramB,
    updateProgramB,
    submitForReview,
    getMyPrograms,
    fetchMyPrograms,
    getPendingReview,
    reviewProgram,
    fetchCallsForProgram,
    fetchApplicationsForCall,
  }
})
