<script setup>
import { ref } from 'vue'
import { reportingApi } from '@/api/reporting'

const callId = ref('')
const program = ref('')
const status = ref('')
const role = ref('')
const stats = ref(null)
const checks = ref(null)
const message = ref('')
const busy = ref(false)

const formats = ['csv', 'xlsx', 'pdf', 'docx']

function buildParams() {
  return {
    callId: callId.value ? Number(callId.value) : undefined,
    program: program.value || undefined,
    status: status.value || undefined,
    role: role.value || undefined,
  }
}

function downloadBlob(blob, filename) {
  const url = URL.createObjectURL(blob)
  const link = document.createElement('a')
  link.href = url
  link.download = filename
  link.click()
  URL.revokeObjectURL(url)
}

async function loadStats() {
  busy.value = true
  try {
    const res = await reportingApi.getStats()
    stats.value = res.data
    message.value = 'Статистику завантажено.'
  } catch {
    message.value = 'Не вдалося завантажити статистику.'
  } finally {
    busy.value = false
  }
}

async function runPrCheck() {
  if (!callId.value) {
    message.value = 'Вкажіть ID виклику.'
    return
  }
  busy.value = true
  try {
    const res = await reportingApi.getPrCheck(Number(callId.value))
    checks.value = res.data
    message.value = 'Перевірку PR readiness виконано.'
  } catch {
    message.value = 'Перевірку не вдалося виконати.'
  } finally {
    busy.value = false
  }
}

async function exportReport(format) {
  busy.value = true
  try {
    const params = buildParams()
    const res = await reportingApi.exportReport(params, format)
    const blob = res.data
    const suffix = `${role.value || 'all'}_${program.value || 'all'}_${status.value || 'all'}`
    downloadBlob(blob, `nti_report_${suffix}.${format}`)
    message.value = `Експорт ${format.toUpperCase()} створено.`
  } catch {
    message.value = `Не вдалося створити ${format.toUpperCase()} експорт.`
  } finally {
    busy.value = false
  }
}
</script>

<template>
  <section class="panel">
    <header class="panel-header">
      <h2>Reporting & Export</h2>
      <p>Адмін-сторінка звітності: фільтри, PR-перевірка готовності та експорт звітів.</p>
    </header>

    <article class="card">
      <h3>Фільтри</h3>
      <div class="grid">
        <div>
          <label class="label">ID виклику</label>
          <input v-model="callId" type="number" min="1" placeholder="Напр. 201" />
        </div>
        <div>
          <label class="label">Програма</label>
          <select v-model="program">
            <option value="">Усі</option>
            <option value="A">Програма A</option>
            <option value="B">Програма B</option>
          </select>
        </div>
        <div>
          <label class="label">Статус</label>
          <select v-model="status">
            <option value="">Усі</option>
            <option value="DRAFT">Чернетка</option>
            <option value="SUBMITTED">Подано</option>
            <option value="IN_REVIEW">На оцінюванні</option>
            <option value="APPROVED">Схвалено</option>
            <option value="REJECTED">Відхилено</option>
          </select>
        </div>
        <div>
          <label class="label">Роль</label>
          <select v-model="role">
            <option value="">Усі</option>
            <option value="student">Студенти/команди</option>
            <option value="company">Компанії</option>
            <option value="evaluator">Комісія</option>
          </select>
        </div>
      </div>

      <div class="row">
        <button :disabled="busy" @click="loadStats">Оновити статистику</button>
        <button :disabled="busy" @click="runPrCheck">PR readiness check</button>
      </div>
      <div class="row">
        <button v-for="fmt in formats" :key="fmt" :disabled="busy" @click="exportReport(fmt)">
          Експорт {{ fmt.toUpperCase() }}
        </button>
      </div>
    </article>

    <article v-if="stats" class="card">
      <h3>Зведена статистика</h3>
      <div class="stats">
        <div v-for="(value, key) in stats" :key="key" class="stat">
          <p class="hint">{{ key }}</p>
          <strong>{{ value }}</strong>
        </div>
      </div>
    </article>

    <article v-if="checks?.checks?.length" class="card">
      <h3>PR Readiness</h3>
      <p>
        Загальний результат:
        <strong>{{ checks.allPassed ? 'PASSED' : 'NOT PASSED' }}</strong>
      </p>
      <div v-for="item in checks.checks" :key="item.name" class="check">
        <strong>{{ item.passed ? 'PASS' : 'FAIL' }} — {{ item.name }}</strong>
        <p class="hint">{{ item.message }}</p>
      </div>
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

.grid {
  display: grid;
  gap: 0.75rem;
  grid-template-columns: repeat(2, minmax(0, 1fr));
}

.label {
  display: block;
  font-size: 0.82rem;
  color: #64748b;
  margin-bottom: 0.2rem;
}

input,
select {
  width: 100%;
  border-radius: 10px;
  border: 1px solid #cbd5e1;
  padding: 0.55rem 0.65rem;
}

.row {
  margin-top: 0.75rem;
  display: flex;
  gap: 0.6rem;
  flex-wrap: wrap;
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

.stats {
  display: grid;
  gap: 0.7rem;
  grid-template-columns: repeat(3, minmax(0, 1fr));
}

.stat {
  border: 1px solid rgba(148, 163, 184, 0.35);
  border-radius: 10px;
  padding: 0.65rem;
}

.check {
  border: 1px solid rgba(148, 163, 184, 0.35);
  border-radius: 10px;
  padding: 0.6rem;
  margin-top: 0.55rem;
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
  .grid,
  .stats {
    grid-template-columns: 1fr;
  }
}
</style>
