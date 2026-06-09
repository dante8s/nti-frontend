<template>

  <div class="page">

    <section class="header">

      <p class="header__eyebrow">Organization</p>

      <h2 class="header__title">

        {{ org?.name || 'Organization details' }}

      </h2>

      <p class="header__text">

        Full organization data and member management for administrators.

      </p>

    </section>



    <div v-if="loading" class="state">

      Loading…

    </div>

    <div v-else-if="error" class="state state--error">

      {{ error }}

    </div>

    <div v-else-if="!org" class="state">

      Organization not found.

    </div>

    <div v-else class="stack">

      <div class="card">

        <div class="card__top">

          <h3 class="card__title">Profile details</h3>

          <div class="card__actions">

            <button

              v-if="canEditOrg"

              type="button"

              class="btn-secondary"

              @click="toggleEdit"

            >

              {{ editMode ? 'Cancel' : 'Edit Organization' }}

            </button>

            <button

              v-if="canChangeStatus"

              type="button"

              class="btn-secondary"

              @click="openStatusModal"

            >

              Change Status

            </button>

            <button

              v-if="canDeleteOrg"

              type="button"

              class="btn-danger"

              :disabled="deleting"

              @click="confirmDeleteOrg"

            >

              {{ deleting ? 'Deleting…' : 'Delete Organization' }}

            </button>

            <button type="button" class="btn-secondary" :disabled="loading" @click="load">

              Refresh

            </button>

          </div>

        </div>



        <div v-if="saveError" class="inline-error">

          {{ saveError }}

        </div>



        <form v-if="editMode" class="form" @submit.prevent="saveProfile">

          <label class="field">

            <span>Name</span>

            <input v-model="profileForm.name" type="text" required />

          </label>

          <label class="field">

            <span>ICO</span>

            <input v-model="profileForm.ico" type="text" required />

          </label>

          <label class="field">

            <span>Sector</span>

            <input v-model="profileForm.sector" type="text" />

          </label>

          <label class="field">

            <span>Description</span>

            <textarea v-model="profileForm.description" rows="4" />

          </label>

          <label class="field">

            <span>Contact email</span>

            <input v-model="profileForm.contactEmail" type="email" />

          </label>

          <label class="field">

            <span>Contact phone</span>

            <input v-model="profileForm.contactPhone" type="tel" />

          </label>

          <label class="field">

            <span>Website</span>

            <input v-model="profileForm.website" type="url" />

          </label>

          <div class="form-actions">

            <button type="submit" class="btn-primary" :disabled="saving">

              {{ saving ? 'Saving…' : 'Save changes' }}

            </button>

          </div>

        </form>



        <dl v-else class="details">

          <div class="details__item">

            <dt>Name</dt>

            <dd>{{ org.name || '—' }}</dd>

          </div>

          <div class="details__item">

            <dt>Status</dt>

            <dd>{{ org.status || '—' }}</dd>

          </div>

          <div class="details__item">

            <dt>ICO</dt>

            <dd>{{ org.ico || '—' }}</dd>

          </div>

          <div class="details__item">

            <dt>Sector</dt>

            <dd>{{ org.sector || '—' }}</dd>

          </div>

          <div class="details__item details__item--wide">

            <dt>Description</dt>

            <dd>{{ org.description || '—' }}</dd>

          </div>

          <div class="details__item">

            <dt>Contact email</dt>

            <dd>{{ org.contactEmail || '—' }}</dd>

          </div>

          <div class="details__item">

            <dt>Contact phone</dt>

            <dd>{{ org.contactPhone || '—' }}</dd>

          </div>

          <div class="details__item details__item--wide">

            <dt>Website</dt>

            <dd>{{ org.website || '—' }}</dd>

          </div>

        </dl>

      </div>



      <div v-if="canManageMembers" class="card">

        <div class="card__top">

          <h3 class="card__title">Manage Members</h3>

          <button type="button" class="btn-secondary" :disabled="membersLoading" @click="loadMembers">

            {{ membersLoading ? 'Loading…' : 'Refresh members' }}

          </button>

        </div>



        <div v-if="membersError" class="inline-error">

          {{ membersError }}

        </div>

        <div v-if="membersSuccess" class="inline-success">

          {{ membersSuccess }}

        </div>



        <form class="member-form" @submit.prevent="submitAddMember">

          <label class="field">

            <span>Invite by email</span>

            <input v-model="addMemberEmail" type="email" placeholder="user@company.com" />

          </label>

          <button type="submit" class="btn-primary" :disabled="memberSaving || !addMemberEmail.trim()">

            {{ memberSaving ? 'Inviting…' : 'Invite member' }}

          </button>

        </form>



        <div class="table-wrap">

          <table class="table">

            <thead>

              <tr>

                <th>Name</th>

                <th>Email</th>

                <th>Role</th>

                <th />

              </tr>

            </thead>

            <tbody>

              <tr v-for="m in members" :key="m.id">

                <td>{{ m.userName || '—' }}</td>

                <td class="muted">{{ m.userEmail || '—' }}</td>

                <td>

                  <span class="pill" :class="m.role === orgStore.OrgMemberRole.OWNER ? 'pill--ok' : 'pill--muted'">

                    {{ m.role }}

                  </span>

                </td>

                <td class="actions-cell">

                  <button

                    v-if="canTransferOwnership && m.role !== orgStore.OrgMemberRole.OWNER"

                    type="button"

                    class="btn-link"

                    :disabled="memberSaving"

                    @click="transferOwnership(m)"

                  >

                    Transfer ownership

                  </button>

                  <button

                    v-if="canRemoveMember(m)"

                    type="button"

                    class="btn-link btn-link--danger"

                    :disabled="memberSaving"

                    @click="confirmRemoveMember(m)"

                  >

                    Remove

                  </button>

                </td>

              </tr>

            </tbody>

          </table>

        </div>

      </div>

    </div>



    <div v-if="statusModal.show" class="modal-overlay" @click.self="statusModal.show = false">

      <div class="modal">

        <h3>Change organization status</h3>

        <p class="modal-meta">

          {{ org?.name }} · current: {{ org?.status || '—' }}

        </p>

        <label class="field">

          <span>New status</span>

          <select v-model="statusModal.nextStatus">

            <option disabled value="">

              Select…

            </option>

            <option v-for="s in statusOptions" :key="s" :value="s">

              {{ s }}

            </option>

          </select>

        </label>

        <div class="modal-actions">

          <button type="button" class="btn-secondary" @click="statusModal.show = false">

            Cancel

          </button>

          <button

            type="button"

            class="btn-primary"

            :disabled="statusSaving || !statusModal.nextStatus"

            @click="submitStatus"

          >

            {{ statusSaving ? 'Saving…' : 'Save' }}

          </button>

        </div>

      </div>

    </div>

  </div>

</template>



<script setup>

import { computed, onMounted, reactive, ref } from 'vue'

import { useRoute, useRouter } from 'vue-router'

import { storeToRefs } from 'pinia'

import { useOrganizationStore } from '@/stores/organization'

import { useAuthStore } from '@/stores/auth'

import { isGlobalAdmin, isSuperAdmin } from '@/utils/roles'

import {
  ORG_MEMBERSHIP_CONFLICT_MESSAGE,
  isOrgMembershipConflictError,
} from '@/utils/organizationMembership'



const route = useRoute()

const router = useRouter()

const orgStore = useOrganizationStore()

const auth = useAuthStore()

const { currentOrganization, members } = storeToRefs(orgStore)



const loading = ref(true)

const error = ref('')

const membersLoading = ref(false)

const membersError = ref('')

const membersSuccess = ref('')

const memberSaving = ref(false)

const saving = ref(false)

const saveError = ref('')

const deleting = ref(false)

const statusSaving = ref(false)

const editMode = ref(false)

const addMemberEmail = ref('')



const profileForm = reactive({

  name: '',

  ico: '',

  sector: '',

  description: '',

  contactEmail: '',

  contactPhone: '',

  website: '',

})



const statusModal = reactive({

  show: false,

  nextStatus: '',

})



const orgId = computed(() => String(route.params.id || '').trim())

const org = computed(() => currentOrganization.value)



const canEditOrg = computed(() => isGlobalAdmin(auth.roles))

const canManageMembers = computed(() => isGlobalAdmin(auth.roles))

const canChangeStatus = computed(() => isGlobalAdmin(auth.roles))

const canDeleteOrg = computed(() => isSuperAdmin(auth.roles))

const canTransferOwnership = computed(() => isGlobalAdmin(auth.roles))



const statusOptions = computed(() => Object.values(orgStore.OrgStatus))



onMounted(load)



function fillFormFromOrg(o) {

  profileForm.name = o?.name || ''

  profileForm.ico = o?.ico || ''

  profileForm.sector = o?.sector || ''

  profileForm.description = o?.description || ''

  profileForm.contactEmail = o?.contactEmail || ''

  profileForm.contactPhone = o?.contactPhone || ''

  profileForm.website = o?.website || ''

}



async function load() {

  if (!orgId.value) {

    error.value = 'Invalid organization id.'

    loading.value = false

    return

  }

  loading.value = true

  error.value = ''

  try {

    await orgStore.getOne(orgId.value)

    fillFormFromOrg(currentOrganization.value)

    await loadMembers()

  } catch (e) {

    error.value = e.response?.data?.error || e.response?.data?.message || 'Failed to load organization.'

  } finally {

    loading.value = false

  }

}



async function loadMembers() {

  if (!orgId.value) return

  membersLoading.value = true

  membersError.value = ''

  try {

    await orgStore.getMembers(orgId.value)

  } catch (e) {

    membersError.value = e.response?.data?.error || e.response?.data?.message || 'Failed to load members.'

  } finally {

    membersLoading.value = false

  }

}



function toggleEdit() {

  editMode.value = !editMode.value

  saveError.value = ''

  if (!editMode.value && org.value) fillFormFromOrg(org.value)

}



async function saveProfile() {

  if (!orgId.value) return

  saving.value = true

  saveError.value = ''

  try {

    await orgStore.update(orgId.value, {

      name: profileForm.name?.trim(),

      ico: profileForm.ico?.trim(),

      sector: profileForm.sector?.trim() || null,

      description: profileForm.description?.trim() || null,

      contactEmail: profileForm.contactEmail?.trim() || null,

      contactPhone: profileForm.contactPhone?.trim() || null,

      website: profileForm.website?.trim() || null,

    })

    editMode.value = false

  } catch (e) {

    saveError.value = e.response?.data?.error || e.response?.data?.message || 'Failed to save organization.'

  } finally {

    saving.value = false

  }

}



function openStatusModal() {

  statusModal.nextStatus = org.value?.status || ''

  statusModal.show = true

}



async function submitStatus() {

  if (!orgId.value || !statusModal.nextStatus) return

  statusSaving.value = true

  try {

    await orgStore.changeStatus(orgId.value, statusModal.nextStatus)

    statusModal.show = false

  } catch (e) {

    saveError.value = e.response?.data?.error || e.response?.data?.message || 'Failed to change status.'

  } finally {

    statusSaving.value = false

  }

}



async function confirmDeleteOrg() {

  const ok = window.confirm('Delete this organization permanently? This cannot be undone.')

  if (!ok) return

  deleting.value = true

  saveError.value = ''

  try {

    await orgStore.delete(orgId.value)

    router.push('/app/admin/organizations')

  } catch (e) {

    saveError.value = e.response?.data?.error || e.response?.data?.message || 'Failed to delete organization.'

  } finally {

    deleting.value = false

  }

}



async function submitAddMember() {

  if (!orgId.value || !addMemberEmail.value.trim()) return

  const email = addMemberEmail.value.trim()

  memberSaving.value = true

  membersError.value = ''

  membersSuccess.value = ''

  try {

    if (await orgStore.isEmailAlreadyOrgMember(email)) {

      membersError.value = ORG_MEMBERSHIP_CONFLICT_MESSAGE

      return

    }

    await orgStore.inviteMember(orgId.value, email)

    membersSuccess.value = 'Member invited successfully.'

    addMemberEmail.value = ''

    await loadMembers()

  } catch (e) {

    membersError.value = isOrgMembershipConflictError(e)

      ? ORG_MEMBERSHIP_CONFLICT_MESSAGE

      : (e.response?.data?.error || e.response?.data?.message || 'Failed to invite member.')

  } finally {

    memberSaving.value = false

  }

}



async function transferOwnership(member) {

  if (!member?.id) return

  memberSaving.value = true

  membersError.value = ''

  try {

    await orgStore.transferOwnership(orgId.value, member.id)

    await loadMembers()

  } catch (e) {

    membersError.value = e.response?.data?.error || e.response?.data?.message || 'Failed to transfer ownership.'

  } finally {

    memberSaving.value = false

  }

}



function canRemoveMember(member) {

  if (!canManageMembers.value) return false

  if (!member?.id || member.role === orgStore.OrgMemberRole.OWNER) return false

  return true

}



async function confirmRemoveMember(member) {

  const ok = window.confirm('Are you sure you want to remove this member from the organization?')

  if (!ok) return

  await removeMember(member)

}



async function removeMember(member) {

  if (!member?.id) return

  memberSaving.value = true

  membersError.value = ''

  try {

    await orgStore.removeMember(orgId.value, member.id)

    await loadMembers()

  } catch (e) {

    membersError.value = e.response?.data?.error || e.response?.data?.message || 'Failed to remove member.'

  } finally {

    memberSaving.value = false

  }

}

</script>



<style scoped>

.page { width: 100%; }

.header { margin-bottom: 1.25rem; }

.header__eyebrow { margin: 0 0 0.35rem; font-size: 0.75rem; font-weight: 800; letter-spacing: 0.14em; text-transform: uppercase; color: #64748b; }

.header__title { margin: 0 0 0.5rem; font-size: clamp(1.5rem, 3vw, 2rem); font-weight: 900; letter-spacing: -0.03em; color: #0f172a; }

.header__text { margin: 0; color: #475569; line-height: 1.6; }

.state { text-align: center; padding: 2rem 1rem; color: #64748b; }

.state--error { color: #991b1b; }

.stack { display: grid; gap: 1rem; }

.card { border-radius: 18px; background: rgba(255, 255, 255, 0.95); border: 1px solid rgba(79, 70, 229, 0.1); box-shadow: 0 12px 32px rgba(15, 23, 42, 0.06); padding: 1.25rem; }

.card__top { display: flex; justify-content: space-between; align-items: flex-start; gap: 1rem; margin-bottom: 0.75rem; flex-wrap: wrap; }

.card__title { margin: 0; font-weight: 900; color: #0f172a; }

.card__actions { display: flex; flex-wrap: wrap; gap: 0.45rem; justify-content: flex-end; }

.btn-secondary { padding: 0.65rem 1rem; border-radius: 12px; border: 1px solid #cbd5e1; background: white; font-weight: 900; cursor: pointer; }

.btn-secondary:disabled { opacity: 0.55; cursor: not-allowed; }

.btn-primary { padding: 0.65rem 1rem; border-radius: 12px; border: none; background: #4f46e5; color: white; font-weight: 900; cursor: pointer; }

.btn-primary:disabled { opacity: 0.55; cursor: not-allowed; }

.btn-danger { padding: 0.65rem 1rem; border-radius: 12px; border: 1px solid rgba(220, 38, 38, 0.25); background: white; color: #b91c1c; font-weight: 900; cursor: pointer; }

.btn-danger:disabled { opacity: 0.55; cursor: not-allowed; }

.form { display: flex; flex-direction: column; gap: 0.85rem; }

.field { display: flex; flex-direction: column; gap: 0.35rem; font-size: 0.9rem; color: #334155; }

.field input, .field textarea, .field select { padding: 0.7rem 0.8rem; border-radius: 12px; border: 1px solid rgba(148, 163, 184, 0.7); font: inherit; }

.form-actions { display: flex; justify-content: flex-end; }

.details { margin: 0; display: grid; grid-template-columns: repeat(auto-fit, minmax(220px, 1fr)); gap: 0.75rem; }

.details__item { border: 1px solid rgba(79, 70, 229, 0.12); border-radius: 12px; padding: 0.7rem; }

.details__item--wide { grid-column: 1 / -1; }

.details__item dt { margin: 0; font-size: 0.75rem; text-transform: uppercase; color: #64748b; letter-spacing: 0.04em; }

.details__item dd { margin: 0.4rem 0 0; color: #0f172a; white-space: pre-wrap; word-break: break-word; }

.inline-error { margin: 0.75rem 0 0.35rem; padding: 0.75rem 0.85rem; border-radius: 12px; background: #fee2e2; color: #991b1b; font-size: 0.9rem; }

.inline-success { margin: 0.75rem 0 0.35rem; padding: 0.75rem 0.85rem; border-radius: 12px; background: #dcfce7; color: #166534; font-size: 0.9rem; }

.member-form { display: grid; grid-template-columns: 1fr auto; gap: 0.85rem; align-items: end; margin: 0.75rem 0 1rem; }

.table-wrap { overflow: auto; border-radius: 16px; border: 1px solid rgba(79, 70, 229, 0.12); background: rgba(255, 255, 255, 0.95); }

.table { width: 100%; border-collapse: collapse; font-size: 0.9rem; }

.table th, .table td { padding: 0.85rem 1rem; text-align: left; border-bottom: 1px solid rgba(15, 23, 42, 0.06); }

.table th { font-size: 0.72rem; text-transform: uppercase; letter-spacing: 0.06em; color: #64748b; background: rgba(79, 70, 229, 0.04); }

.muted { color: #64748b; }

.pill { display: inline-block; padding: 0.25rem 0.65rem; border-radius: 999px; font-size: 0.78rem; font-weight: 800; }

.pill--muted { background: #f1f5f9; color: #475569; }

.pill--ok { background: #d1fae5; color: #065f46; }

.actions-cell { text-align: right; white-space: nowrap; }

.btn-link { border: none; background: transparent; color: #4f46e5; font-weight: 900; cursor: pointer; padding: 0.35rem 0.45rem; }

.btn-link--danger { color: #dc2626; }

.btn-link:disabled { opacity: 0.5; cursor: not-allowed; }

.modal-overlay { position: fixed; inset: 0; background: rgba(15, 23, 42, 0.45); display: flex; align-items: center; justify-content: center; z-index: 100; padding: 1rem; }

.modal { width: 100%; max-width: 520px; background: white; border-radius: 16px; padding: 1.5rem; }

.modal h3 { margin: 0 0 0.35rem; }

.modal-meta { margin: 0 0 1rem; color: #64748b; font-size: 0.9rem; }

.modal-actions { display: flex; justify-content: flex-end; gap: 0.5rem; margin-top: 0.5rem; }

@media (max-width: 900px) {

  .member-form { grid-template-columns: 1fr; }

  .actions-cell { text-align: left; }

}

</style>


