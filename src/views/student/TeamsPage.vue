<script setup>
import { computed, reactive, ref } from 'vue'
import { teamsApi } from '@/api/teams'
import { useAuthStore } from '@/stores/auth'

const auth = useAuthStore()

const team = reactive({
  name: '',
  leaderId: auth.user?.id || '',
  maxCapacity: 5,
})

const teamId = ref(null)
const invitedUserId = ref('')
const teamMembers = ref([])
const pendingInvites = ref([])
const message = ref('')
const busy = ref(false)

const acceptedCount = computed(
  () => teamMembers.value.filter((item) => item.inviteStatus === 'ACCEPTED').length,
)

async function loadMyTeam() {
  busy.value = true
  try {
    const res = await teamsApi.getMyTeam()
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
    team.maxCapacity = data.maxCapacity
    teamMembers.value = data.members || []
    message.value = `Команда завантажена: ${data.name}`
  } catch {
    message.value = 'Не вдалося завантажити команду.'
  } finally {
    busy.value = false
  }
}

async function loadMyInvites() {
  busy.value = true
  try {
    const userId = auth.user?.id
    if (!userId) {
      message.value = 'Не вдалося визначити користувача.'
      return
    }
    const res = await teamsApi.getPendingInvites(userId)
    pendingInvites.value = res.data || []
    message.value = 'Запрошення оновлено.'
  } catch {
    message.value = 'Не вдалося завантажити запрошення.'
  } finally {
    busy.value = false
  }
}

async function onCreateTeam() {
  if (!team.name.trim()) {
    message.value = 'Вкажіть назву команди.'
    return
  }
  busy.value = true
  try {
    const res = await teamsApi.create({
      name: team.name.trim(),
      leaderId: Number(team.leaderId),
      maxCapacity: Number(team.maxCapacity),
    })
    teamId.value = res.data?.id
    teamMembers.value = res.data?.members || []
    message.value = `Команду створено (ID: ${res.data?.id}).`
  } catch {
    message.value = 'Не вдалося створити команду.'
  } finally {
    busy.value = false
  }
}

async function onInviteMember() {
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
  } catch {
    message.value = 'Не вдалося надіслати запрошення.'
  } finally {
    busy.value = false
  }
}

async function onRespondInvite(invite, accepted) {
  busy.value = true
  try {
    await teamsApi.respondInvite(Number(invite.id), accepted)
    await loadMyInvites()
    await loadMyTeam()
    message.value = accepted ? 'Запрошення прийнято.' : 'Запрошення відхилено.'
  } catch {
    message.value = 'Не вдалося обробити запрошення.'
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

    <article class="card">
      <h3>Контекст команди</h3>
      <div class="row">
        <button :disabled="busy" @click="loadMyTeam">Завантажити мою команду</button>
        <button :disabled="busy" @click="loadMyInvites">Завантажити мої запрошення</button>
      </div>
    </article>

    <article class="card">
      <h3>Створити команду</h3>
      <div class="grid two">
        <div>
          <label class="label">Назва команди</label>
          <input v-model="team.name" placeholder="Innovation Squad" />
        </div>
        <div>
          <label class="label">Ліміт учасників</label>
          <input v-model.number="team.maxCapacity" type="number" min="3" max="10" />
        </div>
      </div>
      <button :disabled="busy" @click="onCreateTeam">Створити команду</button>
      <p v-if="teamId" class="hint">Поточний ID команди: {{ teamId }}</p>
    </article>

    <article class="card">
      <h3>Запросити учасника</h3>
      <div class="row">
        <input v-model="invitedUserId" type="number" min="1" placeholder="ID користувача" />
        <button :disabled="busy" @click="onInviteMember">Запросити</button>
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
      <div v-for="invite in pendingInvites" :key="invite.id" class="invite-row">
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
