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
      <article v-for="app in items" :key="app.id" class="card">
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
          <div v-if="app.status === 'DRAFT'" class="draft-actions">
            <router-link
              :to="draftRoute(app)"
              class="link-continue"
            >
              Продовжити чернетку →
            </router-link>
            <button
              class="submit-btn"
              :disabled="submittingId === app.id"
              @click="submitDraft(app.id)"
            >
              {{ submittingId === app.id ? 'Відправлення...' : 'Відправити' }}
            </button>
          </div>
        </footer>

        <p v-if="app.adminComment" class="comment">
          <strong>Коментар:</strong> {{ app.adminComment }}
        </p>
      </article>
    </div>
  </div>
</template>

<script setup>
import { onMounted, ref } from 'vue'
import { applicationsApi } from '@/api/applications'
import { statusLabel } from '@/utils/applicationStatus'

const items = ref([])
const loading = ref(true)
const submittingId = ref(null)
const error = ref('')

onMounted(async () => {
  try {
    const res = await applicationsApi.getMy()
    items.value = res.data || []
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

async function submitDraft(appId) {
  submittingId.value = appId
  error.value = ''
  try {
    await applicationsApi.submit(appId)
    const res = await applicationsApi.getMy()
    items.value = res.data || []
  } catch {
    error.value = 'Не вдалося відправити заявку'
  } finally {
    submittingId.value = null
  }
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

.muted {
  font-size: 0.82rem;
  color: #94a3b8;
}

.link-continue {
  font-weight: 600;
  color: #4f46e5;
  text-decoration: none;
}

.draft-actions {
  display: flex;
  align-items: center;
  gap: 0.6rem;
}

.submit-btn {
  border: none;
  border-radius: 999px;
  background: #4338ca;
  color: #fff;
  font-weight: 700;
  font-size: 0.78rem;
  padding: 0.38rem 0.75rem;
  cursor: pointer;
}

.submit-btn:disabled {
  opacity: 0.65;
  cursor: not-allowed;
}

.comment {
  margin: 1rem 0 0;
  padding: 0.75rem 1rem;
  border-radius: 12px;
  background: rgba(79, 70, 229, 0.06);
  font-size: 0.88rem;
  color: #334155;
}
</style>
