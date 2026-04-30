<template>
  <div class="page">
    <section class="header">
      <p class="header__eyebrow">Organization</p>
      <h2 class="header__title">
        {{ org?.name || 'Organization profile' }}
      </h2>
      <p class="header__text">
        Manage your organization profile and members based on your role.
      </p>
    </section>

    <div v-if="loading" class="state">
      Loading…
    </div>
    <div v-else-if="error" class="state state--error">
      {{ error }}
    </div>
    <div v-else-if="!org" class="empty">
      <p class="empty__text">
        No organization found for your account.
      </p>
      <router-link class="empty__btn" to="/app/org/register">
        Register Organization
      </router-link>
    </div>
    <div v-else class="stack">
      <div class="card">
        <div class="card__top">
          <div>
            <h3 class="card__title">Profile details</h3>
            <p class="card__meta">
              Status: <strong>{{ org.status || '—' }}</strong>
            </p>
          </div>
          <button
            v-if="canEdit"
            type="button"
            class="btn-secondary"
            @click="toggleEdit"
          >
            {{ editMode ? 'Cancel' : 'Edit' }}
          </button>
        </div>

        <div v-if="saveError" class="inline-error">
          {{ saveError }}
        </div>

        <form class="form" @submit.prevent="saveProfile">
          <label class="field">
            <span>Name</span>
            <input v-model="profileForm.name" :disabled="!editMode" type="text" />
          </label>

          <label class="field">
            <span>ICO</span>
            <input v-model="profileForm.ico" :disabled="!editMode" type="text" />
          </label>

          <label class="field">
            <span>Sector</span>
            <input v-model="profileForm.sector" :disabled="!editMode" type="text" />
          </label>

          <label class="field">
            <span>Description</span>
            <textarea v-model="profileForm.description" :disabled="!editMode" rows="4" />
          </label>

          <div class="grid">
            <label class="field">
              <span>Contact email</span>
              <input v-model="profileForm.contactEmail" :disabled="!editMode" type="email" />
            </label>

            <label class="field">
              <span>Contact phone</span>
              <input v-model="profileForm.contactPhone" :disabled="!editMode" type="tel" />
            </label>
          </div>

          <label class="field">
            <span>Website</span>
            <input v-model="profileForm.website" :disabled="!editMode" type="url" />
          </label>

          <div v-if="editMode" class="actions">
            <button type="submit" class="btn-primary" :disabled="saving || !profileForm.name.trim() || !profileForm.ico.trim()">
              {{ saving ? 'Saving…' : 'Save changes' }}
            </button>
          </div>
        </form>
      </div>

      <div v-if="canViewMembers" class="card">
        <div class="card__top">
          <div>
            <h3 class="card__title">Members</h3>
            <p class="card__meta">
              {{
                canManageMembers
                  ? 'Manage who has access to this organization.'
                  : 'All members and their roles (read-only).'
              }}
            </p>
          </div>
          <button type="button" class="btn-secondary" @click="refreshMembers" :disabled="membersLoading">
            {{ membersLoading ? 'Loading…' : 'Refresh' }}
          </button>
        </div>

        <div v-if="membersError" class="inline-error">
          {{ membersError }}
        </div>

        <form v-if="canManageMembers" class="member-form" @submit.prevent="submitAddMember">
          <label class="field">
            <span>Email</span>
            <input v-model="addMember.email" type="email" placeholder="user@company.com" />
          </label>

          <label class="field">
            <span>Role</span>
            <select v-model="addMember.role">
              <option :value="orgStore.OrgMemberRole.MEMBER">
                MEMBER
              </option>
            </select>
          </label>

          <button type="submit" class="btn-primary" :disabled="memberSaving || !addMember.email.trim()">
            {{ memberSaving ? 'Adding…' : 'Add member' }}
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
                    v-if="isAdmin && m.role !== orgStore.OrgMemberRole.OWNER"
                    type="button"
                    class="btn-link"
                    :disabled="memberSaving"
                    @click="confirmTransferOwnership(m)"
                  >
                    Transfer Ownership
                  </button>
                  <button
                    v-if="canManageMembers"
                    type="button"
                    class="btn-link btn-link--danger"
                    :disabled="memberSaving || isMe(m)"
                    @click="removeMember(m)"
                  >
                    Remove
                  </button>
                </td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>

      <div v-else class="card card--muted">
        <h3 class="card__title">Members</h3>
        <p class="card__meta">
          You have read-only access. Member management is available to the organization owner.
        </p>
      </div>
    </div>
  </div>
</template>

<script setup>
import { computed, onMounted, reactive, ref } from 'vue'
import { storeToRefs } from 'pinia'
import { useAuthStore } from '@/stores/auth'
import { useOrganizationStore } from '@/stores/organization'

const auth = useAuthStore()
const orgStore = useOrganizationStore()

const { currentOrganization, members } = storeToRefs(orgStore)

const loading = ref(true)
const error = ref('')
const saving = ref(false)
const saveError = ref('')

const membersLoading = ref(false)
const membersError = ref('')
const memberSaving = ref(false)

const editMode = ref(false)

const profileForm = reactive({
  name: '',
  ico: '',
  sector: '',
  description: '',
  contactEmail: '',
  contactPhone: '',
  website: '',
})

const addMember = reactive({
  email: '',
  role: orgStore.OrgMemberRole.MEMBER,
})

const isAdmin = computed(() => auth.roles?.some((r) => r === 'ADMIN' || r === 'SUPER_ADMIN'))

const org = computed(() => currentOrganization.value)

const myMember = computed(() => {
  const email = auth.user?.email
  if (!email) return null
  return (members.value || []).find((m) => m?.userEmail?.toLowerCase() === String(email).toLowerCase()) || null
})

const canViewMembers = computed(() =>
  isAdmin.value || !!myMember.value,
)

const canManageMembers = computed(() =>
  isAdmin.value || myMember.value?.role === orgStore.OrgMemberRole.OWNER,
)

const canEdit = computed(() => canManageMembers.value)

onMounted(init)

async function init() {
  loading.value = true
  error.value = ''
  try {
    const my = await orgStore.getMy()
    const first = Array.isArray(my) ? my[0] : null
    if (first) {
      currentOrganization.value = first
      fillFormFromOrg(first)
      await refreshMembers()
    }
  } catch (e) {
    error.value = e.response?.data?.message || 'Failed to load organization profile.'
  } finally {
    loading.value = false
  }
}

function fillFormFromOrg(o) {
  profileForm.name = o?.name || ''
  profileForm.ico = o?.ico || ''
  profileForm.sector = o?.sector || ''
  profileForm.description = o?.description || ''
  profileForm.contactEmail = o?.contactEmail || ''
  profileForm.contactPhone = o?.contactPhone || ''
  profileForm.website = o?.website || ''
}

function toggleEdit() {
  editMode.value = !editMode.value
  saveError.value = ''
  if (!editMode.value && org.value) {
    fillFormFromOrg(org.value)
  }
}

async function saveProfile() {
  if (!org.value?.id) return
  saving.value = true
  saveError.value = ''
  try {
    const payload = {
      name: profileForm.name?.trim(),
      ico: profileForm.ico?.trim(),
      sector: profileForm.sector?.trim() || null,
      description: profileForm.description?.trim() || null,
      contactEmail: profileForm.contactEmail?.trim() || null,
      contactPhone: profileForm.contactPhone?.trim() || null,
      website: profileForm.website?.trim() || null,
    }
    await orgStore.update(org.value.id, payload)
    editMode.value = false
  } catch (e) {
    saveError.value = e.response?.data?.message
      || (typeof e.response?.data === 'string' ? e.response.data : null)
      || 'Failed to save changes.'
  } finally {
    saving.value = false
  }
}

async function refreshMembers() {
  if (!org.value?.id) return
  membersLoading.value = true
  membersError.value = ''
  try {
    await orgStore.getMembers(org.value.id)
  } catch (e) {
    membersError.value = e.response?.data?.message || 'Failed to load members.'
  } finally {
    membersLoading.value = false
  }
}

function isMe(m) {
  const email = auth.user?.email
  if (!email) return false
  return String(m?.userEmail || '').toLowerCase() === String(email).toLowerCase()
}

async function submitAddMember() {
  if (!org.value?.id) return
  memberSaving.value = true
  membersError.value = ''
  try {
    await orgStore.addMember(org.value.id, {
      email: addMember.email?.trim(),
      role: addMember.role,
    })
    addMember.email = ''
    await refreshMembers()
  } catch (e) {
    membersError.value = e.response?.data?.message
      || (typeof e.response?.data === 'string' ? e.response.data : null)
      || 'Failed to add member.'
  } finally {
    memberSaving.value = false
  }
}

async function removeMember(m) {
  if (!org.value?.id || !m?.id) return
  memberSaving.value = true
  membersError.value = ''
  try {
    await orgStore.removeMember(org.value.id, m.id)
    await refreshMembers()
  } catch (e) {
    membersError.value = e.response?.data?.message || 'Failed to remove member.'
  } finally {
    memberSaving.value = false
  }
}

async function makeOwner(m) {
  if (!org.value?.id || !m?.id) return
  memberSaving.value = true
  membersError.value = ''
  try {
    await orgStore.transferOwnership(org.value.id, m.id)
    await refreshMembers()
  } catch (e) {
    membersError.value = e.response?.data?.message || 'Failed to transfer ownership.'
  } finally {
    memberSaving.value = false
  }
}

async function confirmTransferOwnership(m) {
  const ok = window.confirm('Are you sure? This will demote you to a regular member.')
  if (!ok) return
  await makeOwner(m)
}
</script>

<style scoped>
.page {
  width: 100%;
}

.header {
  margin-bottom: 1.25rem;
}

.header__eyebrow {
  margin: 0 0 0.35rem;
  font-size: 0.75rem;
  font-weight: 800;
  letter-spacing: 0.14em;
  text-transform: uppercase;
  color: #64748b;
}

.header__title {
  margin: 0 0 0.5rem;
  font-size: clamp(1.5rem, 3vw, 2rem);
  font-weight: 900;
  letter-spacing: -0.03em;
  color: #0f172a;
}

.header__text {
  margin: 0;
  max-width: 52rem;
  color: #475569;
  line-height: 1.6;
}

.state {
  text-align: center;
  padding: 2.5rem 1rem;
  color: #64748b;
}

.state--error {
  text-align: left;
  padding: 0.95rem 1rem;
  border-radius: 14px;
  background: #fee2e2;
  color: #991b1b;
}

.empty {
  padding: 1.25rem;
  border-radius: 18px;
  background: rgba(255, 255, 255, 0.95);
  border: 1px solid rgba(79, 70, 229, 0.1);
  box-shadow: 0 12px 32px rgba(15, 23, 42, 0.06);
}

.empty__text {
  margin: 0 0 0.9rem;
  color: #475569;
}

.empty__btn {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  padding: 0.75rem 1.1rem;
  border-radius: 999px;
  background: #4f46e5;
  color: white;
  font-weight: 900;
  text-decoration: none;
}

.empty__btn:hover {
  background: #4338ca;
}

.stack {
  display: grid;
  gap: 1rem;
}

.card {
  border-radius: 18px;
  background: rgba(255, 255, 255, 0.95);
  border: 1px solid rgba(79, 70, 229, 0.1);
  box-shadow: 0 12px 32px rgba(15, 23, 42, 0.06);
  padding: 1.25rem;
}

.card--muted {
  background: rgba(255, 255, 255, 0.8);
}

.card__top {
  display: flex;
  gap: 1rem;
  align-items: flex-start;
  justify-content: space-between;
  margin-bottom: 0.75rem;
}

.card__title {
  margin: 0;
  font-weight: 900;
  color: #0f172a;
}

.card__meta {
  margin: 0.35rem 0 0;
  color: #64748b;
}

.inline-error {
  margin: 0.75rem 0 0.35rem;
  padding: 0.75rem 0.85rem;
  border-radius: 12px;
  background: #fee2e2;
  color: #991b1b;
  font-size: 0.9rem;
}

.form {
  display: flex;
  flex-direction: column;
  gap: 0.85rem;
}

.grid {
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: 0.85rem;
}

.field {
  display: flex;
  flex-direction: column;
  gap: 0.35rem;
  font-size: 0.9rem;
  color: #334155;
}

.field input,
.field textarea,
.field select {
  padding: 0.7rem 0.8rem;
  border-radius: 12px;
  border: 1px solid rgba(148, 163, 184, 0.7);
  background: white;
  font: inherit;
}

.field input:disabled,
.field textarea:disabled,
.field select:disabled {
  background: #f8fafc;
  color: #64748b;
}

.actions {
  display: flex;
  justify-content: flex-end;
  margin-top: 0.25rem;
}

.btn-secondary {
  padding: 0.65rem 1rem;
  border-radius: 12px;
  border: 1px solid #cbd5e1;
  background: white;
  font-weight: 900;
  cursor: pointer;
  flex-shrink: 0;
}

.btn-secondary:hover:not(:disabled) {
  background: rgba(79, 70, 229, 0.06);
}

.btn-primary {
  padding: 0.65rem 1rem;
  border-radius: 12px;
  border: none;
  background: #4f46e5;
  color: white;
  font-weight: 900;
  cursor: pointer;
}

.btn-primary:hover:not(:disabled) {
  background: #4338ca;
}

.btn-primary:disabled,
.btn-secondary:disabled {
  opacity: 0.55;
  cursor: not-allowed;
}

.member-form {
  display: grid;
  grid-template-columns: 1.5fr 0.7fr auto;
  gap: 0.85rem;
  align-items: end;
  margin: 0.75rem 0 1rem;
}

.table-wrap {
  overflow: auto;
  border-radius: 16px;
  border: 1px solid rgba(79, 70, 229, 0.12);
  background: rgba(255, 255, 255, 0.95);
}

.table {
  width: 100%;
  border-collapse: collapse;
  font-size: 0.9rem;
}

.table th,
.table td {
  padding: 0.85rem 1rem;
  text-align: left;
  border-bottom: 1px solid rgba(15, 23, 42, 0.06);
}

.table th {
  font-size: 0.72rem;
  text-transform: uppercase;
  letter-spacing: 0.06em;
  color: #64748b;
  background: rgba(79, 70, 229, 0.04);
}

.muted {
  color: #64748b;
}

.pill {
  display: inline-block;
  padding: 0.25rem 0.65rem;
  border-radius: 999px;
  font-size: 0.78rem;
  font-weight: 800;
}

.pill--muted {
  background: #f1f5f9;
  color: #475569;
}

.pill--ok {
  background: #d1fae5;
  color: #065f46;
}

.actions-cell {
  text-align: right;
  white-space: nowrap;
}

.btn-link {
  border: none;
  background: transparent;
  color: #4f46e5;
  font-weight: 900;
  cursor: pointer;
  padding: 0.35rem 0.45rem;
}

.btn-link:hover {
  text-decoration: underline;
}

.btn-link--danger {
  color: #dc2626;
}

@media (max-width: 900px) {
  .grid {
    grid-template-columns: 1fr;
  }

  .member-form {
    grid-template-columns: 1fr;
    align-items: stretch;
  }

  .actions-cell {
    text-align: left;
  }
}
</style>

