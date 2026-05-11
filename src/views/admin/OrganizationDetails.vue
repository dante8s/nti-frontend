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
          <button type="button" class="btn-secondary" :disabled="loading" @click="load">
            Refresh
          </button>
        </div>

        <dl class="details">
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

      <div class="card">
        <div class="card__top">
          <h3 class="card__title">Members</h3>
          <button type="button" class="btn-secondary" :disabled="membersLoading" @click="loadMembers">
            {{ membersLoading ? 'Loading…' : 'Refresh members' }}
          </button>
        </div>

        <div v-if="membersError" class="inline-error">
          {{ membersError }}
        </div>

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
                    v-if="m.role !== orgStore.OrgMemberRole.OWNER"
                    type="button"
                    class="btn-link"
                    :disabled="memberSaving"
                    @click="transferOwnership(m)"
                  >
                    Transfer ownership
                  </button>
                  <button
                    v-if="m.role !== orgStore.OrgMemberRole.OWNER"
                    type="button"
                    class="btn-link btn-link--danger"
                    :disabled="memberSaving"
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
    </div>
  </div>
</template>

<script setup>
import { computed, onMounted, ref } from 'vue'
import { useRoute } from 'vue-router'
import { storeToRefs } from 'pinia'
import { useOrganizationStore } from '@/stores/organization'

const route = useRoute()
const orgStore = useOrganizationStore()
const { currentOrganization, members } = storeToRefs(orgStore)

const loading = ref(true)
const error = ref('')
const membersLoading = ref(false)
const membersError = ref('')
const memberSaving = ref(false)

const orgId = computed(() => String(route.params.id || '').trim())
const org = computed(() => currentOrganization.value)

onMounted(load)

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
    await loadMembers()
  } catch (e) {
    error.value = e.response?.data?.message || 'Failed to load organization.'
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
    membersError.value = e.response?.data?.message || 'Failed to load members.'
  } finally {
    membersLoading.value = false
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
    membersError.value = e.response?.data?.message || 'Failed to transfer ownership.'
  } finally {
    memberSaving.value = false
  }
}

async function removeMember(member) {
  if (!member?.id) return
  memberSaving.value = true
  membersError.value = ''
  try {
    await orgStore.removeMember(orgId.value, member.id)
    await loadMembers()
  } catch (e) {
    membersError.value = e.response?.data?.message || 'Failed to remove member.'
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
.card__top { display: flex; justify-content: space-between; align-items: flex-start; gap: 1rem; margin-bottom: 0.75rem; }
.card__title { margin: 0; font-weight: 900; color: #0f172a; }
.btn-secondary { padding: 0.65rem 1rem; border-radius: 12px; border: 1px solid #cbd5e1; background: white; font-weight: 900; cursor: pointer; }
.btn-secondary:disabled { opacity: 0.55; cursor: not-allowed; }
.details { margin: 0; display: grid; grid-template-columns: repeat(auto-fit, minmax(220px, 1fr)); gap: 0.75rem; }
.details__item { border: 1px solid rgba(79, 70, 229, 0.12); border-radius: 12px; padding: 0.7rem; }
.details__item--wide { grid-column: 1 / -1; }
.details__item dt { margin: 0; font-size: 0.75rem; text-transform: uppercase; color: #64748b; letter-spacing: 0.04em; }
.details__item dd { margin: 0.4rem 0 0; color: #0f172a; white-space: pre-wrap; word-break: break-word; }
.inline-error { margin: 0.75rem 0 0.35rem; padding: 0.75rem 0.85rem; border-radius: 12px; background: #fee2e2; color: #991b1b; font-size: 0.9rem; }
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
</style>

