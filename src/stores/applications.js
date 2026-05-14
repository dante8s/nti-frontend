import { defineStore } from 'pinia'
import { ref } from 'vue'
import { applicationsApi } from '@/api/applications'

export const useApplicationsStore = defineStore('applications', () => {
  const applications = ref([])
  const currentApplication = ref(null)

  function upsertApplication(application) {
    if (!application?.id) return
    const idx = applications.value.findIndex((item) => item?.id === application.id)
    if (idx === -1) applications.value = [application, ...applications.value]
    else applications.value.splice(idx, 1, application)
  }

  async function assignProductOwner(applicationId, userId) {
    const response = await applicationsApi.setProductOwner(applicationId, userId)
    const updatedApplication = response.data
    upsertApplication(updatedApplication)
    if (currentApplication.value?.id === applicationId) {
      currentApplication.value = updatedApplication
    }
    return updatedApplication
  }

  return {
    applications,
    currentApplication,
    assignProductOwner,
    upsertApplication,
  }
})
