<template>
  <div class="page">
    <div class="back">
      <router-link to="/programs/b">
        ← Назад до каталогу програм B
      </router-link>
    </div>

    <div class="form-box">
      <h1>Заявка — Програма B</h1>
      <p class="subtitle">Živá prax — подання через кабінет після профілю та (за потреби) команди.</p>

      <div v-if="callInfo" class="call-info">
        <span class="call-label">Завдання:</span>
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
        Заповніть анкету та обовʼязкові документи програми B.
      </div>

      <div v-if="error" class="error">{{ error }}</div>

      <div v-if="success" class="success">
        <h3>Чернетку збережено</h3>
        <p>Відправка — з «Мої заявки». Файли вказані нижче — для моків/наступної інтеграції з зберіганням.</p>
        <router-link to="/app/my-applications">
          Перейти до моїх заявок
        </router-link>
      </div>

      <form v-if="!success && !gateBlocking" @submit.prevent="handleSubmit">
        <div class="section-title">Команда</div>

        <template v-if="applyModeIndividual">
          <div class="field">
            <label>Склад / ваші ролі *</label>
            <textarea
              v-model="form.teamDescription"
              rows="3"
              placeholder="Хто участь у поданні до програми B"
              required
            />
          </div>
          <div class="field">
            <label>Технічні навички *</label>
            <input
              v-model="form.skills"
              type="text"
              placeholder="Стек технологій"
              required
            />
          </div>

          <div class="section-title" style="margin-top: 1.5rem">
            Пропозиція рішення
          </div>
          <div class="field">
            <label>Як ви вирішите завдання? *</label>
            <textarea
              v-model="form.solution"
              rows="5"
              required
              placeholder="Підхід до задачі..."
            />
          </div>
          <div class="field">
            <label>Очікувані результати *</label>
            <textarea v-model="form.expectedResults" rows="3" required />
          </div>
          <div class="field">
            <label>Мотивація *</label>
            <textarea v-model="form.motivation" rows="3" required />
          </div>
        </template>

        <template v-else>
          <div class="field field--readonly">
            <label>Назва команди</label>
            <input type="text" class="readonly-input" :value="teamRow?.name || '—'" readonly>
          </div>
          <TeamApplicationRoster
            v-if="teamRow?.members?.length"
            :members="teamRow.members"
          />
          <p class="muted-hint">
            Режим лідера: обовʼязково лише <strong>CV команди</strong>. Мотиваційний лист і пропозицію рішення можна додати за бажанням до відправки з «Мої заявки» або пізніше за регламентом програми.
          </p>
          <p class="muted-hint storage-hint">
            <strong>Де зберігається CV:</strong>
            файл «CV команди», який ви вибираєте нижче, поки що не зберігається на сервері окремо — він лише передається як частина чернетки заявки.
            Особистий PDF у «Мій профіль» зберігається в записі студентського профілю (БД + файл на диску); переглянути CV товариша можна через «Переглянути профіль» у списку складу.
          </p>
        </template>

        <div class="section-title" style="margin-top: 1.5rem">
          Документи програми B
        </div>
        <p v-if="applyModeTeam" class="muted-hint doc-hint">
          Позначка * — обовʼязкове поле. Інші файли — не обовʼязкові на етапі чернетки для команди.
        </p>
        <div class="field" v-for="doc in programBDocs" :key="doc.type">
          <label>{{ doc.label }}<template v-if="isDocMandatory(doc.type)"> *</template></label>
          <input type="file" accept=".pdf,.doc,.docx" @change="setDoc(doc.type, $event)" />
        </div>

        <div class="actions">
          <button
            type="submit"
            class="btn-success"
            :disabled="loading || !canSubmit"
          >
            {{ loading ? 'Збереження…' : 'Зберегти як чернетку' }}
          </button>
        </div>
      </form>
    </div>
  </div>
</template>

<script setup>
import { computed, onMounted, reactive, ref } from 'vue'
import { useRoute } from 'vue-router'
import { programsApi } from '@/api/programs'
import { applicationsApi } from '@/api/applications'
import { useAuthStore } from '@/stores/auth'
import { resolveTeamLeaderApply } from '@/composables/teamApplyGate'
import TeamApplicationRoster from '@/components/team/TeamApplicationRoster.vue'

const route = useRoute()
const auth = useAuthStore()
const callId = Number(route.params.callId)

const callInfo = ref(null)
const loading = ref(false)
const error = ref('')
const success = ref(false)

const gateError = ref('')
const gateNeedsTeamLink = ref(false)
const teamGateOk = ref(false)
const teamRow = ref(null)
const isSuperAdmin = ref(false)

/** GET /teams/user лише коли є ?applyMode=team (після модалки на ProgramDetail). */
const applyModeTeam = computed(() => route.query.applyMode === 'team')
const applyModeIndividual = computed(() => route.query.applyMode !== 'team')

const gateBlocking = computed(
  () => !!gateError.value || (applyModeTeam.value && !teamGateOk.value),
)

const programBDocs = [
  { type: 'TEAM_CV', label: 'CV команди (PDF)' },
  { type: 'MOTIVATION_LETTER', label: 'Мотиваційний лист (PDF/DOCX)' },
  { type: 'SOLUTION_PROPOSAL', label: 'Пропозиція рішення (PDF/DOCX)' },
]

/** Індивідуально — усі три обовʼязкові; від команди (лідер) — лише TEAM_CV. */
function isDocMandatory(docType) {
  if (applyModeTeam.value) return docType === 'TEAM_CV'
  return true
}

const docs = reactive(
  programBDocs.reduce((acc, item) => {
    acc[item.type] = null
    return acc
  }, {}),
)

const form = reactive({
  teamDescription: '',
  skills: '',
  solution: '',
  expectedResults: '',
  motivation: '',
})

async function loadCall() {
  try {
    const res = await programsApi.getCall(callId)
    callInfo.value = res.data
  } catch (e) {
    console.error(e)
  }
}

onMounted(async () => {
  gateError.value = ''
  gateNeedsTeamLink.value = false
  isSuperAdmin.value = (auth.user?.roles || []).includes('SUPER_ADMIN')

  await loadCall()

  if (!applyModeTeam.value) {
    teamGateOk.value = true
    return
  }

  const result = await resolveTeamLeaderApply(auth.user?.id)
  if (result.ok) {
    teamGateOk.value = true
    teamRow.value = result.team
    return
  }
  if (isSuperAdmin.value) {
    teamGateOk.value = true
    teamRow.value = { id: null, name: '(тест ADMIN/SUPER_ADMIN)' }
    return
  }
  gateError.value = result.message
  gateNeedsTeamLink.value = result.reason === 'no_team'
  teamGateOk.value = false
})

function setDoc(type, event) {
  docs[type] = event.target.files?.[0] || null
}

function buildAttachments() {
  return programBDocs
    .filter((item) => docs[item.type])
    .map((item) => ({
      type: item.type,
      fileName: docs[item.type].name,
      size: docs[item.type].size,
      mimeType: docs[item.type].type || 'application/octet-stream',
    }))
}

const canSubmit = computed(() => {
  if (gateBlocking.value) return false
  const docsOk = programBDocs.every(
    (row) => !isDocMandatory(row.type) || docs[row.type],
  )
  if (!docsOk) return false
  if (applyModeTeam.value) return true
  return Boolean(
    form.teamDescription.trim()
      && form.skills.trim()
      && form.solution.trim()
      && form.expectedResults.trim()
      && form.motivation.trim(),
  )
})

async function handleSubmit() {
  error.value = ''
  if (!canSubmit.value) {
    error.value = 'Заповніть усі обовʼязкові поля або додайте файли.'
    return
  }
  loading.value = true
  try {
    await applicationsApi.create({
      applyMode: applyModeTeam.value ? 'team' : 'individual',
      teamId: teamRow.value?.id ?? null,
      teamNameSnapshot: applyModeTeam.value ? teamRow.value?.name ?? '' : '',
      callId,
      teamDescription:
        applyModeIndividual.value ? form.teamDescription : `Лідер: команда "${teamRow.value?.name ?? ''}"`,
      skills: applyModeIndividual.value ? form.skills : '',
      solution: applyModeIndividual.value ? form.solution : '[team]',
      expectedResults: applyModeIndividual.value ? form.expectedResults : '[team]',
      motivation: applyModeIndividual.value ? form.motivation : '[team]',
      attachments: buildAttachments(),
    })
    success.value = true
  } catch (e) {
    error.value = e?.response?.data?.message || 'Помилка при збереженні'
  } finally {
    loading.value = false
  }
}

function formatDate(date) {
  return new Date(date).toLocaleDateString('uk-UA', {
    day: '2-digit',
    month: 'long',
    year: 'numeric',
  })
}
</script>

<style scoped>
.page {
  max-width: 700px;
  margin: 0 auto;
  padding: 2rem;
}

.back {
  margin-bottom: 1.5rem;
}

.back a {
  color: #059669;
  text-decoration: none;
}

.form-box {
  background: white;
  border: 1px solid #e5e7eb;
  border-radius: 12px;
  padding: 2rem;
}

h1 {
  font-size: 1.5rem;
  margin-bottom: 4px;
}

.subtitle {
  color: #6b7280;
  margin-bottom: 1.5rem;
}

.call-info {
  background: #f0fdf4;
  border: 1px solid #86efac;
  border-radius: 8px;
  padding: 10px 14px;
  margin-bottom: 1.5rem;
  display: flex;
  align-items: center;
  gap: 8px;
  flex-wrap: wrap;
}

.call-label {
  font-size: 0.875rem;
  color: #166534;
}

.deadline {
  margin-left: auto;
  font-size: 0.8rem;
  color: #ef4444;
  font-weight: 500;
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

.section-title {
  font-weight: 600;
  font-size: 0.875rem;
  color: #374151;
  margin-bottom: 0.75rem;
  padding-bottom: 0.5rem;
  border-bottom: 1px solid #f3f4f6;
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
  margin-bottom: 4px;
  color: #374151;
}

input,
textarea {
  width: 100%;
  padding: 10px 12px;
  border: 1px solid #d1d5db;
  border-radius: 8px;
  font-size: 0.9rem;
  box-sizing: border-box;
  font-family: inherit;
}

input:focus,
textarea:focus {
  outline: none;
  border-color: #059669;
}

textarea {
  resize: vertical;
}

.muted-hint {
  font-size: 0.82rem;
  color: #64748b;
  margin: 0 0 1rem;
  line-height: 1.45;
}

.storage-hint {
  margin-top: 0.75rem;
  padding: 0.65rem 0.75rem;
  border-radius: 8px;
  background: #f8fafc;
  border: 1px solid #e2e8f0;
}

.doc-hint {
  margin-top: -0.35rem;
}

.actions {
  margin-top: 1.5rem;
}

.btn-success {
  width: 100%;
  padding: 10px;
  background: #059669;
  color: white;
  border: none;
  border-radius: 8px;
  font-size: 1rem;
  cursor: pointer;
}

.btn-success:disabled {
  opacity: 0.55;
  cursor: not-allowed;
}

.error {
  background: #fee2e2;
  color: #dc2626;
  padding: 10px;
  border-radius: 8px;
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
  color: #047857;
}

.success {
  background: #f0fdf4;
  border: 1px solid #86efac;
  border-radius: 8px;
  padding: 1rem;
  text-align: center;
}

.success h3 {
  color: #166534;
  margin-bottom: 0.5rem;
}

.success p {
  color: #4b7a58;
  margin-bottom: 1rem;
}

.success a {
  color: #059669;
}
</style>
