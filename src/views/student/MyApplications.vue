<template>
  <div class="page">
    <p class="lead">
      Тут відображаються ваші заявки та поточний етап розгляду.
    </p>

    <div v-if="loading" class="state">
      Завантаження…
    </div>
    <div v-else-if="error" class="state state--error">
      {{ error }}
    </div>
    <div v-else-if="items.length === 0" class="empty-card">
      <p>Ви ще не подали жодної заявки.</p>
      <router-link to="/programs/a" class="link-btn">
        Переглянути програми
      </router-link>
    </div>

    <div v-else class="grid">
      <article
        v-for="app in items"
        :key="app.id"
        class="card"
      >
        <header class="card__head">
          <div>
            <h2 class="card__title">
              {{ app.programName }}
            </h2>
            <p class="card__sub">
              {{ app.callTitle }}
            </p>
          </div>
          <span class="pill" :class="pillClass(app.status)">{{ statusLabel(app.status) }}</span>
        </header>

        <div class="timeline" aria-hidden="true">
          <div
            v-for="step in timelineSteps(app.status)"
            :key="step.key"
            class="timeline__step"
          >
            <div
              class="timeline__dot"
              :data-done="step.done"
              :data-current="step.current"
            />
            <span class="timeline__label">{{ step.label }}</span>
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

        <p v-if="app.adminComment" class="comment">
          <strong>Коментар:</strong> {{ app.adminComment }}
        </p>

        <section class="mentorship">
          <h3 class="mentorship__title">Mentorship</h3>
          <div v-if="mentorshipsFor(app.id).length === 0" class="mentorship__empty">
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

    <MilestoneFormModal
      v-model="milestoneModalOpen"
      :application-id="selectedMilestoneAppId"
      :milestone="editingMilestone"
      @created="onMilestoneCreated"
    />
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

const items = ref([])
const loading = ref(true)
const error = ref('')
const router = useRouter()

const mentorshipStore = useMentorshipStore()
const { mentorshipsByApplication } = storeToRefs(mentorshipStore)
const noteStore = useNoteStore()
const { notesByApplication } = storeToRefs(noteStore)
const milestoneStore = useMilestoneStore()
const { milestones } = storeToRefs(milestoneStore)

const milestoneModalOpen = ref(false)
const selectedMilestoneAppId = ref(null)
const editingMilestone = ref(null)

onMounted(async () => {
  try {
    const res = await applicationsApi.getMy()
    items.value = res.data || []
    await Promise.all([
      ...(items.value || []).map((app) => mentorshipStore.getByApplication(app.id)),
      ...(items.value || []).map((app) => noteStore.fetchNotesByApplication(app.id)),
      ...(items.value || []).map((app) => milestoneStore.fetchByApplication(app.id)),
    ])
  } catch (e) {
    error.value = 'Не вдалося завантажити заявки'
  } finally {
    loading.value = false
  }
})

function pillClass(status) {
  const map = {
    DRAFT: 'pill--muted',
    SUBMITTED: 'pill--info',
    IN_REVIEW: 'pill--warn',
    NEEDS_REVISION: 'pill--orange',
    APPROVED: 'pill--ok',
    REJECTED: 'pill--bad',
  }
  return map[status] || 'pill--muted'
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

function mentorshipsFor(applicationId) {
  return mentorshipsByApplication.value?.[applicationId] || []
}

function mentorshipAssignedDt(m) {
  return formatDt(m?.startDate || m?.createdAt)
}

function notesFor(applicationId) {
  const raw = notesByApplication.value?.[String(applicationId)] || []
  return [...raw].sort((a, b) => new Date(b?.createdAt || 0) - new Date(a?.createdAt || 0))
}

function milestonesFor(applicationId) {
  const raw = milestones.value?.[String(applicationId)] || []
  return [...raw].sort((a, b) => new Date(a?.dueDate || 0) - new Date(b?.dueDate || 0))
}

function milestoneStatusClass(status) {
  const map = {
    PENDING_APPROVAL: 'milestone-status--pending',
    PLANNED: 'milestone-status--planned',
    IN_PROGRESS: 'milestone-status--progress',
    COMPLETED: 'milestone-status--completed',
    OVERDUE: 'milestone-status--overdue',
    BLOCKED: 'milestone-status--blocked',
  }
  return map[status] || 'milestone-status--default'
}

function formatMilestoneDate(value) {
  if (!value) return '—'
  return new Date(value).toLocaleDateString('uk-UA', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
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
  width: 100%;
}

.lead {
  margin: 0 0 1.25rem;
  color: #475569;
  line-height: 1.6;
}

.state {
  text-align: center;
  padding: 2rem;
  color: #64748b;
}

.state--error {
  color: #b91c1c;
}

.empty-card {
  text-align: center;
  padding: 2.5rem 1.5rem;
  border-radius: 20px;
  background: rgba(255, 255, 255, 0.9);
  border: 1px dashed rgba(79, 70, 229, 0.25);
}

.empty-card p {
  margin: 0 0 1rem;
  color: #64748b;
}

.link-btn {
  display: inline-flex;
  padding: 0.65rem 1.2rem;
  border-radius: 999px;
  background: #4f46e5;
  color: white;
  font-weight: 600;
  text-decoration: none;
}

.grid {
  display: flex;
  flex-direction: column;
  gap: 1.25rem;
}

.card {
  padding: 1.35rem 1.5rem;
  border-radius: 18px;
  background: rgba(255, 255, 255, 0.95);
  border: 1px solid rgba(79, 70, 229, 0.1);
  box-shadow: 0 16px 40px rgba(15, 23, 42, 0.06);
}

.card:hover {
  box-shadow: 0 20px 48px rgba(15, 23, 42, 0.1);
}

.card__head {
  display: flex;
  justify-content: space-between;
  align-items: flex-start;
  gap: 1rem;
  margin-bottom: 1.25rem;
}

.card__title {
  margin: 0;
  font-size: 1.15rem;
  color: #0f172a;
}

.card__sub {
  margin: 0.35rem 0 0;
  color: #64748b;
  font-size: 0.92rem;
}

.pill {
  flex-shrink: 0;
  padding: 0.3rem 0.75rem;
  border-radius: 999px;
  font-size: 0.78rem;
  font-weight: 700;
}

.pill--muted {
  background: #f1f5f9;
  color: #475569;
}

.pill--info {
  background: #e0e7ff;
  color: #3730a3;
}

.pill--warn {
  background: #fef3c7;
  color: #92400e;
}

.pill--orange {
  background: #ffedd5;
  color: #9a3412;
}

.pill--ok {
  background: #d1fae5;
  color: #065f46;
}

.pill--bad {
  background: #fee2e2;
  color: #991b1b;
}

.timeline {
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  gap: 0.35rem;
  position: relative;
  padding: 0.25rem 0 0.5rem;
}

.timeline__step {
  flex: 1;
  display: flex;
  flex-direction: column;
  align-items: center;
  text-align: center;
  position: relative;
  min-width: 0;
}

.timeline__dot {
  width: 12px;
  height: 12px;
  border-radius: 50%;
  background: #e2e8f0;
  border: 2px solid #cbd5e1;
  z-index: 1;
}

.timeline__dot[data-done='true'] {
  background: #4f46e5;
  border-color: #4338ca;
}

.timeline__dot[data-current='true'] {
  box-shadow: 0 0 0 4px rgba(79, 70, 229, 0.25);
}

.timeline__label {
  margin-top: 0.4rem;
  font-size: 0.68rem;
  font-weight: 600;
  color: #64748b;
  line-height: 1.2;
}

.card__foot {
  display: flex;
  justify-content: space-between;
  align-items: center;
  flex-wrap: wrap;
  gap: 0.5rem;
  margin-top: 1rem;
  padding-top: 0.85rem;
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
}

.link-continue {
  font-weight: 600;
  color: #4f46e5;
  text-decoration: none;
}

.link-btn:hover,
.link-continue:hover {
  opacity: 0.88;
}

.comment {
  margin: 1rem 0 0;
  padding: 0.75rem 1rem;
  border-radius: 12px;
  background: rgba(79, 70, 229, 0.06);
  font-size: 0.88rem;
  color: #334155;
}

.mentorship {
  margin-top: 1rem;
  padding-top: 0.85rem;
  border-top: 1px solid rgba(15, 23, 42, 0.06);
}

.mentorship__title {
  margin: 0 0 0.6rem;
  font-size: 0.95rem;
  color: #0f172a;
}

.mentorship__empty {
  color: #64748b;
  font-size: 0.88rem;
}

.mentorship__table-wrap {
  overflow: auto;
  border-radius: 12px;
  border: 1px solid rgba(79, 70, 229, 0.12);
  background: rgba(255, 255, 255, 0.95);
}

.mentorship__table {
  width: 100%;
  border-collapse: collapse;
  font-size: 0.85rem;
}

.mentorship__table th,
.mentorship__table td {
  padding: 0.65rem 0.75rem;
  text-align: left;
  border-bottom: 1px solid rgba(15, 23, 42, 0.06);
}

.mentorship__table th {
  font-size: 0.72rem;
  text-transform: uppercase;
  letter-spacing: 0.06em;
  color: #64748b;
  background: rgba(79, 70, 229, 0.04);
}

.mentorship__consultations {
  padding: 0.6rem 0.75rem 0.75rem;
}

.notes {
  margin-top: 1rem;
  padding-top: 0.85rem;
  border-top: 1px solid rgba(15, 23, 42, 0.06);
}

.notes__head {
  display: flex;
  justify-content: space-between;
  align-items: center;
  gap: 0.75rem;
  margin-bottom: 0.65rem;
}

.notes__title {
  margin: 0;
  font-size: 0.95rem;
  color: #0f172a;
}

.notes__empty {
  color: #64748b;
  font-size: 0.88rem;
}

.notes__list {
  display: flex;
  flex-direction: column;
  gap: 0.55rem;
}

.note {
  border: 1px solid rgba(79, 70, 229, 0.12);
  border-radius: 12px;
  padding: 0.65rem 0.75rem;
  background: rgba(255, 255, 255, 0.96);
}

.note__head {
  display: flex;
  justify-content: space-between;
  align-items: flex-start;
  gap: 0.75rem;
}

.note__meta {
  display: flex;
  flex-direction: column;
  gap: 0.15rem;
  font-size: 0.8rem;
  color: #64748b;
}

.note__content {
  margin: 0.55rem 0 0;
  color: #334155;
  font-size: 0.88rem;
  white-space: pre-wrap;
}

.milestones {
  margin-top: 1rem;
  padding-top: 0.85rem;
  border-top: 1px solid rgba(15, 23, 42, 0.06);
}

.milestones__head {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 0.75rem;
  margin-bottom: 0.65rem;
}

.milestones__title {
  margin: 0;
  font-size: 0.95rem;
  color: #0f172a;
}

.milestones__add-btn {
  padding: 0.4rem 0.75rem;
  border: none;
  border-radius: 9px;
  background: #4f46e5;
  color: white;
  font-weight: 600;
  cursor: pointer;
}

.milestones__add-btn:hover {
  background: #4338ca;
}

.milestones__empty {
  color: #64748b;
  font-size: 0.88rem;
}

.milestones__list {
  position: relative;
  display: flex;
  flex-direction: column;
  gap: 0.65rem;
  padding-left: 1rem;
}

.milestones__list::before {
  content: '';
  position: absolute;
  left: 0.2rem;
  top: 0;
  bottom: 0;
  width: 2px;
  background: rgba(79, 70, 229, 0.2);
}

.milestone-item {
  position: relative;
  border: 1px solid rgba(79, 70, 229, 0.12);
  border-radius: 12px;
  background: rgba(255, 255, 255, 0.96);
  padding: 0.7rem 0.8rem;
}

.milestone-item::before {
  content: '';
  position: absolute;
  left: -0.96rem;
  top: 0.95rem;
  width: 10px;
  height: 10px;
  border-radius: 50%;
  background: #6366f1;
}

.milestone-item__top {
  display: flex;
  justify-content: space-between;
  align-items: flex-start;
  gap: 0.75rem;
}

.milestone-item__title {
  margin: 0;
  font-size: 0.92rem;
  color: #0f172a;
}

.milestone-item__meta {
  margin: 0.4rem 0 0;
  color: #64748b;
  font-size: 0.8rem;
}

.milestone-item__desc {
  margin: 0.45rem 0 0;
  color: #334155;
  font-size: 0.86rem;
  white-space: pre-wrap;
}

.milestone-item__actions {
  margin-top: 0.6rem;
  display: flex;
  gap: 0.5rem;
}

.milestone-action-btn {
  padding: 0.3rem 0.6rem;
  border: 1px solid rgba(79, 70, 229, 0.25);
  border-radius: 8px;
  background: white;
  color: #4338ca;
  font-size: 0.76rem;
  font-weight: 600;
  cursor: pointer;
}

.milestone-action-btn--danger {
  border-color: rgba(220, 38, 38, 0.25);
  color: #b91c1c;
}

.milestone-action-btn:hover {
  background: rgba(79, 70, 229, 0.06);
}

.milestone-status {
  padding: 0.2rem 0.6rem;
  border-radius: 999px;
  font-size: 0.72rem;
  font-weight: 700;
  white-space: nowrap;
}

.milestone-status--pending {
  background: #fef3c7;
  color: #92400e;
}

.milestone-status--planned {
  background: #e0e7ff;
  color: #3730a3;
}

.milestone-status--progress {
  background: #dbeafe;
  color: #1d4ed8;
}

.milestone-status--completed {
  background: #d1fae5;
  color: #065f46;
}

.milestone-status--overdue {
  background: #fee2e2;
  color: #991b1b;
}

.milestone-status--blocked {
  background: #f1f5f9;
  color: #334155;
}

.milestone-status--default {
  background: #f8fafc;
  color: #475569;
}
</style>
