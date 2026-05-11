<template>
  <div class="page">
    <h1>Мої заявки</h1>

    <div v-if="loading" class="loading">
      Завантаження...
    </div>

    <div v-else-if="applications.length === 0" class="empty">
      <p>У вас поки немає заявок</p>
      <router-link to="/programs" class="btn-go">
        Переглянути програми
      </router-link>
    </div>

    <div v-else class="layout">

      <!-- Список заявок -->
      <div class="list">
        <div
          v-for="app in applications"
          :key="app.id"
          class="app-card"
          :class="{
            active: selected?.id === app.id,
            [statusClass(app.status)]: true
          }"
          @click="select(app)"
        >
          <div class="card-top">
            <span class="program-tag">
              {{ app.programType === 'PROGRAM_A' ? 'Програма A' : 'Програма B' }}
            </span>
            <span class="status-tag" :class="statusClass(app.status)">
              {{ statusLabel(app.status) }}
            </span>
          </div>
          <div class="card-title">{{ app.callTitle }}</div>
          <div class="card-sub">{{ app.programName }}</div>
          <div class="card-date">{{ formatDate(app.createdAt) }}</div>

          <!-- Footer картки: кнопки з гілки Andrii -->
          <footer class="card__foot">
            <span class="muted">Оновлено: {{ formatDate(app.updatedAt) }}</span>
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
                Продовжити чернетку →
              </router-link>
            </div>
          </footer>
        </div>
      </div>

      <!-- Деталі -->
      <div v-if="selected" class="detail">

        <!-- Шапка -->
        <div class="detail-head">
          <div>
            <h2>{{ selected.callTitle }}</h2>
            <div class="detail-sub">{{ selected.programName }}</div>
          </div>
          <span class="status-tag large" :class="statusClass(selected.status)">
            {{ statusLabel(selected.status) }}
          </span>
        </div>

        <!-- Коментар адміна -->
        <div v-if="selected.adminComment" class="admin-comment">
          <div class="comment-label">💬 Коментар від адміністратора</div>
          <div class="comment-text">{{ selected.adminComment }}</div>
        </div>

        <!-- Кнопка редагувати якщо DRAFT або NEEDS_REVISION -->
        <div
          v-if="selected.status === 'DRAFT' || selected.status === 'NEEDS_REVISION'"
          class="edit-section"
        >
          <router-link
            :to="`/apply/${selected.programType === 'PROGRAM_A' ? 'a' : 'b'}/${selected.callId}`"
            class="btn-edit"
          >
            ✏️ Редагувати заявку
          </router-link>
        </div>

        <!-- Документи -->
        <DocumentUpload
          :key="selected.id"
          :application-id="selected.id"
          :application-status="selected.status"
          @change="refreshSelected"
        />

        <!-- Кнопка відправити -->
        <div
          v-if="selected.status === 'DRAFT' || selected.status === 'NEEDS_REVISION'"
          class="submit-section"
        >
          <div v-if="submitError" class="submit-error">{{ submitError }}</div>
          <button class="btn-submit" :disabled="submitting" @click="submitApp">
            {{
              submitting
                ? 'Відправка...'
                : selected.status === 'NEEDS_REVISION'
                  ? '↩ Відправити виправлену заявку'
                  : '📤 Відправити заявку'
            }}
          </button>
        </div>

        <!-- Таймлайн -->
        <StatusTimeline
          :key="'audit-' + selected.id"
          :application-id="selected.id"
          ref="timelineRef"
        />

        <!-- Mentorship (з гілки Andrii) -->
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

        <!-- Milestones (з гілки Andrii) -->
        <section class="milestones">
          <h3 class="milestones__title">Milestones</h3>
          <div v-if="milestonesFor(selected.id).length === 0" class="milestones__empty">
            No milestones yet.
          </div>
          <div v-else class="milestones__list">
            <article
              v-for="m in milestonesFor(selected.id)"
              :key="m.id"
              class="milestone-item"
            >
              <div class="milestone-item__top">
                <h4 class="milestone-item__title">{{ m.title || '—' }}</h4>
                <span class="milestone-status" :class="milestoneStatusClass(m.status)">
                  {{ m.status || '—' }}
                </span>
              </div>
              <p class="milestone-item__meta">Due: {{ formatMilestoneDate(m.dueDate) }}</p>
              <p class="milestone-item__desc">{{ m.description || '—' }}</p>
              <MilestoneDetailsPanel :milestone-id="m.id" />
              <div v-if="m.status === 'PENDING_APPROVAL'" class="milestone-item__actions">
                <button
                  type="button"
                  class="milestone-action-btn"
                  @click="openEditMilestoneModal(selected.id, m)"
                >
                  Edit
                </button>
                <button
                  type="button"
                  class="milestone-action-btn milestone-action-btn--danger"
                  @click="deleteMilestone(selected.id, m.id)"
                >
                  Delete
                </button>
              </div>
            </article>
          </div>
        </section>

      </div>

      <div v-else class="detail empty-detail">
        <p>Оберіть заявку зі списку</p>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, onMounted } from 'vue'
import { storeToRefs } from 'pinia'
import { useRouter } from 'vue-router'
import { applicationsApi } from '@/api/applications'
import { useMentorshipStore } from '@/stores/mentorship'
import { useNoteStore } from '@/stores/note'
import { useMilestoneStore } from '@/stores/milestone'
import MilestoneFormModal from '@/components/MilestoneFormModal.vue'
import MilestoneDetailsPanel from '@/components/MilestoneDetailsPanel.vue'
import ConsultationsPanel from '@/components/ConsultationsPanel.vue'
import DocumentUpload from '@/components/DocumentUpload.vue'
import StatusTimeline from '@/components/StatusTimeline.vue'

const applications = ref([])
const selected = ref(null)
const loading = ref(true)
const error = ref('')
const router = useRouter()
const submitting = ref(false)
const submitError = ref('')
const timelineRef = ref(null)

const mentorshipStore = useMentorshipStore()
const { mentorshipsByApplication } = storeToRefs(mentorshipStore)
const noteStore = useNoteStore()
const { notesByApplication } = storeToRefs(noteStore)
const milestoneStore = useMilestoneStore()
const { milestones } = storeToRefs(milestoneStore)

onMounted(load)

async function load() {
  loading.value = true
  try {
    const res = await applicationsApi.getMy()
    applications.value = res.data
  } catch (e) {
    console.error(e)
  } finally {
    loading.value = false
  }
}

function select(app) {
  selected.value = app
  submitError.value = ''
}

async function refreshSelected() {
  if (!selected.value) return
  try {
    const res = await applicationsApi.getById(selected.value.id)
    selected.value = res.data
    const idx = applications.value.findIndex(a => a.id === res.data.id)
    if (idx !== -1) applications.value[idx] = res.data
  } catch (e) {
    console.error(e)
  }
}

async function submitApp() {
  submitError.value = ''
  submitting.value = true
  try {
    const res = await applicationsApi.submit(selected.value.id)
    selected.value = res.data
    const idx = applications.value.findIndex(a => a.id === res.data.id)
    if (idx !== -1) applications.value[idx] = res.data
    if (timelineRef.value) timelineRef.value.reload()
  } catch (e) {
    submitError.value = e.response?.data || 'Помилка при відправці'
  } finally {
    submitting.value = false
  }
}

function statusClass(s) {
  return s?.toLowerCase().replace(/_/g, '-') || ''
}

function statusLabel(status) {
  return {
    DRAFT: 'Чернетка',
    SUBMITTED: 'Відправлена',
    IN_REVIEW: 'На розгляді',
    NEEDS_REVISION: 'Потрібна правка',
    APPROVED: 'Схвалена',
    REJECTED: 'Відхилена'
  }[status] || status
}

function formatDate(date) {
  if (!date) return '—'
  return new Date(date).toLocaleDateString('uk-UA', {
    day: '2-digit', month: 'short', year: 'numeric'
  })
}

// Збережено з гілки Andrii — потрібно для кнопки "Open Program Proposal"
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

// Потрібно для router-link "Продовжити чернетку" — реалізуй відповідно до своєї маршрутизації
function draftRoute(app) {
  return `/apply/${app.programType === 'PROGRAM_A' ? 'a' : 'b'}/${app.callId}`
}

function mentorshipsFor(appId) {
  return mentorshipsByApplication.value?.[appId] || []
}

function mentorshipAssignedDt(m) {
  return formatDate(m.assignedAt)
}

function milestonesFor(appId) {
  return milestones.value?.filter(m => m.applicationId === appId) || []
}

function milestoneStatusClass(status) {
  return status?.toLowerCase().replace(/_/g, '-') || ''
}

function formatMilestoneDate(date) {
  return formatDate(date)
}

// Реалізуй ці функції відповідно до свого milestone store/api
function openEditMilestoneModal(appId, milestone) {
  // TODO: відкрити MilestoneFormModal
}

async function deleteMilestone(appId, milestoneId) {
  // TODO: викликати milestoneStore.delete(milestoneId)
}
</script>

<style scoped>
.page {
  max-width: 1100px;
  margin: 0 auto;
  padding: 2rem;
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

/* ── Список ── */
.list {
  display: flex;
  flex-direction: column;
  gap: 8px;
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

/* Footer картки */
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
  align-items: center;
  margin-bottom: 4px;
}

.milestone-item__title {
  font-size: 0.875rem;
  font-weight: 600;
  margin: 0;
  color: #111827;
}

.milestone-status {
  font-size: 0.72rem;
  padding: 2px 8px;
  border-radius: 20px;
  background: #f3f4f6;
  color: #6b7280;
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
  gap: 0.5rem;
  margin-top: 8px;
}

.milestone-action-btn {
  padding: 4px 12px;
  border-radius: 6px;
  font-size: 0.8rem;
  font-weight: 500;
  cursor: pointer;
  border: 1px solid #e5e7eb;
  background: #fff;
  color: #374151;
}

.milestone-action-btn--danger {
  border-color: #fca5a5;
  color: #dc2626;
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