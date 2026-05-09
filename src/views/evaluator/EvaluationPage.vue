<script setup>
import { computed, reactive, ref, watch } from 'vue'
import { evaluationApi } from '@/api/evaluation'
import { applicationsApi } from '@/api/applications'
import { adminAllowedNextStatuses, statusLabel } from '@/utils/applicationStatus'

const appId = ref('')
const callId = ref('')
const evaluatorId = ref('')
const criteria = ref([])
const queue = ref([])
const scores = reactive({})
const average = ref(null)
const complete = ref(null)
const message = ref('')
const busy = ref(false)
const decisionComment = ref('')
const loadedApplication = ref(null)
const loadingApplication = ref(false)
const decisionBusy = ref(false)

function asPositiveInt(value) {
  const n = Number(value)
  return Number.isInteger(n) && n > 0 ? n : null
}

function decisionClass(st) {
  if (st === 'APPROVED') return 'btn-decision--ok'
  if (st === 'REJECTED') return 'btn-decision--bad'
  if (st === 'NEEDS_REVISION') return 'btn-decision--warn'
  if (st === 'IN_REVIEW') return 'btn-decision--neutral'
  return 'btn-decision--neutral'
}

const summary = computed(() => ({
  assigned: queue.value.length,
  inReview: queue.value.filter((x) => x.status === 'IN_REVIEW' || x.status === 'SUBMITTED').length,
  scored: queue.value.filter((x) => x.status === 'SCORED').length,
}))

async function loadCriteria() {
  const call = asPositiveInt(callId.value)
  if (!call) {
    message.value = 'Вкажіть ID виклику.'
    return
  }
  busy.value = true
  try {
    const res = await evaluationApi.getCriteria(call)
    criteria.value = res.data || []
    for (const item of criteria.value) {
      scores[item.id] = scores[item.id] ?? ''
    }
    message.value = 'Критерії завантажено.'
  } catch {
    message.value = 'Не вдалося завантажити критерії.'
  } finally {
    busy.value = false
  }
}

async function loadQueue() {
  const call = asPositiveInt(callId.value)
  if (!call) {
    message.value = 'Вкажіть ID виклику.'
    return
  }
  busy.value = true
  try {
    const res = await evaluationApi.getQueue(call)
    queue.value = res.data || []
    message.value = 'Чергу заявок завантажено.'
  } catch {
    message.value = 'Не вдалося завантажити чергу заявок.'
  } finally {
    busy.value = false
  }
}

function pickApplication(id) {
  appId.value = id
}

async function saveScore(criteriaId) {
  const app = asPositiveInt(appId.value)
  const evaluator = asPositiveInt(evaluatorId.value)
  if (!app || !evaluator) {
    message.value = 'Вкажіть ID заявки та ID оцінювача.'
    return
  }
  busy.value = true
  try {
    await evaluationApi.submitScore({
      applicationId: app,
      evaluatorId: evaluator,
      criteriaId: Number(criteriaId),
      score: Number(scores[criteriaId]),
    })
    message.value = `Оцінку за критерієм #${criteriaId} збережено.`
  } catch {
    message.value = 'Не вдалося зберегти оцінку.'
  } finally {
    busy.value = false
  }
}

const commissionNextStatuses = computed(() => {
  const st = loadedApplication.value?.status
  if (!st) return []
  return adminAllowedNextStatuses(st)
})

watch(appId, async (raw) => {
  loadedApplication.value = null
  const id = asPositiveInt(raw)
  if (!id) {
    loadingApplication.value = false
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
})

async function refreshSummary() {
  const app = asPositiveInt(appId.value)
  const evaluator = asPositiveInt(evaluatorId.value)
  const call = asPositiveInt(callId.value)
  if (!app || !evaluator || !call) {
    message.value = 'Вкажіть ID заявки, оцінювача та виклику.'
    return
  }
  busy.value = true
  try {
    const avgRes = await evaluationApi.getAverage(app)
    const completeRes = await evaluationApi.getCompletion(
      app,
      evaluator,
      call,
    )
    average.value = avgRes.data
    complete.value = completeRes.data
    message.value = 'Підсумкові дані оновлено.'
  } catch {
    message.value = 'Не вдалося оновити підсумок.'
  } finally {
    busy.value = false
  }
}

async function submitCommissionDecision(nextStatus) {
  const id = asPositiveInt(appId.value)
  if (!id || !nextStatus) return
  if (!commissionNextStatuses.value.includes(nextStatus)) {
    message.value = 'Для поточного статусу заявки ця дія недоступна.'
    return
  }
  decisionBusy.value = true
  try {
    await applicationsApi.changeStatus(
      id,
      nextStatus,
      decisionComment.value.trim() || null,
    )
    message.value = `Статус заявки оновлено: ${statusLabel(nextStatus)}.`
    decisionComment.value = ''
    const refreshed = await applicationsApi.getOne(id)
    loadedApplication.value = refreshed.data
    await loadQueue()
  } catch (e) {
    message.value =
      e.response?.data?.message
      || 'Не вдалося оновити статус (перевірте права API на бекенді).'
  } finally {
    decisionBusy.value = false
  }
}
</script>

<template>
  <section class="panel">
    <header class="panel-header">
      <h2>Оцінювання та рішення комісії</h2>
      <p>
        Черга заявок за викликом, балли за критеріями та зміна статусу: прийняти до розгляду, повернути на доопрацювання,
        схвалити або відхилити.
      </p>
    </header>

    <article class="card">
      <h3>Огляд</h3>
      <div class="stats">
        <div class="stat">
          <p class="hint">Призначено заявок</p>
          <strong>{{ summary.assigned }}</strong>
        </div>
        <div class="stat">
          <p class="hint">В роботі</p>
          <strong>{{ summary.inReview }}</strong>
        </div>
        <div class="stat">
          <p class="hint">Оцінено</p>
          <strong>{{ summary.scored }}</strong>
        </div>
      </div>
    </article>

    <article class="card">
      <div class="grid">
        <div>
          <label class="label">ID заявки</label>
          <input v-model.trim="appId" type="text" inputmode="numeric" pattern="[0-9]*" placeholder="Напр. 1001" />
        </div>
        <div>
          <label class="label">ID виклику</label>
          <input v-model.trim="callId" type="text" inputmode="numeric" pattern="[0-9]*" placeholder="Напр. 201" />
        </div>
        <div>
          <label class="label">ID оцінювача</label>
          <input
            v-model.trim="evaluatorId"
            type="text"
            inputmode="numeric"
            pattern="[0-9]*"
            placeholder="Напр. 999001"
          />
        </div>
      </div>
      <div class="row">
        <button :disabled="busy" @click="loadQueue">Черга заявок</button>
        <button :disabled="busy" @click="loadCriteria">Критерії</button>
        <button :disabled="busy" @click="refreshSummary">Оновити підсумок</button>
      </div>
    </article>

    <article class="card">
      <h3>Черга заявок</h3>
      <div v-if="!queue.length" class="hint">Заявки ще не завантажено.</div>
      <div v-for="item in queue" :key="item.id" class="rowline">
        <div>
          <strong>Заявка #{{ item.id }}</strong>
          <p class="hint">
            {{ item.programName || 'Заявка' }} ·
            {{ statusLabel(item.status) }} ·
            Учасник: #{{ item.applicantId }}
          </p>
        </div>
        <button :disabled="busy" @click="pickApplication(item.id)">Обрати</button>
      </div>
    </article>

    <article class="card">
      <h3>Скоринг критеріїв</h3>
      <div v-if="!criteria.length" class="hint">Спочатку завантажте критерії виклику.</div>
      <div v-for="item in criteria" :key="item.id" class="rowline">
        <div>
          <strong>{{ item.name }}</strong>
          <p class="hint">Вага: {{ item.weightPercent }}% · Максимум: {{ item.maxScore }}</p>
        </div>
        <input
          v-model="scores[item.id]"
          type="number"
          min="0"
          :max="item.maxScore"
          step="0.1"
          class="score"
        />
        <button :disabled="busy" @click="saveScore(item.id)">Зберегти</button>
      </div>
    </article>

    <article class="card card--decision">
      <h3>Рішення комісії по заявці</h3>
      <p class="hint">
        Після оцінки критеріїв зафіксуйте статус. Якщо заявка лише «Подано», спочатку переведіть її в «На розгляді»
        (формальний старт розгляду).
      </p>

      <template v-if="asPositiveInt(appId)">
        <p v-if="loadedApplication" class="status-line">
          Заявка <span class="mono">#{{ loadedApplication.id }}</span> ·
          <strong>{{ statusLabel(loadedApplication.status) }}</strong>
        </p>
        <p v-else-if="loadingApplication" class="hint muted">Завантаження даних заявки…</p>
        <p v-else class="hint muted">
          Заявку не знайдено або API недоступний для вашої ролі (налаштуйте бекенд для комісії).
        </p>

        <label class="label-block">
          <span>Коментар для студента</span>
          <textarea
            v-model="decisionComment"
            rows="3"
            placeholder="Обґрунтування рішення, що виправити при поверненні на доопрацювання…"
          />
        </label>

        <div v-if="!commissionNextStatuses.length && loadedApplication" class="hint muted">
          З цієї стадії зміна статусу тут недоступна (наприклад, чернетка або вже завершене рішення).
        </div>
        <div v-else class="decision-actions">
          <button
            v-for="st in commissionNextStatuses"
            :key="st"
            type="button"
            :class="['btn-decision', decisionClass(st)]"
            :disabled="decisionBusy || !asPositiveInt(appId)"
            @click="submitCommissionDecision(st)"
          >
            {{ statusLabel(st) }}
          </button>
        </div>
      </template>
      <p v-else class="hint muted">
        Оберіть заявку з черги або вкажіть її ID вище.
      </p>
    </article>

    <article v-if="average || complete" class="card">
      <h3>Підсумок оцінювання</h3>
      <p v-if="average">
        Середній бал: <strong>{{ average.simpleAverage ?? '—' }}</strong> · Зважений:
        <strong>{{ average.weightedAverage ?? '—' }}</strong>
      </p>
      <p v-if="complete">
        Заповнення критеріїв: <strong>{{ complete.scoredCriteria }}</strong> /
        <strong>{{ complete.totalCriteria }}</strong>
      </p>
    </article>

    <p v-if="message" class="message info">{{ message }}</p>
  </section>
</template>

<style scoped>
.panel {
  display: flex;
  flex-direction: column;
  gap: 1rem;
}

.panel-header p {
  margin: 0.35rem 0 0;
  color: #64748b;
}

.card {
  padding: 1rem 1.1rem;
  border-radius: 14px;
  background: rgba(255, 255, 255, 0.9);
  border: 1px solid rgba(79, 70, 229, 0.12);
}

.stats {
  display: grid;
  grid-template-columns: repeat(3, minmax(0, 1fr));
  gap: 0.7rem;
}

.stat {
  border: 1px solid rgba(148, 163, 184, 0.35);
  border-radius: 10px;
  padding: 0.65rem;
}

.grid {
  display: grid;
  gap: 0.75rem;
  grid-template-columns: repeat(3, minmax(0, 1fr));
}

.label {
  display: block;
  font-size: 0.82rem;
  color: #64748b;
  margin-bottom: 0.2rem;
}

input {
  width: 100%;
  border-radius: 10px;
  border: 1px solid #cbd5e1;
  padding: 0.55rem 0.65rem;
}

.score {
  width: 90px;
}

.row {
  display: flex;
  gap: 0.6rem;
  flex-wrap: wrap;
  margin-top: 0.75rem;
}

.rowline {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 0.7rem;
  padding: 0.6rem 0;
  border-bottom: 1px solid rgba(148, 163, 184, 0.25);
}

.rowline:last-child {
  border-bottom: none;
}

button {
  border: none;
  border-radius: 999px;
  background: #4f46e5;
  color: #fff;
  font-weight: 700;
  padding: 0.45rem 0.85rem;
  cursor: pointer;
}

button:disabled {
  opacity: 0.65;
  cursor: not-allowed;
}

.hint {
  margin: 0;
  color: #64748b;
  font-size: 0.84rem;
}

.message {
  margin: 0;
  border-radius: 10px;
  padding: 0.7rem 0.8rem;
}

.info {
  background: #eff6ff;
  color: #1e40af;
}

.label-block span {
  display: block;
  font-size: 0.82rem;
  color: #64748b;
  margin-bottom: 0.35rem;
}

.label-block textarea {
  width: 100%;
  border-radius: 10px;
  border: 1px solid #cbd5e1;
  padding: 0.55rem 0.65rem;
  font: inherit;
  resize: vertical;
}

.status-line {
  margin: 0 0 0.75rem;
  font-size: 0.9rem;
}

.mono {
  font-family: ui-monospace, monospace;
}

.decision-actions {
  display: flex;
  flex-wrap: wrap;
  gap: 0.5rem;
  margin-top: 0.75rem;
}

.btn-decision {
  border: none;
  border-radius: 999px;
  font-weight: 700;
  padding: 0.5rem 0.95rem;
  cursor: pointer;
  font-size: 0.85rem;
}

.btn-decision--neutral {
  background: #4f46e5;
  color: #fff;
}

.btn-decision--ok {
  background: #059669;
  color: #fff;
}

.btn-decision--warn {
  background: #d97706;
  color: #fff;
}

.btn-decision--bad {
  background: #dc2626;
  color: #fff;
}

.btn-decision:disabled {
  opacity: 0.55;
  cursor: not-allowed;
}

.muted {
  color: #64748b;
}

.card--decision {
  border-color: rgba(79, 70, 229, 0.2);
  box-shadow: 0 4px 20px rgba(79, 70, 229, 0.06);
}

@media (max-width: 900px) {
  .grid {
    grid-template-columns: 1fr;
  }
  .stats {
    grid-template-columns: 1fr;
  }
}
</style>
