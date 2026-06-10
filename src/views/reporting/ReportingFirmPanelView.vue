<script setup>
import { onMounted, ref } from 'vue'
import { RouterLink } from 'vue-router'
import { useI18n } from 'vue-i18n'
import { reportingApi } from '@/api/reporting'

const { t } = useI18n()

const firmDash = ref(null)
const message = ref('')
const busy = ref(false)

async function load() {
  busy.value = true
  try {
    const res = await reportingApi.getFirmDashboard()
    firmDash.value = res.data
    message.value = t('reporting.dataUpdated')
  } catch {
    message.value = t('reporting.failedFirm')
  } finally {
    busy.value = false
  }
}

onMounted(load)
</script>

<template>
  <div class="panel">
    <nav class="back-row" aria-label="Reporting navigation">
      <RouterLink class="back-link" :to="{ name: 'reporting-admin' }">{{ t('reporting.toSummary') }}</RouterLink>
      <RouterLink class="back-link muted" :to="{ name: 'reporting-student' }">{{ t('reporting.toStudent') }}</RouterLink>
    </nav>

    <article class="card hero">
      <h3>{{ t('reporting.firmPanelTitle') }}</h3>
      <p class="hint lead">{{ t('reporting.firmPanelLead') }}</p>
      <div class="quick-links">
        <RouterLink class="link-pill" to="/app/programs/my">{{ t('reporting.myProposalsLink') }}</RouterLink>
        <RouterLink class="link-pill" to="/app/org/profile">{{ t('reporting.orgProfileLink') }}</RouterLink>
      </div>
      <div class="row">
        <button type="button" :disabled="busy" @click="load">{{ t('reporting.refresh') }}</button>
      </div>
    </article>

    <template v-if="firmDash">
      <article v-if="firmDash.summary" class="card">
        <h4 class="card-title">{{ t('reporting.summary') }}</h4>
        <div class="summary-strip">
          <span>{{ t('reporting.programs') }} <strong>{{ firmDash.summary.programCount }}</strong></span>
          <span>{{ t('reporting.applicationsOrg') }} <strong>{{ firmDash.summary.applicationCount }}</strong></span>
          <span>{{ t('reporting.mentorshipsAssign') }} <strong>{{ firmDash.summary.mentorshipCount }}</strong></span>
          <span>{{ t('reporting.openCalls') }} <strong>{{ firmDash.summary.openCallCount }}</strong></span>
        </div>
        <p class="hint note">{{ t('reporting.budgetsNote') }}</p>
      </article>

      <article
        v-for="org in firmDash.organizations"
        :key="org.organizationId"
        class="card org-card"
      >
        <h4 class="org-name">{{ org.organizationName }}</h4>
        <p class="hint org-meta">
          {{ t('reporting.orgAppsAndMentorships', { appCount: org.applicationCount, mentorCount: org.mentorshipCount }) }}
        </p>

        <h5 class="sub">{{ t('reporting.programsLoad') }}</h5>
        <ul class="program-list">
          <li v-for="pr in org.programs" :key="pr.programId">
            <span class="pr-name">{{ pr.name }}</span>
            <span class="hint">({{ pr.type }}, {{ pr.status }})</span>
            — {{ t('reporting.appsOnProgram') }} <strong>{{ pr.applicationsOnProgram }}</strong>
          </li>
        </ul>

        <h5 class="sub">{{ t('reporting.callsAndApps') }}</h5>
        <div v-if="!org.calls?.length" class="hint">{{ t('reporting.noCallsForPrograms') }}</div>
        <div v-for="c in org.calls" :key="c.callId" class="list-row">
          <div class="list-row__title">
            <strong>{{ c.title }}</strong>
          </div>
          <div class="meta">
            <span>{{ t('reporting.deadline') }} {{ c.deadline }}</span>
            <span>{{ t('reporting.callStatus') }} {{ c.status }}</span>
            <span>{{ t('reporting.program') }}: {{ c.programName }}</span>
            <span>{{ t('reporting.appsOnCall') }} <strong>{{ c.applicationsOnCall }}</strong></span>
          </div>
        </div>
      </article>

      <article v-if="!firmDash.organizations?.length" class="card">
        <p class="hint">{{ t('reporting.noLinkedOrgs') }}</p>
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
  background: #f0fdf4;
  color: #166534;
  font-weight: 600;
  font-size: 0.85rem;
  text-decoration: none;
}

.link-pill:hover {
  background: #dcfce7;
}

.row {
  display: flex;
  gap: 0.6rem;
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

.note {
  margin-top: 0.65rem;
  font-size: 0.8rem;
}

.org-card + .org-card {
  margin-top: 0;
}

.org-name {
  margin: 0 0 0.25rem;
  color: #0f172a;
}

.org-meta {
  margin-bottom: 0.75rem;
}

.sub {
  margin: 1rem 0 0.4rem;
  font-size: 0.92rem;
  color: #334155;
}

.program-list {
  margin: 0.25rem 0 0;
  padding-left: 1.15rem;
  color: #334155;
}

.pr-name {
  font-weight: 600;
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
}

.hint {
  margin: 0;
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
