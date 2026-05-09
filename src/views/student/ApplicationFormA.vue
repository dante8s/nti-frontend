<template>
  <div class="page">
    <div class="back">
      <router-link to="/programs/a">
        ← Назад до каталогу програм A
      </router-link>
    </div>

    <div class="form-box">
      <h1>Заявка — Програма A</h1>
      <p class="subtitle">Grantová inkubácia — подання через кабінет після профілю та команди.</p>

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
        Заповніть опис проєкту та вкладіть усі документи згідно програми A.
      </div>

      <div v-if="error" class="error">{{ error }}</div>

      <div v-if="success" class="success">
        <h3>Чернетку збережено</h3>
        <p>Відправка заявки — з розділу «Мої заявки» за регламентом програми.</p>
        <router-link to="/app/my-applications">
          Перейти до моїх заявок
        </router-link>
      </div>

      <form v-if="!success && !gateBlocking" @submit.prevent="handleSubmit">
        <!-- Команда: для individual — текст; для team — лише назва з бекенду -->
        <div class="section-title">Команда / учасники</div>
        <template v-if="applyModeIndividual">
          <div class="field">
            <label>Склад / ролі (як представляєте себе на виклик) *</label>
            <textarea
              v-model="form.teamDescription"
              rows="3"
              placeholder="Якщо подача індивідуальна — опишіть свою участь або майбутній склад партнерів..."
              required
            />
          </div>
        </template>
        <template v-else>
          <div class="field field--readonly">
            <label>Назва команди (з профілю команди)</label>
            <input type="text" :value="teamRow?.name || '—'" readonly class="readonly-input">
          </div>
          <TeamApplicationRoster
            v-if="teamRow?.members?.length"
            :members="teamRow.members"
          />
          <p class="muted-hint storage-hint">
            <strong>Де зберігається CV:</strong>
            особистий PDF із розділу «Мій профіль» записується в таблицю студентських профілів (поля шляху та назви файлу на сервері).
            Його можна відкрити там або у профілі учасника команди кнопкою «Переглянути профіль».
            Файли, які ви додаєте до цієї заявки нижче, поки що йдуть у чернетку як метадані й можуть ще не зберігатися окремими документами в БД — після налаштування збереження їх буде видно в модулі заявок.
          </p>
        </template>

        <!-- Проект: повністю лише для individual -->
        <template v-if="applyModeIndividual">
          <div class="section-title" style="margin-top: 1.5rem">
            Проєкт (програма A)
          </div>
          <div class="field">
            <label>Назва проєкту *</label>
            <input v-model="form.projectName" type="text" required placeholder="Назва ідеї / проєкту" />
          </div>
          <div class="field">
            <label>Короткий опис *</label>
            <textarea v-model="form.description" rows="4" placeholder="Ідея, проблема, цінність" required />
          </div>
          <div class="field">
            <label>Категорія *</label>
            <select v-model="form.category" required>
              <option value="">Оберіть категорію</option>
              <option value="software">ПЗ</option>
              <option value="ai">AI та дані</option>
              <option value="web">Веб</option>
              <option value="game">Геймдев</option>
              <option value="iot">IoT / embedded</option>
            </select>
          </div>
          <div class="field">
            <label>Технологічний стек *</label>
            <input v-model="form.techStack" type="text" required placeholder="Наприклад: Vue, Spring, PostgreSQL…" />
          </div>
          <div class="field">
            <label>Мотивація *</label>
            <textarea v-model="form.motivation" rows="3" placeholder="Чому участь у програмі A" required />
          </div>
        </template>
        <div v-else class="muted-hint">
          Для режиму «від команди» текстові поля анкети не обовʼязкові на цьому кроці; обовʼязкові — додатки нижче.
        </div>

        <div class="section-title" style="margin-top: 1.5rem">
          Обов'язкові документи (програма A)
        </div>
        <div class="field" v-for="doc in requiredDocs" :key="doc.type">
          <label>{{ doc.label }} *</label>
          <input type="file" accept=".pdf,.doc,.docx,.xls,.xlsx" @change="setDoc(doc.type, $event)" />
        </div>

        <div class="actions">
          <button
            type="submit"
            class="btn-primary"
            :disabled="loading || !canSubmit"
          >
            {{ loading ? 'Збереження...' : 'Зберегти як чернетку' }}
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
/** Після перевірки тільки в режимі team */
const teamRow = ref(null)
const teamGateOk = ref(false)
const isSuperAdmin = ref(false)

/** Не робимо GET /api/teams поки режим явно не `team`. */
const applyModeTeam = computed(() => route.query.applyMode === 'team')
const applyModeIndividual = computed(() => route.query.applyMode !== 'team')

const gateBlocking = computed(
  () => !!gateError.value || (applyModeTeam.value && !teamGateOk.value),
)

const requiredDocs = [
  { type: 'EXEC_SUMMARY', label: 'Executive Summary (PDF/DOCX)' },
  { type: 'TECH_ARCH', label: 'Технічна архітектура (PDF/DOCX)' },
  { type: 'ROADMAP', label: 'Roadmap / план етапів (PDF/DOCX)' },
  { type: 'BUDGET', label: 'Бюджет (PDF/XLSX)' },
  { type: 'RISK_ANALYSIS', label: 'Аналіз ризиків (PDF/DOCX)' },
  { type: 'MONETIZATION', label: 'Модель монетизації (PDF/DOCX)' },
]

const docs = reactive(
  requiredDocs.reduce((acc, row) => {
    acc[row.type] = null
    return acc
  }, {}),
)

const form = reactive({
  projectName: '',
  description: '',
  category: '',
  techStack: '',
  teamDescription: '',
  motivation: '',
})

const canSubmit = computed(() => {
  if (gateBlocking.value) return false
  const allDocs = requiredDocs.every((row) => docs[row.type])
  if (!allDocs) return false
  if (applyModeTeam.value) return true
  return Boolean(
    form.projectName.trim()
      && form.description.trim()
      && form.category
      && form.techStack.trim()
      && form.teamDescription.trim()
      && form.motivation.trim(),
  )
})

function setDoc(type, event) {
  docs[type] = event.target.files?.[0] || null
}

function buildAttachments() {
  return requiredDocs
    .filter((item) => docs[item.type])
    .map((item) => ({
      type: item.type,
      fileName: docs[item.type].name,
      size: docs[item.type].size,
      mimeType: docs[item.type].type || 'application/octet-stream',
    }))
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
  }

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
  teamRow.value = result.team || null
})

async function handleSubmit() {
  error.value = ''
  if (!canSubmit.value) {
    error.value =
      applyModeTeam.value
        ? 'Перевірте обовʼязкові файли або доступ лідера.'
        : 'Заповніть усі поля та додайте файли.'
    return
  }
  loading.value = true
  try {
    await applicationsApi.create({
      applyMode: applyModeTeam.value ? 'team' : 'individual',
      teamId: teamRow.value?.id ?? null,
      teamNameSnapshot: applyModeTeam.value ? teamRow.value?.name ?? '' : '',
      callId,
      projectName: applyModeIndividual.value ? form.projectName : teamRow.value?.name || '',
      description: applyModeIndividual.value ? form.description : '[team submission]',
      category: applyModeIndividual.value ? form.category : '',
      techStack: applyModeIndividual.value ? form.techStack : '',
      teamDescription:
        applyModeIndividual.value ? form.teamDescription : `Team #${teamRow.value?.id} — лідер подає від команди`,
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
  color: #4f46e5;
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
  background: #f0f9ff;
  border: 1px solid #bae6fd;
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
  color: #0369a1;
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
select,
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
select:focus,
textarea:focus {
  outline: none;
  border-color: #4f46e5;
}

textarea {
  resize: vertical;
}

.muted-hint {
  font-size: 0.82rem;
  color: #64748b;
  margin: 0.5rem 0 1rem;
  line-height: 1.45;
}

.storage-hint {
  margin-top: 0.75rem;
  padding: 0.65rem 0.75rem;
  border-radius: 8px;
  background: #f8fafc;
  border: 1px solid #e2e8f0;
}

.actions {
  margin-top: 1.5rem;
}

.btn-primary {
  width: 100%;
  padding: 10px;
  background: #4f46e5;
  color: white;
  border: none;
  border-radius: 8px;
  font-size: 1rem;
  cursor: pointer;
}

.btn-primary:disabled {
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
  color: #4338ca;
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
  color: #4f46e5;
}
</style>
