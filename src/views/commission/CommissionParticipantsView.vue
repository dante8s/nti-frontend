<template>
  <div class="commission-page">
    <header class="commission-page__head">
      <router-link class="back" :to="{ name: 'commission-hub' }">← Programs</router-link>
      <h1>{{ title }}</h1>
      <p v-if="callSummary" class="commission-page__lead">
        {{ callSummary }}
        <span v-if="program"> · {{ program.name }}</span>
      </p>
      <p v-else-if="!loading" class="commission-page__lead commission-page__lead--warn">
        No open call found for this program. Create a call in the admin panel or check the catalog.
      </p>
    </header>

    <div v-if="loading" class="state">Loading…</div>
    <div v-else-if="error" class="state state--err">{{ error }}</div>
    <div v-else-if="!trackedCalls.length" class="state">No data to display.</div>

    <section v-else class="panel panel--list">
      <h2 class="panel__title">Teams and applications</h2>
      <p v-if="!rows.length" class="hint">No applications for this call yet.</p>

      <article v-for="row in rows" :key="row.applicationId" class="team-block">
        <div class="team-block__head">
          <h3>{{ row.title }}</h3>
          <router-link
            class="btn-eval"
            :to="{
              name: 'commission-evaluate',
              params: {
                programType: programLetter,
                callId: row.callId,
                applicationId: row.applicationId,
              },
              query: { program: programLetter },
            }"
          >
            Evaluate
          </router-link>
        </div>
        <p class="hint">
          Application #{{ row.applicationId }} · {{ statusLabel(row.status) }}
          <span v-if="row.callTitle"> · {{ row.callTitle }}</span>
          <span v-else-if="row.callId"> · call #{{ row.callId }}</span>
          <span v-if="row.programName"> · {{ row.programName }}</span>
        </p>
        <div class="members">
          <router-link
            v-for="m in row.members"
            :key="m.userId"
            class="member-chip"
            :to="{
              name: 'member-profile',
              params: { userId: m.userId },
              query: { back: backToParticipants },
            }"
          >
            <span class="member-chip__icon">✉</span>
            {{ m.label }}
          </router-link>
        </div>
      </article>
    </section>
  </div>
</template>

<script setup>
import { computed, onMounted, ref, watch } from 'vue'
import { useRoute } from 'vue-router'
import { programsApi } from '@/api/programs'
import { evaluationApi } from '@/api/evaluation'
import { statusLabel } from '@/utils/applicationStatus'

const route = useRoute()
const loading = ref(true)
const error = ref('')
const program = ref(null)
const call = ref(null)
const trackedCalls = ref([])
const applications = ref([])

const programLetter = computed(() => String(route.params.programType || 'a').toLowerCase())

const title = computed(() =>
  programLetter.value === 'b' ? 'Program B — participants' : 'Program A — participants',
)

const backToParticipants = computed(() => route.fullPath)

const callSummary = computed(() => {
  const list = trackedCalls.value
  if (!list.length) return ''
  if (list.length === 1) {
    const c = list[0]
    return `Call: ${c.title || `#${c.id}`}`
  }
  const titles = list.map((c) => c.title || `№${c.id}`).join(', ')
  return `Calls (${list.length}): ${titles}`
})

function normalizeProgramType(letter) {
  return letter === 'b' ? 'B' : 'A'
}

/** All calls for all approved programs of type A/B (not just the first call of the first program). */
async function resolveAllCallsForProgram(letter) {
  const type = normalizeProgramType(letter)
  const { data: programs } = await programsApi.getAllByType(type)
  const list = Array.isArray(programs) ? programs : []
  const candidates = list.filter((p) => p?.status === 'APPROVED' || !p.status)
  const ordered = candidates.length ? candidates : list

  const entries = []
  for (const p of ordered) {
    const { data: callsRaw } = await programsApi.getCallsByProgram(p.id)
    const calls = Array.isArray(callsRaw) ? callsRaw : []
    for (const c of calls) {
      entries.push({ program: p, call: c })
    }
  }
  return entries
}

const rows = computed(() => {
  const out = []
  for (const app of applications.value) {
    const applicantId = app.applicantId
    const members = []

    if (app.teamMembers?.length) {
      for (const m of app.teamMembers) {
        members.push({
          userId: m.userId,
          label: m.email || `Participant #${m.userId}`,
        })
      }
    } else if (applicantId) {
      members.push({
        userId: applicantId,
        label: app.applicantEmail || `Participant #${applicantId}`,
      })
    }

    out.push({
      applicationId: app.id,
      callId: app.callId,
      status: app.status,
      programName: app.programName,
      callTitle: app.callTitle,
      title: app.teamName || `Application #${app.id}`,
      members,
    })
  }
  return out
})

async function load() {
  loading.value = true
  error.value = ''
  program.value = null
  call.value = null
  trackedCalls.value = []
  applications.value = []

  try {
    const entries = await resolveAllCallsForProgram(programLetter.value)
    if (!entries.length) {
      loading.value = false
      return
    }
    program.value = entries[0].program
    trackedCalls.value = entries.map((e) => e.call)
    call.value = entries.find((e) => e.call?.status === 'OPEN')?.call || entries[0].call

    const seen = new Set()
    const merged = []
    for (const { program: prog, call: c } of entries) {
      const { data: queue } = await evaluationApi.getQueue(c.id)
      const list = Array.isArray(queue) ? queue : []
      for (const a of list) {
        if (!a?.status || a.status === 'DRAFT' || seen.has(a.id)) continue
        seen.add(a.id)
        merged.push({
          ...a,
          applicantId: a.applicantId,
          applicantEmail: a.applicantEmail?.trim(),
          callId: c.id,
          callTitle: c.title || `Call #${c.id}`,
          programName: a.programName || prog?.name,
        })
      }
    }
    applications.value = merged
  } catch (e) {
    error.value =
      e?.response?.data?.error || e?.response?.data?.message || 'Failed to load the participants list.'
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
  display: flex;
  flex-wrap: wrap;
  gap: 0.4rem;
  margin-top: 0.4rem;
}

.member-chip {
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
}

.member-chip:hover {
  background: rgba(79, 70, 229, 0.14);
  border-color: rgba(79, 70, 229, 0.4);
}

.member-chip__icon {
  font-size: 0.75rem;
  opacity: 0.7;
}
</style>
