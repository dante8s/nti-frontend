<script setup>
import { computed, onMounted, ref } from 'vue'
import { RouterLink } from 'vue-router'
import { reportingApi } from '@/api/reporting'

const callId = ref('')
const evalCallId = ref('')
const program = ref('')
const status = ref('')
const role = ref('')

const teamCallId = ref('')
const teamProgram = ref('')
const teamStatus = ref('')
const teamLinked = ref('')
const teamWinnerOnly = ref(false)
const teamMinMembers = ref('')

const adminStats = ref(null)
const teamItems = ref([])
const teamTotal = ref(0)
const teamPage = ref(0)
const teamPageSize = 20
const message = ref('')
const busy = ref(false)

const formats = ['csv', 'xlsx', 'pdf', 'docx']

const statLabels = {
  openCalls: 'Open calls',
  totalApplications: 'Total applications',
  applicationsDraft: 'Drafts',
  applicationsSubmitted: 'Submitted',
  applicationsInReview: 'In review',
  applicationsNeedsRevision: 'Needs revision',
  applicationsApproved: 'Approved applications',
  applicationsRejected: 'Rejected',
  callsWithWinningTeam: 'Calls with winning team',
  activePartnerOrganizations: 'Active partners',
  totalOrganizations: 'Total organizations',
  totalStudentProfiles: 'Student profiles',
  profileWithCv: 'Profiles with CV',
  completeProfiles: 'Complete profiles',
  averageGrade: 'Average profile score',
  totalTeams: 'Total teams',
  eligibleTeams: 'Teams with ≥ 3 members',
}

function buildApplicationExportParams() {
  return {
    callId: callId.value ? Number(callId.value) : undefined,
    program: program.value || undefined,
    status: status.value || undefined,
    role: role.value || undefined,
  }
}

function buildTeamQueryParams() {
  const linked = teamLinked.value
  return {
    callId: teamCallId.value ? Number(teamCallId.value) : undefined,
    program: teamProgram.value || undefined,
    applicationStatus: teamStatus.value || undefined,
    linkedToCall: linked === '' ? undefined : linked === 'yes',
    winnerOnly: teamWinnerOnly.value || undefined,
    minMembers: teamMinMembers.value ? Number(teamMinMembers.value) : undefined,
    page: teamPage.value,
    size: teamPageSize,
  }
}

function buildTeamExportParams() {
  const linked = teamLinked.value
  return {
    callId: teamCallId.value ? Number(teamCallId.value) : undefined,
    program: teamProgram.value || undefined,
    applicationStatus: teamStatus.value || undefined,
    linkedToCall: linked === '' ? undefined : linked === 'yes',
    winnerOnly: teamWinnerOnly.value || undefined,
    minMembers: teamMinMembers.value ? Number(teamMinMembers.value) : undefined,
  }
}

function downloadBlob(blob, filename) {
  const url = URL.createObjectURL(blob)
  const link = document.createElement('a')
  link.href = url
  link.download = filename
  link.click()
  URL.revokeObjectURL(url)
}

async function loadAdminStats() {
  busy.value = true
  try {
    const res = await reportingApi.getStats()
    adminStats.value = res.data
    message.value = 'Summary updated.'
  } catch {
    message.value = 'Failed to load summary.'
  } finally {
    busy.value = false
  }
}

async function loadTeams() {
  busy.value = true
  try {
    const res = await reportingApi.getTeams(buildTeamQueryParams())
    teamItems.value = res.data?.items || []
    teamTotal.value = res.data?.total ?? 0
    message.value = 'Team report updated.'
  } catch {
    message.value = 'Failed to load teams.'
    teamItems.value = []
    teamTotal.value = 0
  } finally {
    busy.value = false
  }
}

async function exportApplications(format) {
  busy.value = true
  try {
    const params = buildApplicationExportParams()
    const res = await reportingApi.exportApplications(params, format)
    const suffix = `${role.value || 'all'}_${program.value || 'all'}_${status.value || 'all'}`
    downloadBlob(res.data, `nti_zvit_zayavky_${suffix}.${format}`)
    message.value = `Applications export (${format.toUpperCase()}) generated.`
  } catch {
    message.value = `Failed to export applications (${format.toUpperCase()}).`
  } finally {
    busy.value = false
  }
}

async function exportTeams(format) {
  busy.value = true
  try {
    const res = await reportingApi.exportTeams(buildTeamExportParams(), format)
    downloadBlob(res.data, `nti_zvit_komandy_${format}.${format}`)
    message.value = `Teams export (${format.toUpperCase()}) generated.`
  } catch {
    message.value = `Failed to export teams (${format.toUpperCase()}).`
  } finally {
    busy.value = false
  }
}

async function exportEvaluationExcel() {
  if (!evalCallId.value) {
    message.value = 'Please specify the call ID for the Excel evaluation.'
    return
  }
  busy.value = true
  try {
    const res = await reportingApi.exportEvaluationWorkbook(Number(evalCallId.value))
    downloadBlob(res.data, `evaluation_report_call_${evalCallId.value}.xlsx`)
    message.value = 'Excel evaluation report downloaded.'
  } catch {
    message.value = 'Failed to generate Excel evaluation.'
  } finally {
    busy.value = false
  }
}

function onTeamFilterSubmit() {
  teamPage.value = 0
  loadTeams()
}

function teamPrevPage() {
  if (teamPage.value > 0) {
    teamPage.value -= 1
    loadTeams()
  }
}

function teamNextPage() {
  if ((teamPage.value + 1) * teamPageSize < teamTotal.value) {
    teamPage.value += 1
    loadTeams()
  }
}

function statusLabel(s) {
  const map = {
    DRAFT: 'Draft',
    SUBMITTED: 'Submitted',
    IN_REVIEW: 'In review',
    NEEDS_REVISION: 'Needs revision',
    APPROVED: 'Approved',
    REJECTED: 'Rejected',
  }
  return map[s] || s || '—'
}

const teamPageLabel = computed(() => {
  if (!teamTotal.value) return '0 records'
  const from = teamPage.value * teamPageSize + 1
  const to = Math.min((teamPage.value + 1) * teamPageSize, teamTotal.value)
  return `${from}–${to} of ${teamTotal.value}`
})

onMounted(async () => {
  await loadAdminStats()
  await loadTeams()
})
</script>

<template>
  <div class="panel">
    <article v-if="adminStats" class="card">
      <h3>Summary</h3>
      <p class="hint">
        Overview of competitions, applications, and teams. Detailed lists —
        <RouterLink class="inline-link" to="/app/admin/applications">Applications</RouterLink>,
        <RouterLink class="inline-link" to="/app/admin/organizations">Organizations</RouterLink>,
        <RouterLink class="inline-link" to="/app/admin/users">Users</RouterLink>.
      </p>
      <div class="stats">
        <div v-for="(value, key) in adminStats" :key="key" class="stat">
          <p class="hint">{{ statLabels[key] || key }}</p>
          <strong>{{ value ?? '—' }}</strong>
        </div>
      </div>
      <div class="row">
        <button type="button" :disabled="busy" @click="loadAdminStats">Refresh summary</button>
      </div>
    </article>

    <article class="card">
      <h3>Teams and calls</h3>
      <p class="hint">
        Team-to-call link via the leader’s application (any status). ‘No call’ — the leader has not submitted an application.
      </p>
      <div class="grid">
        <div>
          <label class="label">Call ID</label>
          <input v-model="teamCallId" type="number" min="1" placeholder="All" />
        </div>
        <div>
          <label class="label">Program</label>
          <select v-model="teamProgram">
            <option value="">All</option>
            <option value="A">Program A</option>
            <option value="B">Program B</option>
          </select>
        </div>
        <div>
          <label class="label">Application status</label>
          <select v-model="teamStatus">
            <option value="">All</option>
            <option value="DRAFT">Draft</option>
            <option value="SUBMITTED">Submitted</option>
            <option value="IN_REVIEW">In review</option>
            <option value="NEEDS_REVISION">Needs revision</option>
            <option value="APPROVED">Approved</option>
            <option value="REJECTED">Rejected</option>
          </select>
        </div>
        <div>
          <label class="label">Call link</label>
          <select v-model="teamLinked">
            <option value="">All</option>
            <option value="yes">Has application (on call)</option>
            <option value="no">No call</option>
          </select>
        </div>
        <div>
          <label class="label">Min. members</label>
          <input v-model="teamMinMembers" type="number" min="1" max="10" placeholder="E.g. 3" />
        </div>
        <label class="check-inline">
          <input v-model="teamWinnerOnly" type="checkbox" />
          <span>Winners only (APPROVED)</span>
        </label>
      </div>

      <div class="row">
        <button type="button" :disabled="busy" @click="onTeamFilterSubmit">Apply filters</button>
        <button
          v-for="fmt in formats"
          :key="'team-' + fmt"
          type="button"
          class="btn-secondary"
          :disabled="busy"
          @click="exportTeams(fmt)"
        >
          Export teams {{ fmt.toUpperCase() }}
        </button>
      </div>

      <div v-if="!teamItems.length" class="hint table-empty">No teams found for the selected filter.</div>
      <div v-else class="table-wrap">
        <table class="data-table">
          <thead>
            <tr>
              <th>Team</th>
              <th>Leader</th>
              <th>Members</th>
              <th>Call</th>
              <th>Status</th>
              <th>Milestones</th>
            </tr>
          </thead>
          <tbody>
            <tr v-for="row in teamItems" :key="row.teamId">
              <td>
                <strong>{{ row.teamName }}</strong>
                <span class="sub">#{{ row.teamId }}</span>
              </td>
              <td>
                {{ row.leaderName || '—' }}
                <span v-if="row.leaderEmail" class="sub">{{ row.leaderEmail }}</span>
              </td>
              <td>{{ row.acceptedMembers }} / {{ row.maxCapacity ?? '—' }}</td>
              <td>
                <template v-if="row.linkedToCall && row.callTitle">
                  {{ row.callTitle }}
                  <span class="sub">#{{ row.callId }}</span>
                  <span v-if="row.additionalCallsCount" class="badge">
                    +{{ row.additionalCallsCount }} call
                  </span>
                </template>
                <span v-else class="muted-cell">No call</span>
              </td>
              <td>
                <template v-if="row.applicationStatus">
                  {{ statusLabel(row.applicationStatus) }}
                  <span v-if="row.isWinner" class="badge badge--win">Winner</span>
                </template>
                <span v-else>—</span>
              </td>
              <td class="milestones-cell">
                <span>⏳ {{ row.pendingApprovalMilestones }}</span>
                <span>⚠ {{ row.overdueOrAttentionMilestones }}</span>
                <span class="sub">total {{ row.totalMilestones }}</span>
              </td>
            </tr>
          </tbody>
        </table>
      </div>

      <div v-if="teamTotal > teamPageSize" class="pager">
        <button type="button" :disabled="busy || teamPage === 0" @click="teamPrevPage">← Back</button>
        <span class="hint">{{ teamPageLabel }}</span>
        <button
          type="button"
          :disabled="busy || (teamPage + 1) * teamPageSize >= teamTotal"
          @click="teamNextPage"
        >
          Next →
        </button>
      </div>
    </article>

    <article class="card">
      <h3>Application export</h3>
      <div class="grid">
        <div>
          <label class="label">Call ID</label>
          <input v-model="callId" type="number" min="1" placeholder="E.g. 1" />
        </div>
        <div>
          <label class="label">Program</label>
          <select v-model="program">
            <option value="">All</option>
            <option value="A">Program A</option>
            <option value="B">Program B</option>
          </select>
        </div>
        <div>
          <label class="label">Application status</label>
          <select v-model="status">
            <option value="">All</option>
            <option value="DRAFT">Draft</option>
            <option value="SUBMITTED">Submitted</option>
            <option value="IN_REVIEW">In review</option>
            <option value="NEEDS_REVISION">Needs revision</option>
            <option value="APPROVED">Approved</option>
            <option value="REJECTED">Rejected</option>
          </select>
        </div>
        <div>
          <label class="label">Applicant role</label>
          <select v-model="role">
            <option value="">All</option>
            <option value="student">Students</option>
            <option value="company">Companies</option>
            <option value="evaluator">Commission</option>
          </select>
        </div>
      </div>
      <div class="row">
        <button
          v-for="fmt in formats"
          :key="'app-' + fmt"
          type="button"
          :disabled="busy"
          @click="exportApplications(fmt)"
        >
          Export applications {{ fmt.toUpperCase() }}
        </button>
      </div>
    </article>

    <article class="card">
      <h3>Evaluation report (Excel by call)</h3>
      <p class="hint">Criteria and average scores by call.</p>
      <div class="row tight">
        <input
          v-model="evalCallId"
          type="number"
          min="1"
          class="narrow"
          placeholder="Call ID"
        />
        <button type="button" :disabled="busy" @click="exportEvaluationExcel">
          Download evaluation_report.xlsx
        </button>
      </div>
    </article>

    <p v-if="message" class="message info">{{ message }}</p>
  </div>
</template>

<style scoped>
.panel {
  display: flex;
  flex-direction: column;
  gap: 1rem;
}

.card {
  padding: 1rem 1.1rem;
  border-radius: 14px;
  background: rgba(255, 255, 255, 0.9);
  border: 1px solid rgba(79, 70, 229, 0.12);
}

.card h3 {
  margin: 0 0 0.5rem;
}

.grid {
  display: grid;
  gap: 0.75rem;
  grid-template-columns: repeat(2, minmax(0, 1fr));
}

.label {
  display: block;
  font-size: 0.82rem;
  color: #64748b;
  margin-bottom: 0.2rem;
}

input,
select {
  width: 100%;
  box-sizing: border-box;
  border-radius: 10px;
  border: 1px solid #cbd5e1;
  padding: 0.55rem 0.65rem;
}

input.narrow {
  max-width: 11rem;
}

.check-inline {
  display: flex;
  align-items: center;
  gap: 0.5rem;
  margin-top: 1.5rem;
  color: #334155;
  font-size: 0.88rem;
}

.check-inline input {
  width: auto;
}

.row {
  margin-top: 0.75rem;
  display: flex;
  gap: 0.6rem;
  flex-wrap: wrap;
  align-items: center;
}

.row.tight {
  margin-top: 0.5rem;
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

button.btn-secondary {
  background: #fff;
  color: #4f46e5;
  border: 1px solid #c7d2fe;
}

button:disabled {
  opacity: 0.65;
  cursor: not-allowed;
}

.stats {
  display: grid;
  gap: 0.7rem;
  grid-template-columns: repeat(3, minmax(0, 1fr));
  margin-top: 0.65rem;
}

.stat {
  border: 1px solid rgba(148, 163, 184, 0.35);
  border-radius: 10px;
  padding: 0.65rem;
}

.hint {
  margin: 0;
  color: #64748b;
  font-size: 0.84rem;
}

.inline-link {
  font-weight: 700;
  color: #4f46e5;
  text-decoration: none;
}

.inline-link:hover {
  text-decoration: underline;
}

.table-wrap {
  margin-top: 0.85rem;
  overflow-x: auto;
  border: 1px solid rgba(148, 163, 184, 0.35);
  border-radius: 12px;
}

.data-table {
  width: 100%;
  border-collapse: collapse;
  font-size: 0.86rem;
}

.data-table th,
.data-table td {
  padding: 0.6rem 0.75rem;
  text-align: left;
  border-bottom: 1px solid #e2e8f0;
}

.data-table th {
  background: #f8fafc;
  color: #475569;
  font-weight: 700;
}

.sub {
  display: block;
  font-size: 0.78rem;
  color: #64748b;
}

.muted-cell {
  color: #94a3b8;
  font-style: italic;
}

.badge {
  display: inline-block;
  margin-left: 0.35rem;
  padding: 0.1rem 0.4rem;
  border-radius: 999px;
  font-size: 0.72rem;
  font-weight: 700;
  background: #eef2ff;
  color: #3730a3;
}

.badge--win {
  background: #ecfdf5;
  color: #047857;
}

.milestones-cell {
  display: flex;
  flex-direction: column;
  gap: 0.15rem;
}

.table-empty {
  margin-top: 0.75rem;
}

.pager {
  margin-top: 0.75rem;
  display: flex;
  align-items: center;
  gap: 0.75rem;
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

@media (max-width: 900px) {
  .grid,
  .stats {
    grid-template-columns: 1fr;
  }

  .check-inline {
    margin-top: 0;
  }
}
</style>
