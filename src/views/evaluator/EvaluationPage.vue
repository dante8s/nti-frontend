<script setup>
import { computed, reactive, ref } from 'vue'
import { evaluationApi } from '@/api/evaluation'

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

const summary = computed(() => ({
  assigned: queue.value.length,
  inReview: queue.value.filter((x) => x.status === 'IN_REVIEW' || x.status === 'SUBMITTED').length,
  scored: queue.value.filter((x) => x.status === 'SCORED').length,
}))

async function loadCriteria() {
  if (!callId.value) {
    message.value = 'Вкажіть ID виклику.'
    return
  }
  busy.value = true
  try {
    const res = await evaluationApi.getCriteria(Number(callId.value))
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
  if (!callId.value) {
    message.value = 'Вкажіть ID виклику.'
    return
  }
  busy.value = true
  try {
    const res = await evaluationApi.getQueue(Number(callId.value))
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
  if (!appId.value || !evaluatorId.value) {
    message.value = 'Вкажіть ID заявки та ID оцінювача.'
    return
  }
  busy.value = true
  try {
    await evaluationApi.submitScore({
      applicationId: Number(appId.value),
      evaluatorId: Number(evaluatorId.value),
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

async function refreshSummary() {
  if (!appId.value || !evaluatorId.value || !callId.value) {
    message.value = 'Вкажіть ID заявки, оцінювача та виклику.'
    return
  }
  busy.value = true
  try {
    const avgRes = await evaluationApi.getAverage(Number(appId.value))
    const completeRes = await evaluationApi.getCompletion(
      Number(appId.value),
      Number(evaluatorId.value),
      Number(callId.value),
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
</script>

<template>
  <section class="panel">
    <header class="panel-header">
      <h2>Evaluation & Scoring</h2>
      <p>Робоче місце комісії: черга заявок, критерії, скоринг та контроль заповнення оцінок.</p>
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
          <input v-model="appId" type="number" min="1" />
        </div>
        <div>
          <label class="label">ID виклику</label>
          <input v-model="callId" type="number" min="1" />
        </div>
        <div>
          <label class="label">ID оцінювача</label>
          <input v-model="evaluatorId" type="number" min="1" />
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
          <p class="hint">Статус: {{ item.status }} · Кандидат: #{{ item.applicantId }}</p>
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

@media (max-width: 900px) {
  .grid {
    grid-template-columns: 1fr;
  }
  .stats {
    grid-template-columns: 1fr;
  }
}
</style>
