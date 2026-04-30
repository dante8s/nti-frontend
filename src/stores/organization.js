import { defineStore } from 'pinia'
import { ref } from 'vue'
import { organizationsApi } from '@/api/organizations'

export const OrgStatus = Object.freeze({
  PENDING: 'PENDING',
  ACTIVE: 'ACTIVE',
  SUSPENDED: 'SUSPENDED',
})

export const OrgMemberRole = Object.freeze({
  OWNER: 'OWNER',
  MEMBER: 'MEMBER',
})

export const useOrganizationStore = defineStore('organization', () => {
  const organizations = ref([])
  const currentOrganization = ref(null)
  const members = ref([])

  function upsertOrganizationInList(org) {
    if (!org?.id) return
    const idx = organizations.value.findIndex((o) => o?.id === org.id)
    if (idx === -1) organizations.value = [org, ...organizations.value]
    else organizations.value.splice(idx, 1, org)
  }

  // Public
  async function getPublicAll() {
    const response = await organizationsApi.getPublicAll()
    organizations.value = response.data
    return response.data
  }

  // Authenticated (CRUD)
  async function create(data) {
    const response = await organizationsApi.create(data)
    currentOrganization.value = response.data
    upsertOrganizationInList(response.data)
    return response.data
  }

  async function getAll() {
    const response = await organizationsApi.getAll()
    organizations.value = response.data
    return response.data
  }

  async function getMy() {
    const response = await organizationsApi.getMy()
    organizations.value = response.data
    return response.data
  }

  async function getOne(id) {
    const response = await organizationsApi.getOne(id)
    currentOrganization.value = response.data
    upsertOrganizationInList(response.data)
    return response.data
  }

  async function update(id, data) {
    const response = await organizationsApi.update(id, data)
    currentOrganization.value = response.data
    upsertOrganizationInList(response.data)
    return response.data
  }

  async function remove(id) {
    await organizationsApi.delete(id)
    organizations.value = organizations.value.filter((o) => o?.id !== id)
    if (currentOrganization.value?.id === id) currentOrganization.value = null
  }

  // Authenticated (Membership)
  async function getMembers(id) {
    const response = await organizationsApi.getMembers(id)
    members.value = response.data
    return response.data
  }

  async function addMember(id, data) {
    const response = await organizationsApi.addMember(id, data)
    members.value = [...members.value, response.data]
    return response.data
  }

  async function transferOwnership(id, memberId) {
    const response = await organizationsApi.transferOwnership(id, memberId)
    const updated = response.data
    members.value = members.value.map((m) => {
      if (m?.id === updated?.id) return updated
      if (m?.role === OrgMemberRole.OWNER) return { ...m, role: OrgMemberRole.MEMBER }
      return m
    })
    return updated
  }

  async function removeMember(id, memberId) {
    await organizationsApi.removeMember(id, memberId)
    members.value = members.value.filter((m) => m?.id !== memberId)
  }

  // Authenticated (Admin/Owner ops)
  async function changeStatus(id, status) {
    const response = await organizationsApi.changeStatus(id, status)
    currentOrganization.value = response.data
    upsertOrganizationInList(response.data)
    return response.data
  }

  return {
    // Enums (usable in UI logic)
    OrgStatus,
    OrgMemberRole,

    // State
    organizations,
    currentOrganization,
    members,

    // Actions (mapped to API)
    getPublicAll,
    create,
    getAll,
    getMy,
    getOne,
    update,
    delete: remove,
    getMembers,
    addMember,
    transferOwnership,
    removeMember,
    changeStatus,
  }
})

