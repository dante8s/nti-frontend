<template>
  <div class="page">
    <p class="lead">
      Manage programs A/B and calls (deadlines), and track the current status of each program.
    </p>

    <div class="tabs">
      <button type="button" :class="['tab', { active: tab === 'A' }]" @click="tab = 'A'; loadTab()">
        Program A
      </button>
      <button type="button" :class="['tab', { active: tab === 'B' }]" @click="tab = 'B'; loadTab()">
        Program B
      </button>
    </div>

    <div class="toolbar">
      <button type="button" class="btn-primary" @click="openProgramModal(null)">
        + New program ({{ tab }})
      </button>
      <button type="button" class="btn-ghost" @click="loadTab">
        Refresh
      </button>
    </div>

    <div v-if="loading" class="state">
      Loading…
    </div>
    <div v-else-if="error" class="state state--error">
      {{ error }}
    </div>
    <div v-else class="program-list">
      <article v-for="p in programs" :key="p.id" class="program-card">
        <div class="program-card__head">
          <div>
            <h2>{{ p.name }}</h2>
            <p class="desc">
              {{ p.description || '—' }}
            </p>
            <p v-if="programOrganizationLine(p)" class="program-org">
              Organization:
              <router-link
                v-if="programOrganizationAdminLink(p)"
                class="program-org__link"
                :to="programOrganizationAdminLink(p)"
                @click.stop
              >
                {{ programOrganizationName(p) }}
              </router-link>
              <span v-else>{{ programOrganizationName(p) }}</span>
            </p>
            <StatusBadge :status="p.status" :label="statusLabel(p.status)" />
          </div>
          <div class="program-card__actions">
            <button type="button" class="btn-sm" @click="openProgramModal(p)">
              Edit
            </button>
            <button type="button" class="btn-sm btn-sm--ghost" @click="openProgramDetails(p)">
              Open Details
            </button>
          </div>
        </div>

        <section class="calls">
          <div class="calls__head">
            <h3>Calls</h3>
            <button type="button" class="btn-sm" @click="openCallModal(p)">
              + Add call
            </button>
          </div>

          <div v-if="callsByProgram[p.id]?.loading" class="muted">
            Loading calls…
          </div>
          <div v-else-if="!(callsByProgram[p.id]?.items || []).length" class="muted">
            No calls yet.
          </div>
          <ul v-else class="call-rows">
            <li v-for="c in callsByProgram[p.id].items" :key="c.id" class="call-row">
              <div>
                <div class="call-title">
                  {{ c.title }}
                </div>
                <div class="call-meta">
                  Deadline: {{ formatDt(c.deadline) }} · {{ c.status }}
                </div>
              </div>
              <button v-if="c.status === 'OPEN'" type="button" class="btn-sm btn-sm--warn" @click="closeCall(c)">
                Close
              </button>
            </li>
          </ul>
        </section>
      </article>
    </div>

    <!-- Program modal -->
    <div v-if="programModal.show" class="modal-overlay" @click.self="programModal.show = false">
      <div class="modal">
        <h3>{{ programModal.edit ? 'Edit program' : 'New program' }}</h3>
        <label class="field">
          <span>Name</span>
          <input v-model="programModal.name" type="text">
        </label>
        <label class="field">
          <span>Description</span>
          <textarea v-model="programModal.description" rows="3" />
        </label>
        <label v-if="programModal.edit" class="field">
          <span>Current status</span>
          <StatusBadge :status="programModal.status" :label="statusLabel(programModal.status)" />
        </label>
        <label v-if="showOrganizationAssign" class="field">
          <span>Assign Organization</span>
          <select v-model="programModal.organizationId">
            <option value="">
              — Select organization —
            </option>
            <option v-for="org in organizations" :key="org.id" :value="String(org.id)">
              {{ org.name }}{{ org.ico ? ` (${org.ico})` : '' }}
            </option>
          </select>
        </label>
        <div class="modal-actions">
          <button type="button" class="btn-secondary" @click="programModal.show = false">
            Cancel
          </button>
          <button type="button" class="btn-primary-solid" @click="saveProgram">
            Save
          </button>
        </div>
      </div>
    </div>

    <!-- Call modal -->
    <div v-if="callModal.show" class="modal-overlay" @click.self="callModal.show = false">
      <div class="modal">
        <h3>New call</h3>
        <p class="muted small">
          The deadline must be in the future (validated on the server).
        </p>
        <label class="field">
          <span>Name</span>
          <input v-model="callModal.title" type="text">
        </label>
        <label class="field">
          <span>Deadline</span>
          <input v-model="callModal.deadlineLocal" type="datetime-local">
        </label>
        <label class="field">
          <span>Evaluation criteria (optional)</span>
          <textarea v-model="callModal.evaluationCriteria" rows="2" />
        </label>
        <div class="modal-actions">
          <button type="button" class="btn-secondary" @click="callModal.show = false">
            Cancel
          </button>
          <button type="button" class="btn-primary-solid" @click="saveCall">
            Create
          </button>
        </div>
      </div>
    </div>

    <div v-if="toast.show" class="toast" :class="toast.type">
      {{ toast.message }}
    </div>
  </div>
</template>

<script setup>
import { computed, reactive, ref, watch } from 'vue'
import { useRouter } from 'vue-router'
import { programsApi } from '@/api/programs'
import { useAuthStore } from '@/stores/auth'
import { useOrganizationStore } from '@/stores/organization'
import { apiErrorMessage } from '@/utils/apiError'
import { isSuperAdmin } from '@/utils/roles'
import StatusBadge from '@/components/StatusBadge.vue'

const router = useRouter()
const authStore = useAuthStore()
const orgStore = useOrganizationStore()
const tab = ref('A')
const programs = ref([])
const organizations = ref([])
const loading = ref(true)
const error = ref('')

const callsByProgram = reactive({})

const programModal = reactive({
  show: false,
  edit: false,
  id: null,
  name: '',
  description: '',
  status: '',
  organizationId: '',
  initialOrganizationId: '',
})

const callModal = reactive({
  show: false,
  program: null,
  title: '',
  deadlineLocal: '',
  evaluationCriteria: '',
})

const toast = reactive({
  show: false,
  message: '',
  type: 'success',
})

watch(tab, () => {
  loadTab()
}, { immediate: true })

const isSuperAdminUser = computed(() => isSuperAdmin(authStore.roles))

const showOrganizationAssign = computed(() =>
  tab.value === 'B' && isSuperAdminUser.value && programModal.show,
)

async function loadOrganizations() {
  if (!isSuperAdminUser.value) return
  try {
    organizations.value = (await orgStore.getAll()) || []
  } catch {
    organizations.value = []
  }
}

async function loadTab() {
  loading.value = true
  error.value = ''
  const type = tab.value === 'A' ? 'A' : 'B'
  try {
    const res = await programsApi.getAllByType(type)
    programs.value = res.data || []
    for (const p of programs.value) {
      loadCalls(p.id)
    }
  } catch (e) {
    error.value = apiErrorMessage(e, 'Failed to load programs')
  } finally {
    loading.value = false
  }
}

async function loadCalls(programId) {
  if (!callsByProgram[programId]) {
    callsByProgram[programId] = { loading: true, items: [] }
  } else {
    callsByProgram[programId].loading = true
  }
  try {
    const res = await programsApi.getCallsByProgram(programId)
    callsByProgram[programId].items = res.data || []
  } catch {
    callsByProgram[programId].items = []
  } finally {
    callsByProgram[programId].loading = false
  }
}

function openProgramModal(p) {
  if (p) {
    programModal.edit = true
    programModal.id = p.id
    programModal.name = p.name
    programModal.description = p.description || ''
    programModal.status = p.status || ''
    const orgId = programOrganizationId(p)
    programModal.organizationId = orgId != null ? String(orgId) : ''
    programModal.initialOrganizationId = programModal.organizationId
  } else {
    programModal.edit = false
    programModal.id = null
    programModal.name = ''
    programModal.description = ''
    programModal.status = ''
    programModal.organizationId = ''
    programModal.initialOrganizationId = ''
  }
  if (tab.value === 'B' && isSuperAdminUser.value) {
    loadOrganizations()
  }
  programModal.show = true
}

async function saveProgram() {
  const type = `PROGRAM_${tab.value}`
  const body = {
    name: programModal.name,
    description: programModal.description,
    type,
  }

  try {
    let programId = programModal.id
    if (programModal.edit) {
      await programsApi.update(programModal.id, body)
      showToast('Program updated', 'success')
    } else {
      const res = await programsApi.create(body)
      programId = res.data?.id ?? null
      showToast('Program created', 'success')
    }

    if (
      tab.value === 'B'
      && isSuperAdminUser.value
      && programId
      && programModal.organizationId
      && programModal.organizationId !== programModal.initialOrganizationId
    ) {
      await programsApi.assignOrganization(programId, programModal.organizationId)
      showToast('Organization assigned to program', 'success')
    }

    programModal.show = false
    await loadTab()
  } catch (e) {
    showToast(apiErrorMessage(e, 'Save error'), 'error')
  }
}

function statusLabel(status) {
  if (!status) return 'Unknown'
  return status
    .toString()
    .toLowerCase()
    .split('_')
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(' ')
}

function programOrganizationId(p) {
  return p?.organizationId ?? p?.organization_id ?? null
}

function programOrganizationName(p) {
  return p?.organizationName ?? p?.organization_name ?? '—'
}

function programOrganizationLine(p) {
  return programOrganizationName(p) !== '—' || programOrganizationAdminLink(p)
}

function programOrganizationAdminLink(p) {
  const id = programOrganizationId(p)
  if (id == null || id === '') return null
  return { name: 'OrganizationDetails', params: { id: String(id) } }
}

/** String for <input type="datetime-local"> in the browser local time. */
function toDatetimeLocalValue(d) {
  const pad = (n) => String(n).padStart(2, '0')
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`
}

/**
 * Value from datetime-local → "YYYY-MM-DDTHH:mm:ss" without UTC conversion,
 * so that LocalDateTime on the server matches what the user selected.
 */
function deadlineFromLocalInput(localStr) {
  if (!localStr || typeof localStr !== 'string') return null
  const t = localStr.trim()
  if (t.length === 16) return `${t}:00`
  if (t.length >= 19) return t.slice(0, 19)
  return null
}

function openCallModal(program) {
  callModal.program = program
  callModal.title = ''
  const t = new Date()
  t.setDate(t.getDate() + 7)
  callModal.deadlineLocal = toDatetimeLocalValue(t)
  callModal.evaluationCriteria = ''
  callModal.show = true
}

async function saveCall() {
  const p = callModal.program
  if (!p || !callModal.title.trim()) return
  const deadline = deadlineFromLocalInput(callModal.deadlineLocal)
  if (!deadline) {
    showToast('Please select a deadline', 'error')
    return
  }
  try {
    await programsApi.createCall(p.id, {
      title: callModal.title.trim(),
      deadline,
      evaluationCriteria: callModal.evaluationCriteria?.trim() || null,
    })
    showToast('Call created', 'success')
    callModal.show = false
    await loadCalls(p.id)
  } catch (e) {
    showToast(
      apiErrorMessage(e, 'Check the deadline (must be in the future relative to the server)'),
      'error',
    )
  }
}

async function closeCall(c) {
  if (!confirm('Close the call for new applications?')) return
  try {
    await programsApi.closeCall(c.id)
    showToast('Call closed', 'success')
    await loadCalls(c.programId)
  } catch (e) {
    showToast(apiErrorMessage(e, 'Failed to close the call'), 'error')
  }
}

function formatDt(iso) {
  if (!iso) return '—'
  return new Date(iso).toLocaleString('uk-UA', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  })
}

function showToast(message, type = 'success') {
  toast.message = message
  toast.type = type
  toast.show = true
  setTimeout(() => { toast.show = false }, 3000)
}

function openProgramDetails(program) {
  const programId = program?.id
  const rawType = program?.type || (tab.value === 'A' ? 'PROGRAM_A' : 'PROGRAM_B')
  if (!programId) return

  // We pass 'B' or 'A' in the query so ProgramDetail can find it easily
  const typeQuery = String(rawType).includes('B') ? 'B' : 'A'

  router.push({
    name: 'program-detail',
    // keep required route param happy, but rely on query for strict fetching
    params: { type: typeQuery.toLowerCase(), id: String(programId) },
    query: { type: typeQuery },
  })
}
</script>

<style scoped>
.page {
  width: 100%;
}

.lead {
  margin: 0 0 1.25rem;
  color: #475569;
  line-height: 1.6;
  max-width: 48rem;
}

.tabs {
  display: flex;
  gap: 0.5rem;
  margin-bottom: 1rem;
}

.tab {
  padding: 0.55rem 1.2rem;
  border-radius: 999px;
  border: 1px solid rgba(79, 70, 229, 0.2);
  background: white;
  font-weight: 600;
  color: #64748b;
  cursor: pointer;
}

.tab.active {
  background: rgba(79, 70, 229, 0.15);
  color: #312e81;
  border-color: rgba(79, 70, 229, 0.35);
}

.toolbar {
  display: flex;
  gap: 0.75rem;
  margin-bottom: 1.25rem;
  flex-wrap: wrap;
}

.btn-primary {
  padding: 0.6rem 1.1rem;
  border-radius: 12px;
  border: none;
  background: #4f46e5;
  color: white;
  font-weight: 600;
  cursor: pointer;
}

.btn-ghost {
  padding: 0.6rem 1rem;
  border-radius: 12px;
  border: 1px solid #cbd5e1;
  background: white;
  font-weight: 600;
  cursor: pointer;
}

.state {
  padding: 2rem;
  text-align: center;
  color: #64748b;
}

.state--error {
  color: #b91c1c;
}

.program-list {
  display: flex;
  flex-direction: column;
  gap: 1.25rem;
}

.program-card {
  border-radius: 18px;
  padding: 1.35rem 1.5rem;
  background: rgba(255, 255, 255, 0.95);
  border: 1px solid rgba(79, 70, 229, 0.1);
  box-shadow: 0 14px 36px rgba(15, 23, 42, 0.06);
}

.program-card h2 {
  margin: 0 0 0.35rem;
  font-size: 1.2rem;
}

.desc {
  margin: 0;
  color: #64748b;
  font-size: 0.92rem;
  line-height: 1.5;
}

.program-org {
  margin: 0.45rem 0 0;
  font-size: 0.88rem;
  color: #475569;
}

.program-org__link {
  color: #4f46e5;
  font-weight: 600;
  text-decoration: none;
}

.program-org__link:hover {
  text-decoration: underline;
}

.program-card__head {
  display: flex;
  justify-content: space-between;
  gap: 1rem;
  align-items: flex-start;
}

.program-card__actions {
  display: flex;
  flex-direction: column;
  gap: 0.35rem;
}

.btn-sm {
  padding: 0.4rem 0.75rem;
  border-radius: 10px;
  border: 1px solid rgba(79, 70, 229, 0.25);
  background: white;
  color: #4338ca;
  font-weight: 600;
  font-size: 0.8rem;
  cursor: pointer;
}

.btn-sm--warn {
  border-color: rgba(217, 119, 6, 0.4);
  color: #b45309;
}

.calls {
  margin-top: 1.25rem;
  padding-top: 1rem;
  border-top: 1px solid rgba(15, 23, 42, 0.06);
}

.calls__head {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 0.65rem;
}

.calls h3 {
  margin: 0;
  font-size: 0.95rem;
}

.call-rows {
  list-style: none;
  margin: 0;
  padding: 0;
}

.call-row {
  display: flex;
  justify-content: space-between;
  gap: 0.75rem;
  padding: 0.65rem 0;
  border-bottom: 1px solid rgba(15, 23, 42, 0.05);
}

.call-title {
  font-weight: 600;
  font-size: 0.9rem;
}

.call-meta {
  font-size: 0.78rem;
  color: #64748b;
  margin-top: 0.15rem;
}

.muted {
  color: #94a3b8;
  font-size: 0.88rem;
}

.small {
  font-size: 0.82rem;
  margin-top: 0;
}

.modal-overlay {
  position: fixed;
  inset: 0;
  background: rgba(15, 23, 42, 0.45);
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 100;
  padding: 1rem;
}

.modal {
  width: 100%;
  max-width: 420px;
  background: white;
  border-radius: 16px;
  padding: 1.5rem;
}

.modal h3 {
  margin: 0 0 1rem;
}

.field {
  display: flex;
  flex-direction: column;
  gap: 0.35rem;
  margin-bottom: 0.85rem;
  font-size: 0.88rem;
}

.field input,
.field textarea,
.field select {
  padding: 0.5rem 0.65rem;
  border-radius: 10px;
  border: 1px solid #cbd5e1;
  font: inherit;
}

.field.row {
  flex-direction: row;
  align-items: center;
  gap: 0.5rem;
}

.modal-actions {
  display: flex;
  justify-content: flex-end;
  gap: 0.5rem;
  margin-top: 0.5rem;
}

.btn-secondary {
  padding: 0.55rem 1rem;
  border-radius: 10px;
  border: 1px solid #cbd5e1;
  background: white;
  font-weight: 600;
  cursor: pointer;
}

.btn-primary-solid {
  padding: 0.55rem 1rem;
  border-radius: 10px;
  border: none;
  background: #4f46e5;
  color: white;
  font-weight: 600;
  cursor: pointer;
}

.toast {
  position: fixed;
  bottom: 1.5rem;
  right: 1.5rem;
  padding: 0.65rem 1.1rem;
  border-radius: 12px;
  font-size: 0.88rem;
  z-index: 120;
}

.toast.success {
  background: #059669;
  color: white;
}

.toast.error {
  background: #dc2626;
  color: white;
}
</style>

