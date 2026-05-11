import { defineStore } from 'pinia'
import { ref } from 'vue'
import { milestonesApi } from '@/api/milestones'

export const MilestoneStatus = Object.freeze({
  PENDING_APPROVAL: 'PENDING_APPROVAL',
  PLANNED: 'PLANNED',
  IN_PROGRESS: 'IN_PROGRESS',
  COMPLETED: 'COMPLETED',
  OVERDUE: 'OVERDUE',
  BLOCKED: 'BLOCKED',
})

const ALLOWED_TRANSITIONS = Object.freeze({
  [MilestoneStatus.PENDING_APPROVAL]: [MilestoneStatus.PLANNED],
  [MilestoneStatus.PLANNED]: [MilestoneStatus.IN_PROGRESS, MilestoneStatus.BLOCKED],
  [MilestoneStatus.IN_PROGRESS]: [
    MilestoneStatus.COMPLETED,
    MilestoneStatus.BLOCKED,
    MilestoneStatus.PLANNED,
  ],
  [MilestoneStatus.BLOCKED]: [MilestoneStatus.IN_PROGRESS, MilestoneStatus.PLANNED],
  [MilestoneStatus.OVERDUE]: [MilestoneStatus.IN_PROGRESS, MilestoneStatus.COMPLETED],
  [MilestoneStatus.COMPLETED]: [],
})

export function getAllowedTransitions(currentStatus) {
  if (!currentStatus) return []
  return ALLOWED_TRANSITIONS[currentStatus] || []
}

export const useMilestoneStore = defineStore('milestone', () => {
  // Per-application list: { [applicationId]: Milestone[] }
  const milestones = ref({})
  // Admin pending approval list
  const pendingMilestones = ref([])
  const currentMilestone = ref(null)

  function upsertMilestoneInAppList(applicationId, milestone) {
    if (!applicationId || !milestone?.id) return
    const key = String(applicationId)
    const list = milestones.value[key] || []
    const idx = list.findIndex((m) => m?.id === milestone.id)
    const next = [...list]
    if (idx === -1) next.unshift(milestone)
    else next.splice(idx, 1, milestone)
    milestones.value = {
      ...milestones.value,
      [key]: next,
    }
  }

  function removeMilestoneFromAppList(applicationId, milestoneId) {
    if (!applicationId || !milestoneId) return
    const key = String(applicationId)
    milestones.value = {
      ...milestones.value,
      [key]: (milestones.value[key] || []).filter((m) => m?.id !== milestoneId),
    }
  }

  function upsertPendingMilestone(milestone) {
    if (!milestone?.id) return
    const idx = pendingMilestones.value.findIndex((m) => m?.id === milestone.id)
    if (idx === -1) pendingMilestones.value = [milestone, ...pendingMilestones.value]
    else pendingMilestones.value.splice(idx, 1, milestone)
  }

  async function create(data) {
    const response = await milestonesApi.create(data)
    const created = response.data
    currentMilestone.value = created
    upsertMilestoneInAppList(created?.applicationId ?? data?.applicationId, created)
    if (created?.status === MilestoneStatus.PENDING_APPROVAL) upsertPendingMilestone(created)
    return created
  }

  async function getAll(params = {}) {
    const response = await milestonesApi.getAll(params)
    return response.data || []
  }

  async function fetchByApplication(applicationId) {
    const response = await milestonesApi.getAll({ applicationId })
    milestones.value = {
      ...milestones.value,
      [String(applicationId)]: response.data || [],
    }
    return milestones.value[String(applicationId)]
  }

  async function getOne(id) {
    const response = await milestonesApi.getOne(id)
    const milestone = response.data
    currentMilestone.value = milestone
    upsertMilestoneInAppList(milestone?.applicationId, milestone)
    return milestone
  }

  async function update(id, data) {
    const response = await milestonesApi.update(id, data)
    const milestone = response.data
    currentMilestone.value = milestone
    upsertMilestoneInAppList(milestone?.applicationId ?? data?.applicationId, milestone)
    return milestone
  }

  async function remove(id, applicationId = null) {
    await milestonesApi.delete(id)
    const appId = applicationId ?? currentMilestone.value?.applicationId
    if (appId) removeMilestoneFromAppList(appId, id)
    pendingMilestones.value = pendingMilestones.value.filter((m) => m?.id !== id)
    if (currentMilestone.value?.id === id) currentMilestone.value = null
  }

  async function changeStatus(id, status, applicationId = null) {
    const response = await milestonesApi.changeStatus(id, status)
    const milestone = response.data
    currentMilestone.value = milestone
    const appId = milestone?.applicationId ?? applicationId
    if (appId) upsertMilestoneInAppList(appId, milestone)

    if (milestone?.status === MilestoneStatus.PENDING_APPROVAL) {
      upsertPendingMilestone(milestone)
    } else {
      pendingMilestones.value = pendingMilestones.value.filter((m) => m?.id !== milestone?.id)
    }
    return milestone
  }

  async function getPendingApproval() {
    const response = await milestonesApi.getPendingApproval()
    pendingMilestones.value = response.data || []
    return pendingMilestones.value
  }

  return {
    MilestoneStatus,
    milestones,
    pendingMilestones,
    currentMilestone,
    create,
    getAll,
    fetchByApplication,
    getOne,
    update,
    delete: remove,
    changeStatus,
    getPendingApproval,
    getAllowedTransitions,
    upsertMilestoneInAppList,
    removeMilestoneFromAppList,
  }
})

