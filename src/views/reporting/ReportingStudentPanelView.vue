<script setup>
import { onMounted, ref } from 'vue'
import { RouterLink } from 'vue-router'
import { useI18n } from 'vue-i18n'
import { reportingApi } from '@/api/reporting'

const { t } = useI18n()

const studentDash = ref(null)
const message = ref('')
const busy = ref(false)

async function load() {
  busy.value = true
  try {
    const res = await reportingApi.getStudentDashboard()
    studentDash.value = res.data
    message.value = t('reporting.dataUpdated')
  } catch {
    message.value = t('reporting.failedStudent')
  } finally {
    busy.value = false
  }
}

onMounted(load)

function statusLabel(s) {
  const map = {
    DRAFT: t('reporting.draft'),
    SUBMITTED: t('reporting.submitted'),
    IN_REVIEW: t('reporting.inReview'),
    NEEDS_REVISION: t('reporting.needsRevision'),
    APPROVED: t('reporting.approved'),
    REJECTED: t('reporting.rejected'),
  }
  return map[s] || s
}
</script>

<template>
  <div class="panel">
    <nav class="back-row" aria-label="Reporting navigation">
      <RouterLink class="back-link" :to="{ name: 'reporting-admin' }">{{ t('reporting.toSummary') }}</RouterLink>
      <RouterLink class="back-link muted" :to="{ name: 'reporting-firm' }">{{ t('reporting.toFirm') }}</RouterLink>
    </nav>

    <article class="card hero">
      <h3>{{ t('reporting.studentPanelTitle') }}</h3>
      <p class="hint lead">{{ t('reporting.studentPanelLead') }}</p>
      <div class="quick-links">
        <RouterLink class="link-pill" to="/app/my-applications">{{ t('reporting.myApplicationsLink') }}</RouterLink>
        <RouterLink class="link-pill" to="/app/teams">{{ t('reporting.myTeamLink') }}</RouterLink>
        <RouterLink class="link-pill" to="/app/my-profile">{{ t('reporting.myProfileLink') }}</RouterLink>
      </div>
      <div class="row">
        <button type="button" :disabled="busy" @click="load">{{ t('reporting.refresh') }}</button>
      </div>
    </article>

    <template v-if="studentDash">
      <article v-if="studentDash.summary" class="card">
        <h4 class="card-title">{{ t('reporting.summary') }}</h4>
        <div class="summary-strip">
          <span>{{ t('reporting.studentSummaryApps') }} <strong>{{ studentDash.summary.applicationCount }}</strong></span>
          <span>{{ t('reporting.studentSummaryPending') }} <strong>{{ studentDash.summary.pendingApprovalMilestones }}</strong></span>
          <span>{{ t('reporting.studentSummaryOverdue') }} <strong>{{ studentDash.summary.overdueOrAttentionMilestones }}</strong></span>
          <span>{{ t('reporting.studentSummaryTeams') }} <strong>{{ studentDash.summary.teamCount }}</strong></span>
        </div>
      </article>

      <article class="card">
        <h4 class="card-title">{{ t('reporting.appsAndDeadlines') }}</h4>
        <div v-if="!studentDash.applications?.length" class="hint">{{ t('reporting.noApplications') }}</div>
        <div v-for="row in studentDash.applications" :key="row.applicationId" class="list-row">
          <div class="list-row__title">
            <strong>#{{ row.applicationId }}</strong>
            {{ row.callTitle || '—' }}
          </div>
          <div class="meta">
            <span class="badge">{{ statusLabel(row.status) }}</span>
            <span v-if="row.callDeadline">{{ t('reporting.callDeadline') }} {{ row.callDeadline }}</span>
            <span v-if="row.programName">{{ row.programName }} ({{ row.programType }})</span>
            <span v-if="row.callStatus">{{ t('reporting.callStatus') }} {{ row.callStatus }}</span>
          </div>
          <div class="hint small">
            {{ t('reporting.requiredMilestones', { pendingApproval: row.pendingApprovalMilestones, overdueOrAttention: row.overdueOrAttentionMilestones, total: row.totalMilestones }) }}
          </div>
        </div>
      </article>

      <article class="card">
        <h4 class="card-title">{{ t('reporting.teamsSection') }}</h4>
        <div v-if="!studentDash.teams?.length" class="hint">{{ t('reporting.noAcceptedTeams') }}</div>
        <div v-for="team in studentDash.teams" :key="team.teamId" class="list-row">
          <strong>{{ team.name }}</strong>
          <span class="hint"> — {{ team.role }}, {{ t('reporting.colMembers').toLowerCase() }}: {{ team.acceptedMembers }}</span>
        </div>
      </article>
    </template>

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

.card.hero .lead {
  margin: 0.5rem 0 0.75rem;
}

.card-title {
  margin: 0 0 0.65rem;
  font-size: 1rem;
  color: #334155;
}

.quick-links {
  display: flex;
  flex-wrap: wrap;
  gap: 0.5rem;
  margin-bottom: 0.75rem;
}

.link-pill {
  display: inline-block;
  padding: 0.35rem 0.75rem;
  border-radius: 999px;
  background: #eef2ff;
  color: #4338ca;
  font-weight: 600;
  font-size: 0.85rem;
  text-decoration: none;
}

.link-pill:hover {
  background: #e0e7ff;
}

.row {
  display: flex;
  gap: 0.6rem;
  flex-wrap: wrap;
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

.summary-strip {
  display: flex;
  flex-wrap: wrap;
  gap: 0.75rem 1rem;
  padding: 0.6rem 0.75rem;
  background: #f8fafc;
  border-radius: 10px;
  border: 1px solid #e2e8f0;
}

.list-row {
  border: 1px solid #e2e8f0;
  border-radius: 10px;
  padding: 0.55rem 0.65rem;
  margin-top: 0.45rem;
}

.list-row__title {
  font-size: 0.95rem;
}

.meta {
  display: flex;
  flex-wrap: wrap;
  gap: 0.5rem 0.75rem;
  font-size: 0.84rem;
  color: #475569;
  margin-top: 0.35rem;
  align-items: center;
}

.badge {
  background: #f1f5f9;
  padding: 0.15rem 0.45rem;
  border-radius: 6px;
  font-weight: 600;
}

.hint {
  margin: 0;
  color: #64748b;
  font-size: 0.84rem;
}

.hint.small {
  font-size: 0.78rem;
  margin-top: 0.35rem;
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

.back-row {
  display: flex;
  flex-wrap: wrap;
  gap: 0.75rem 1rem;
  align-items: center;
}

.back-link {
  font-weight: 600;
  color: #4f46e5;
  text-decoration: none;
}

.back-link:hover {
  text-decoration: underline;
}

.back-link.muted {
  color: #64748b;
}
</style>
