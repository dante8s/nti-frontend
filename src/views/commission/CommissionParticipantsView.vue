<template>
  <div class="commission-page">
    <header class="commission-page__head">
      <router-link class="back" :to="{ name: 'commission-hub' }">← Програми</router-link>
      <h1>{{ title }}</h1>
      <p v-if="calls.length" class="commission-page__lead">
        Виклики: <strong>{{ callsLabel }}</strong>
        <span v-if="program"> · {{ program.name }}</span>
      </p>
      <p v-else-if="!loading" class="commission-page__lead commission-page__lead--warn">
        Не знайдено викликів для цієї програми. Створіть виклик у адмінці або перевірте каталог.
      </p>
    </header>

    <div v-if="loading" class="state">Завантаження…</div>
    <div v-else-if="error" class="state state--err">{{ error }}</div>
    <div v-else-if="!calls.length" class="state">Немає даних для відображення.</div>

    <section v-else class="panel panel--list">
      <h2 class="panel__title">Команди та заявки</h2>
      <p v-if="!rows.length" class="hint">Поки немає заявок по цьому виклику.</p>

      <article v-for="row in rows" :key="row.applicationId" class="team-block">
        <div class="team-block__head">
          <h3>{{ row.title }}</h3>
          <router-link
            class="btn-eval"
            :to="{
              name: 'commission-evaluate',
              params: { callId: row.callId, applicationId: row.applicationId },
              query: { program: programLetter },
            }"
          >
            Оцінити
          </router-link>
        </div>
        <p class="hint">
          Заявка №{{ row.applicationId }} · {{ statusLabel(row.status) }}
          <span v-if="row.programName"> · {{ row.programName }}</span>
          <span v-if="row.callTitle"> · {{ row.callTitle }}</span>
        </p>
        <ul class="members">
          <li v-for="m in row.members" :key="m.userId">
            <router-link
              :to="{
                name: 'member-profile',
                params: { userId: m.userId },
                query: { back: backToParticipants },
              }"
            >
              {{ m.label }}
            </router-link>
          </li>
        </ul>
      </article>
    </section>
  </div>
</template>

<script setup>
import { computed, onMounted, ref, watch } from 'vue'
import { useRoute } from 'vue-router'
import { programsApi } from '@/api/programs'
import { evaluationApi } from '@/api/evaluation'
import { teamsApi } from '@/api/teams'
import { statusLabel } from '@/utils/applicationStatus'

const route = useRoute()
const loading = ref(true)
const error = ref('')
const program = ref(null)
const calls = ref([])
const applications = ref([])
const teamByApplicant = ref(new Map())

const programLetter = computed(() => String(route.params.programType || 'a').toLowerCase())

const title = computed(() =>
  programLetter.value === 'b' ? 'Програма B — учасники' : 'Програма A — учасники',
)

const backToParticipants = computed(() => route.fullPath)
const callsLabel = computed(() => {
  if (calls.value.length === 1) {
    const only = calls.value[0]
    return only.title || `№${only.id}`
  }
  return `${calls.value.length} виклики`
})

function normalizeProgramType(letter) {
  return letter === 'b' ? 'B' : 'A'
}

async function resolveProgramCalls(letter) {
  const type = normalizeProgramType(letter)
  const { data: programsRaw } = await programsApi.getAllByType(type)
  const list = Array.isArray(programsRaw) ? programsRaw : []
  const candidates = list.filter((p) => p?.status === 'APPROVED' || !p.status)
  const ordered = candidates.length ? candidates : list

  const foundCalls = []
  let primaryProgram = null
  for (const p of ordered) {
    const { data: callsRaw } = await programsApi.getCallsByProgram(p.id)
    const programCalls = Array.isArray(callsRaw) ? callsRaw : []
    if (programCalls.length && !primaryProgram) {
      primaryProgram = p
    }
    for (const call of programCalls) {
      foundCalls.push({ ...call, program: p })
    }
  }
  return { program: primaryProgram || ordered[0] || null, calls: foundCalls }
}

async function loadTeamForApplicant(applicantId) {
  if (!applicantId || teamByApplicant.value.has(applicantId)) return
  try {
    const { data } = await teamsApi.getTeamForUser(applicantId)
    teamByApplicant.value.set(applicantId, data)
  } catch {
    teamByApplicant.value.set(applicantId, null)
  }
}

const rows = computed(() => {
  const out = []
  for (const app of applications.value) {
    const applicantId = app.applicantId
    const team = applicantId ? teamByApplicant.value.get(applicantId) : null
    let title = `Заявка №${app.id}`
    const members = []
    if (team?.name) {
      title = team.name
    }
    if (team?.members?.length) {
      for (const m of team.members) {
        if (m.inviteStatus === 'ACCEPTED' || !m.inviteStatus) {
          members.push({
            userId: m.userId,
            label: m.memberDisplayName || `Учасник #${m.userId}`,
          })
        }
      }
    }
    if (!members.length && applicantId) {
      members.push({
        userId: applicantId,
        label: `Учасник #${applicantId}`,
      })
    }
    out.push({
      applicationId: app.id,
      callId: app.callId,
      status: app.status,
      programName: app.programName,
      callTitle: app.callTitle,
      title,
      members,
    })
  }
  return out
})

async function load() {
  loading.value = true
  error.value = ''
  program.value = null
  calls.value = []
  applications.value = []
  teamByApplicant.value = new Map()

  try {
    const resolved = await resolveProgramCalls(programLetter.value)
    if (!resolved.calls.length) {
      loading.value = false
      return
    }
    program.value = resolved.program
    calls.value = resolved.calls

    const queueResults = await Promise.all(
      resolved.calls.map(async (call) => {
        const { data: queue } = await evaluationApi.getQueue(call.id)
        const list = Array.isArray(queue) ? queue : []
        return list.map((app) => ({
          ...app,
          callId: call.id,
          callTitle: call.title || `№${call.id}`,
          programName: app.programName || call.program?.name,
        }))
      }),
    )
    const list = queueResults.flat()
    applications.value = list.filter((a) => a.status && a.status !== 'DRAFT')

    const ids = [...new Set(applications.value.map((a) => a.applicantId).filter(Boolean))]
    await Promise.all(ids.map((id) => loadTeamForApplicant(id)))
  } catch (e) {
    error.value = e?.response?.data?.message || 'Не вдалося завантажити список учасників.'
  } finally {
    loading.value = false
  }
}

onMounted(load)
watch(programLetter, load)
</script>

<style scoped>
.commission-page {
  max-width: 880px;
  margin: 0 auto;
  padding: 1.5rem 1rem 2.5rem;
}

.back {
  display: inline-block;
  margin-bottom: 0.65rem;
  color: #64748b;
  text-decoration: none;
  font-size: 0.9rem;
}

.back:hover {
  text-decoration: underline;
}

.commission-page__head h1 {
  margin: 0 0 0.35rem;
  font-size: 1.5rem;
}

.commission-page__lead {
  margin: 0;
  color: #64748b;
  font-size: 0.92rem;
}

.commission-page__lead--warn {
  color: #b45309;
}

.state {
  padding: 1rem;
  border-radius: 12px;
  background: #f1f5f9;
  color: #475569;
}

.state--err {
  background: #fef2f2;
  color: #b91c1c;
}

.panel {
  margin-top: 1.25rem;
  border-radius: 16px;
  padding: 1.25rem 1.2rem 1.5rem;
  background: #e4e4e8;
  border: 1px solid #c8c8d0;
  min-height: 200px;
}

.panel__title {
  margin: 0 0 1rem;
  font-size: 1.1rem;
}

.team-block {
  border-radius: 12px;
  padding: 1rem 1rem 0.9rem;
  background: rgba(255, 255, 255, 0.72);
  border: 1px solid rgba(148, 163, 184, 0.45);
  margin-bottom: 1rem;
}

.team-block:last-child {
  margin-bottom: 0;
}

.team-block__head {
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  gap: 0.75rem;
}

.team-block__head h3 {
  margin: 0;
  font-size: 1.05rem;
}

.btn-eval {
  flex-shrink: 0;
  font-weight: 700;
  font-size: 0.82rem;
  color: #fff;
  text-decoration: none;
  padding: 0.38rem 0.75rem;
  border-radius: 999px;
  background: #4f46e5;
}

.btn-eval:hover {
  background: #4338ca;
}

.hint {
  margin: 0.35rem 0 0.6rem;
  font-size: 0.82rem;
  color: #64748b;
}

.members {
  margin: 0;
  padding-left: 1.1rem;
  color: #334155;
  font-size: 0.9rem;
}

.members a {
  color: #4338ca;
  text-decoration: none;
}

.members a:hover {
  text-decoration: underline;
}
</style>
