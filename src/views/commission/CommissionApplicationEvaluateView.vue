<template>
  <div class="evaluate">
    <header class="evaluate__head">
      <router-link class="back" :to="listBack">← До учасників</router-link>
      <h1>Оцінювання заявки</h1>
      <p v-if="isReadOnlyCommission" class="evaluate__hint">
        Режим перегляду: критерії та бали без збереження оцінок і без рішення по статусу.
      </p>
      <p v-else class="evaluate__hint">
        Критерії, бали та рішення комісії (лише для SUPER_EVALUATOR / адміністратора).
      </p>
    </header>

    <section class="panel panel--meta">
      <p v-if="loadedApplication" class="status-line">
        Заявка <span class="mono">#{{ loadedApplication.id }}</span> ·
        <strong>{{ statusLabel(loadedApplication.status) }}</strong>
      </p>
      <p v-else-if="loadingApplication" class="muted">Завантаження заявки…</p>
      <p v-else class="muted">Заявку не знайдено.</p>
      <div class="row">
        <button type="button" :disabled="busy" @click="loadCriteria">Критерії</button>
        <button type="button" :disabled="busy" @click="refreshSummary">Оновити підсумок</button>
      </div>
    </section>

    <ApplicationDocumentsDownload
      v-if="numericApplicationId"
      :application-id="numericApplicationId"
    />

    <section v-if="isReadOnlyCommission && criteria.length" class="panel">
      <h2>Критерії (перегляд)</h2>
      <div v-for="item in criteria" :key="item.id" class="rowline rowline--readonly">
        <div>
          <strong>{{ item.name }}</strong>
          <p class="hint">Вага: {{ item.weightPercent }}% · Бал за шкалою 1–100</p>
          <p v-if="item.description" class="hint criteria-desc-inline">
            {{ item.description }}
          </p>
        </div>
      </div>
    </section>

    <section v-if="canScoreAndDecide" class="panel panel--criteria">
      <div class="criteria-head">
        <h2>Критерії</h2>
        <button type="button" class="btn-save-all" :disabled="busy || !criteria.length" @click="saveAllScores">
          Зберегти всі
        </button>
      </div>
      <p v-if="!criteria.length && !busy" class="hint">
        Для цього виклику немає критеріїв або виклик не знайдено. Перезавантажте сторінку після запуску
        бекенда (можливе автоматичне створення стандартного набору) або зверніться до адміністратора.
      </p>
      <ul v-else class="criteria-list">
        <li v-for="item in criteria" :key="item.id" class="criteria-card">
          <div class="criteria-card__head">
            <strong class="criteria-name">{{ item.name }}</strong>
            <span class="criteria-meta">Вага: {{ item.weightPercent ?? '—' }}%</span>
          </div>
          <p v-if="item.description" class="criteria-desc">
            {{ item.description }}
          </p>
          <div class="criteria-grid">
            <label class="field-compact">
              <span class="field-label">Оцінка (1–100) *</span>
              <input
                v-model.number="scores[item.id]"
                type="number"
                min="1"
                max="100"
                step="1"
                class="score-input"
                placeholder="1–100"
              >
            </label>
            <label class="field-compact field-compact--grow">
              <span class="field-label">Коментар</span>
              <textarea
                v-model="comments[item.id]"
                rows="2"
                class="comment-input"
                placeholder="Примітка щодо цього критерію…"
              />
            </label>
          </div>
          <div class="criteria-actions">
            <button type="button" class="btn-row-save" :disabled="busy" @click="saveScore(item.id)">
              Зберегти пункт
            </button>
          </div>
        </li>
      </ul>
    </section>

    <section v-if="canScoreAndDecide" class="panel panel--decision">
      <h2>Рішення по заявці</h2>
      <p class="hint">
        Якщо заявка «Подана», спочатку переведіть у «На розгляді». Далі — схвалення, відхилення або доопрацювання.
      </p>
      <template v-if="loadedApplication">
        <label class="label-block">
          <span>Коментар для студента</span>
          <textarea
            v-model="decisionComment"
            rows="3"
            placeholder="Обґрунтування, що змінити при доопрацюванні…"
          />
        </label>
        <div v-if="!commissionNextStatuses.length" class="hint muted">
          З цієї стадії зміна статусу недоступна.
        </div>
        <div v-else class="decision-actions">
          <button
            v-for="st in commissionNextStatuses"
            :key="st"
            type="button"
            :class="['btn-decision', decisionClass(st)]"
            :disabled="decisionBusy"
            @click="submitCommissionDecision(st)"
          >
            {{ statusLabel(st) }}
          </button>
        </div>
      </template>
    </section>

    <section v-if="average || complete" class="panel">
      <h2>Підсумок</h2>
      <p v-if="average">
        Середній: <strong>{{ average.simpleAverage ?? '—' }}</strong> · Зважений:
        <strong>{{ average.weightedAverage ?? '—' }}</strong>
      </p>
      <p v-if="complete && complete.totalCriteria != null">
        Критерії: <strong>{{ complete.complete ? 'повністю' : 'не завершено' }}</strong>
        (усього {{ complete.totalCriteria }})
      </p>
    </section>

    <p v-if="message" class="message">{{ message }}</p>
  </div>
</template>

<script setup>
import { computed, onMounted, reactive, ref, watch } from 'vue'
import { useRoute } from 'vue-router'
import { evaluationApi } from '@/api/evaluation'
import { applicationsApi } from '@/api/applications'
import { adminAllowedNextStatuses, statusLabel } from '@/utils/applicationStatus'
import { useCommissionAuth } from '@/composables/useCommissionAuth'
import ApplicationDocumentsDownload from '@/components/ApplicationDocumentsDownload.vue'

const route = useRoute()
const { auth, isReadOnlyCommission, canScoreAndDecide } = useCommissionAuth()

const applicationId = computed(() => Number(route.params.applicationId))

const criteria = ref([])
const scores = reactive({})
const comments = reactive({})
const average = ref(null)
const complete = ref(null)
const message = ref('')
const busy = ref(false)
const decisionComment = ref('')
const loadedApplication = ref(null)
const loadingApplication = ref(false)
const decisionBusy = ref(false)
const evaluatorId = ref('')

/** Спочатку callId з заявки (джерело істини); інакше з маршруту — усуває порожній список критеріїв при гонці watch. */
const effectiveCallId = computed(() => {
  const fromApp = loadedApplication.value?.callId
  const nApp = fromApp != null && fromApp !== '' ? Number(fromApp) : NaN
  if (Number.isInteger(nApp) && nApp > 0) {
    return nApp
  }
  const nRoute = Number(route.params.callId)
  return Number.isInteger(nRoute) && nRoute > 0 ? nRoute : null
})

const listBack = computed(() => ({
  name: 'commission-participants',
  params: { programType: route.query.program === 'b' ? 'b' : 'a' },
}))

const numericApplicationId = computed(() => asPositiveInt(applicationId.value))

function asPositiveInt(n) {
  return Number.isInteger(n) && n > 0 ? n : null
}

function decisionClass(st) {
  if (st === 'APPROVED') return 'btn-decision--ok'
  if (st === 'REJECTED') return 'btn-decision--bad'
  if (st === 'NEEDS_REVISION') return 'btn-decision--warn'
  if (st === 'IN_REVIEW') return 'btn-decision--neutral'
  return 'btn-decision--neutral'
}

const commissionNextStatuses = computed(() => {
  const st = loadedApplication.value?.status
  if (!st) return []
  return adminAllowedNextStatuses(st)
})

async function loadApplication() {
  const id = asPositiveInt(applicationId.value)
  if (!id) {
    loadedApplication.value = null
    return
  }
  loadingApplication.value = true
  try {
    const res = await applicationsApi.getOne(id)
    loadedApplication.value = res.data
  } catch {
    loadedApplication.value = null
  } finally {
    loadingApplication.value = false
  }
}

async function loadCriteria() {
  const call = asPositiveInt(effectiveCallId.value)
  if (!call) {
    criteria.value = []
    message.value = loadedApplication.value
      ? 'Не вдалося визначити виклик для цієї заявки (немає callId).'
      : 'Некоректний ID виклику — спочатку дочекайтесь завантаження заявки.'
    return
  }
  busy.value = true
  try {
    const res = await evaluationApi.getCriteria(call)
    const list = Array.isArray(res.data) ? res.data : []
    criteria.value = list
    for (const item of criteria.value) {
      if (scores[item.id] === undefined) scores[item.id] = ''
      if (comments[item.id] === undefined) comments[item.id] = ''
    }
    if (canScoreAndDecide.value && auth.user?.id) {
      evaluatorId.value = String(auth.user.id)
      await prefetchMyScores()
    }
    message.value = list.length
      ? `Завантажено критеріїв: ${list.length}.`
      : `Для виклику №${call} сервер повернув порожній список критеріїв.`
  } catch {
    criteria.value = []
    message.value = 'Не вдалося завантажити критерії.'
  } finally {
    busy.value = false
  }
}

async function prefetchMyScores() {
  const app = asPositiveInt(applicationId.value)
  const ev = asPositiveInt(Number(evaluatorId.value))
  if (!app || !ev) return
  try {
    const { data } = await evaluationApi.getMyScores(app, ev)
    const list = Array.isArray(data) ? data : []
    for (const evRow of list) {
      const cid = evRow.criteria?.id ?? evRow.criteriaId
      if (cid != null && evRow.score != null) {
        scores[cid] = evRow.score
      }
      if (cid != null && evRow.comment != null) {
        comments[cid] = evRow.comment
      }
    }
  } catch {
    /* ignore */
  }
}

function clampScore(raw) {
  const n = Number(raw)
  if (Number.isNaN(n)) return null
  if (n < 1 || n > 100) return null
  return n
}

async function saveScore(criteriaId) {
  if (isReadOnlyCommission.value) return
  const app = asPositiveInt(applicationId.value)
  const evaluator = asPositiveInt(Number(evaluatorId.value))
  if (!app || !evaluator) {
    message.value = 'Немає ID оцінювача.'
    return
  }
  busy.value = true
  const valid = clampScore(scores[criteriaId])
  if (valid == null) {
    message.value = 'Вкажіть бал від 1 до 100.'
    busy.value = false
    return
  }
  try {
    await evaluationApi.submitScore({
      applicationId: app,
      evaluatorId: evaluator,
      criteriaId: Number(criteriaId),
      score: valid,
      comment: String(comments[criteriaId] ?? '').trim() || null,
    })
    message.value = `Збережено критерій "${criteria.value.find((c) => c.id === criteriaId)?.name ?? criteriaId}".`
  } catch {
    message.value = 'Не вдалося зберегти оцінку.'
  } finally {
    busy.value = false
  }
}

async function saveAllScores() {
  if (!criteria.value.length) return
  busy.value = true
  try {
    let saved = 0
    for (const item of criteria.value) {
      const valid = clampScore(scores[item.id])
      if (valid == null) continue
      const app = asPositiveInt(applicationId.value)
      const evaluator = asPositiveInt(Number(evaluatorId.value))
      await evaluationApi.submitScore({
        applicationId: app,
        evaluatorId: evaluator,
        criteriaId: Number(item.id),
        score: valid,
        comment: String(comments[item.id] ?? '').trim() || null,
      })
      saved += 1
    }
    message.value = saved ? `Збережено оцінок: ${saved}.` : 'Немає жодного балу 1–100 для збереження.'
    await refreshSummary()
  } catch {
    message.value = 'Не вдалося зберегти оцінки.'
  } finally {
    busy.value = false
  }
}

async function refreshSummary() {
  const app = asPositiveInt(applicationId.value)
  const call = asPositiveInt(effectiveCallId.value)
  if (!app || !call) {
    message.value = 'Некоректні параметри заявки або виклику.'
    return
  }
  busy.value = true
  try {
    const avgRes = await evaluationApi.getAverage(app)
    average.value = avgRes.data
    if (canScoreAndDecide.value) {
      const evaluator = asPositiveInt(Number(evaluatorId.value || auth.user?.id))
      if (evaluator) {
        const completeRes = await evaluationApi.getCompletion(app, evaluator, call)
        complete.value = completeRes.data
      } else {
        complete.value = null
      }
    } else {
      complete.value = null
    }
    message.value = 'Підсумок оновлено.'
  } catch {
    message.value = 'Не вдалося оновити підсумок.'
  } finally {
    busy.value = false
  }
}

async function submitCommissionDecision(nextStatus) {
  if (isReadOnlyCommission.value) return
  const id = asPositiveInt(applicationId.value)
  if (!id || !nextStatus) return
  if (!commissionNextStatuses.value.includes(nextStatus)) {
    message.value = 'Цей перехід статусу зараз недоступний.'
    return
  }
  decisionBusy.value = true
  try {
    await applicationsApi.changeStatus(id, nextStatus, decisionComment.value.trim() || null)
    message.value = `Статус оновлено: ${statusLabel(nextStatus)}.`
    decisionComment.value = ''
    await loadApplication()
  } catch (e) {
    message.value = e.response?.data?.message || e.response?.data || 'Не вдалося змінити статус.'
  } finally {
    decisionBusy.value = false
  }
}

onMounted(async () => {
  if (canScoreAndDecide.value && auth.user?.id) {
    evaluatorId.value = String(auth.user.id)
  }
  await loadApplication()
  await loadCriteria()
  await refreshSummary()
})

watch(applicationId, async () => {
  Object.keys(scores).forEach((k) => delete scores[k])
  Object.keys(comments).forEach((k) => delete comments[k])
  await loadApplication()
  await loadCriteria()
  await refreshSummary()
})
</script>

<style scoped>
.evaluate {
  max-width: 720px;
  margin: 0 auto;
  padding: 1.25rem 1rem 2rem;
  display: flex;
  flex-direction: column;
  gap: 1rem;
}

.evaluate__head h1 {
  margin: 0.35rem 0 0;
  font-size: 1.45rem;
}

.back {
  color: #64748b;
  text-decoration: none;
  font-size: 0.9rem;
}

.back:hover {
  text-decoration: underline;
}

.evaluate__hint {
  margin: 0.4rem 0 0;
  color: #64748b;
  font-size: 0.88rem;
}

.panel {
  border-radius: 16px;
  padding: 1.1rem 1.15rem;
  background: #e4e4e8;
  border: 1px solid #c8c8d0;
}

.panel--criteria {
  background: #edd8e4;
  border-color: #d4b8c8;
}

.panel--decision {
  background: #e8e4f0;
  border-color: #c8c0dc;
}

.panel h2 {
  margin: 0 0 0.75rem;
  font-size: 1.05rem;
}

.row {
  display: flex;
  flex-wrap: wrap;
  gap: 0.5rem;
  margin-top: 0.65rem;
}

.row button {
  border: none;
  border-radius: 999px;
  background: #4f46e5;
  color: #fff;
  font-weight: 700;
  padding: 0.45rem 0.85rem;
  cursor: pointer;
}

.row button:disabled {
  opacity: 0.6;
  cursor: not-allowed;
}

.rowline {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 0.65rem;
  padding: 0.55rem 0;
  border-bottom: 1px solid rgba(100, 100, 120, 0.2);
}

.rowline:last-child {
  border-bottom: none;
}

.rowline--readonly {
  align-items: flex-start;
}

.criteria-head {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  justify-content: space-between;
  gap: 0.5rem;
  margin-bottom: 0.75rem;
}

.criteria-head h2 {
  margin: 0;
}

.btn-save-all {
  border: none;
  border-radius: 999px;
  background: #9d174d;
  color: #fff;
  font-weight: 700;
  padding: 0.4rem 0.95rem;
  font-size: 0.82rem;
  cursor: pointer;
}

.btn-save-all:disabled {
  opacity: 0.5;
  cursor: not-allowed;
}

.criteria-list {
  list-style: none;
  margin: 0;
  padding: 0;
  display: flex;
  flex-direction: column;
  gap: 0.85rem;
}

.criteria-card {
  background: rgba(255, 255, 255, 0.55);
  border: 1px solid rgba(180, 120, 150, 0.45);
  border-radius: 12px;
  padding: 0.85rem 1rem;
}

.criteria-card__head {
  display: flex;
  flex-wrap: wrap;
  align-items: baseline;
  justify-content: space-between;
  gap: 0.5rem;
  margin-bottom: 0.35rem;
}

.criteria-name {
  font-size: 1rem;
  color: #1e293b;
}

.criteria-meta {
  font-size: 0.78rem;
  font-weight: 600;
  color: #64748b;
}

.criteria-desc {
  margin: 0 0 0.65rem;
  font-size: 0.84rem;
  color: #475569;
  line-height: 1.4;
}

.criteria-desc-inline {
  margin: 0.25rem 0 0;
  max-width: 100%;
}

.criteria-grid {
  display: grid;
  gap: 0.65rem;
  grid-template-columns: minmax(100px, 140px) 1fr;
}

@media (max-width: 560px) {
  .criteria-grid {
    grid-template-columns: 1fr;
  }
}

.field-compact {
  display: flex;
  flex-direction: column;
  gap: 0.25rem;
}

.field-compact--grow {
  min-width: 0;
}

.field-label {
  font-size: 0.76rem;
  font-weight: 700;
  color: #475569;
  text-transform: uppercase;
  letter-spacing: 0.03em;
}

.score-input {
  width: 100%;
  border-radius: 8px;
  border: 1px solid #cbd5e1;
  padding: 0.45rem 0.5rem;
  font-size: 0.95rem;
  font-weight: 600;
}

.comment-input {
  width: 100%;
  border-radius: 8px;
  border: 1px solid #cbd5e1;
  padding: 0.45rem 0.5rem;
  font: inherit;
  resize: vertical;
  min-height: 52px;
}

.criteria-actions {
  margin-top: 0.6rem;
  display: flex;
  justify-content: flex-end;
}

.btn-row-save {
  border: none;
  border-radius: 999px;
  background: #be185d;
  color: #fff;
  font-weight: 700;
  padding: 0.35rem 0.85rem;
  font-size: 0.82rem;
  cursor: pointer;
}

.btn-row-save:disabled {
  opacity: 0.55;
  cursor: not-allowed;
}

.score {
  width: 88px;
  border-radius: 8px;
  border: 1px solid #cbd5e1;
  padding: 0.4rem 0.45rem;
}

.hint {
  margin: 0;
  font-size: 0.82rem;
  color: #64748b;
}

.muted {
  color: #94a3b8;
  font-size: 0.88rem;
}

.status-line {
  margin: 0 0 0.5rem;
}

.mono {
  font-family: ui-monospace, monospace;
}

.label-block span {
  display: block;
  font-size: 0.82rem;
  color: #64748b;
  margin-bottom: 0.3rem;
}

.label-block textarea {
  width: 100%;
  border-radius: 10px;
  border: 1px solid #cbd5e1;
  padding: 0.5rem 0.55rem;
  font: inherit;
}

.decision-actions {
  display: flex;
  flex-wrap: wrap;
  gap: 0.45rem;
  margin-top: 0.65rem;
}

.btn-decision {
  border: none;
  border-radius: 999px;
  font-weight: 700;
  padding: 0.45rem 0.85rem;
  cursor: pointer;
  font-size: 0.82rem;
  color: #fff;
}

.btn-decision--neutral {
  background: #4f46e5;
}

.btn-decision--ok {
  background: #059669;
}

.btn-decision--warn {
  background: #d97706;
}

.btn-decision--bad {
  background: #dc2626;
}

.message {
  margin: 0;
  padding: 0.65rem 0.75rem;
  border-radius: 10px;
  background: #eff6ff;
  color: #1e40af;
  font-size: 0.88rem;
}
</style>
