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
  const commentsByMilestone = ref({})
  const attachmentsByMilestone = ref({})
  const commentsLoading = ref(false)
  const commentsError = ref(null)
  const attachmentsLoading = ref(false)
  const attachmentsError = ref(null)

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

  async function getComments(milestoneId) {
    commentsLoading.value = true
    commentsError.value = null
    try {
      const response = await milestonesApi.getComments(milestoneId)
      commentsByMilestone.value = {
        ...commentsByMilestone.value,
        [String(milestoneId)]: response.data || [],
      }
      return commentsByMilestone.value[String(milestoneId)]
    } catch (error) {
      commentsError.value = error
      throw error
    } finally {
      commentsLoading.value = false
    }
  }

  async function addComment(milestoneId, content) {
    const response = await milestonesApi.addComment(milestoneId, content)
    const key = String(milestoneId)
    const createdComment = {
      ...response.data,
      createdAt: response.data?.createdAt || new Date().toISOString(),
    }
    const current = commentsByMilestone.value[key] || []
    commentsByMilestone.value = {
      ...commentsByMilestone.value,
      [key]: [createdComment, ...current],
    }
    // Force map replacement to make sure all computed consumers update immediately.
    commentsByMilestone.value = { ...commentsByMilestone.value }
    return createdComment
  }

  async function deleteComment(milestoneId, commentId) {
    await milestonesApi.deleteComment(milestoneId, commentId)
    const key = String(milestoneId)
    commentsByMilestone.value = {
      ...commentsByMilestone.value,
      [key]: (commentsByMilestone.value[key] || []).filter((comment) => comment?.id !== commentId),
    }
  }

  async function getAttachments(milestoneId) {
    attachmentsLoading.value = true
    attachmentsError.value = null
    try {
      const response = await milestonesApi.getAttachments(milestoneId)
      attachmentsByMilestone.value = {
        ...attachmentsByMilestone.value,
        [String(milestoneId)]: response.data || [],
      }
      return attachmentsByMilestone.value[String(milestoneId)]
    } catch (error) {
      attachmentsError.value = error
      throw error
    } finally {
      attachmentsLoading.value = false
    }
  }

  async function addAttachment(milestoneId, file) {
    const response = await milestonesApi.addAttachment(milestoneId, file)
    const key = String(milestoneId)
    attachmentsByMilestone.value = {
      ...attachmentsByMilestone.value,
      [key]: [...(attachmentsByMilestone.value[key] || []), response.data],
    }
    return response.data
  }

  async function deleteAttachment(milestoneId, attachmentId) {
    await milestonesApi.deleteAttachment(milestoneId, attachmentId)
    const key = String(milestoneId)
    attachmentsByMilestone.value = {
      ...attachmentsByMilestone.value,
      [key]: (attachmentsByMilestone.value[key] || []).filter(
        (attachment) => attachment?.id !== attachmentId,
      ),
    }
  }

  function attachmentFilename(contentDisposition, fallbackName = 'attachment') {
    if (!contentDisposition) return fallbackName
    const utf8Match = contentDisposition.match(/filename\*=UTF-8''([^;]+)/i)
    if (utf8Match?.[1]) return decodeURIComponent(utf8Match[1])
    const plainMatch = contentDisposition.match(/filename="?([^"]+)"?/i)
    if (plainMatch?.[1]) return plainMatch[1]
    return fallbackName
  }

  async function openAttachmentFile(milestoneId, attachmentId, inline = false, fallbackName = 'attachment') {
    const response = await milestonesApi.getAttachmentFile(milestoneId, attachmentId, inline)
    const blob = response.data instanceof Blob
      ? response.data
      : new Blob([response.data], {
          type: response.headers?.['content-type'] || 'application/octet-stream',
        })
    const url = URL.createObjectURL(blob)

    if (inline) {
      window.open(url, '_blank')
      setTimeout(() => URL.revokeObjectURL(url), 60000)
      return
    }

    const filename = attachmentFilename(response.headers?.['content-disposition'], fallbackName)
    const link = document.createElement('a')
    link.style.display = 'none'
    link.href = url
    link.download = filename
    document.body.appendChild(link)
    link.click()
    link.remove()
    URL.revokeObjectURL(url)
  }

  return {
    MilestoneStatus,
    milestones,
    pendingMilestones,
    currentMilestone,
    commentsByMilestone,
    attachmentsByMilestone,
    commentsLoading,
    commentsError,
    attachmentsLoading,
    attachmentsError,
    create,
    getAll,
    fetchByApplication,
    getOne,
    update,
    delete: remove,
    changeStatus,
    getPendingApproval,
    getComments,
    addComment,
    deleteComment,
    getAttachments,
    addAttachment,
    deleteAttachment,
    openAttachmentFile,
    getAllowedTransitions,
    upsertMilestoneInAppList,
    removeMilestoneFromAppList,
  }
})

