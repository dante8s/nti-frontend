<script setup>
import { computed, onMounted, ref } from 'vue'
import { RouterLink } from 'vue-router'
import { reportingApi } from '@/api/reporting'
import { useAuthStore } from '@/stores/auth'

const auth = useAuthStore()
const roles = computed(() => auth.roles || [])

const canExportApplications = computed(() =>
  roles.value.some((x) => ['SUPER_EVALUATOR', 'ADMIN', 'SUPER_ADMIN', 'EVALUATOR'].includes(x)),
)
const canExportEvaluationExcel = computed(() =>
  roles.value.some((x) => ['SUPER_EVALUATOR', 'ADMIN', 'SUPER_ADMIN'].includes(x)),
)

const callId = ref('')
const evalCallId = ref('')
const program = ref('')
const status = ref('')
const role = ref('')
const adminStats = ref(null)
const message = ref('')
const busy = ref(false)

const formats = ['csv', 'xlsx', 'pdf', 'docx']

function buildExportParams() {
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

async function loadAdminStats() {
  busy.value = true
  try {
    const res = await reportingApi.getStats()
    adminStats.value = res.data
    message.value = 'Адміністративну статистику оновлено.'
  } catch {
    message.value = 'Не вдалося завантажити адміністративну статистику.'
  } finally {
    busy.value = false
  }
}

async function exportApplications(format) {
  busy.value = true
  try {
    const params = buildExportParams()
    const res = await reportingApi.exportApplications(params, format)
    const blob = res.data
    const suffix = `${role.value || 'all'}_${program.value || 'all'}_${status.value || 'all'}`
    downloadBlob(blob, `nti_zvit_zayavky_${suffix}.${format}`)
    message.value = `Файл ${format.toUpperCase()} згенеровано.`
  } catch {
    message.value = `Не вдалося створити експорт ${format.toUpperCase()}.`
  } finally {
    busy.value = false
  }
}

async function exportEvaluationExcel() {
  if (!evalCallId.value) {
    message.value = 'Вкажіть ID виклику для Excel оцінювання.'
    return
  }
  busy.value = true
  try {
    const res = await reportingApi.exportEvaluationWorkbook(Number(evalCallId.value))
    downloadBlob(res.data, `evaluation_report_call_${evalCallId.value}.xlsx`)
    message.value = 'Excel-звіт оцінювання завантажено.'
  } catch {
    message.value = 'Не вдалося згенерувати Excel оцінювання.'
  } finally {
    busy.value = false
  }
}

onMounted(() => {
  loadAdminStats()
})
</script>

<template>
  <div class="panel">
    <article class="card card--panels">
      <h3>Перегляд панелей</h3>
      <p class="hint">
        Статуси, строки та обов’язкові задачі (студент / команда); завдання, бюджети та команди (компанія) — у
        окремих екранах. Дані API для поточного користувача.
      </p>
      <div class="panel-actions">
        <RouterLink class="panel-btn" :to="{ name: 'reporting-student' }">
          Панель студента / команди
        </RouterLink>
        <RouterLink class="panel-btn panel-btn--secondary" :to="{ name: 'reporting-firm' }">
          Панель компанії
        </RouterLink>
      </div>
    </article>

    <article class="card">
      <h3>Фільтри експорту заявок</h3>
      <div class="grid">
        <div>
          <label class="label">ID виклику</label>
          <input v-model="callId" type="number" min="1" placeholder="Напр. 1" />
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
          <label class="label">Статус заявки</label>
          <select v-model="status">
            <option value="">Усі</option>
            <option value="DRAFT">Чернетка</option>
            <option value="SUBMITTED">Подано</option>
            <option value="IN_REVIEW">На оцінюванні</option>
            <option value="NEEDS_REVISION">Потрібні правки</option>
            <option value="APPROVED">Схвалено</option>
            <option value="REJECTED">Відхилено</option>
          </select>
        </div>
        <div>
          <label class="label">Роль заявника (фільтр)</label>
          <select v-model="role">
            <option value="">Усі</option>
            <option value="student">Студенти</option>
            <option value="company">Компанії (FIRM)</option>
            <option value="evaluator">Комісія</option>
          </select>
        </div>
      </div>

      <div class="row">
        <button type="button" :disabled="busy" @click="loadAdminStats">Оновити зведення</button>
      </div>

      <p v-if="!canExportApplications" class="hint">
        Експорт файлів заявок доступний ролям комісії та адміністраторам.
      </p>
      <div v-else class="row">
        <button
          v-for="fmt in formats"
          :key="fmt"
          type="button"
          :disabled="busy"
          @click="exportApplications(fmt)"
        >
          Експорт {{ fmt.toUpperCase() }}
        </button>
      </div>
    </article>

    <article v-if="canExportEvaluationExcel" class="card">
      <h3>Звіт оцінювання (Excel по виклику)</h3>
      <p class="hint">Окремий файл з критеріями та середніми балами — як у комісії.</p>
      <div class="row tight">
        <input
          v-model="evalCallId"
          type="number"
          min="1"
          class="narrow"
          placeholder="ID виклику"
        />
        <button type="button" :disabled="busy" @click="exportEvaluationExcel">
          Завантажити evaluation_report.xlsx
        </button>
      </div>
    </article>

    <article v-if="adminStats" class="card">
      <h3>Панель адміністрування</h3>
      <p class="hint">
        Активні виклики, обсяги заявок за статусами, партнери (організації), профілі та команди.
      </p>
      <div class="stats">
        <div v-for="(value, key) in adminStats" :key="key" class="stat">
          <p class="hint">{{ key }}</p>
          <strong>{{ value ?? '—' }}</strong>
        </div>
      </div>
    </article>

    <p v-if="message" class="message info">{{ message }}</p>
  </div>
</template>

<style scoped>
.panel {
  display: flex;
  flex-direction: column;
  gap: 1rem;
}

.card--panels .panel-actions {
  display: flex;
  flex-wrap: wrap;
  gap: 0.65rem;
  margin-top: 0.65rem;
}

.panel-btn {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  padding: 0.55rem 1.1rem;
  border-radius: 12px;
  font-weight: 700;
  text-decoration: none;
  background: #4f46e5;
  color: #fff;
  border: 2px solid #4f46e5;
}

.panel-btn:hover {
  background: #4338ca;
  border-color: #4338ca;
}

.panel-btn--secondary {
  background: #fff;
  color: #4f46e5;
}

.panel-btn--secondary:hover {
  background: #eef2ff;
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

input.narrow {
  max-width: 11rem;
}

.row {
  margin-top: 0.75rem;
  display: flex;
  gap: 0.6rem;
  flex-wrap: wrap;
  align-items: center;
}

.row.tight {
  margin-top: 0.5rem;
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
