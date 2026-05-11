<template>
  <div class="page">
    <h1>Мої заявки</h1>
    <p class="lead">
      Ваші заявки за програмами A та B: статуси узгоджені з процесом розгляду комісією (подання, розгляд, рішення або
      повернення на доопрацювання з коментарем).
    </p>

    <div v-if="loading" class="loading">
      Завантаження...
    </div>

    <div v-else-if="applications.length === 0" class="empty">
      <p>У вас поки немає заявок</p>
      <router-link to="/programs/a" class="btn-go">
        Переглянути програми
      </router-link>
    </div>

    <div v-else class="layout">

      <!-- Список заявок -->
      <div class="list">
        <div v-for="app in applications" :key="app.id" class="app-card" :class="{
          active: selected?.id === app.id,
          [statusClass(app.status)]: true
        }" @click="select(app)">
          <div class="card-top">
            <span class="program-tag">
              {{ app.programType === 'PROGRAM_A'
                ? 'Програма A' : 'Програма B' }}
            </span>
            <span class="status-tag" :class="statusClass(app.status)">
              {{ statusLabel(app.status) }}
            </span>
          </div>
          <div class="card-title">{{ app.callTitle }}</div>
          <div class="card-sub">{{ app.programName }}</div>
          <div class="card-date">
            {{ formatDate(app.createdAt) }}
          </div>
        </div>
      </div>

      <!-- Деталі -->
      <div v-if="selected" class="detail">

        <div class="detail-head">
          <div>
            <h2>{{ selected.callTitle }}</h2>
            <div class="detail-sub">
              {{ selected.programName }}
            </div>
          </div>
          <span class="status-tag large" :class="statusClass(selected.status)">
            {{ statusLabel(selected.status) }}
          </span>
        </div>

        <!-- Коментар адміна -->
        <div v-if="selected.adminComment" class="admin-comment">
          <div class="comment-label">
            💬 Коментар від адміністратора
          </div>
          <div class="comment-text">
            {{ selected.adminComment }}
          </div>
        </div>

        <footer class="card__foot">
          <span class="muted">Оновлено: {{ formatDt(app.updatedAt) }}</span>
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
        <!-- Кнопка редагувати якщо DRAFT -->
        <div v-if="selected.status === 'DRAFT'
          || selected.status === 'NEEDS_REVISION'" class="edit-section">
          <router-link
            :to="{
              name: selected.programType === 'PROGRAM_A' ? 'apply-a' : 'apply-b',
              params: { callId: selected.callId },
            }"
            class="btn-edit"
          >
            ✏️ Редагувати заявку
          </router-link>
        </div>

        <!-- Документи -->
        <DocumentUpload :key="selected.id" :application-id="selected.id" :application-status="selected.status"
          @change="refreshSelected" />

        <!-- Кнопка відправити -->
        <div v-if="selected.status === 'DRAFT'
          || selected.status === 'NEEDS_REVISION'" class="submit-section">
          <div v-if="submitError" class="submit-error">
            {{ submitError }}
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
                <tr v-for="m in mentorshipsFor(app.id)" :key="m.id">
                  <td class="cell-title">
                    {{ m.mentorName || '—' }}
                  </td>
                  <td>
                    <span class="pill pill--muted">
                      {{ m.status || '—' }}
                    </span>
                  </td>
                  <td class="muted">
                    {{ mentorshipAssignedDt(m) }}
                  </td>
                </tr>
              </tbody>
            </table>
            <div class="mentorship__consultations">
              <ConsultationsPanel
                v-for="m in mentorshipsFor(app.id)"
                :key="`consultations-${m.id}`"
                :mentorship-id="m.id"
              />
            </div>
          </div>
        </section>

        <section class="notes">
          <div class="notes__head">
            <h3 class="notes__title">Consultation Notes</h3>
          </div>
          <div v-if="notesFor(app.id).length === 0" class="notes__empty">
            No notes yet.
          </div>
          <div v-else class="notes__list">
            <article v-for="n in notesFor(app.id)" :key="n.id" class="note">
              <header class="note__head">
                <div class="note__meta">
                  <strong>{{ n.createdByName || '—' }}</strong>
                  <span>{{ formatDt(n.createdAt) }}</span>
                </div>
              </header>
              <p class="note__content">
                {{ n.content }}
              </p>
            </article>
          </div>
        </section>

        <section class="milestones">
          <div class="milestones__head">
            <h3 class="milestones__title">Milestones</h3>
            <button type="button" class="milestones__add-btn" @click="openMilestoneModal(app.id)">
              Add Milestone
            </button>
          </div>
          <div v-if="milestonesFor(app.id).length === 0" class="milestones__empty">
            No milestones yet.
          </div>
          <div v-else class="milestones__list">
            <article v-for="m in milestonesFor(app.id)" :key="m.id" class="milestone-item">
              <div class="milestone-item__top">
                <h4 class="milestone-item__title">
                  {{ m.title || '—' }}
                </h4>
                <span class="milestone-status" :class="milestoneStatusClass(m.status)">
                  {{ m.status || '—' }}
                </span>
              </div>
              <p class="milestone-item__meta">
                Due: {{ formatMilestoneDate(m.dueDate) }}
              </p>
              <p class="milestone-item__desc">
                {{ m.description || '—' }}
              </p>
              <MilestoneDetailsPanel :milestone-id="m.id" />
              <div v-if="m.status === 'PENDING_APPROVAL'" class="milestone-item__actions">
                <button type="button" class="milestone-action-btn" @click="openEditMilestoneModal(app.id, m)">
                  Edit
                </button>
                <button
                  type="button"
                  class="milestone-action-btn milestone-action-btn--danger"
                  @click="deleteMilestone(app.id, m.id)"
                >
                  Delete
                </button>
              </div>
            </article>
          </div>
        </section>
      </article>
    </div>
          <button class="btn-submit" :disabled="submitting" @click="submitApp">
            {{ submitting
              ? 'Відправка...'
              : selected.status === 'NEEDS_REVISION'
                ? '↩ Відправити виправлену заявку'
                : '📤 Відправити заявку' }}
          </button>
        </div>

        <!-- Таймлайн -->
        <StatusTimeline :key="'audit-' + selected.id" :application-id="selected.id" ref="timelineRef" />

        <p v-if="selected.status === 'APPROVED'" class="comment comment--ok">
          <strong>Далі:</strong> заявка схвалена. Очікуйте онбординг від NTI та повідомлення про старт проєкту.
        </p>
        <div v-if="selected.onboarding && selected.status === 'APPROVED'" class="onboarding">
          <p class="onboarding__title">
            Онбординг: {{ selected.onboarding.status }}
          </p>
          <p class="onboarding__meta">
            Підтверджено: {{ selected.onboarding.approvedBy }} · {{ formatDt(selected.onboarding.approvedAt) }}
          </p>
          <ul class="onboarding__list">
            <li v-for="step in selected.onboarding.steps || []" :key="step.key">
              {{ step.done ? '✓' : '•' }} {{ step.label }}
            </li>
          </ul>
        </div>

      </div>

      <div v-else class="detail empty-detail">
        <p>Оберіть заявку зі списку</p>
      </div>
    </div>
  </div>
</template>

<script setup>
import { onMounted, ref } from 'vue'
import { storeToRefs } from 'pinia'
import { useRouter } from 'vue-router'
import { applicationsApi } from '@/api/applications'
import { statusLabel } from '@/utils/applicationStatus'
import { useMentorshipStore } from '@/stores/mentorship'
import { useNoteStore } from '@/stores/note'
import { useMilestoneStore } from '@/stores/milestone'
import MilestoneFormModal from '@/components/MilestoneFormModal.vue'
import MilestoneDetailsPanel from '@/components/MilestoneDetailsPanel.vue'
import ConsultationsPanel from '@/components/ConsultationsPanel.vue'
import { ref, onMounted } from 'vue'
import { applicationsApi } from '@/api/applications'
import DocumentUpload from '@/components/DocumentUpload.vue'
import StatusTimeline from '@/components/StatusTimeline.vue'

const applications = ref([])
const selected = ref(null)
const loading = ref(true)
const error = ref('')
const router = useRouter()

const mentorshipStore = useMentorshipStore()
const { mentorshipsByApplication } = storeToRefs(mentorshipStore)
const noteStore = useNoteStore()
const { notesByApplication } = storeToRefs(noteStore)
const milestoneStore = useMilestoneStore()
const { milestones } = storeToRefs(milestoneStore)
const submitting = ref(false)
const submitError = ref('')
const timelineRef = ref(null)

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
    // Оновлюємо також в списку
    const idx = applications.value
      .findIndex(a => a.id === res.data.id)
    if (idx !== -1) {
      applications.value[idx] = res.data
    }
  } catch (e) {
    console.error(e)
  }
}

async function submitApp() {
  submitError.value = ''
  submitting.value = true
  try {
    const res = await applicationsApi
      .submit(selected.value.id)
    selected.value = res.data
    const idx = applications.value
      .findIndex(a => a.id === res.data.id)
    if (idx !== -1) {
      applications.value[idx] = res.data
    }
    // Оновлюємо таймлайн
    if (timelineRef.value) {
      timelineRef.value.reload()
    }
  } catch (e) {
    submitError.value =
      e.response?.data || 'Помилка при відправці'
  } finally {
    submitting.value = false
  }
}

function statusClass(s) {
  return s?.toLowerCase().replace('_', '-') || ''
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
  return new Date(date).toLocaleDateString('uk-UA', {
    day: '2-digit', month: 'short', year: 'numeric'
  })
}

function formatDt(value) {
  if (!value) return '—'
  return new Date(value).toLocaleString('uk-UA', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  })
}

function openMilestoneModal(applicationId) {
  editingMilestone.value = null
  selectedMilestoneAppId.value = applicationId
  milestoneModalOpen.value = true
}

function openEditMilestoneModal(applicationId, milestone) {
  selectedMilestoneAppId.value = applicationId
  editingMilestone.value = milestone
  milestoneModalOpen.value = true
}

async function onMilestoneCreated(created) {
  editingMilestone.value = null
  if (created?.applicationId) {
    await milestoneStore.fetchByApplication(created.applicationId)
    return
  }
  if (selectedMilestoneAppId.value) {
    await milestoneStore.fetchByApplication(selectedMilestoneAppId.value)
  }
}

async function deleteMilestone(applicationId, milestoneId) {
  await milestoneStore.delete(milestoneId, applicationId)
}

function timelineSteps(status) {
  const lastLabel =
    status === 'APPROVED'
      ? 'Схвалено'
      : status === 'REJECTED'
        ? 'Відхилено'
        : status === 'NEEDS_REVISION'
          ? 'Потрібні зміни'
          : 'Рішення'

  const phase = (s) => {
    if (s === 'DRAFT') return 0
    if (s === 'SUBMITTED') return 1
    if (s === 'IN_REVIEW') return 2
    if (s === 'NEEDS_REVISION' || s === 'APPROVED' || s === 'REJECTED') return 3
    return 0
  }

  const p = phase(status)

  return [
    { key: 't1', label: 'Чернетка', done: p > 0, current: status === 'DRAFT' },
    { key: 't2', label: 'Подано', done: p > 1, current: status === 'SUBMITTED' },
    { key: 't3', label: 'На розгляді', done: p > 2, current: status === 'IN_REVIEW' },
    {
      key: 't4',
      label: lastLabel,
      done: status === 'APPROVED' || status === 'REJECTED',
      current:
        status === 'NEEDS_REVISION'
        || status === 'APPROVED'
        || status === 'REJECTED',
    },
  ]
}

function draftRoute(app) {
  const t = (app.programType || '').includes('A') ? 'a' : 'b'
  return { name: `apply-${t}`, params: { callId: app.callId } }
}

function programDetailRoute(app) {
  const programId = app?.call?.program?.id ?? app?.programId
  if (!programId) return null
  const rawType = app?.call?.program?.type || app?.programType || ''
  if (rawType) {
    const typeQuery = String(rawType).includes('B') ? 'B' : 'A'
    return {
      name: 'program-detail',
      params: { type: typeQuery.toLowerCase(), id: String(programId) },
      query: { type: typeQuery },
    }
  }
  return {
    name: 'program-detail',
    params: { type: 'a', id: String(programId) },
  }
}

function openProgramProposal(app) {
  const route = programDetailRoute(app)
  if (!route) return
  router.push(route)
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
  margin-bottom: 0.5rem;
}

.lead {
  margin: 0 0 1.5rem;
  max-width: 48rem;
  color: #64748b;
  line-height: 1.55;
  font-size: 0.95rem;
}

.layout {
  display: grid;
  grid-template-columns: 320px 1fr;
  gap: 1.5rem;
  align-items: start;
}

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

.app-card.draft {
  border-left-color: #9ca3af;
}

.app-card.submitted {
  border-left-color: #3b82f6;
}

.app-card.in-review {
  border-left-color: #f59e0b;
}

.app-card.needs-revision {
  border-left-color: #ef4444;
}

.app-card.approved {
  border-left-color: #10b981;
}

.app-card.rejected {
  border-left-color: #6b7280;
}

.card-top {
  display: flex;
  justify-content: space-between;
  margin-bottom: 4px;
}

.program-tag {
  font-size: 0.7rem;
  font-weight: 600;
  color: #4f46e5;
  text-transform: uppercase;
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
}

.link-continue {
  font-weight: 600;
  color: #4f46e5;
  text-decoration: none;
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

.draft {
  background: #f3f4f6;
  color: #374151;
}

.submitted {
  background: #dbeafe;
  color: #1e40af;
}

.in-review {
  background: #fef3c7;
  color: #92400e;
}

.needs-revision {
  background: #fee2e2;
  color: #991b1b;
}

.approved {
  background: #d1fae5;
  color: #065f46;
}

.rejected {
  background: #f3f4f6;
  color: #6b7280;
}

.mentorship__consultations {
  padding: 0.6rem 0.75rem 0.75rem;
}

.notes {
  margin-top: 1rem;
  padding-top: 0.85rem;
  border-top: 1px solid rgba(15, 23, 42, 0.06);
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

.comment {
  margin: 1rem 0 0;
  padding: 0.75rem 1rem;
  font-size: 0.9rem;
  color: #334155;
}

.comment--ok {
  background: rgba(5, 150, 105, 0.1);
  color: #065f46;
  border-radius: 8px;
}

.onboarding {
  margin-top: 0.65rem;
  padding: 0.75rem 1rem;
  border-radius: 12px;
  background: rgba(14, 116, 144, 0.08);
  color: #0f172a;
}

.onboarding__title {
  margin: 0;
  font-weight: 700;
}

.onboarding__meta {
  margin: 0.2rem 0 0.45rem;
  color: #475569;
  font-size: 0.82rem;
}

.onboarding__list {
  margin: 0;
  padding-left: 1rem;
  color: #334155;
  font-size: 0.84rem;
}
</style>