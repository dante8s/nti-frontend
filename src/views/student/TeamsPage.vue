<script setup>
import { computed, onMounted, reactive, ref } from 'vue'
import { teamsApi } from '@/api/teams'
import { applicationsApi } from '@/api/applications'
import { getCallApplicationEligibility } from '@/api/profileApi'
import { useAuthStore } from '@/stores/auth'
import { hasTeamLeaderRole } from '@/utils/roles'
import AppConfirmModal from '@/components/AppConfirmModal.vue'

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
const invitedUserRef = ref('')
const teamMembers = ref([])
const pendingInvites = ref([])
const message = ref('')
const busy = ref(false)
const removalNotice = ref(null)
const removalNoticeDismissed = ref(false)
const myProjects = ref({ current: null, history: [] })
const projectsLoading = ref(false)
const completingProject = ref(false)

const confirmModal = reactive({
  open: false,
  title: '',
  message: '',
  highlight: '',
  profileLink: null,
  variant: 'danger',
  confirmLabel: 'Підтвердити',
  action: null,
  payload: null,
})
const confirmLoading = ref(false)
/** Від GET /api/profile/me/call-application-eligibility */
const callEligibility = ref(null)

const acceptedCount = computed(
  () => teamMembers.value.filter((item) => item.inviteStatus === 'ACCEPTED').length,
)
const roles = computed(() =>
  auth.roles?.length ? auth.roles : auth.user?.roles || [],
)
const isSuperAdmin = computed(() => roles.value.includes('SUPER_ADMIN'))
const isAdmin = computed(() =>
  roles.value.some((r) => r === 'ADMIN' || r === 'SUPER_ADMIN'),
)
const canViewTeamId = computed(() => isAdmin.value)
const myMembership = computed(() =>
  teamMembers.value.find((m) => Number(m.userId) === Number(auth.user?.id)),
)
const isTeamLeader = computed(
  () =>
    Number(team.leaderId) === Number(auth.user?.id) ||
    myMembership.value?.role === 'LEADER',
)
const canManageTeam = computed(() => isTeamLeader.value || isSuperAdmin.value)
/** Якщо є активний або очікуючий підтвердження проект — лідер не може видаляти команду/учасників */
const hasActiveProject = computed(() => !!myProjects.value.current)
const isTeamMemberOnly = computed(
  () => !!teamId.value && !isTeamLeader.value && !isSuperAdmin.value,
)
const hasLeaderRoleBadge = computed(
  () => isTeamLeader.value && hasTeamLeaderRole(auth.user?.roles),
)
const teamFormReadonly = computed(() => !!teamId.value && !canManageTeam.value)

const leaderMember = computed(() =>
  teamMembers.value.find(
    (m) =>
      m.role === 'LEADER' || Number(m.userId) === Number(team.leaderId),
  ),
)

const leaderEmail = computed(() => {
  const email = leaderMember.value?.memberEmail
  if (email && String(email).trim()) return String(email).trim()
  if (team.leaderId) return `користувач #${team.leaderId}`
  return 'лідер команди'
})

function memberLinkLabel(member) {
  const email = member?.memberEmail?.trim()
  if (email) return email
  const name = member?.memberDisplayName?.trim()
  if (name) return name
  return member?.userId != null ? `Користувач #${member.userId}` : '—'
}

function memberProfileRoute(userId) {
  return {
    name: 'member-profile',
    params: { userId: String(userId) },
    query: { back: '/app/teams' },
  }
}

function canRemoveMember(member) {
  if (!canManageTeam.value || !member?.userId) return false
  if (member.role === 'LEADER') return false
  if (Number(member.userId) === Number(auth.user?.id)) return false
  if (hasActiveProject.value) return false
  return member.inviteStatus === 'ACCEPTED' || member.inviteStatus === 'PENDING'
}

function memberRemoveLabel(member) {
  return member.inviteStatus === 'PENDING' ? 'Скасувати' : 'Виключити'
}

function removalNoticeStorageKey(teamId) {
  return `nti-team-removal-seen-${teamId}`
}

async function loadRemovalNotice(uid) {
  try {
    const { data } = await teamsApi.getRemovalNotice(Number(uid))
    removalNotice.value = data
    removalNoticeDismissed.value =
      sessionStorage.getItem(removalNoticeStorageKey(data.teamId)) === '1'
  } catch {
    removalNotice.value = null
    removalNoticeDismissed.value = false
  }
}

function dismissRemovalNotice() {
  if (removalNotice.value?.teamId) {
    sessionStorage.setItem(removalNoticeStorageKey(removalNotice.value.teamId), '1')
  }
  removalNoticeDismissed.value = true
}

function formatRemovedAt(iso) {
  if (!iso) return ''
  try {
    return new Date(iso).toLocaleString('uk-UA', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    })
  } catch {
    return ''
  }
}

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
    removalNotice.value = null
    removalNoticeDismissed.value = false
    message.value = `Команда завантажена: ${data.name}`
  } catch (err) {
    if (err?.response?.status === 404) {
      teamId.value = null
      teamMembers.value = []
      await loadRemovalNotice(uid)
      if (removalNotice.value) {
        message.value = ''
      } else {
        message.value = 'Команда ще не створена. Створіть нову або прийміть запрошення.'
      }
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
  try {
    await auth.hydrateUserFromSession()
    const res = await teamsApi.getMyPendingInvites()
    pendingInvites.value = res.data || []
    if (!silent && pendingInvites.value.length) {
      message.value = 'Є нові запрошення в команду — перегляньте нижче.'
    }
  } catch (e) {
    pendingInvites.value = []
    if (!silent) {
      message.value = apiErrorMessage(e, 'Не вдалося завантажити запрошення.')
    }
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
  await auth.hydrateUserFromSession()
  await loadMyTeam()
  await loadMyInvites({ silent: true })
  await loadMyProjects()
})

async function loadMyProjects() {
  projectsLoading.value = true
  try {
    const { data } = await applicationsApi.getMyProjects()
    myProjects.value = data
  } catch {
    myProjects.value = { current: null, history: [] }
  } finally {
    projectsLoading.value = false
  }
}

function onCompleteProject(applicationId) {
  confirmModal.title = 'Надіслати запит на завершення?'
  confirmModal.message = 'Запит на завершення буде надіслано адміністратору. Після підтвердження проект зміниться на «Завершено».'
  confirmModal.highlight = myProjects.value.current?.programName || ''
  confirmModal.profileLink = null
  confirmModal.variant = 'warning'
  confirmModal.confirmLabel = 'Так, надіслати запит'
  confirmModal.action = 'complete-project'
  confirmModal.payload = { applicationId }
  confirmModal.open = true
}

function formatProjectDate(iso) {
  if (!iso) return '—'
  return new Date(iso).toLocaleDateString('uk-UA', {
    day: '2-digit', month: 'short', year: 'numeric',
  })
}

async function onCreateTeam() {
  if (teamId.value && !canManageTeam.value) {
    message.value = 'Ви вже в команді як учасник. Створити нову може лише користувач без команди.'
    return
  }
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
    message.value = isAdmin.value
      ? `Команду створено (ID: ${res.data?.id}).`
      : 'Команду створено.'
    await auth.hydrateUserFromSession()
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
  const raw = invitedUserRef.value.trim()
  if (!raw) {
    message.value = 'Вкажіть email або ID користувача для запрошення.'
    return
  }
  const params = raw.includes('@') ? { email: raw } : { userId: Number(raw) }
  if (!raw.includes('@') && (!Number.isFinite(params.userId) || params.userId < 1)) {
    message.value = 'Некоректний ID. Вкажіть число або email учасника.'
    return
  }
  busy.value = true
  try {
    await teamsApi.invite(Number(teamId.value), params)
    invitedUserRef.value = ''
    await loadMyTeam()
    message.value = 'Запрошення відправлено. Учасник побачить його в «Мої вхідні запрошення».'
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

function resetTeamForm() {
  teamId.value = null
  team.name = ''
  team.leaderId = null
  team.maxCapacity = 3
  team.description = ''
  teamMembers.value = []
}

function onRemoveMember(member) {
  if (!canRemoveMember(member)) return
  const wasPending = member.inviteStatus === 'PENDING'
  confirmModal.title = wasPending ? 'Скасувати запрошення?' : 'Виключити з команди?'
  confirmModal.message = wasPending
    ? 'Користувач більше не зможе прийняти це запрошення.'
    : 'Учасник зникне зі складу. У нього в кабінеті з’явиться повідомлення, що його виключили з команди.'
  confirmModal.highlight = memberLinkLabel(member)
  confirmModal.profileLink = member.userId ? memberProfileRoute(member.userId) : null
  confirmModal.variant = wasPending ? 'warning' : 'danger'
  confirmModal.confirmLabel = memberRemoveLabel(member)
  confirmModal.action = 'remove-member'
  confirmModal.payload = { member, wasPending }
  confirmModal.open = true
}

function onDeleteTeam() {
  if (!canManageTeam.value) {
    message.value = 'Видалити команду може лише її лідер.'
    return
  }
  if (!teamId.value) {
    message.value = 'Немає команди для видалення.'
    return
  }
  confirmModal.title = 'Видалити команду?'
  confirmModal.message =
    'Дію не можна скасувати: зникнуть склад і всі запрошення. Подані заявки на виклики в «Мої заявки» залишаться — видалиться лише запис команди в системі.'
  confirmModal.highlight = team.name ? `«${team.name}»` : ''
  confirmModal.profileLink = null
  confirmModal.variant = 'danger'
  confirmModal.confirmLabel = 'Видалити команду'
  confirmModal.action = 'delete-team'
  confirmModal.payload = null
  confirmModal.open = true
}

function closeConfirmModal() {
  confirmModal.open = false
  confirmModal.action = null
  confirmModal.payload = null
}

async function onConfirmModalAction() {
  if (confirmLoading.value) return

  if (confirmModal.action === 'remove-member') {
    const { member, wasPending } = confirmModal.payload || {}
    if (!member?.userId) return
    confirmLoading.value = true
    busy.value = true
    try {
      await teamsApi.removeMember(Number(teamId.value), Number(member.userId))
      closeConfirmModal()
      await loadMyTeam()
      message.value = wasPending
        ? 'Запрошення скасовано.'
        : 'Учасника виключено з команди.'
    } catch (e) {
      message.value = apiErrorMessage(e, 'Не вдалося виконати дію.')
    } finally {
      confirmLoading.value = false
      busy.value = false
    }
    return
  }

  if (confirmModal.action === 'delete-team') {
    confirmLoading.value = true
    busy.value = true
    try {
      await teamsApi.deleteTeam(Number(teamId.value))
      closeConfirmModal()
      resetTeamForm()
      message.value = 'Команду видалено. Можете створити нову.'
      await loadCallEligibility()
      await loadMyInvites({ silent: true })
    } catch (e) {
      const serverMsg = e?.response?.data?.message
      message.value =
        typeof serverMsg === 'string' ? serverMsg : apiErrorMessage(e, 'Не вдалося видалити команду.')
    } finally {
      confirmLoading.value = false
      busy.value = false
    }
    return
  }

  if (confirmModal.action === 'complete-project') {
    const { applicationId } = confirmModal.payload || {}
    if (!applicationId) return
    confirmLoading.value = true
    completingProject.value = true
    try {
      await applicationsApi.completeProject(applicationId)
      closeConfirmModal()
      await loadMyProjects()
      message.value = 'Запит на завершення надіслано. Очікуйте підтвердження від адміністратора.'
    } catch (e) {
      message.value = apiErrorMessage(e, 'Не вдалося завершити проект.')
    } finally {
      confirmLoading.value = false
      completingProject.value = false
    }
  }
}
</script>

<template>
  <section class="panel">
    <header class="panel-header">
      <h2>Моя команда</h2>
      <p>Створення команди, запрошення учасників та керування вхідними інвайтами.</p>
    </header>

    <div
      v-if="removalNotice && !removalNoticeDismissed && !teamId"
      class="removal-banner"
      role="alert"
    >
      <strong>Вас виключили з команди</strong>
      <p class="removal-banner__text">
        Лідер команди «{{ removalNotice.teamName }}» прибрав вас із складу.
        <span v-if="removalNotice.removedAt">
          ({{ formatRemovedAt(removalNotice.removedAt) }})
        </span>
        Ви можете приєднатися до іншої команди за запрошенням або створити власну, якщо ще не
        були лідером іншої команди.
      </p>
      <button type="button" class="removal-banner__btn" @click="dismissRemovalNotice">
        Зрозуміло
      </button>
    </div>

    <div v-if="isTeamMemberOnly" class="member-banner" role="status">
      <strong>Ви — учасник команди</strong>
      <span class="member-banner__text">
        Змінювати назву, запрошувати людей, видаляти команду та подавати заявки на виклики може лише
        <strong>лідер</strong> ({{ leaderEmail }}). Ви можете переглядати склад і
        приймати вхідні запрошення в інші команди нижче.
      </span>
    </div>

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
      v-if="callEligibility && !callEligibility.suggestsReadyForCallFlow && !isTeamMemberOnly"
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
      <h3>{{ teamId ? (canManageTeam ? 'Моя команда' : 'Моя команда (перегляд)') : 'Створення команди' }}</h3>
      <div class="grid two form-fields">
        <div class="form-field">
          <label class="label" for="team-name">Назва команди</label>
          <input
            id="team-name"
            v-model="team.name"
            type="text"
            placeholder="Innovation Squad"
            :readonly="teamFormReadonly"
            :disabled="teamFormReadonly"
          />
        </div>
        <div class="form-field">
          <label class="label" for="team-max-capacity">Ліміт учасників</label>
          <input
            id="team-max-capacity"
            value="3"
            type="text"
            readonly
            disabled
          />
        </div>
      </div>
      <div class="field-desc form-field">
        <label class="label" for="team-description">Опис команди</label>
        <textarea
          id="team-description"
          v-model="team.description"
          rows="4"
          placeholder="Коротко опишіть напрямок проєкту або компетенції команди"
          :readonly="teamFormReadonly"
          :disabled="teamFormReadonly"
          style="resize: none"
        ></textarea>
      </div>
      <button v-if="!teamId" type="button" :disabled="busy" @click="onCreateTeam">
        Створити команду
      </button>
      <p v-if="teamId && canViewTeamId" class="hint">Поточний ID команди: {{ teamId }}</p>

      <div v-if="teamId && canManageTeam && !hasActiveProject" class="danger-zone">
        <p class="danger-zone__text">
          Видалення команди незворотне: зникнуть склад і запрошення. Подані заявки на виклики в кабінеті
          залишаються — зникає лише запис команди в системі.
        </p>
        <button type="button" class="danger" :disabled="busy" @click="onDeleteTeam">
          Видалити команду
        </button>
      </div>
      <div v-if="teamId && canManageTeam && hasActiveProject" class="active-project-lock">
        🔒 Команда має активний проект — видалення та зміни складу заблоковані.
      </div>
    </article>

    <article v-if="teamId" class="card">
      <h3>{{ canManageTeam ? 'Запросити учасника' : 'Склад команди' }}</h3>
      <div v-if="canManageTeam && !hasActiveProject" class="row">
        <input
          v-model="invitedUserRef"
          type="text"
          placeholder="Email користувача"
          autocomplete="off"
        />
        <button :disabled="busy" @click="onInviteMember">Запросити</button>
      </div>
      <div v-if="canManageTeam && hasActiveProject" class="active-project-lock active-project-lock--inline">
        🔒 Запрошення заблоковано — є активний проект.
      </div>
      <p class="hint">Підтверджено учасників: {{ acceptedCount }} / {{ team.maxCapacity }}</p>
      <p v-if="canManageTeam" class="hint hint--sub">
        Після виключення того самого користувача можна запросити його знову — необмежену кількість разів.
      </p>
      <div v-if="teamMembers.length" class="member-table-wrap">
        <table class="member-table" :class="{ 'member-table--actions': canManageTeam }">
          <colgroup>
            <col class="member-table__col-email">
            <col class="member-table__col-status">
            <col class="member-table__col-role">
            <col v-if="canManageTeam" class="member-table__col-action">
          </colgroup>
          <thead>
            <tr>
              <th scope="col" class="member-table__th-email">Учасник</th>
              <th scope="col" class="member-table__th-center">Статус</th>
              <th scope="col" class="member-table__th-center">Роль</th>
              <th v-if="canManageTeam" scope="col" class="member-table__th-center">Дія</th>
            </tr>
          </thead>
          <tbody>
            <tr v-for="member in teamMembers" :key="member.id">
              <td class="member-table__email" data-label="Учасник">
                <router-link
                  v-if="member.userId"
                  class="member-link"
                  :to="memberProfileRoute(member.userId)"
                  :title="'Профіль та CV — ' + memberLinkLabel(member)"
                >
                  <span class="member-link__icon">✉</span>
                  {{ memberLinkLabel(member) }}
                </router-link>
                <span v-else class="member-link member-link--static">
                  <span class="member-link__icon">✉</span>
                  {{ memberLinkLabel(member) }}
                </span>
              </td>
              <td class="member-table__status" data-label="Статус">
                <span class="badge">{{ member.inviteStatus }}</span>
              </td>
              <td class="member-table__role" data-label="Роль">{{ member.role }}</td>
              <td v-if="canManageTeam" class="member-table__action" data-label="Дія">
                <button
                  v-if="canRemoveMember(member)"
                  type="button"
                  class="member-remove"
                  :disabled="busy"
                  :title="memberRemoveLabel(member)"
                  @click="onRemoveMember(member)"
                >
                  {{ memberRemoveLabel(member) }}
                </button>
              </td>
            </tr>
          </tbody>
        </table>
      </div>
    </article>

    <article class="card">
      <div class="card-title-row">
        <h3>Мої вхідні запрошення</h3>
        <button type="button" class="link-btn" :disabled="busy" @click="loadMyInvites()">
          Оновити
        </button>
      </div>
      <p class="hint">
        Запрошення приходять на акаунт, під яким ви увійшли ({{ auth.user?.email || '—' }}).
        Лідер може вказати ваш email замість ID.
      </p>
      <div v-if="!pendingInvites.length" class="hint">Немає запрошень у статусі очікування.</div>
      <div v-for="invite in pendingInvites" :key="`${invite.teamId}-${invite.userId}-${invite.id}`" class="invite-row">
        <span class="invite-team-name">{{ invite.teamName || `Команда #${invite.teamId}` }}</span>
        <span class="badge">{{ invite.inviteStatus }}</span>
        <div class="row actions">
          <button :disabled="busy" @click="onRespondInvite(invite, true)">Прийняти</button>
          <button class="danger" :disabled="busy" @click="onRespondInvite(invite, false)">
            Відхилити
          </button>
        </div>
      </div>
    </article>

    <!-- Проекти -->
    <article class="card">
      <h3 class="card-title">Проекти</h3>

      <div v-if="projectsLoading" class="hint">Завантаження…</div>
      <template v-else>

        <!-- Актуальний проект -->
        <div class="project-section">
          <h4 class="project-section__title">Поточний проект</h4>
          <div v-if="myProjects.current" class="project-card project-card--active">
            <div class="project-card__head">
              <span class="project-card__program">{{ myProjects.current.programName }}</span>
              <span v-if="myProjects.current.callTitle" class="project-card__call">{{ myProjects.current.callTitle }}</span>
              <span
                class="project-badge"
                :class="myProjects.current.status === 'COMPLETION_REQUESTED' ? 'project-badge--pending' : 'project-badge--active'"
              >
                {{ myProjects.current.status === 'COMPLETION_REQUESTED' ? 'Чекає підтвердження' : 'Активний' }}
              </span>
            </div>
            <div class="project-card__team">
              Команда: <strong>{{ myProjects.current.teamName || '—' }}</strong>
            </div>
            <div class="project-card__dates">
              Подано: {{ formatProjectDate(myProjects.current.createdAt) }}
            </div>
            <div v-if="myProjects.current.members?.length" class="project-card__members">
              <span class="project-card__members-label">Учасники:</span>
              <router-link
                v-for="m in myProjects.current.members"
                :key="m.userId"
                :to="memberProfileRoute(m.userId)"
                class="project-member-chip project-member-chip--link"
                :class="{ 'project-member-chip--leader': m.role === 'LEADER' }"
              >{{ m.email }}</router-link>
            </div>
            <button
              v-if="canManageTeam && myProjects.current.status !== 'COMPLETION_REQUESTED'"
              type="button"
              class="btn btn-complete"
              :disabled="completingProject"
              @click="onCompleteProject(myProjects.current.applicationId)"
            >
              {{ completingProject ? 'Надсилання…' : 'Проект закінчено' }}
            </button>
            <p v-if="myProjects.current.status === 'COMPLETION_REQUESTED'" class="completion-pending-note">
              ⏳ Запит на завершення надіслано — очікуйте підтвердження адміністратора.
            </p>
          </div>
          <div v-else class="hint">Команда зараз не має активного проекту.</div>
        </div>

        <!-- Завершені проекти -->
        <div v-if="myProjects.history?.length" class="project-section">
          <h4 class="project-section__title">Завершені проекти</h4>
          <div
            v-for="proj in myProjects.history"
            :key="proj.applicationId"
            class="project-card"
          >
            <div class="project-card__head">
              <span class="project-card__program">{{ proj.programName }}</span>
              <span v-if="proj.callTitle" class="project-card__call">{{ proj.callTitle }}</span>
              <span class="project-badge project-badge--done">Завершено</span>
            </div>
            <div class="project-card__team">
              Команда: <strong>{{ proj.teamName || '—' }}</strong>
            </div>
            <div class="project-card__dates">
              Подано: {{ formatProjectDate(proj.createdAt) }} ·
              Завершено: {{ formatProjectDate(proj.updatedAt) }}
            </div>
            <div v-if="proj.members?.length" class="project-card__members">
              <span class="project-card__members-label">Учасники:</span>
              <router-link
                v-for="m in proj.members"
                :key="m.userId"
                :to="memberProfileRoute(m.userId)"
                class="project-member-chip project-member-chip--link"
                :class="{ 'project-member-chip--leader': m.role === 'LEADER' }"
              >{{ m.email }}</router-link>
            </div>
          </div>
        </div>

      </template>
    </article>

    <p v-if="message" class="message info">{{ message }}</p>

    <AppConfirmModal
      v-model="confirmModal.open"
      :title="confirmModal.title"
      :message="confirmModal.message"
      :highlight="confirmModal.highlight"
      :profile-link="confirmModal.profileLink"
      :variant="confirmModal.variant"
      :confirm-label="confirmModal.confirmLabel"
      :loading="confirmLoading"
      @confirm="onConfirmModalAction"
      @cancel="closeConfirmModal"
    />
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

.member-banner {
  padding: 0.85rem 1rem;
  border-radius: 14px;
  background: linear-gradient(120deg, #f8fafc 0%, #e2e8f0 100%);
  border: 1px solid rgba(100, 116, 139, 0.35);
  font-size: 0.84rem;
  color: #334155;
  line-height: 1.45;
}

.member-banner strong {
  display: block;
  margin-bottom: 0.35rem;
  color: #1e293b;
}

.member-banner__text {
  display: block;
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

.card-title {
  margin: 0 0 0.9rem;
  font-size: 1rem;
  font-weight: 700;
  color: #0f172a;
}

.project-section {
  margin-bottom: 1.2rem;
}

.project-section__title {
  font-size: 0.82rem;
  font-weight: 700;
  text-transform: uppercase;
  letter-spacing: 0.05em;
  color: #64748b;
  margin: 0 0 0.6rem;
}

.project-card {
  border: 1px solid #e2e8f0;
  border-radius: 12px;
  padding: 0.85rem 1rem;
  margin-bottom: 0.65rem;
  background: #f8fafc;
  display: flex;
  flex-direction: column;
  gap: 0.4rem;
}

.project-card--active {
  border-color: rgba(99, 102, 241, 0.35);
  background: #f5f3ff;
}

.project-card__head {
  display: flex;
  align-items: center;
  gap: 0.65rem;
  flex-wrap: wrap;
}

.project-card__program {
  font-weight: 600;
  color: #1e293b;
  font-size: 0.95rem;
}

.project-badge {
  font-size: 0.72rem;
  font-weight: 700;
  padding: 0.15rem 0.55rem;
  border-radius: 999px;
  text-transform: uppercase;
  letter-spacing: 0.04em;
}

.project-badge--active {
  background: #ede9fe;
  color: #4c1d95;
}

.project-badge--done {
  background: #d1fae5;
  color: #065f46;
}

.project-badge--pending {
  background: #fef3c7;
  color: #92400e;
}

.completion-pending-note {
  margin-top: 0.4rem;
  font-size: 0.82rem;
  color: #92400e;
  background: #fffbeb;
  border: 1px solid rgba(217, 119, 6, 0.3);
  border-radius: 8px;
  padding: 0.4rem 0.65rem;
}

.project-card__call {
  font-size: 0.78rem;
  color: #64748b;
  background: rgba(99, 102, 241, 0.07);
  border: 1px solid rgba(99, 102, 241, 0.18);
  border-radius: 999px;
  padding: 0.1rem 0.5rem;
  font-weight: 500;
}

.project-card__team {
  font-size: 0.88rem;
  color: #334155;
}

.project-card__dates {
  font-size: 0.8rem;
  color: #64748b;
}

.project-card__members {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  gap: 0.35rem;
  margin-top: 0.1rem;
}

.project-card__members-label {
  font-size: 0.8rem;
  color: #64748b;
}

.project-member-chip {
  font-size: 0.78rem;
  background: #e0e7ff;
  color: #3730a3;
  padding: 0.1rem 0.5rem;
  border-radius: 999px;
}

.project-member-chip--leader {
  background: #c7d2fe;
  font-weight: 600;
}

.project-member-chip--link {
  text-decoration: none;
  cursor: pointer;
  transition: background 0.15s, color 0.15s;
}

.project-member-chip--link:hover {
  background: #a5b4fc;
  color: #1e1b4b;
}

.btn-complete {
  margin-top: 0.4rem;
  align-self: flex-start;
  background: #4f46e5;
  color: #fff;
  border: none;
  border-radius: 10px;
  padding: 0.45rem 0.9rem;
  font-size: 0.85rem;
  font-weight: 600;
  cursor: pointer;
}

.btn-complete:disabled {
  opacity: 0.6;
  cursor: not-allowed;
}

.card h3 {
  margin: 0 0 0.8rem;
}

.card-title-row {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 0.75rem;
  margin-bottom: 0.35rem;
}

.card-title-row h3 {
  margin: 0;
}

.link-btn {
  border: none;
  background: transparent;
  color: #4f46e5;
  font-weight: 700;
  font-size: 0.84rem;
  cursor: pointer;
  padding: 0.2rem 0.35rem;
}

.link-btn:hover:not(:disabled) {
  text-decoration: underline;
}

.link-btn:disabled {
  opacity: 0.5;
  cursor: not-allowed;
}

.invite-team-name {
  font-weight: 600;
  color: #1e293b;
}

.grid {
  display: grid;
  gap: 0.8rem;
}

.two {
  grid-template-columns: repeat(2, minmax(0, 1fr));
}

.form-fields {
  align-items: start;
}

.form-field {
  display: flex;
  flex-direction: column;
  min-width: 0;
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
  margin-bottom: 0.35rem;
}

.field-desc {
  margin-top: 0.85rem;
}

textarea {
  width: 100%;
  box-sizing: border-box;
  border-radius: 10px;
  border: 1px solid #cbd5e1;
  resize: none;
  padding: 0.55rem 0.65rem;
  font: inherit;
  resize: vertical;
  min-height: 5rem;
}

input {
  width: 100%;
  box-sizing: border-box;
  border-radius: 10px;
  border: 1px solid #cbd5e1;
  padding: 0.55rem 0.65rem;
  font: inherit;
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
  background: #cb7a5c;
}

.active-project-lock {
  margin-top: 1rem;
  padding: 0.7rem 0.9rem;
  border-radius: 12px;
  border: 1px solid rgba(217, 119, 6, 0.3);
  background: #fffbeb;
  color: #92400e;
  font-size: 0.84rem;
  font-weight: 500;
}

.active-project-lock--inline {
  margin-top: 0.4rem;
  padding: 0.45rem 0.75rem;
}

.danger-zone {
  margin-top: 1rem;
  padding: 0.85rem 1rem;
  border-radius: 12px;
  border: 1px solid rgba(220, 38, 38, 0.35);
  background: #fef2f2;
}

.danger-zone__text {
  margin: 0 0 0.65rem;
  font-size: 0.84rem;
  color: #991b1b;
  line-height: 1.45;
}

.member-table-wrap {
  margin-top: 0.55rem;
  overflow-x: auto;
}

.member-table {
  width: 100%;
  border-collapse: separate;
  border-spacing: 0 0.45rem;
  table-layout: fixed;
}

.member-table__col-email {
  width: auto;
}

.member-table__col-status {
  width: 7.25rem;
}

.member-table__col-role {
  width: 5.25rem;
}

.member-table__col-action {
  width: 6.75rem;
}

.member-table thead th {
  padding: 0.45rem 0.75rem;
  font-size: 0.72rem;
  font-weight: 700;
  color: #64748b;
  text-transform: uppercase;
  letter-spacing: 0.03em;
  background: rgba(248, 250, 252, 0.95);
  border-radius: 8px;
}

.member-table__th-email {
  text-align: left;
}

.member-table__th-center {
  text-align: center;
}

.member-table tbody tr {
  background: rgba(255, 255, 255, 0.95);
  box-shadow: 0 0 0 1px rgba(148, 163, 184, 0.35);
}

.member-table tbody td {
  padding: 0.6rem 0.75rem;
  vertical-align: middle;
}

.member-table tbody td:first-child {
  border-radius: 10px 0 0 10px;
}

.member-table tbody td:last-child {
  border-radius: 0 10px 10px 0;
}

.member-table:not(.member-table--actions) tbody td:last-child {
  border-radius: 0 10px 10px 0;
}

.member-table__email {
  word-break: break-all;
}

.member-table__status {
  text-align: center;
}

.member-table__status .badge {
  display: inline-block;
}

.member-table__role {
  text-align: center;
  font-size: 0.75rem;
  font-weight: 700;
  color: #64748b;
  text-transform: uppercase;
}

.member-table__action {
  text-align: center;
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

.member-link {
  display: inline-flex;
  align-items: center;
  gap: 0.35rem;
  padding: 0.25rem 0.65rem;
  background: rgba(79, 70, 229, 0.07);
  border: 1px solid rgba(79, 70, 229, 0.2);
  border-radius: 999px;
  color: #4338ca;
  font-size: 0.82rem;
  font-weight: 500;
  text-decoration: none;
  transition: background 0.15s, border-color 0.15s;
  word-break: break-all;
}

.member-link:hover {
  background: rgba(79, 70, 229, 0.14);
  border-color: rgba(79, 70, 229, 0.4);
  text-decoration: none;
}

.member-link--static {
  display: inline-flex;
  align-items: center;
  gap: 0.35rem;
  padding: 0.25rem 0.65rem;
  background: rgba(100, 116, 139, 0.07);
  border: 1px solid rgba(100, 116, 139, 0.2);
  border-radius: 999px;
  color: #475569;
  font-size: 0.82rem;
  font-weight: 500;
}

.member-link__icon {
  font-size: 0.78rem;
  opacity: 0.7;
}

.member-remove {
  border: none;
  border-radius: 999px;
  padding: 0.35rem 0.7rem;
  font-size: 0.75rem;
  font-weight: 700;
  cursor: pointer;
  background: #f9ebe6;
  color: #cb7a5c;
  border: 1px solid rgba(203, 122, 92, 0.4);
}

.member-remove:hover:not(:disabled) {
  background: #f3d5c9;
}

.member-remove:disabled {
  opacity: 0.6;
  cursor: not-allowed;
}

.removal-banner {
  padding: 0.9rem 1rem;
  border-radius: 14px;
  background: linear-gradient(120deg, #fef2f2 0%, #fff1f2 100%);
  border: 1px solid rgba(220, 38, 38, 0.35);
  font-size: 0.84rem;
  color: #7f1d1d;
  line-height: 1.45;
}

.removal-banner strong {
  display: block;
  margin-bottom: 0.35rem;
  color: #991b1b;
  font-size: 0.95rem;
}

.removal-banner__text {
  margin: 0 0 0.65rem;
}

.removal-banner__btn {
  border: none;
  border-radius: 999px;
  padding: 0.45rem 0.9rem;
  font-weight: 700;
  font-size: 0.82rem;
  cursor: pointer;
  background: #4f46e5;
  color: #fff;
}

.removal-banner__btn:hover {
  background: #4338ca;
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

.hint--sub {
  margin-top: 0.25rem;
  font-size: 0.8rem;
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

  .member-table {
    table-layout: auto;
  }

  .member-table thead {
    display: none;
  }

  .member-table tbody tr {
    display: block;
    margin-bottom: 0.5rem;
    border-radius: 10px;
  }

  .member-table tbody td {
    display: block;
    text-align: left;
    border-radius: 0;
    padding: 0.35rem 0.75rem;
  }

  .member-table tbody td::before {
    content: attr(data-label);
    display: block;
    font-size: 0.7rem;
    font-weight: 700;
    color: #64748b;
    text-transform: uppercase;
    margin-bottom: 0.15rem;
  }

  :deep(#team-max-capacity::-webkit-inner-spin-button),
  :deep(#team-max-capacity::-webkit-outer-spin-button) {
    -webkit-appearance: none;
    margin: 0;
  }
  :deep(#team-max-capacity) {
    -moz-appearance: textfield;
  }
}
</style>
