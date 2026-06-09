<template>
  <div class="reports-page">
    <div class="reports-page__header">
      <div>
        <h1 class="reports-page__title">Звіти завершених проектів</h1>
        <p class="reports-page__sub">Архів результатів, KPI та учасники завершених проектів.</p>
      </div>
      <button class="btn-export-all" :disabled="!reports.length || exportingAll" @click="exportAll">
        {{ exportingAll ? 'Завантаження…' : '⬇ Експорт усіх (CSV)' }}
      </button>
    </div>

    <div v-if="loading" class="reports-page__loading">Завантаження звітів…</div>
    <p v-else-if="error" class="reports-page__error">{{ error }}</p>
    <p v-else-if="!reports.length" class="reports-page__empty">
      Завершених проектів ще немає.
    </p>

    <div v-else class="reports-table-wrap">
      <table class="reports-table">
        <thead>
          <tr>
            <th>#</th>
            <th>Назва проекту</th>
            <th>Програма</th>
            <th>Тімлід</th>
            <th>Product Owner</th>
            <th>Дата завершення</th>
            <th>KPI бал</th>
            <th>Мілстоуни</th>
            <th>Дії</th>
          </tr>
        </thead>
        <tbody>
          <tr v-for="r in reports" :key="r.id">
            <td class="reports-table__id">{{ r.applicationId }}</td>
            <td class="reports-table__name">{{ r.projectName || '—' }}</td>
            <td>
              <span class="badge" :class="r.programType === 'PROGRAM_B' ? 'badge--b' : 'badge--a'">
                {{ r.programType === 'PROGRAM_B' ? 'Програма B' : 'Програма A' }}
              </span>
            </td>
            <td>{{ r.teamLeaderName || '—' }}</td>
            <td>{{ r.productOwnerName || '—' }}</td>
            <td>{{ formatDate(r.completedAt) }}</td>
            <td>
              <span v-if="r.kpiScore != null" class="kpi-score">
                {{ r.kpiScore.toFixed(2) }}
              </span>
              <span v-else class="kpi-empty">не оцінювався</span>
            </td>
            <td>
              <span class="milestones">{{ r.milestonesDone }}/{{ r.milestonesTotal }}</span>
            </td>
            <td class="reports-table__actions">
              <button
                class="btn-details"
                @click="toggleDetails(r.id)"
              >
                {{ expanded === r.id ? 'Сховати' : 'Деталі' }}
              </button>
              <button
                class="btn-export"
                :disabled="exporting[r.id]"
                @click="exportOne(r)"
              >
                {{ exporting[r.id] ? '…' : 'CSV' }}
              </button>
            </td>
          </tr>
          
          <!-- Розгорнутий рядок деталей -->
          <tr v-if="expanded != null" v-for="r in reports.filter(x => x.id === expanded)" :key="'detail-' + r.id">
            <td colspan="9" class="reports-table__detail">
              <div class="detail-grid">
                <div v-if="r.teamMembers" class="detail-block">
                  <div class="detail-block__label">Учасники команди</div>
                  <div class="detail-block__value">{{ r.teamMembers }}</div>
                </div>
                <div v-if="parsedKpi(r)" class="detail-block">
                  <div class="detail-block__label">KPI по критеріях</div>
                  <ul class="kpi-list">
                    <li v-for="(score, name) in parsedKpi(r)" :key="name">
                      <span class="kpi-list__name">{{ name }}</span>
                      <span class="kpi-list__score">{{ Number(score).toFixed(2) }}</span>
                    </li>
                  </ul>
                </div>
                <div v-if="parsedDocs(r).length" class="detail-block">
                  <div class="detail-block__label">Результатні документи</div>
                  <ul class="doc-list">
                    <li v-for="doc in parsedDocs(r)" :key="doc.type">
                      <span class="doc-list__type">{{ doc.type }}</span>
                      <span class="doc-list__name">{{ doc.fileName }}</span>
                    </li>
                  </ul>
                </div>
              </div>
            </td>
          </tr>
        </tbody>
      </table>
    </div>
  </div>
</template>

<script setup>
import { onMounted, reactive, ref } from 'vue'
import { adminApi } from '@/api/admin'

const reports = ref([])
const loading = ref(true)
const error = ref('')
const expanded = ref(null)
const exporting = reactive({})
const exportingAll = ref(false)

onMounted(async () => {
  try {
    const res = await adminApi.getReports()
    reports.value = res.data || []
  } catch (e) {
    error.value = 'Не вдалося завантажити звіти.'
  } finally {
    loading.value = false
  }
})

function toggleDetails(id) {
  expanded.value = expanded.value === id ? null : id
}

function formatDate(dt) {
  if (!dt) return '—'
  return new Date(dt).toLocaleDateString('uk-UA', {
    day: '2-digit', month: '2-digit', year: 'numeric',
    hour: '2-digit', minute: '2-digit',
  })
}

function parsedKpi(r) {
  if (!r.kpiDetails) return null
  try { return JSON.parse(r.kpiDetails) } catch { return null }
}

function parsedDocs(r) {
  if (!r.resultDocuments) return []
  try { return JSON.parse(r.resultDocuments) } catch { return [] }
}

function triggerDownload(blob, filename) {
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = filename
  document.body.appendChild(a)
  a.click()
  a.remove()
  URL.revokeObjectURL(url)
}

async function exportOne(r) {
  exporting[r.id] = true
  try {
    const res = await adminApi.exportReportCsv(r.id)
    triggerDownload(res.data, `report_${r.applicationId}.csv`)
  } finally {
    exporting[r.id] = false
  }
}

async function exportAll() {
  exportingAll.value = true
  try {
    const res = await adminApi.exportAllReportsCsv()
    triggerDownload(res.data, 'all_reports.csv')
  } finally {
    exportingAll.value = false
  }
}
</script>

<style scoped>
.reports-page {
  padding: 1.5rem 2rem;
  max-width: 1200px;
  margin: 0 auto;
}

.reports-page__header {
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  gap: 1rem;
  margin-bottom: 1.5rem;
}

.reports-page__title {
  margin: 0 0 0.25rem;
  font-size: 1.35rem;
  font-weight: 700;
  color: #0f172a;
}

.reports-page__sub {
  margin: 0;
  font-size: 0.85rem;
  color: #64748b;
}

.reports-page__loading,
.reports-page__empty {
  color: #64748b;
  font-size: 0.9rem;
}

.reports-page__error {
  color: #b91c1c;
  font-size: 0.9rem;
}

.btn-export-all {
  flex-shrink: 0;
  padding: 0.5rem 1.1rem;
  border: none;
  border-radius: 8px;
  background: #0ea5e9;
  color: #fff;
  font-weight: 600;
  font-size: 0.85rem;
  cursor: pointer;
  white-space: nowrap;
}

.btn-export-all:disabled {
  opacity: 0.6;
  cursor: not-allowed;
}

.reports-table-wrap {
  overflow-x: auto;
  border-radius: 12px;
  border: 1px solid #e2e8f0;
}

.reports-table {
  width: 100%;
  border-collapse: collapse;
  font-size: 0.85rem;
}

.reports-table th {
  background: #f8fafc;
  padding: 0.65rem 0.85rem;
  text-align: left;
  font-weight: 600;
  color: #475569;
  border-bottom: 1px solid #e2e8f0;
  white-space: nowrap;
}

.reports-table td {
  padding: 0.65rem 0.85rem;
  border-bottom: 1px solid #f1f5f9;
  vertical-align: middle;
}

.reports-table tr:last-child td {
  border-bottom: none;
}

.reports-table__id {
  color: #94a3b8;
  font-size: 0.78rem;
}

.reports-table__name {
  font-weight: 600;
  color: #1e293b;
}

.badge {
  display: inline-block;
  padding: 2px 8px;
  border-radius: 999px;
  font-size: 0.75rem;
  font-weight: 600;
}

.badge--a {
  background: #dbeafe;
  color: #1d4ed8;
}

.badge--b {
  background: #fef3c7;
  color: #b45309;
}

.kpi-score {
  font-weight: 700;
  color: #059669;
}

.kpi-empty {
  color: #94a3b8;
  font-size: 0.78rem;
}

.milestones {
  font-weight: 600;
  color: #334155;
}

.reports-table__actions {
  display: flex;
  gap: 6px;
}

.btn-details {
  padding: 4px 10px;
  border: 1px solid #94a3b8;
  border-radius: 6px;
  background: #fff;
  color: #334155;
  font-size: 0.78rem;
  cursor: pointer;
}

.btn-export {
  padding: 4px 10px;
  border: none;
  border-radius: 6px;
  background: #0ea5e9;
  color: #fff;
  font-size: 0.78rem;
  font-weight: 600;
  cursor: pointer;
}

.btn-export:disabled {
  opacity: 0.6;
  cursor: not-allowed;
}

.reports-table__detail {
  background: #f8fafc;
  padding: 1rem 1.25rem !important;
}

.detail-grid {
  display: flex;
  flex-wrap: wrap;
  gap: 1.5rem;
}

.detail-block__label {
  font-size: 0.75rem;
  font-weight: 600;
  color: #64748b;
  margin-bottom: 0.35rem;
  text-transform: uppercase;
  letter-spacing: 0.04em;
}

.detail-block__value {
  font-size: 0.85rem;
  color: #334155;
}

.kpi-list {
  list-style: none;
  margin: 0;
  padding: 0;
  display: flex;
  flex-direction: column;
  gap: 4px;
}

.kpi-list li {
  display: flex;
  gap: 0.75rem;
  font-size: 0.82rem;
}

.kpi-list__name {
  color: #475569;
}

.kpi-list__score {
  font-weight: 700;
  color: #059669;
}

.doc-list {
  list-style: none;
  margin: 0;
  padding: 0;
  display: flex;
  flex-direction: column;
  gap: 4px;
}

.doc-list li {
  display: flex;
  gap: 0.5rem;
  font-size: 0.82rem;
}

.doc-list__type {
  font-weight: 600;
  color: #0369a1;
  min-width: 80px;
}

.doc-list__name {
  color: #475569;
}
</style>
