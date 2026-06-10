<template>
  <div class="page">
    <h1>My applications</h1>

    <div v-if="loading" class="loading">
      Loading...
    </div>

    <div v-else-if="error" class="empty empty--error">
      <p>{{ error }}</p>
      <p class="hint">Make sure the Spring backend is running on port 8080 and log in again.</p>
      <button type="button" class="btn-go" @click="load">Try again</button>
    </div>

    <div v-else-if="applications.length === 0" class="empty">
      <p>You have no applications yet</p>
      <router-link to="/programs/a" class="btn-go">
        Browse programs
      </router-link>
    </div>

    <div v-else class="layout">

      <!-- Application list -->
      <div class="list">
        <div
          v-for="app in applications"
          :key="app.id"
          class="app-card"
          :class="{
            active: sameApplicationId(selectedId, app.id),
            [statusClass(app.status)]: true
          }"
          @click="selectApplication(app)"
        >
          <div class="card-top">
            <span class="program-tag">
              {{ app.programType === 'PROGRAM_A' ? 'Program A' : 'Program B' }}
            </span>
            <span class="status-tag" :class="statusClass(app.status)">
              {{ statusLabel(app.status) }}
            </span>
          </div>
          <div class="card-title">{{ app.callTitle }}</div>
          <div class="card-sub">{{ app.programName }}</div>
          <div class="card-date">{{ formatDate(app.createdAt) }}</div>

          <!-- Card footer: buttons from Andrii branch -->
          <footer class="card__foot">
            <span class="muted">Updated: {{ formatDate(app.updatedAt) }}</span>
            <div class="card__foot-actions">
              <button
                v-if="programDetailRoute(app)"
                type="button"
                class="program-proposal-btn"
                @click.stop="openProgramProposal(app)"
              >
                Open Program Proposal
              </button>
              <router-link
                v-if="app.status === 'DRAFT'"
                :to="draftRoute(app)"
                class="link-continue"
                @click.stop
              >
                Continue draft →
              </router-link>
            </div>
          </footer>
        </div>
      </div>

      <!-- Details -->
      <div v-if="selected" class="detail">

        <!-- Header -->
        <div class="detail-head">
          <div>
            <h2>{{ selected.callTitle }}</h2>
            <div class="detail-sub">{{ selected.programName }}</div>
          </div>
          <span class="status-tag large" :class="statusClass(selected.status)">
            {{ statusLabel(selected.status) }}
          </span>
        </div>

        <!-- Admin comment -->
        <div v-if="selected.adminComment" class="admin-comment">
          <div class="comment-label">💬 Comment from administrator</div>
          <div class="comment-text">{{ selected.adminComment }}</div>
        </div>

        <!-- Edit button if DRAFT or NEEDS_REVISION -->
        <div
          v-if="selected.status === 'DRAFT' || selected.status === 'NEEDS_REVISION'"
          class="edit-section"
        >
          <router-link
            :to="`/apply/${selected.programType === 'PROGRAM_A' ? 'a' : 'b'}/${selected.callId}`"
            class="btn-edit"
          >
            ✏️ Edit application
          </router-link>
        </div>

        <!-- Documents -->
        <DocumentUpload
          :key="selected.id"
          :application-id="selected.id"
          :application-status="selected.status"
          @change="refreshSelected"
        />

        <!-- Result documents (APPROVED only) -->
        <ResultDocumentUpload
          v-if="selected.status === 'APPROVED'"
          :key="'result-' + selected.id"
          :application-id="selected.id"
          @change="onResultDocsChange"
        />

        <!-- Submit button -->
        <div
          v-if="canSubmitApplication"
          class="submit-section"
        >
          <div v-if="submitError" class="submit-error">{{ submitError }}</div>
          <button class="btn-submit" :disabled="submitting" @click="submitApp">
            {{
              submitting
                ? 'Submitting...'
                : selected.status === 'NEEDS_REVISION'
                  ? '↩ Submit revised application'
                  : '📤 Submit application'
            }}
          </button>
        </div>

        <!-- Complete project button -->
        <div
          v-if="selected.status === 'APPROVED'"
          class="submit-section"
        >
          <div v-if="completeError" class="submit-error">{{ completeError }}</div>
          <button
            class="btn-complete"
            :disabled="completing || !resultDocsReady"
            :title="!resultDocsReady ? 'Upload both result documents' : ''"
            @click="completeProject"
          >
            {{ completing ? 'Sending...' : '✅ Complete project' }}
          </button>
          <p v-if="!resultDocsReady" class="complete-hint">
            To complete the project, upload both result documents above
          </p>
        </div>

        <!-- Timeline -->
        <StatusTimeline
          :key="'audit-' + selected.id"
          :application-id="selected.id"
          ref="timelineRef"
        />

        <!-- Mentorship (from Andrii branch) -->
        <section class="mentorship">
          <h3 class="mentorship__title">Mentorship</h3>
          <div v-if="mentorshipsFor(selected.id).length === 0" class="mentorship__empty">
            No mentorship assigned yet.
          </div>
          <div v-else class="mentorship__table-wrap">
            <table class="mentorship__table">
              <thead>
                <tr>
                  <th>Mentor</th>
                  <th>Status</th>
                  <th>Assigned</th>
                </tr>
              </thead>
              <tbody>
                <tr v-for="m in mentorshipsFor(selected.id)" :key="m.id">
                  <td class="cell-title">{{ m.mentorName || '—' }}</td>
                  <td>
                    <span class="pill pill--muted">{{ m.status || '—' }}</span>
                  </td>
                  <td class="muted">{{ mentorshipAssignedDt(m) }}</td>
                </tr>
              </tbody>
            </table>
            <div class="mentorship__consultations">
              <ConsultationsPanel
                v-for="m in mentorshipsFor(selected.id)"
                :key="`consultations-${m.id}`"
                :mentorship-id="m.id"
              />
            </div>
          </div>
        </section>

        <!-- Milestones -->
        <section class="milestones">
          <div class="milestones__head">
            <h3 class="milestones__title">Milestones</h3>
            <button
              v-if="canCreateMilestone"
              type="button"
              class="milestone-btn milestone-btn--primary"
              @click="openCreateMilestoneModal"
            >
              Add Milestone
            </button>
          </div>

          <p v-if="milestoneError" class="milestones__error">
            {{ milestoneError }}
          </p>

          <div v-if="milestoneList.length === 0" class="milestones__empty">
            No milestones yet.
          </div>
          <div v-else class="milestones__list">
            <article
              v-for="milestone in milestoneList"
              :key="milestone.id"
              class="milestone-item"
            >
              <div class="milestone-item__top">
                <h4 class="milestone-item__title">
                  {{ milestone.title || '—' }}
                </h4>
                <div class="milestone-item__status-controls">
                  <StatusBadge :status="milestone.status" />
                  <template v-if="canUpdateMilestoneStatus(milestone)">
                    <select
                      v-model="milestoneNextStatuses[milestone.id]"
                      class="milestone-select"
                    >
                      <option disabled value="">
                        Update status...
                      </option>
                      <option
                        v-for="nextStatus in allowedStatusOptions(milestone)"
                        :key="`${milestone.id}-${nextStatus}`"
                        :value="nextStatus"
                      >
                        {{ nextStatus }}
                      </option>
                    </select>
                    <button
                      type="button"
                      class="milestone-btn milestone-btn--secondary"
                      :disabled="!milestoneNextStatuses[milestone.id]"
                      @click="updateMilestoneStatus(milestone)"
                    >
                      Update Status
                    </button>
                  </template>
                </div>
              </div>
              <p class="milestone-item__meta">
                Due: {{ formatDate(milestone.dueDate) }}
              </p>
              <p class="milestone-item__desc">
                {{ milestone.description || '—' }}
              </p>
              <MilestoneDetailsPanel
                :milestone-id="milestone.id"
                :read-only="isProgramAReadOnly"
              />
              <div class="milestone-item__actions">
                <button
                  v-if="canEditMilestone(milestone)"
                  type="button"
                  class="milestone-btn milestone-btn--secondary"
                  @click="openEditMilestoneModal(milestone)"
                >
                  Edit
                </button>
                <button
                  v-if="canDeleteMilestone(milestone)"
                  type="button"
                  class="milestone-btn milestone-btn--danger"
                  @click="deleteMilestone(milestone)"
                >
                  Delete Milestone
                </button>
                <button
                  v-if="isAdmin && milestone.status === MilestoneStatus.PENDING_APPROVAL"
                  type="button"
                  class="milestone-btn milestone-btn--primary"
                  @click="approveMilestone(milestone)"
                >
                  Approve
                </button>
              </div>
            </article>
          </div>
        </section>

      </div>

      <div v-else class="detail empty-detail">
        <p>Select an application from the list</p>
      </div>
    </div>

    <MilestoneFormModal
      v-model="milestoneModalOpen"
      :application-id="selectedId"
      :milestone="editingMilestone"
      @created="onMilestoneSaved"
    />
  </div>
</template>

<script setup>
import { ref, computed, onMounted, onActivated, watch } from 'vue'
import { storeToRefs } from 'pinia'
import { useRouter } from 'vue-router'
import { applicationsApi } from '@/api/applications'
import { useMentorshipStore } from '@/stores/mentorship'
import { MilestoneStatus, useMilestoneStore } from '@/stores/milestone'
import { useAuthStore } from '@/stores/auth'
import { apiErrorMessage } from '@/utils/apiError'
import { isProgramAReadOnly as checkProgramAReadOnly, isProgramBTeamLeader } from '@/utils/applicationPermissions'
import MilestoneDetailsPanel from '@/components/MilestoneDetailsPanel.vue'
import MilestoneFormModal from '@/components/MilestoneFormModal.vue'
import StatusBadge from '@/components/StatusBadge.vue'
import ConsultationsPanel from '@/components/ConsultationsPanel.vue'
import DocumentUpload from '@/components/DocumentUpload.vue'
import ResultDocumentUpload from '@/components/ResultDocumentUpload.vue'
import StatusTimeline from '@/components/StatusTimeline.vue'
import { isProgramATeamLeader } from '@/utils/applicationPermissions'

const applications = ref([])
/** ID of the selected application — more reliable than storing the full object from the array. */
const selectedId = ref(null)
const selected = computed(() => {
  const id = selectedId.value
  if (id == null || id === '') return null
  return applications.value.find((a) => sameApplicationId(a.id, id)) ?? null
})

const loading = ref(true)
const error = ref('')
const router = useRouter()
const submitting = ref(false)
const submitError = ref('')
const completing = ref(false)
const completeError = ref('')
const resultDocsReady = ref(false)
const timelineRef = ref(null)
const milestoneModalOpen = ref(false)
const editingMilestone = ref(null)
const milestoneNextStatuses = ref({})
const milestoneError = ref('')

const authStore = useAuthStore()
const mentorshipStore = useMentorshipStore()
const { mentorshipsByApplication } = storeToRefs(mentorshipStore)
const milestoneStore = useMilestoneStore()
const { milestones } = storeToRefs(milestoneStore)

const roles = computed(() => authStore.roles || [])
const isAdmin = computed(() => roles.value.some((r) => r === 'ADMIN' || r === 'SUPER_ADMIN'))
const isStudent = computed(() => roles.value.includes('STUDENT'))
const isMentor = computed(() => roles.value.includes('MENTOR'))
const isFirm = computed(() => roles.value.includes('FIRM'))
const isFirmUser = computed(() => roles.value.includes('FIRM_USER'))

const isProgramBApplication = computed(() =>
  selected.value?.call?.program?.type === 'PROGRAM_B'
  || selected.value?.programType === 'PROGRAM_B',
)

const isProgramAReadOnly = computed(() =>
  checkProgramAReadOnly(selected.value, authStore.user?.id, isAdmin.value),
)

const canCreateMilestone = computed(() => {
  // 0. GLOBAL: Block if application is completed
  // Use optional chaining (?.) in case status is null/undefined
  if (selected.value?.status === 'COMPLETED') return false

  // 1. Global blocks and Admin override
  if (isProgramAReadOnly.value) return false
  if (isAdmin.value) return true

  // 2. Program-specific logic
  if (isProgramBApplication.value) {
    // PROGRAM B: Only Organizations (Firm / Firm User) can create
    return isFirm.value || isFirmUser.value
  } else {
    // PROGRAM A: Only Students who are team leaders can create
    return isStudent.value && isProgramATeamLeader(selected.value, authStore.user?.id)
  }
})

const milestoneList = computed(() => {
  const id = selectedId.value
  if (id == null) return []
  return [...(milestones.value?.[String(id)] || [])].sort(
    (a, b) => new Date(a?.dueDate || 0) - new Date(b?.dueDate || 0),
  )
})

const canSubmitApplication = computed(() => {
  const status = selected.value?.status
  return status === 'DRAFT' || status === 'NEEDS_REVISION'
})

onMounted(() => {
  void load()
})

onActivated(() => {
  void load()
})

watch(selectedId, (id) => {
  if (id == null) return
  void loadApplicationExtras(id)
})

watch(
  () => applications.value.length,
  () => {
    if (selectedId.value != null) void loadApplicationExtras(selectedId.value)
  },
)

async function loadApplicationExtras(applicationId) {
  if (applicationId == null) return
  try {
    await Promise.all([
      milestoneStore.fetchByApplication(applicationId),
      mentorshipStore.getByApplication(applicationId),
    ])
  } catch (e) {
    console.error(e)
  }
}

function sameApplicationId(a, b) {
  if (a == null || b == null) return false
  return Number(a) === Number(b)
}

function normalizeApplicationsList(data) {
  if (Array.isArray(data)) return data
  if (Array.isArray(data?.content)) return data.content
  return []
}

async function load() {
  loading.value = true
  error.value = ''
  try {
    const res = await applicationsApi.getMy()
    const list = normalizeApplicationsList(res.data)
        .slice()
        .sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt))
    applications.value = list
    if (!list.length) {
      selectedId.value = null
    } else if (!list.some((a) => sameApplicationId(a.id, selectedId.value))) {
      selectedId.value = Number(list[0].id)
    }
    if (selectedId.value != null) {
      await loadApplicationExtras(selectedId.value)
    }
  } catch (e) {
    console.error(e)
    if (e.code === 'ECONNABORTED') {
      error.value = 'Request timed out. Check if the backend is running on port 8080.'
    } else if (!e.response) {
      error.value = 'No connection to the server. Start the backend and reload the page.'
    } else if (e.response?.status === 403) {
      error.value = 'No access to the application list. Log in as a student or reload the page.'
    } else {
      error.value = apiErrorMessage(e, 'Failed to load applications.')
    }
    applications.value = []
    selectedId.value = null
  } finally {
    loading.value = false
  }
}
function selectApplication(app) {
  if (app?.id == null) return

  selectedId.value = Number(app.id)

  // Reset UI state
  submitError.value = ''
  completeError.value = ''
  resultDocsReady.value = false

  // Load additional data for the selected application
  void loadApplicationExtras(app.id)
}

async function refreshSelected() {
  const id = selectedId.value
  if (id == null) return
  try {
    const res = await applicationsApi.getById(id)
    const idx = applications.value.findIndex((a) => sameApplicationId(a.id, id))
    if (idx !== -1) applications.value[idx] = res.data
    selectedId.value = Number(res.data.id)
  } catch (e) {
    console.error(e)
  }
}

async function submitApp() {
  const id = selectedId.value
  if (id == null) return
  submitError.value = ''
  submitting.value = true
  try {
    const res = await applicationsApi.submit(id)
    const idx = applications.value.findIndex((a) => sameApplicationId(a.id, id))
    if (idx !== -1) applications.value[idx] = res.data
    selectedId.value = Number(res.data.id)
    if (timelineRef.value) timelineRef.value.reload()
  } catch (e) {
    submitError.value = apiErrorMessage(e, 'Submission error')
  } finally {
    submitting.value = false
  }
}

function statusClass(s) {
  return s?.toLowerCase().replace(/_/g, '-') || ''
}

function onResultDocsChange(ready) {
  resultDocsReady.value = ready
}

async function completeProject() {
  const id = selectedId.value
  if (id == null) return
  completeError.value = ''
  completing.value = true
  try {
    const res = await applicationsApi.completeProject(id)
    const idx = applications.value.findIndex((a) => sameApplicationId(a.id, id))
    if (idx !== -1) applications.value[idx] = res.data
    selectedId.value = Number(res.data.id)
    if (timelineRef.value) timelineRef.value.reload()
  } catch (e) {
    completeError.value = e.response?.data || e.response?.data?.message || 'Project completion error'
  } finally {
    completing.value = false
  }
}

function statusLabel(status) {
  return {
    DRAFT: 'Draft',
    SUBMITTED: 'Submitted',
    IN_REVIEW: 'In review',
    NEEDS_REVISION: 'Needs revision',
    APPROVED: 'Approved',
    REJECTED: 'Rejected',
    COMPLETION_REQUESTED: 'Awaiting confirmation',
    COMPLETION_PO_APPROVED: 'PO confirmed',
    COMPLETED: 'Completed'
  }[status] || status
}

function formatDate(date) {
  if (!date) return '—'
  return new Date(date).toLocaleDateString('en-GB', {
    day: '2-digit', month: 'short', year: 'numeric'
  })
}

// Saved from Andrii branch — needed for the "Open Program Proposal" button
function programDetailRoute(app) {
  const programId = app?.call?.program?.id ?? app?.programId
  if (!programId) return null
  const rawType = app?.call?.program?.type || app?.programType || ''
  const typeQuery = String(rawType).includes('B') ? 'B' : 'A'
  return {
    name: 'program-detail',
    params: { type: typeQuery.toLowerCase(), id: String(programId) },
    query: { type: typeQuery },
  }
}

function openProgramProposal(app) {
  const route = programDetailRoute(app)
  if (!route) return
  router.push(route)
}

// Needed for the router-link "Continue draft" — implement according to your routing
function draftRoute(app) {
  return `/apply/${app.programType === 'PROGRAM_A' ? 'a' : 'b'}/${app.callId}`
}

function mentorshipsFor(appId) {
  return mentorshipsByApplication.value?.[appId] || []
}

function mentorshipAssignedDt(m) {
  return formatDate(m.assignedAt)
}

function canEditMilestone(milestone) {
  if (isProgramAReadOnly.value) return false
  if (isAdmin.value) return true
  return isStudent.value && milestone?.status === MilestoneStatus.PENDING_APPROVAL
}

function canDeleteMilestone() {
  if (isProgramAReadOnly.value) return false
  return isAdmin.value
}

function canUpdateMilestoneStatus(milestone) {
  if (isAdmin.value) return true
  if (isMentor.value) return allowedStatusOptions(milestone).length > 0
  return false
}

function allowedStatusOptions(milestone) {
  if (!milestone?.status) return []
  return milestoneStore.getAllowedTransitions(milestone.status) || []
}

function openCreateMilestoneModal() {
  editingMilestone.value = null
  milestoneModalOpen.value = true
}

function openEditMilestoneModal(milestone) {
  editingMilestone.value = milestone
  milestoneModalOpen.value = true
}

async function onMilestoneSaved() {
  const id = selectedId.value
  if (id == null) return
  await milestoneStore.fetchByApplication(id)
  milestoneModalOpen.value = false
  editingMilestone.value = null
}

async function deleteMilestone(milestone) {
  if (!milestone?.id || selectedId.value == null) return
  const ok = window.confirm('Delete this milestone permanently?')
  if (!ok) return
  milestoneError.value = ''
  try {
    await milestoneStore.delete(milestone.id, selectedId.value)
    await milestoneStore.fetchByApplication(selectedId.value)
  } catch (e) {
    milestoneError.value = e.response?.data?.error || e.response?.data?.message || 'Failed to delete milestone.'
  }
}

async function updateMilestoneStatus(milestone) {
  const nextStatus = milestoneNextStatuses.value[milestone.id]
  if (!nextStatus || selectedId.value == null) return
  milestoneError.value = ''
  try {
    await milestoneStore.changeStatus(milestone.id, nextStatus, selectedId.value)
    milestoneNextStatuses.value[milestone.id] = ''
  } catch (e) {
    milestoneError.value = e.response?.data?.error || e.response?.data?.message || 'Failed to update milestone status.'
  }
}

async function approveMilestone(milestone) {
  if (!milestone?.id || selectedId.value == null) return
  milestoneError.value = ''
  try {
    await milestoneStore.changeStatus(milestone.id, MilestoneStatus.PLANNED, selectedId.value)
  } catch (e) {
    milestoneError.value = e.response?.data?.error || e.response?.data?.message || 'Failed to approve milestone.'
  }
}
</script>

<style scoped>
.page {
  max-width: 1100px;
  margin: 0 auto;
  padding: 2rem;
  overflow: visible;
}

h1 {
  font-size: 1.75rem;
  margin-bottom: 1.5rem;
}

.layout {
  display: grid;
  grid-template-columns: 320px 1fr;
  gap: 1.5rem;
  align-items: start;
}

/* ── List (sticky left sidebar) ── */
.list {
  display: flex;
  flex-direction: column;
  gap: 8px;
  position: sticky;
  top: 1rem;
  max-height: calc(100vh - 2rem);
  overflow-y: auto;
  scrollbar-width: thin;
  scrollbar-color: #c7d2fe transparent;
}

.app-card {
  border: 1px solid #e5e7eb;
  border-radius: 10px;
  padding: 12px 14px;
  cursor: pointer;
  border-left: 4px solid #e5e7eb;
  background: white;
  transition: all 0.15s;
}

.app-card:hover {
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.08);
}

.app-card.active {
  border-color: #4f46e5;
  background: #f5f3ff;
}

.app-card.draft        { border-left-color: #9ca3af; }
.app-card.submitted    { border-left-color: #3b82f6; }
.app-card.in-review    { border-left-color: #f59e0b; }
.app-card.needs-revision { border-left-color: #ef4444; }
.app-card.approved     { border-left-color: #10b981; }
.app-card.rejected     { border-left-color: #6b7280; }

.card-top {
  display: flex;
  justify-content: space-between;
  align-items: center;
  flex-wrap: wrap;
  gap: 0.5rem;
  margin-bottom: 6px;
}

.card-title {
  font-size: 0.9rem;
  font-weight: 500;
  color: #111827;
  margin-bottom: 2px;
}

.card-sub {
  font-size: 0.78rem;
  color: #6b7280;
  margin-bottom: 4px;
}

.card-date {
  font-size: 0.75rem;
  color: #9ca3af;
}

.program-tag {
  font-size: 0.7rem;
  font-weight: 600;
  color: #4f46e5;
  text-transform: uppercase;
}

/* Card footer */
.card__foot {
  display: flex;
  justify-content: space-between;
  align-items: center;
  flex-wrap: wrap;
  gap: 0.5rem;
  margin-top: 0.75rem;
  padding-top: 0.75rem;
  border-top: 1px solid rgba(15, 23, 42, 0.06);
}

.card__foot-actions {
  display: flex;
  align-items: center;
  gap: 0.5rem;
  flex-wrap: wrap;
}

.muted {
  font-size: 0.82rem;
  color: #94a3b8;
}

.program-proposal-btn {
  border: 1px solid rgba(79, 70, 229, 0.25);
  background: #fff;
  color: #4338ca;
  border-radius: 10px;
  padding: 0.35rem 0.65rem;
  font-weight: 600;
  font-size: 0.8rem;
  cursor: pointer;
  transition: background 0.15s;
}

.program-proposal-btn:hover {
  background: #f5f3ff;
}

.link-continue {
  font-size: 0.8rem;
  color: #4f46e5;
  text-decoration: none;
  font-weight: 500;
}

/* ── Status tags ── */
.status-tag {
  font-size: 0.7rem;
  padding: 2px 8px;
  border-radius: 20px;
  font-weight: 500;
}

.status-tag.large {
  font-size: 0.875rem;
  padding: 4px 12px;
}

.draft          { background: #f3f4f6; color: #374151; }
.submitted      { background: #dbeafe; color: #1e40af; }
.in-review      { background: #fef3c7; color: #92400e; }
.needs-revision { background: #fee2e2; color: #991b1b; }
.approved       { background: #d1fae5; color: #065f46; }
.rejected       { background: #f3f4f6; color: #6b7280; }

/* ── Detail panel ── */
.detail {
  background: white;
  border: 1px solid #e5e7eb;
  border-radius: 12px;
  padding: 1.5rem;
}

.detail-head {
  display: flex;
  justify-content: space-between;
  align-items: flex-start;
  margin-bottom: 1rem;
}

.detail-head h2 {
  font-size: 1.1rem;
  margin: 0 0 4px;
}

.detail-sub {
  font-size: 0.8rem;
  color: #6b7280;
}

.admin-comment {
  background: #fffbeb;
  border: 1px solid #fcd34d;
  border-radius: 8px;
  padding: 10px 14px;
  margin-bottom: 1rem;
}

.comment-label {
  font-weight: 600;
  font-size: 0.8rem;
  color: #92400e;
  margin-bottom: 4px;
}

.comment-text {
  font-size: 0.875rem;
  color: #374151;
}

.edit-section {
  margin-bottom: 1rem;
}

.btn-edit {
  display: inline-block;
  padding: 8px 16px;
  background: #f3f4f6;
  color: #374151;
  border-radius: 8px;
  text-decoration: none;
  font-size: 0.875rem;
}

.submit-section {
  margin-top: 1rem;
}

.submit-error {
  background: #fee2e2;
  color: #dc2626;
  padding: 8px 12px;
  border-radius: 6px;
  font-size: 0.875rem;
  margin-bottom: 8px;
}

.btn-submit {
  width: 100%;
  padding: 10px;
  background: #10b981;
  color: white;
  border: none;
  border-radius: 8px;
  font-size: 0.95rem;
  cursor: pointer;
}

.btn-submit:disabled {
  opacity: 0.5;
  cursor: not-allowed;
}

.btn-complete {
  width: 100%;
  padding: 10px;
  background: #059669;
  color: white;
  border: none;
  border-radius: 8px;
  font-size: 0.95rem;
  cursor: pointer;
  margin-top: 0.5rem;
}

.btn-complete:disabled {
  opacity: 0.5;
  cursor: not-allowed;
}

.complete-hint {
  font-size: 0.78rem;
  color: #6b7280;
  margin-top: 6px;
  text-align: center;
}

/* ── Mentorship ── */
.mentorship {
  margin-top: 1.5rem;
  padding-top: 1rem;
  border-top: 1px solid #e5e7eb;
}

.mentorship__title,
.milestones__title {
  font-size: 0.95rem;
  font-weight: 600;
  margin-bottom: 0.75rem;
  color: #111827;
}

.mentorship__empty,
.milestones__empty {
  font-size: 0.85rem;
  color: #9ca3af;
}

.mentorship__table-wrap {
  overflow-x: auto;
}

.mentorship__table {
  width: 100%;
  border-collapse: collapse;
  font-size: 0.85rem;
}

.mentorship__table th {
  text-align: left;
  padding: 6px 10px;
  font-weight: 600;
  color: #6b7280;
  border-bottom: 1px solid #e5e7eb;
}

.mentorship__table td {
  padding: 8px 10px;
  border-bottom: 1px solid #f3f4f6;
}

.pill {
  display: inline-block;
  padding: 2px 8px;
  border-radius: 20px;
  font-size: 0.75rem;
}

.pill--muted {
  background: #f3f4f6;
  color: #6b7280;
}

.mentorship__consultations {
  padding: 0.6rem 0.75rem 0.75rem;
}

/* ── Milestones ── */
.milestones {
  margin-top: 1.5rem;
  padding-top: 1rem;
  border-top: 1px solid #e5e7eb;
}

.milestones__head {
  display: flex;
  justify-content: space-between;
  align-items: center;
  gap: 0.75rem;
  margin-bottom: 0.75rem;
}

.milestones__error {
  margin: 0 0 0.75rem;
  color: #b91c1c;
  font-size: 0.88rem;
}

.milestones__list {
  display: flex;
  flex-direction: column;
  gap: 0.75rem;
}

.milestone-item {
  border: 1px solid #e5e7eb;
  border-radius: 8px;
  padding: 12px 14px;
}

.milestone-item__top {
  display: flex;
  justify-content: space-between;
  align-items: flex-start;
  gap: 0.75rem;
  margin-bottom: 4px;
  flex-wrap: wrap;
}

.milestone-item__status-controls {
  display: flex;
  align-items: center;
  gap: 0.45rem;
  flex-wrap: wrap;
  justify-content: flex-end;
}

.milestone-item__title {
  font-size: 0.875rem;
  font-weight: 600;
  margin: 0;
  color: #111827;
}

.milestone-select {
  border: 1px solid #cbd5e1;
  border-radius: 8px;
  padding: 0.35rem 0.5rem;
  font-size: 0.78rem;
}

.milestone-item__meta {
  font-size: 0.78rem;
  color: #9ca3af;
  margin: 4px 0;
}

.milestone-item__desc {
  font-size: 0.85rem;
  color: #374151;
  margin: 0 0 8px;
}

.milestone-item__actions {
  display: flex;
  flex-wrap: wrap;
  gap: 0.45rem;
  margin-top: 8px;
}

.milestone-btn {
  border-radius: 8px;
  padding: 0.35rem 0.75rem;
  font-size: 0.8rem;
  font-weight: 600;
  cursor: pointer;
}

.milestone-btn--primary {
  border: none;
  background: #4f46e5;
  color: white;
}

.milestone-btn--primary:hover:not(:disabled) {
  background: #4338ca;
}

.milestone-btn--secondary {
  border: 1px solid rgba(79, 70, 229, 0.25);
  background: white;
  color: #4338ca;
}

.milestone-btn--danger {
  border: 1px solid rgba(220, 38, 38, 0.25);
  background: white;
  color: #b91c1c;
}

.milestone-btn:disabled {
  opacity: 0.5;
  cursor: not-allowed;
}

/* ── Empty / Loading ── */
.empty-detail {
  display: flex;
  align-items: center;
  justify-content: center;
  min-height: 300px;
  color: #9ca3af;
  background: white;
  border: 1px solid #e5e7eb;
  border-radius: 12px;
}

.loading,
.empty {
  text-align: center;
  padding: 3rem;
  color: #9ca3af;
}

.btn-go {
  display: inline-block;
  padding: 10px 20px;
  background: #4f46e5;
  color: white;
  border-radius: 8px;
  text-decoration: none;
  margin-top: 1rem;
}
</style>
