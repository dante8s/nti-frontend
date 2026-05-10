<template>
  <div class="page">
    <div class="back">
      <router-link to="/programs/a">
        ← Назад до програми А
      </router-link>
    </div>

    <div class="form-box">
      <h1>Заявка — Програма А</h1>
      <p class="subtitle">
        Грантовий інкубаційний програм
      </p>

      <div v-if="callInfo" class="call-info">
        <span class="call-label">Виклик:</span>
        <strong>{{ callInfo.title }}</strong>
        <span class="deadline">
          Дедлайн: {{ formatDate(callInfo.deadline) }}
        </span>
      </div>

      <div v-if="gateError" class="error gate-error">
        {{ gateError }}
        <router-link v-if="gateNeedsTeamLink" class="gate-link" to="/app/teams">
          Перейти до «Моя команда»
        </router-link>
      </div>

      <div v-else-if="applyModeIndividual" class="mode-ok mode-ok--solo">
        <strong>Індивідуальна подача.</strong>
        Спочатку заповніть опис проєкту, потім завантажте обов’язкові документи.
      </div>

      <div v-else-if="applyModeTeam" class="mode-ok mode-ok--team">
        <strong>Подача від команди.</strong>
        Після перевірки складу — завантажте документи та відправте заявку.
      </div>

      <div v-if="bootError" class="error">
        {{ bootError }}
      </div>

      <div v-if="error" class="error">{{ error }}</div>

      <div v-if="success" class="success">
        <h3>Заявку відправлено</h3>
        <p>Статус можна відстежувати в «Мої заявки».</p>
        <router-link to="/app/my-applications">
          Перейти до моїх заявок
        </router-link>
      </div>

      <div v-else-if="!gateBlocking && applicationId && !bootError" class="wizard">
        <!-- Крок 1: анкета -->
        <section v-show="wizard === 'details'" class="step">
          <template v-if="applyModeIndividual">
            <div class="field">
              <label>Назва проєкту *</label>
              <input
                v-model="form.projectName"
                type="text"
                required
                placeholder="Назва ідеї / проєкту"
              >
            </div>
            <div class="field">
              <label>Короткий опис *</label>
              <textarea
                v-model="form.description"
                rows="4"
                required
                placeholder="Ідея, проблема, цінність"
              />
            </div>
            <div class="field">
              <label>Тематична категорія *</label>
              <select v-model="form.category" required>
                <option value="">
                  Оберіть категорію
                </option>
                <option value="software">
                  Розробка ПЗ
                </option>
                <option value="ai">
                  AI та дані
                </option>
                <option value="web">
                  Веб та мобільні застосунки
                </option>
                <option value="game">
                  Ігри та медіа
                </option>
                <option value="iot">
                  IoT / embedded
                </option>
              </select>
            </div>
            <div class="field">
              <label>Технологічний стек *</label>
              <input
                v-model="form.techStack"
                type="text"
                required
                placeholder="Наприклад: Vue, Spring, PostgreSQL…"
              >
            </div>
            <div class="field">
              <label>Склад команди *</label>
              <textarea
                v-model="form.teamComposition"
                rows="3"
                required
                placeholder="Ролі, досвід, як працюєте разом"
              />
            </div>
          </template>

          <template v-else>
            <div class="field field--readonly">
              <label>Назва команди</label>
              <input
                type="text"
                :value="teamRow?.name || '—'"
                readonly
                class="readonly-input"
              >
            </div>
            <TeamApplicationRoster
              v-if="teamRow?.members?.length"
              :members="teamRow.members"
            />
          </template>

          <div class="actions">
            <button
              type="button"
              class="btn-primary"
              :disabled="saving || !canSaveDetails"
              @click="saveDetailsAndGoDocs"
            >
              {{ saving ? 'Збереження…' : 'Зберегти і перейти до документів' }}
            </button>
          </div>
        </section>

        <!-- Крок 2: документи -->
        <section v-show="wizard === 'documents'" class="step step--docs">
          <div class="saved-bar">
            <span class="saved-ok">✓ Інформація збережена</span>
            <span class="saved-meta">{{ form.projectName || teamRow?.name || 'Чернетка' }}</span>
            <button type="button" class="linkish" @click="wizard = 'details'">
              Редагувати дані ↵
            </button>
          </div>

          <div class="docs-head">
            <h2 class="docs-title">
              Обов'язкові документи
            </h2>
            <span class="docs-count">{{ uploadedCount }}/{{ requiredDocs.length }} завантажено</span>
          </div>

          <p class="docs-hint">
            Завантажте всі обов'язкові документи щоб відправити заявку. Допускаються лише PDF або DOCX (до 10 МБ).
          </p>

          <ul class="doc-list">
            <li
              v-for="doc in docRows"
              :key="doc.documentType"
              class="doc-row"
            >
              <span class="doc-icon" :class="{ done: doc.uploaded }">{{ doc.uploaded ? '✓' : '' }}</span>
              <div class="doc-body">
                <div class="doc-title-line">
                  <span class="doc-name">{{ doc.label }}</span>
                  <span class="pill">Обов'язково</span>
                </div>
                <p class="doc-desc">
                  {{ doc.description }}
                </p>
                <p v-if="doc.fileName" class="doc-file">
                  {{ doc.fileName }}
                </p>
              </div>
              <label class="upload-btn">
                <input
                  type="file"
                  accept=".pdf,.doc,.docx,application/pdf,application/vnd.openxmlformats-officedocument.wordprocessingml.document"
                  class="sr-only"
                  :disabled="!!uploadingType"
                  @change="onPickFile(doc.documentType, $event)"
                >
                <span>{{ doc.uploaded ? '↻ Замінити' : '↑ Завантажити' }}</span>
              </label>
            </li>
          </ul>

          <div v-if="submitError" class="error submit-err">
            {{ submitError }}
          </div>

          <div class="actions actions--split">
            <button
              type="button"
              class="btn-secondary"
              :disabled="saving"
              @click="saveDraftQuiet"
            >
              Зберегти як чернетку
            </button>
            <button
              type="button"
              class="btn-success"
              :disabled="saving || !allDocsUploaded || !['DRAFT', 'NEEDS_REVISION'].includes(applicationStatus)"
              @click="submitApplication"
            >
              {{ saving ? 'Відправка…' : 'Відправити заявку' }}
            </button>
          </div>

          <section v-if="auditEvents.length" class="history">
            <h3 class="history-title">
              Історія заявки
            </h3>
            <ul class="history-list">
              <li v-for="ev in auditEvents" :key="ev.id" class="history-item">
                <span class="history-dot" />
                <div>
                  <strong>{{ ev.description || ev.action }}</strong>
                  <div class="history-meta">
                    {{ formatDateTime(ev.createdAt) }}
                    <span v-if="ev.actorName">· {{ ev.actorName }}</span>
                  </div>
                </div>
              </li>
            </ul>
          </section>
        </section>
      </div>
    </div>
  </div>
</template>

<script setup>
import { computed, onMounted, reactive, ref, watch } from 'vue'
import { useRoute } from 'vue-router'
import { programsApi } from '@/api/programs'
import { applicationsApi } from '@/api/applications'
import { auditApi } from '@/api/audit'
import { useAuthStore } from '@/stores/auth'
import { resolveTeamLeaderApply } from '@/composables/teamApplyGate'
import TeamApplicationRoster from '@/components/team/TeamApplicationRoster.vue'

const route = useRoute()
const auth = useAuthStore()
const callId = Number(route.params.callId)

const callInfo = ref(null)
const applicationId = ref(null)
const applicationStatus = ref('DRAFT')
const bootError = ref('')
const saving = ref(false)
const error = ref('')
const success = ref(false)
const submitError = ref('')
const gateError = ref('')
const gateNeedsTeamLink = ref(false)
const teamRow = ref(null)
const teamGateOk = ref(false)
const isSuperAdmin = ref(false)

const wizard = ref('details')
const uploadingType = ref('')

const docRows = ref([])

const auditEvents = ref([])

const applyModeTeam = computed(() => route.query.applyMode === 'team')
const applyModeIndividual = computed(() => route.query.applyMode !== 'team')

const gateBlocking = computed(
  () => !!gateError.value || (applyModeTeam.value && !teamGateOk.value),
)

/** Типи та підписи як у DocumentRequirements (програма A). */
const requiredDocs = [
  {
    type: 'RESUME_A',
    label: 'Резюме',
    description: 'Короткий опис проблеми, рішення, ринку та переваг',
  },
  {
    type: 'TECHNICAL_ARCH',
    label: 'Технічна архітектура',
    description: 'Опис рішення, технологій, модулів і роботи',
  },
  {
    type: 'ROADMAP',
    label: 'Дорожня карта',
    description: 'Віхи, дорожня карта та хронологія',
  },
  {
    type: 'BUDGET',
    label: 'Бюджет',
    description: 'План розподілу грантів та очікувані витрати',
  },
  {
    type: 'RISK_ANALYSIS',
    label: 'Аналіз ризиків',
    description: 'Виявлення ризиків, впливів і заходів пом\'якшення',
  },
  {
    type: 'MONETIZATION',
    label: 'Модель монетизації',
    description: 'Спосіб створити цінність продукту та дохід',
  },
]

const form = reactive({
  projectName: '',
  description: '',
  category: '',
  techStack: '',
  teamComposition: '',
})

const canSaveDetails = computed(() => {
  if (applyModeTeam.value) {
    return !!teamRow.value?.id
  }
  return Boolean(
    form.projectName.trim()
      && form.description.trim()
      && form.category
      && form.techStack.trim()
      && form.teamComposition.trim(),
  )
})

const uploadedCount = computed(
  () => docRows.value.filter((r) => r.uploaded).length,
)

const allDocsUploaded = computed(
  () => uploadedCount.value === requiredDocs.length,
)

function buildFormPayload() {
  return {
    version: 1,
    applyMode: applyModeTeam.value ? 'team' : 'individual',
    teamId: teamRow.value?.id ?? null,
    teamNameSnapshot: applyModeTeam.value ? (teamRow.value?.name || '') : '',
    projectName: applyModeIndividual.value ? form.projectName : (teamRow.value?.name || ''),
    description: applyModeIndividual.value ? form.description : '',
    category: applyModeIndividual.value ? form.category : '',
    techStack: applyModeIndividual.value ? form.techStack : '',
    teamComposition: applyModeIndividual.value ? form.teamComposition : '',
  }
}

function applyFormFromJson(raw) {
  if (!raw) return
  try {
    const o = typeof raw === 'string' ? JSON.parse(raw) : raw
    if (o.projectName) form.projectName = o.projectName
    if (o.description) form.description = o.description
    if (o.category) form.category = o.category
    if (o.techStack) form.techStack = o.techStack
    if (o.teamComposition) form.teamComposition = o.teamComposition
    if (o.teamDescription && !form.teamComposition) form.teamComposition = o.teamDescription
  } catch {
    /* ignore */
  }
}

function detailsLookComplete() {
  if (applyModeTeam.value) return true
  return canSaveDetails.value
}

async function refreshDocStatus() {
  if (!applicationId.value) return
  const res = await applicationsApi.getDocumentStatus(applicationId.value)
  const rows = res.data || []
  const map = new Map(rows.map((r) => [r.documentType, r]))
  docRows.value = requiredDocs.map((d) => {
    const s = map.get(d.type)
    return {
      documentType: d.type,
      label: d.label,
      description: d.description,
      uploaded: s?.uploaded || false,
      fileName: s?.fileName || null,
    }
  })
}

async function refreshAudit() {
  if (!applicationId.value) return
  try {
    const res = await auditApi.getForApplication(applicationId.value)
    auditEvents.value = (res.data || []).slice().reverse()
  } catch {
    auditEvents.value = []
  }
}

async function ensureApplication() {
  bootError.value = ''
  try {
    const res = await applicationsApi.getMyByCall(callId)
    applicationId.value = res.data.id
    applicationStatus.value = res.data.status || 'DRAFT'
    applyFormFromJson(res.data.formData)
    if (detailsLookComplete() || route.query.step === 'docs') {
      wizard.value = 'documents'
    }
  } catch (e) {
    if (e?.response?.status === 404) {
      const created = await applicationsApi.create({ callId })
      applicationId.value = created.data.id
      applicationStatus.value = created.data.status || 'DRAFT'
    } else {
      bootError.value = e?.response?.data?.message || 'Не вдалося завантажити заявку'
    }
  }
}

async function saveDetailsAndGoDocs() {
  error.value = ''
  if (!canSaveDetails.value) {
    error.value = 'Заповніть усі обов’язкові поля.'
    return
  }
  saving.value = true
  try {
    const fd = JSON.stringify(buildFormPayload())
    await applicationsApi.update(applicationId.value, fd)
    wizard.value = 'documents'
    await refreshDocStatus()
    await refreshAudit()
  } catch (e) {
    error.value = e?.response?.data?.message || e?.response?.data || 'Не вдалося зберегти'
  } finally {
    saving.value = false
  }
}

async function saveDraftQuiet() {
  error.value = ''
  saving.value = true
  try {
    const fd = JSON.stringify(buildFormPayload())
    await applicationsApi.update(applicationId.value, fd)
    await refreshAudit()
  } catch (e) {
    error.value = e?.response?.data?.message || 'Не вдалося зберегти чернетку'
  } finally {
    saving.value = false
  }
}

async function onPickFile(documentType, event) {
  const file = event.target.files?.[0]
  event.target.value = ''
  if (!file) return
  submitError.value = ''
  uploadingType.value = documentType
  try {
    await applicationsApi.uploadDocument(applicationId.value, documentType, file)
    await refreshDocStatus()
    await refreshAudit()
  } catch (e) {
    submitError.value = e?.response?.data?.message
      || (typeof e?.response?.data === 'string' ? e.response.data : null)
      || 'Помилка завантаження (лише PDF або DOCX, до 10 МБ)'
  } finally {
    uploadingType.value = ''
  }
}

async function submitApplication() {
  submitError.value = ''
  saving.value = true
  try {
    await applicationsApi.submit(applicationId.value)
    success.value = true
  } catch (e) {
    const d = e?.response?.data
    submitError.value = typeof d === 'string' ? d : (d?.message || 'Не вдалося відправити заявку')
  } finally {
    saving.value = false
  }
}

onMounted(async () => {
  gateError.value = ''
  gateNeedsTeamLink.value = false
  isSuperAdmin.value = (auth.user?.roles || []).includes('SUPER_ADMIN')

  try {
    const res = await programsApi.getCall(callId)
    callInfo.value = res.data
  } catch (e) {
    console.error(e)
    bootError.value = 'Не вдалося завантажити виклик'
    return
  }

  if (applyModeTeam.value) {
    const result = await resolveTeamLeaderApply(auth.user?.id)
    if (result.ok) {
      teamGateOk.value = true
      teamRow.value = result.team
    } else if (isSuperAdmin.value) {
      teamGateOk.value = true
      teamRow.value = { id: null, name: '(тест ADMIN/SUPER_ADMIN)', members: [] }
    } else {
      gateError.value = result.message
      gateNeedsTeamLink.value = result.reason === 'no_team'
      teamGateOk.value = false
      teamRow.value = result.team || null
      return
    }
  } else {
    teamGateOk.value = true
  }

  await ensureApplication()
  if (applicationId.value && !bootError.value) {
    await refreshDocStatus()
    await refreshAudit()
  }
})

watch(wizard, async (w) => {
  if (w === 'documents' && applicationId.value) {
    await refreshDocStatus()
  }
})

function formatDate(date) {
  return new Date(date).toLocaleDateString('uk-UA', {
    day: 'numeric',
    month: 'long',
    year: 'numeric',
  })
}

function formatDateTime(iso) {
  if (!iso) return ''
  return new Date(iso).toLocaleString('uk-UA', {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  })
}
</script>

<style scoped>
.page {
  max-width: 720px;
  margin: 0 auto;
  padding: 2rem;
}

.back {
  margin-bottom: 1.25rem;
}

.back a {
  color: #4f46e5;
  text-decoration: none;
  font-weight: 600;
}

.form-box {
  background: #fff;
  border: 1px solid #e5e7eb;
  border-radius: 16px;
  padding: 2rem;
  box-shadow: 0 8px 30px rgba(15, 23, 42, 0.06);
}

h1 {
  font-size: 1.55rem;
  margin: 0 0 0.25rem;
}

.subtitle {
  color: #64748b;
  margin: 0 0 1.25rem;
}

.call-info {
  background: #f0f9ff;
  border: 1px solid #bae6fd;
  border-radius: 10px;
  padding: 10px 14px;
  margin-bottom: 1.25rem;
  display: flex;
  align-items: center;
  gap: 8px;
  flex-wrap: wrap;
}

.call-label {
  font-size: 0.875rem;
  color: #0369a1;
}

.deadline {
  margin-left: auto;
  font-size: 0.85rem;
  color: #ef4444;
  font-weight: 600;
}

.mode-ok {
  padding: 0.65rem 0.85rem;
  border-radius: 10px;
  margin-bottom: 1rem;
  font-size: 0.875rem;
  line-height: 1.45;
}

.mode-ok--solo {
  background: #f0fdf4;
  border: 1px solid #86efac;
  color: #166534;
}

.mode-ok--team {
  background: #eff6ff;
  border: 1px solid #bfdbfe;
  color: #1e3a8a;
}

.field {
  margin-bottom: 1rem;
}

.field--readonly label {
  color: #64748b;
}

.readonly-input {
  background: #f8fafc;
  cursor: default;
}

label {
  display: block;
  font-size: 0.875rem;
  margin-bottom: 0.35rem;
  color: #334155;
  font-weight: 600;
}

input,
select,
textarea {
  width: 100%;
  padding: 10px 12px;
  border: 1px solid #d1d5db;
  border-radius: 10px;
  font-size: 0.95rem;
  box-sizing: border-box;
  font-family: inherit;
}

input:focus,
select:focus,
textarea:focus {
  outline: none;
  border-color: #4f46e5;
  box-shadow: 0 0 0 2px rgba(79, 70, 229, 0.15);
}

textarea {
  resize: vertical;
}

.saved-bar {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  gap: 0.5rem 1rem;
  padding: 0.65rem 0.85rem;
  background: #f0fdf4;
  border: 1px solid #bbf7d0;
  border-radius: 10px;
  margin-bottom: 1.25rem;
  font-size: 0.9rem;
}

.saved-ok {
  color: #166534;
  font-weight: 700;
}

.saved-meta {
  color: #475569;
  font-weight: 600;
}

.linkish {
  margin-left: auto;
  border: none;
  background: none;
  color: #4f46e5;
  font-weight: 600;
  cursor: pointer;
  text-decoration: underline;
}

.docs-head {
  display: flex;
  align-items: baseline;
  justify-content: space-between;
  gap: 1rem;
  margin-bottom: 0.5rem;
}

.docs-title {
  margin: 0;
  font-size: 1.1rem;
}

.docs-count {
  font-size: 0.85rem;
  color: #64748b;
  font-weight: 600;
}

.docs-hint {
  margin: 0 0 1rem;
  font-size: 0.85rem;
  color: #64748b;
}

.doc-list {
  list-style: none;
  margin: 0;
  padding: 0;
  border: 1px solid #e2e8f0;
  border-radius: 12px;
  overflow: hidden;
}

.doc-row {
  display: grid;
  grid-template-columns: 2.25rem 1fr auto;
  gap: 0.65rem 1rem;
  align-items: start;
  padding: 0.85rem 1rem;
  border-bottom: 1px solid #e2e8f0;
  background: #fff;
}

.doc-row:last-child {
  border-bottom: none;
}

.doc-icon {
  width: 1.5rem;
  height: 1.5rem;
  border-radius: 999px;
  border: 2px solid #cbd5e1;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 0.75rem;
  color: #16a34a;
  flex-shrink: 0;
}

.doc-icon.done {
  border-color: #22c55e;
  background: #dcfce7;
}

.doc-title-line {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  gap: 0.4rem 0.6rem;
}

.doc-name {
  font-weight: 700;
  color: #0f172a;
}

.pill {
  font-size: 0.68rem;
  font-weight: 700;
  text-transform: uppercase;
  letter-spacing: 0.02em;
  color: #b91c1c;
  background: #fee2e2;
  padding: 0.12rem 0.45rem;
  border-radius: 6px;
}

.doc-desc {
  margin: 0.25rem 0 0;
  font-size: 0.82rem;
  color: #64748b;
  line-height: 1.4;
}

.doc-file {
  margin: 0.35rem 0 0;
  font-size: 0.8rem;
  color: #475569;
}

.upload-btn {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  padding: 0.4rem 0.75rem;
  border-radius: 999px;
  background: #4f46e5;
  color: #fff;
  font-size: 0.8rem;
  font-weight: 700;
  cursor: pointer;
  flex-shrink: 0;
  border: none;
}

.upload-btn:hover {
  background: #4338ca;
}

.sr-only {
  position: absolute;
  width: 1px;
  height: 1px;
  padding: 0;
  margin: -1px;
  overflow: hidden;
  clip: rect(0, 0, 0, 0);
  border: 0;
}

.actions {
  margin-top: 1.5rem;
}

.actions--split {
  display: flex;
  flex-wrap: wrap;
  gap: 0.75rem;
}

.btn-primary {
  width: 100%;
  padding: 12px;
  background: #4f46e5;
  color: #fff;
  border: none;
  border-radius: 10px;
  font-size: 1rem;
  font-weight: 700;
  cursor: pointer;
}

.btn-primary:disabled {
  opacity: 0.55;
  cursor: not-allowed;
}

.btn-secondary {
  flex: 1;
  min-width: 160px;
  padding: 12px;
  background: #f1f5f9;
  color: #334155;
  border: 1px solid #cbd5e1;
  border-radius: 10px;
  font-weight: 700;
  cursor: pointer;
}

.btn-success {
  flex: 1;
  min-width: 180px;
  padding: 12px;
  background: #16a34a;
  color: #fff;
  border: none;
  border-radius: 10px;
  font-weight: 700;
  cursor: pointer;
}

.btn-success:disabled {
  opacity: 0.5;
  cursor: not-allowed;
}

.submit-err {
  margin-top: 1rem;
}

.error {
  background: #fee2e2;
  color: #b91c1c;
  padding: 10px 12px;
  border-radius: 10px;
  margin-bottom: 1rem;
  font-size: 0.875rem;
}

.gate-error {
  line-height: 1.45;
}

.gate-link {
  display: inline-block;
  margin-top: 0.4rem;
  font-weight: 700;
  color: #4338ca;
}

.success {
  background: #f0fdf4;
  border: 1px solid #86efac;
  border-radius: 10px;
  padding: 1.25rem;
  text-align: center;
}

.success h3 {
  color: #166534;
  margin-bottom: 0.5rem;
}

.success a {
  color: #4f46e5;
  font-weight: 700;
}

.history {
  margin-top: 2rem;
  padding-top: 1.25rem;
  border-top: 1px solid #e2e8f0;
}

.history-title {
  margin: 0 0 0.75rem;
  font-size: 1rem;
}

.history-list {
  list-style: none;
  margin: 0;
  padding: 0;
}

.history-item {
  display: flex;
  gap: 0.65rem;
  padding: 0.5rem 0;
  border-bottom: 1px dashed #e2e8f0;
  font-size: 0.88rem;
}

.history-dot {
  width: 8px;
  height: 8px;
  border-radius: 50%;
  background: #6366f1;
  margin-top: 0.35rem;
  flex-shrink: 0;
}

.history-meta {
  font-size: 0.78rem;
  color: #64748b;
  margin-top: 0.15rem;
}
</style>
