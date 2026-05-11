<script setup>
import { computed, onMounted, reactive, ref } from 'vue'
import { teamsApi } from '@/api/teams'
import { getCallApplicationEligibility } from '@/api/profileApi'
import { useAuthStore } from '@/stores/auth'
import { hasTeamLeaderRole } from '@/utils/roles'

const auth = useAuthStore()

function apiErrorMessage(error, fallback) {
  const m = error?.response?.data?.message
  if (typeof m === 'string') return m
  if (m && typeof m === 'object') {
    try {
      return JSON.stringify(m)
    } catch {
      return fallback
    }
  }
  if (error?.response?.status === 403) return 'Доступ заборонено (перевірте вхід у систему або ID лідера).'
  return fallback
}

const team = reactive({
  name: '',
  leaderId: null,
  maxCapacity: 3,
  description: '',
})

const teamId = ref(null)
const invitedUserId = ref('')
const teamMembers = ref([])
const pendingInvites = ref([])
const message = ref('')
const busy = ref(false)
/** Від GET /api/profile/me/call-application-eligibility */
const callEligibility = ref(null)

const acceptedCount = computed(
  () => teamMembers.value.filter((item) => item.inviteStatus === 'ACCEPTED').length,
)
const isSuperAdmin = computed(() => (auth.user?.roles || []).includes('SUPER_ADMIN'))
const isTeamLeader = computed(() => Number(team.leaderId) === Number(auth.user?.id))
const canManageTeam = computed(() => isTeamLeader.value || isSuperAdmin.value)
const hasLeaderRoleBadge = computed(() =>
  hasTeamLeaderRole(auth.user?.roles),
)

/** Є команда й ви можете діяти від імені лідера (або SUPER_ADMIN для тесту). */
const canSeeApplyInstructions = computed(
  () =>
    !!teamId.value &&
    (isTeamLeader.value || isSuperAdmin.value),
)

async function loadMyTeam() {
  busy.value = true
  try {
    const uid = auth.user?.id
    if (!uid) {
      message.value = 'Увійдіть у систему знову — у профілі бракує ідентифікатора користувача (userId).'
      return
    }
    const res = await teamsApi.getMyTeam(Number(uid))
    const data = res.data
    if (!data) {
      message.value = 'Команда ще не створена. Створіть нову або прийміть запрошення.'
      teamId.value = null
      teamMembers.value = []
      return
    }
    teamId.value = data.id
    team.name = data.name
    team.leaderId = data.leaderId
    team.maxCapacity = Math.min(Number(data.maxCapacity) || 3, 3)
    team.description = data.description ?? ''
    teamMembers.value = data.members || []
    message.value = `Команда завантажена: ${data.name}`
  } catch (err) {
    if (err?.response?.status === 404) {
      message.value = 'Команда ще не створена. Створіть нову або прийміть запрошення.'
      teamId.value = null
      teamMembers.value = []
      return
    }
    message.value = apiErrorMessage(err, 'Не вдалося завантажити команду.')
  } finally {
    busy.value = false
  }
  await loadCallEligibility()
}

async function loadMyInvites(options = {}) {
  const silent = options.silent === true
  busy.value = true
  try {
    const userId = auth.user?.id
    if (!userId) {
      message.value = 'Не вдалося визначити користувача.'
      return
    }
    const res = await teamsApi.getPendingInvites(Number(userId))
    pendingInvites.value = res.data || []
    if (!silent) message.value = 'Запрошення оновлено.'
  } catch {
    message.value = 'Не вдалося завантажити запрошення.'
  } finally {
    busy.value = false
  }
}

async function loadCallEligibility() {
  try {
    callEligibility.value = await getCallApplicationEligibility()
  } catch {
    callEligibility.value = null
  }
}

/** При відкритті сторінки підтягуємо команду й вхідні інвайти (раніше список лишався порожнім без ручної дії). */
onMounted(async () => {
  await loadMyTeam()
  await loadMyInvites({ silent: true })
})

async function onCreateTeam() {
  if (!team.name.trim()) {
    message.value = 'Вкажіть назву команди.'
    return
  }
  const leaderId = Number(auth.user?.id)
  if (!Number.isFinite(leaderId) || leaderId < 1) {
    message.value = 'Не вдалося визначити ваш ID. Вийдіть і увійдіть знову після оновлення сервера.'
    return
  }
  if (!team.description.trim()) {
    message.value = 'Вкажіть опис команди.'
    return
  }
  busy.value = true
  try {
    const res = await teamsApi.create({
      name: team.name.trim(),
      leaderId,
      maxCapacity: Math.min(Math.max(Number(team.maxCapacity) || 3, 1), 3),
      description: team.description.trim(),
      competencies: '',
    })
    teamId.value = res.data?.id
    team.leaderId = res.data?.leaderId ?? leaderId
    teamMembers.value = res.data?.members || []
    message.value = `Команду створено (ID: ${res.data?.id}).`
    auth.refreshUserFromStorage()
    await loadCallEligibility()
  } catch (e) {
    message.value = apiErrorMessage(e, 'Не вдалося створити команду.')
  } finally {
    busy.value = false
  }
}

async function onInviteMember() {
  if (!canManageTeam.value) {
    message.value = 'Запрошувати учасників може лише лідер команди.'
    return
  }
  if (!teamId.value) {
    message.value = 'Спочатку створіть або завантажте команду.'
    return
  }
  if (!invitedUserId.value) {
    message.value = 'Вкажіть ID користувача для запрошення.'
    return
  }
  busy.value = true
  try {
    await teamsApi.invite(Number(teamId.value), Number(invitedUserId.value))
    invitedUserId.value = ''
    await loadMyTeam()
    message.value = 'Запрошення відправлено.'
  } catch (e) {
    message.value = e?.response?.data?.message || 'Не вдалося надіслати запрошення.'
  } finally {
    busy.value = false
  }
}

async function onRespondInvite(invite, accepted) {
  busy.value = true
  try {
    const uid = auth.user?.id
    if (!uid) {
      message.value = 'Не вдалося визначити користувача.'
      return
    }
    await teamsApi.respondInvite(Number(invite.teamId), Number(uid), accepted)
    await loadMyInvites({ silent: true })
    await loadMyTeam()
    message.value = accepted ? 'Запрошення прийнято.' : 'Запрошення відхилено.'
  } catch (e) {
    message.value = apiErrorMessage(e, 'Не вдалося обробити запрошення.')
  } finally {
    busy.value = false
  }
}
</script>

<template>
  <section class="panel">
    <header class="panel-header">
      <h2>Моя команда</h2>
      <p>Створення команди, запрошення учасників та керування вхідними інвайтами.</p>
    </header>

    <div v-if="hasLeaderRoleBadge" class="leader-banner">
      <span class="leader-banner__icon" aria-hidden="true">⚑</span>
      <div>
        <strong>Роль «Лідер команди»</strong>
        <span class="leader-banner__text">
          Після створення команди ви зможете запрошувати учасників і подавати заявки на програми від імені команди (як її лідер).
        </span>
      </div>
    </div>

    <div
      v-if="callEligibility && !callEligibility.suggestsReadyForCallFlow"
      class="eligibility-banner"
      role="alert"
    >
      <strong class="eligibility-banner__title">Нагадування щодо готовності до виклику</strong>
      <p class="eligibility-banner__lead">
        Якщо профіль або CV ще «не дотягнуті», система не вважає вас готовим подати заявку на виклик —
        спочатку виправте це у
        <router-link class="eligibility-banner__link eligibility-banner__link--inline" to="/app/my-profile">
          Мій профіль
        </router-link>.
      </p>
      <p
        v-if="callEligibility.profileComplete === false"
        class="eligibility-banner__error"
      >
        Помилка готовності: профіль або CV ще «не дотягнуті» — завершіть усі обовʼязкові поля студентського
        профілю та завантажте файл CV у форматі PDF.
      </p>
      <p class="eligibility-banner__subtitle">Що варто зробити далі:</p>
      <ul v-if="callEligibility.remindersUk?.length" class="eligibility-banner__list">
        <li v-for="(line, idx) in callEligibility.remindersUk" :key="idx">{{ line }}</li>
      </ul>
      <p v-else class="eligibility-banner__fallback">
        Перевірте «Мій профіль»: анкета має бути повністю заповненою, а CV — завантаженим (PDF).
      </p>
      <div class="eligibility-banner__links">
        <router-link class="eligibility-banner__link" to="/programs/a">Каталог програми A</router-link>
        <span class="eligibility-banner__sep">·</span>
        <router-link class="eligibility-banner__link" to="/programs/b">Каталог програми B</router-link>
      </div>
    </div>

    <div
      v-if="callEligibility?.suggestsReadyForCallFlow && canSeeApplyInstructions"
      class="ready-banner"
      role="status"
    >
      <strong>Можна подавати заявку на виклик</strong>
      <span class="ready-banner__text">
        Оберіть програму нижче, відкрийте картку виклику та натисніть «Подати заявку» — форма відкриється у вашому кабінеті.
      </span>
      <div class="ready-banner__links">
        <router-link class="ready-banner__link" to="/programs/a">Каталог A → виклики</router-link>
        <router-link class="ready-banner__link" to="/programs/b">Каталог B → виклики</router-link>
      </div>
    </div>

    <article v-if="canSeeApplyInstructions" class="card card--muted">
      <h3>Подача заявки на виклик після створення команди</h3>
      <ol class="apply-steps">
        <li>
          Заповніть
          <router-link class="inline-link" to="/app/my-profile">студентський профіль</router-link>
          та завантажте CV (якщо ще не зробили): без цього бекенд може не вважати профіль завершеним.
        </li>
        <li>
          Перейдіть у
          <router-link class="inline-link" to="/programs/a">каталог програми A</router-link>
          або
          <router-link class="inline-link" to="/programs/b">каталог програми B</router-link>
          та оберіть конкретну програму.
        </li>
        <li>
          У розділі «Активні виклики» біля потрібного виклику натисніть «Подати заявку». Відкриється форма заявки; збережіть чернетку, потім надішліть її з розділу «Мої заявки» за правилами програми.
        </li>
      </ol>
      <p v-if="!isTeamLeader && isSuperAdmin" class="hint">
        SUPER_ADMIN: кнопка подачі на сайті також працює в тестовому режимі; для реального сценарію увійдіть під акаунтом лідера з роллю STUDENT.
      </p>
    </article>

    <article class="card">
      <h3>Назва команди</h3>
      <div class="grid two">
        <div>
          <input v-model="team.name" placeholder="Innovation Squad" />
        </div>
        <div>
          <label class="label">Ліміт учасників</label>
          <input v-model.number="team.maxCapacity" type="number" min="1" max="3" />
        </div>
      </div>
      <div class="field-desc">
        <label class="label">Опис команди</label>
        <textarea
          v-model="team.description"
          rows="4"
          placeholder="Коротко опишіть напрямок проєкту або компетенції команди"
        ></textarea>
      </div>
      <button :disabled="busy" @click="onCreateTeam">Створити команду</button>
      <p v-if="teamId" class="hint">Поточний ID команди: {{ teamId }}</p>
    </article>

    <article class="card">
      <h3>Запросити учасника</h3>
      <div class="row">
        <input v-model="invitedUserId" type="number" min="1" placeholder="ID користувача" />
        <button :disabled="busy || !canManageTeam" @click="onInviteMember">Запросити</button>
      </div>
      <p class="hint">Підтверджено учасників: {{ acceptedCount }} / {{ team.maxCapacity }}</p>
      <div v-for="member in teamMembers" :key="member.id" class="invite-row">
        <span>Користувач #{{ member.userId }}</span>
        <span class="badge">{{ member.inviteStatus }}</span>
        <span class="hint">{{ member.role }}</span>
      </div>
    </article>

    <article class="card">
      <h3>Мої вхідні запрошення</h3>
      <div v-if="!pendingInvites.length" class="hint">Немає запрошень у статусі очікування.</div>
      <div v-for="invite in pendingInvites" :key="`${invite.teamId}-${invite.userId}-${invite.id}`" class="invite-row">
        <span>Команда #{{ invite.teamId }}</span>
        <span class="badge">{{ invite.inviteStatus }}</span>
        <div class="row actions">
          <button :disabled="busy" @click="onRespondInvite(invite, true)">Прийняти</button>
          <button class="danger" :disabled="busy" @click="onRespondInvite(invite, false)">
            Відхилити
          </button>
        </div>
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

.leader-banner {
  display: flex;
  gap: 0.75rem;
  align-items: flex-start;
  padding: 0.9rem 1rem;
  border-radius: 14px;
  background: linear-gradient(125deg, #ecfdf5 0%, #f0fdf4 50%, #e0e7ff 100%);
  border: 1px solid rgba(16, 185, 129, 0.25);
  box-shadow: 0 1px 0 rgba(255, 255, 255, 0.8) inset;
}

.leader-banner__icon {
  font-size: 1.35rem;
  line-height: 1;
}

.leader-banner strong {
  display: block;
  font-size: 0.92rem;
  color: #064e3b;
  margin-bottom: 0.25rem;
}

.leader-banner__text {
  display: block;
  font-size: 0.82rem;
  color: #0f766e;
  line-height: 1.45;
}

.eligibility-banner {
  padding: 0.85rem 1rem;
  border-radius: 14px;
  background: linear-gradient(120deg, #fffbeb 0%, #fef3c7 100%);
  border: 1px solid rgba(217, 119, 6, 0.28);
  font-size: 0.84rem;
  color: #92400e;
  line-height: 1.45;
}

.eligibility-banner__title {
  display: block;
  margin-bottom: 0.45rem;
  color: #78350f;
  font-size: 0.93rem;
}

.eligibility-banner__lead {
  margin: 0 0 0.55rem;
  color: #92400e;
  line-height: 1.5;
}

.eligibility-banner__error {
  margin: 0 0 0.55rem;
  padding: 0.5rem 0.65rem;
  border-radius: 10px;
  background: rgba(253, 230, 138, 0.55);
  border: 1px solid rgba(217, 119, 6, 0.45);
  color: #92400e;
  font-weight: 600;
  font-size: 0.82rem;
  line-height: 1.45;
}

.eligibility-banner__subtitle {
  margin: 0 0 0.25rem;
  font-size: 0.82rem;
  font-weight: 700;
  color: #92400e;
}

.eligibility-banner__list {
  margin: 0.2rem 0 0.55rem;
  padding-left: 1.25rem;
  color: #92400e;
}

.eligibility-banner__fallback {
  margin: 0.2rem 0 0.55rem;
  font-size: 0.82rem;
  color: #a16207;
  line-height: 1.45;
}

.eligibility-banner__link {
  display: inline-block;
  font-weight: 700;
  color: #4f46e5;
  text-decoration: none;
}

.eligibility-banner__link--inline {
  display: inline;
}

.eligibility-banner__link:hover {
  text-decoration: underline;
}

.eligibility-banner__links {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  gap: 0.35rem 0.5rem;
}

.eligibility-banner__sep {
  color: rgba(146, 64, 14, 0.45);
}

.ready-banner {
  padding: 0.85rem 1rem;
  border-radius: 14px;
  background: linear-gradient(125deg, #ecfdf5 0%, #d1fae5 100%);
  border: 1px solid rgba(16, 185, 129, 0.35);
  font-size: 0.84rem;
  color: #065f46;
  line-height: 1.45;
}

.ready-banner strong {
  display: block;
  margin-bottom: 0.35rem;
  color: #064e3b;
}

.ready-banner__text {
  display: block;
  margin-bottom: 0.55rem;
}

.ready-banner__links {
  display: flex;
  flex-wrap: wrap;
  gap: 0.5rem 0.85rem;
}

.ready-banner__link {
  font-weight: 700;
  color: #4f46e5;
  text-decoration: none;
}

.ready-banner__link:hover {
  text-decoration: underline;
}

.card--muted {
  background: rgba(248, 250, 252, 0.95);
  border-style: dashed;
}

.apply-steps {
  margin: 0;
  padding-left: 1.2rem;
  font-size: 0.84rem;
  color: #334155;
  line-height: 1.55;
}

.apply-steps li {
  margin-bottom: 0.5rem;
}

.inline-link {
  font-weight: 700;
  color: #4f46e5;
  text-decoration: none;
}

.inline-link:hover {
  text-decoration: underline;
}

.card {
  padding: 1rem 1.1rem;
  border-radius: 14px;
  background: rgba(255, 255, 255, 0.9);
  border: 1px solid rgba(79, 70, 229, 0.12);
}

.card h3 {
  margin: 0 0 0.8rem;
}

.grid {
  display: grid;
  gap: 0.8rem;
}

.two {
  grid-template-columns: repeat(2, minmax(0, 1fr));
}

.row {
  display: flex;
  gap: 0.6rem;
  align-items: center;
  flex-wrap: wrap;
}

.label {
  display: block;
  font-size: 0.82rem;
  color: #64748b;
  margin-bottom: 0.2rem;
}

.field-desc {
  margin-top: 0.75rem;
}

textarea {
  width: 100%;
  border-radius: 10px;
  border: 1px solid #cbd5e1;
  padding: 0.55rem 0.65rem;
  font: inherit;
  resize: vertical;
  min-height: 5rem;
}

input {
  width: 100%;
  border-radius: 10px;
  border: 1px solid #cbd5e1;
  padding: 0.55rem 0.65rem;
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

.danger {
  background: #dc2626;
}

.invite-row {
  margin-top: 0.55rem;
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 0.6rem;
  border: 1px solid rgba(148, 163, 184, 0.35);
  border-radius: 10px;
  padding: 0.55rem 0.65rem;
}

.actions {
  justify-content: flex-end;
}

.badge {
  background: #eef2ff;
  color: #3730a3;
  padding: 0.2rem 0.45rem;
  border-radius: 999px;
  font-size: 0.75rem;
  font-weight: 700;
}

.hint {
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

@media (max-width: 760px) {
  .two {
    grid-template-columns: 1fr;
  }
}
</style>
