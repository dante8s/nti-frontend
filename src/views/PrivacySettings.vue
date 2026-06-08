<script setup>
import { ref } from 'vue'
import { useI18n } from 'vue-i18n'
import { useAuthStore } from '@/stores/auth'
import { useRouter } from 'vue-router'
import { exportMyData, getMyData, deleteMyAccount } from '@/api/gdpr'

const { t } = useI18n()
const auth = useAuthStore()
const router = useRouter()

// ── View data ─────────────────────────────────────────────────────────────────
const myData     = ref(null)
const loading    = ref(false)
const loadError  = ref('')

async function handleView() {
  if (myData.value) { myData.value = null; return }
  loading.value = true
  loadError.value = ''
  try {
    const res = await getMyData()
    myData.value = res.data
  } catch {
    loadError.value = 'Не вдалося завантажити дані. Спробуйте ще раз.'
  } finally {
    loading.value = false
  }
}

// ── Download JSON ─────────────────────────────────────────────────────────────
const exporting   = ref(false)
const exportError = ref('')

async function handleExport() {
  exporting.value = true
  exportError.value = ''
  try {
    const res = await exportMyData()
    const url = URL.createObjectURL(new Blob([res.data], { type: 'application/json' }))
    const a = document.createElement('a')
    a.href = url
    a.download = 'my-data.json'
    a.click()
    URL.revokeObjectURL(url)
  } catch {
    exportError.value = t('gdpr.exportError')
  } finally {
    exporting.value = false
  }
}

// ── Delete account ────────────────────────────────────────────────────────────
const password      = ref('')
const deleting      = ref(false)
const deleteError   = ref('')
const deleteSuccess = ref(false)

async function handleDelete() {
  deleting.value = true
  deleteError.value = ''
  try {
    await deleteMyAccount(password.value)
    deleteSuccess.value = true
    setTimeout(() => { auth.logout(); router.push('/') }, 3000)
  } catch (e) {
    deleteError.value = e.response?.data?.error || t('gdpr.deleteError')
  } finally {
    deleting.value = false
  }
}

// ── Helpers ────────────────────────────────────────────────────────────────────
function fmt(iso) {
  if (!iso) return '—'
  return new Date(iso).toLocaleString('uk-UA', {
    day: '2-digit', month: '2-digit', year: 'numeric',
    hour: '2-digit', minute: '2-digit',
  })
}

const ROLE_LABELS = {
  STUDENT: 'Студент', FIRM: 'Компанія', FIRM_USER: 'Представник фірми',
  MENTOR: 'Ментор', EVALUATOR: 'Комісія', SUPER_EVALUATOR: 'Комісія (рішення)',
  ADMIN: 'Адміністратор', SUPER_ADMIN: 'Супер-адміністратор',
}

const STATUS_LABELS = {
  DRAFT: 'Чернетка', SUBMITTED: 'Подано', FORMALLY_VERIFIED: 'Підтверджено',
  IN_REVIEW: 'На оцінюванні', NEEDS_REVISION: 'Потрібні виправлення',
  APPROVED: 'Схвалено', REJECTED: 'Відхилено', ONBOARDING: 'Онбординг',
  ACTIVE: 'Активний', SUSPENDED: 'Відсторонено', ARCHIVED: 'Архів',
}
</script>

<template>
  <div class="privacy">
    <h2 class="privacy__title">{{ t('gdpr.title') }}</h2>

    <!-- ── Мої дані ── -->
    <section class="privacy__section">
      <h3 class="privacy__section-title">{{ t('gdpr.exportTitle') }}</h3>
      <p class="privacy__desc">{{ t('gdpr.exportDesc') }}</p>

      <div class="privacy__actions">
        <button class="btn btn--primary" :disabled="loading" @click="handleView">
          {{ loading ? 'Завантаження...' : myData ? 'Сховати дані' : 'Переглянути мої дані' }}
        </button>
        <button class="btn btn--outline" :disabled="exporting" @click="handleExport">
          {{ exporting ? 'Збереження...' : 'Зберегти копію (JSON)' }}
        </button>
      </div>
      <p v-if="loadError" class="privacy__error">{{ loadError }}</p>
      <p v-if="exportError" class="privacy__error">{{ exportError }}</p>

      <!-- Дані -->
      <div v-if="myData" class="data-view">

        <!-- Акаунт -->
        <div class="data-block">
          <p class="data-block__title">Акаунт</p>
          <div class="data-rows">
            <div class="data-row"><span class="data-label">Ім'я</span><span>{{ myData.account?.name }}</span></div>
            <div class="data-row"><span class="data-label">Email</span><span>{{ myData.account?.email }}</span></div>
            <div class="data-row">
              <span class="data-label">Ролі</span>
              <span>{{ (myData.account?.roles || []).map(r => ROLE_LABELS[r] || r).join(', ') }}</span>
            </div>
            <div class="data-row"><span class="data-label">Реєстрація</span><span>{{ fmt(myData.account?.createdAt) }}</span></div>
            <div class="data-row"><span class="data-label">Згода GDPR</span><span>{{ fmt(myData.account?.gdprConsentedAt) }}</span></div>
          </div>
        </div>

        <!-- Студентський профіль -->
        <div v-if="myData.studentProfile" class="data-block">
          <p class="data-block__title">Студентський профіль</p>
          <div class="data-rows">
            <div class="data-row"><span class="data-label">Програма навчання</span><span>{{ myData.studentProfile.studyProgram || '—' }}</span></div>
            <div class="data-row"><span class="data-label">Курс</span><span>{{ myData.studentProfile.yearOfStudy || '—' }}</span></div>
            <div class="data-row"><span class="data-label">Навички</span><span>{{ myData.studentProfile.skills || '—' }}</span></div>
            <div class="data-row"><span class="data-label">Про себе</span><span>{{ myData.studentProfile.bio || '—' }}</span></div>
          </div>
        </div>

        <!-- Заявки -->
        <div class="data-block">
          <p class="data-block__title">Заявки ({{ (myData.applications || []).length }})</p>
          <p v-if="!myData.applications?.length" class="data-empty">Заявок немає</p>
          <div v-else class="data-table-wrap">
            <table class="data-table">
              <thead><tr><th>Виклик</th><th>Програма</th><th>Статус</th><th>Дата</th></tr></thead>
              <tbody>
                <tr v-for="a in myData.applications" :key="a.id">
                  <td>{{ a.call }}</td>
                  <td>{{ a.program }}</td>
                  <td>
                    <span class="status-badge" :class="a.status?.toLowerCase()">
                      {{ STATUS_LABELS[a.status] || a.status }}
                    </span>
                  </td>
                  <td class="cell-date">{{ fmt(a.createdAt) }}</td>
                </tr>
              </tbody>
            </table>
          </div>
        </div>

        <!-- Сповіщення -->
        <div class="data-block">
          <p class="data-block__title">Сповіщення ({{ (myData.notifications || []).length }})</p>
          <p v-if="!myData.notifications?.length" class="data-empty">Сповіщень немає</p>
          <div v-else class="data-table-wrap">
            <table class="data-table">
              <thead><tr><th>Тема</th><th>Дата</th></tr></thead>
              <tbody>
                <tr v-for="(n, i) in myData.notifications" :key="i">
                  <td>{{ n.title }}</td>
                  <td class="cell-date">{{ fmt(n.createdAt) }}</td>
                </tr>
              </tbody>
            </table>
          </div>
        </div>

        <!-- Журнал дій -->
        <div class="data-block">
          <p class="data-block__title">Журнал дій ({{ (myData.auditEvents || []).length }})</p>
          <p v-if="!myData.auditEvents?.length" class="data-empty">Дій немає</p>
          <div v-else class="data-table-wrap">
            <table class="data-table">
              <thead><tr><th>Дія</th><th>Об'єкт</th><th>Дата</th></tr></thead>
              <tbody>
                <tr v-for="(e, i) in myData.auditEvents" :key="i">
                  <td>{{ e.action }}</td>
                  <td>{{ e.entity }}</td>
                  <td class="cell-date">{{ fmt(e.createdAt) }}</td>
                </tr>
              </tbody>
            </table>
          </div>
        </div>

        <p class="data-exported-at">Дані актуальні на: {{ fmt(myData.exportedAt) }}</p>
      </div>
    </section>

    <!-- ── Видалення акаунту ── -->
    <section class="privacy__section privacy__section--danger">
      <h3 class="privacy__section-title privacy__section-title--danger">{{ t('gdpr.deleteTitle') }}</h3>
      <p class="privacy__desc">{{ t('gdpr.deleteDesc') }}</p>
      <div class="privacy__warning">{{ t('gdpr.deleteWarning') }}</div>

      <div v-if="!deleteSuccess">
        <div class="privacy__field">
          <label>{{ t('gdpr.passwordLabel') }}</label>
          <input v-model="password" type="password" :placeholder="t('gdpr.passwordPlaceholder')" />
        </div>
        <p v-if="deleteError" class="privacy__error">{{ deleteError }}</p>
        <button class="btn btn--danger" :disabled="deleting || !password" @click="handleDelete">
          {{ deleting ? t('gdpr.deleting') : t('gdpr.deleteBtn') }}
        </button>
      </div>
      <div v-else class="privacy__success">{{ t('gdpr.deleteSuccess') }}</div>
    </section>
  </div>
</template>

<style scoped>
.privacy {
  max-width: 720px;
}

.privacy__title {
  font-size: 1.5rem;
  font-weight: 800;
  margin-bottom: 2rem;
  color: #0f172a;
}

.privacy__section {
  background: white;
  border-radius: 14px;
  padding: 1.5rem;
  margin-bottom: 1.5rem;
  border: 1px solid rgba(79, 70, 229, 0.12);
  box-shadow: 0 1px 4px rgba(15, 23, 42, 0.05);
}

.privacy__section--danger { border-color: rgba(220, 38, 38, 0.2); }

.privacy__section-title {
  font-size: 1.1rem;
  font-weight: 700;
  color: #1e293b;
  margin-bottom: 0.75rem;
}

.privacy__section-title--danger { color: #b91c1c; }

.privacy__desc {
  font-size: 0.9rem;
  color: #475569;
  margin-bottom: 1rem;
  line-height: 1.6;
}

.privacy__actions {
  display: flex;
  gap: 0.75rem;
  flex-wrap: wrap;
  margin-bottom: 0.5rem;
}

.privacy__warning {
  background: #fef3c7;
  border: 1px solid #fcd34d;
  border-radius: 8px;
  padding: 0.75rem 1rem;
  font-size: 0.875rem;
  color: #92400e;
  margin-bottom: 1.25rem;
}

.privacy__field {
  margin-bottom: 1rem;
}

.privacy__field label {
  display: block;
  font-size: 0.875rem;
  color: #475569;
  margin-bottom: 4px;
  font-weight: 600;
}

.privacy__field input {
  width: 100%;
  max-width: 320px;
  padding: 10px 12px;
  border: 1px solid #e2e8f0;
  border-radius: 8px;
  font-size: 0.95rem;
  box-sizing: border-box;
}

.privacy__field input:focus {
  outline: none;
  border-color: #4f46e5;
}

.btn {
  padding: 0.6rem 1.25rem;
  border-radius: 10px;
  font-size: 0.88rem;
  font-weight: 700;
  cursor: pointer;
  border: none;
  transition: background 0.15s, border-color 0.15s;
}

.btn:disabled { opacity: 0.55; cursor: not-allowed; }

.btn--primary { background: #4f46e5; color: white; }
.btn--primary:hover:not(:disabled) { background: #4338ca; }

.btn--outline {
  background: white;
  color: #475569;
  border: 1px solid #cbd5e1;
}
.btn--outline:hover:not(:disabled) { background: #f8fafc; border-color: #94a3b8; }

.btn--danger { background: #dc2626; color: white; }
.btn--danger:hover:not(:disabled) { background: #b91c1c; }

.privacy__error {
  margin-top: 0.65rem;
  font-size: 0.85rem;
  color: #dc2626;
}

.privacy__success {
  background: #ecfdf5;
  border: 1px solid #6ee7b7;
  border-radius: 8px;
  padding: 1rem;
  color: #065f46;
  font-size: 0.9rem;
  font-weight: 600;
}

/* ── Data view ── */
.data-view {
  margin-top: 1.5rem;
  display: flex;
  flex-direction: column;
  gap: 1rem;
}

.data-block {
  border: 1px solid #e2e8f0;
  border-radius: 12px;
  overflow: hidden;
}

.data-block__title {
  margin: 0;
  padding: 0.65rem 1rem;
  background: #f8fafc;
  font-size: 0.8rem;
  font-weight: 700;
  text-transform: uppercase;
  letter-spacing: 0.08em;
  color: #64748b;
  border-bottom: 1px solid #e2e8f0;
}

.data-rows {
  padding: 0.5rem 0;
}

.data-row {
  display: flex;
  gap: 1rem;
  padding: 0.45rem 1rem;
  font-size: 0.9rem;
  color: #1e293b;
  border-bottom: 1px solid #f1f5f9;
}

.data-row:last-child { border-bottom: none; }

.data-label {
  min-width: 160px;
  color: #64748b;
  font-size: 0.85rem;
  flex-shrink: 0;
}

.data-empty {
  margin: 0;
  padding: 0.75rem 1rem;
  font-size: 0.88rem;
  color: #94a3b8;
}

.data-table-wrap {
  overflow-x: auto;
}

.data-table {
  width: 100%;
  border-collapse: collapse;
  font-size: 0.875rem;
}

.data-table th {
  padding: 0.55rem 1rem;
  text-align: left;
  color: #64748b;
  font-weight: 600;
  font-size: 0.8rem;
  border-bottom: 1px solid #e2e8f0;
}

.data-table td {
  padding: 0.55rem 1rem;
  border-bottom: 1px solid #f1f5f9;
  color: #1e293b;
}

.data-table tbody tr:last-child td { border-bottom: none; }

.cell-date {
  color: #94a3b8;
  font-size: 0.8rem;
  white-space: nowrap;
}

.status-badge {
  display: inline-block;
  padding: 2px 8px;
  border-radius: 6px;
  font-size: 0.75rem;
  font-weight: 600;
  background: #f1f5f9;
  color: #475569;
}
.status-badge.approved { background: #dcfce7; color: #166534; }
.status-badge.rejected { background: #fee2e2; color: #991b1b; }
.status-badge.active   { background: #dbeafe; color: #1e40af; }
.status-badge.submitted, .status-badge.in_review { background: #fef9c3; color: #854d0e; }

.data-exported-at {
  font-size: 0.78rem;
  color: #94a3b8;
  text-align: right;
  margin: 0;
}
</style>
