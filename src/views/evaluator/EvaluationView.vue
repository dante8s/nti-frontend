<template>
  <div class="page">
    <section class="page__head">
      <p class="eyebrow">Commission</p>
      <h2 class="page__title">Application evaluation</h2>
      <p class="page__sub">Select a call and evaluate submitted applications by criteria</p>
    </section>

    <!-- Call selector -->
    <div class="call-selector card">
      <label class="field__label">Call (Call ID)</label>
      <div class="call-input-row">
        <input
          v-model="callIdInput"
          class="field__input"
          placeholder="Enter call ID"
          @keyup.enter="loadCall"
        />
        <button type="button" class="btn btn--primary" :disabled="!callIdInput.trim() || callLoading" @click="loadCall">
          {{ callLoading ? 'Loading...' : 'Load' }}
        </button>
      </div>
      <div v-if="callError" class="alert alert--error">{{ callError }}</div>
    </div>

    <div v-if="applications.length || criteria.length" class="workspace">
      <!-- Applications list -->
      <div class="apps-panel card">
        <h3 class="panel-title">Applications ({{ applications.length }})</h3>
        <div v-if="applications.length === 0" class="empty-msg">No applications in the queue</div>
        <div v-else class="apps-list">
          <button
            v-for="app in applications"
            :key="app.id"
            type="button"
            class="app-item"
            :class="{ 'app-item--active': selectedApp?.id === app.id }"
            @click="selectApp(app)"
          >
            <div class="app-item__name">{{ app.applicantId }}</div>
            <div class="app-item__meta">{{ app.programName }}</div>
            <span class="app-item__status" :class="statusClass(app.status)">
              {{ statusLabel(app.status) }}
            </span>
          </button>
        </div>
      </div>

      <!-- Scoring panel -->
      <div class="score-panel">
        <div v-if="!selectedApp" class="card empty-select">
          <p>Select an application from the list</p>
        </div>

        <div v-else class="card">
          <div class="score-panel__head">
            <div>
              <h3 class="panel-title">Application #{{ selectedApp.id }}</h3>
              <p class="panel-sub">{{ selectedApp.programName }}</p>
            </div>
            <div v-if="completionInfo" class="completion">
              <span
                class="completion__badge"
                :class="completionInfo.complete ? 'completion__badge--ok' : 'completion__badge--pending'"
              >
                {{ completionInfo.complete ? '✓ Evaluated' : `${scoredCount}/${completionInfo.totalCriteria} criteria` }}
              </span>
            </div>
          </div>

          <div v-if="scoreError" class="alert alert--error">{{ scoreError }}</div>
          <div v-if="scoreSuccess" class="alert alert--ok">Scores saved</div>

          <div v-if="loadingScores" class="state-msg">Loading scores...</div>

          <div v-else-if="criteria.length === 0" class="empty-msg">No criteria for this call</div>

          <div v-else class="criteria-list">
            <div v-for="c in criteria" :key="c.id" class="criterion">
              <div class="criterion__header">
                <div>
                  <span class="criterion__name">{{ c.name }}</span>
                  <span class="criterion__weight">{{ c.weightPercent }}%</span>
                </div>
                <span class="criterion__max">max {{ c.maxScore }}</span>
              </div>
              <p v-if="c.description" class="criterion__desc">{{ c.description }}</p>

              <div class="criterion__inputs">
                <div class="score-field">
                  <label class="field__label">Score (0–{{ c.maxScore }})</label>
                  <input
                    v-model.number="scoreForm[c.id].score"
                    class="field__input score-input"
                    type="number"
                    :min="0"
                    :max="c.maxScore"
                    step="0.5"
                    placeholder="0"
                  />
                </div>
                <div class="comment-field">
                  <label class="field__label">Comment</label>
                  <input
                    v-model="scoreForm[c.id].comment"
                    class="field__input"
                    placeholder="Optional"
                  />
                </div>
                <div class="recommendation-field">
                  <label class="field__label">Recommendation</label>
                  <select v-model="scoreForm[c.id].recommendation" class="field__input field__select">
                    <option value="">— select —</option>
                    <option value="APPROVE">Approve</option>
                    <option value="REJECT">Reject</option>
                    <option value="REQUEST_CHANGES">Request changes</option>
                    <option value="ABSTAIN">Abstain</option>
                  </select>
                </div>
              </div>
            </div>
          </div>

          <div v-if="criteria.length" class="submit-row">
            <button
              type="button"
              class="btn btn--primary"
              :disabled="submitting"
              @click="submitScores"
            >
              {{ submitting ? 'Saving...' : '💾 Save all scores' }}
            </button>

            <div v-if="averageInfo" class="average-info">
              <span class="average-info__label">Average:</span>
              <span class="average-info__val">{{ averageInfo.weightedAverage?.toFixed(2) }}</span>
              <span class="average-info__hint">(weighted)</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, computed, watch } from 'vue'
import { useAuthStore } from '@/stores/auth'
import { evaluationsApi } from '@/api/evaluations'

const auth = useAuthStore()
const evaluatorId = computed(() => auth.user?.id)

const callIdInput = ref('')
const callLoading = ref(false)
const callError = ref('')

const applications = ref([])
const criteria = ref([])
const selectedApp = ref(null)
const loadingScores = ref(false)
const scoreForm = ref({})

const submitting = ref(false)
const scoreError = ref('')
const scoreSuccess = ref(false)

const completionInfo = ref(null)
const averageInfo = ref(null)

const scoredCount = computed(
  () => Object.values(scoreForm.value).filter((f) => f.score !== '' && f.score !== null).length,
)

async function loadCall() {
  const callId = callIdInput.value.trim()
  if (!callId) return
  callLoading.value = true
  callError.value = ''
  applications.value = []
  criteria.value = []
  selectedApp.value = null
  try {
    const [appsRes, critRes] = await Promise.all([
      evaluationsApi.getApplicationQueue(callId),
      evaluationsApi.getCriteria(callId),
    ])
    applications.value = Array.isArray(appsRes.data) ? appsRes.data : []
    criteria.value = Array.isArray(critRes.data) ? critRes.data : []
  } catch (e) {
    callError.value = e.response?.data?.message || 'Failed to load the call'
  } finally {
    callLoading.value = false
  }
}

async function selectApp(app) {
  selectedApp.value = app
  scoreError.value = ''
  scoreSuccess.value = ''
  completionInfo.value = null
  averageInfo.value = null
  initScoreForm()
  await loadExistingScores(app.id)
  await loadMeta(app.id)
}

function initScoreForm() {
  const form = {}
  for (const c of criteria.value) {
    form[c.id] = { score: '', comment: '', recommendation: '' }
  }
  scoreForm.value = form
}

async function loadExistingScores(appId) {
  if (!evaluatorId.value) return
  loadingScores.value = true
  try {
    const res = await evaluationsApi.getMineScores(appId, evaluatorId.value)
    const scores = Array.isArray(res.data) ? res.data : []
    for (const s of scores) {
      if (scoreForm.value[s.criteriaId]) {
        scoreForm.value[s.criteriaId] = {
          score: s.score ?? '',
          comment: s.comment || '',
          recommendation: s.recommendation || '',
        }
      }
    }
  } catch {
    // no existing scores — keep empty form
  } finally {
    loadingScores.value = false
  }
}

async function loadMeta(appId) {
  const callId = callIdInput.value.trim()
  try {
    const [avgRes, completeRes] = await Promise.allSettled([
      evaluationsApi.getAverage(appId),
      evaluationsApi.checkComplete(appId, evaluatorId.value, callId),
    ])
    if (avgRes.status === 'fulfilled') averageInfo.value = avgRes.value.data
    if (completeRes.status === 'fulfilled') completionInfo.value = completeRes.value.data
  } catch {
    // meta is optional
  }
}

async function submitScores() {
  submitting.value = true
  scoreError.value = ''
  scoreSuccess.value = false
  try {
    const promises = criteria.value
      .filter((c) => scoreForm.value[c.id]?.score !== '' && scoreForm.value[c.id]?.score !== null)
      .map((c) =>
        evaluationsApi.submitScore({
          applicationId: selectedApp.value.id,
          evaluatorId: evaluatorId.value,
          criteriaId: c.id,
          score: scoreForm.value[c.id].score,
          comment: scoreForm.value[c.id].comment || null,
          recommendation: scoreForm.value[c.id].recommendation || null,
        }),
      )
    await Promise.all(promises)
    scoreSuccess.value = true
    await loadMeta(selectedApp.value.id)
  } catch (e) {
    scoreError.value = e.response?.data?.message || 'Error saving scores'
  } finally {
    submitting.value = false
  }
}

function statusLabel(s) {
  return (
    {
      SUBMITTED: 'Submitted',
      IN_REVIEW: 'In review',
      APPROVED: 'Approved',
      REJECTED: 'Rejected',
      NEEDS_REVISION: 'Needs revision',
    }[s] || s
  )
}

function statusClass(s) {
  return s?.toLowerCase().replace(/_/g, '-') || ''
}
</script>

<style scoped>
.page {
  width: 100%;
}

.page__head {
  margin-bottom: 1.75rem;
}

.eyebrow {
  margin: 0 0 0.35rem;
  font-size: 0.75rem;
  font-weight: 700;
  letter-spacing: 0.14em;
  text-transform: uppercase;
  color: #64748b;
}

.page__title {
  margin: 0 0 0.5rem;
  font-size: clamp(1.5rem, 3vw, 2rem);
  font-weight: 800;
  letter-spacing: -0.03em;
  color: #0f172a;
}

.page__sub {
  margin: 0;
  max-width: 36rem;
  color: #475569;
  line-height: 1.6;
}

/* ── Card ── */
.card {
  background: rgba(255, 255, 255, 0.95);
  border: 1px solid rgba(79, 70, 229, 0.1);
  border-radius: 16px;
  box-shadow: 0 12px 32px rgba(15, 23, 42, 0.06);
  padding: 1.5rem;
}

/* ── Call selector ── */
.call-selector {
  margin-bottom: 1.5rem;
}

.call-input-row {
  display: flex;
  gap: 0.65rem;
  margin-top: 0.5rem;
  flex-wrap: wrap;
}

.call-input-row .field__input {
  flex: 1;
  min-width: 160px;
}

/* ── Workspace layout ── */
.workspace {
  display: grid;
  grid-template-columns: 280px 1fr;
  gap: 1.25rem;
  align-items: start;
}

/* ── Apps panel ── */
.apps-panel {
  padding: 1.25rem;
}

.panel-title {
  margin: 0 0 1rem;
  font-size: 0.95rem;
  font-weight: 700;
  color: #0f172a;
}

.panel-sub {
  margin: 0.2rem 0 0;
  font-size: 0.82rem;
  color: #64748b;
}

.apps-list {
  display: flex;
  flex-direction: column;
  gap: 0.5rem;
}

.app-item {
  width: 100%;
  text-align: left;
  padding: 0.75rem 0.9rem;
  border-radius: 12px;
  border: 1px solid rgba(15, 23, 42, 0.08);
  background: white;
  cursor: pointer;
  transition: background 0.15s ease, border-color 0.15s ease;
}

.app-item:hover {
  background: rgba(79, 70, 229, 0.04);
  border-color: rgba(79, 70, 229, 0.15);
}

.app-item--active {
  background: rgba(79, 70, 229, 0.08);
  border-color: rgba(79, 70, 229, 0.3);
}

.app-item__name {
  font-size: 0.88rem;
  font-weight: 600;
  color: #1e293b;
  margin-bottom: 0.2rem;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.app-item__meta {
  font-size: 0.75rem;
  color: #64748b;
  margin-bottom: 0.4rem;
}

.app-item__status {
  font-size: 0.7rem;
  padding: 0.15rem 0.55rem;
  border-radius: 999px;
  font-weight: 600;
}

.submitted { background: #dbeafe; color: #1e40af; }
.in-review { background: #fef3c7; color: #92400e; }
.approved  { background: #d1fae5; color: #065f46; }
.rejected  { background: #fee2e2; color: #991b1b; }
.needs-revision { background: #fee2e2; color: #991b1b; }

/* ── Score panel ── */
.empty-select {
  display: flex;
  align-items: center;
  justify-content: center;
  min-height: 200px;
  color: #94a3b8;
}

.score-panel__head {
  display: flex;
  justify-content: space-between;
  align-items: flex-start;
  margin-bottom: 1.25rem;
  gap: 1rem;
  flex-wrap: wrap;
}

.completion__badge {
  display: inline-block;
  padding: 0.3rem 0.85rem;
  border-radius: 999px;
  font-size: 0.8rem;
  font-weight: 700;
}

.completion__badge--ok {
  background: rgba(16, 185, 129, 0.12);
  color: #065f46;
}

.completion__badge--pending {
  background: rgba(245, 158, 11, 0.12);
  color: #92400e;
}

/* ── Criteria ── */
.criteria-list {
  display: flex;
  flex-direction: column;
  gap: 1rem;
}

.criterion {
  padding: 1rem 1.1rem;
  border-radius: 12px;
  border: 1px solid rgba(79, 70, 229, 0.1);
  background: rgba(248, 250, 252, 0.8);
}

.criterion__header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 0.35rem;
}

.criterion__name {
  font-size: 0.92rem;
  font-weight: 700;
  color: #0f172a;
}

.criterion__weight {
  margin-left: 0.5rem;
  font-size: 0.75rem;
  font-weight: 600;
  color: #4f46e5;
  background: rgba(79, 70, 229, 0.1);
  padding: 0.1rem 0.45rem;
  border-radius: 999px;
}

.criterion__max {
  font-size: 0.75rem;
  color: #94a3b8;
}

.criterion__desc {
  margin: 0 0 0.75rem;
  font-size: 0.82rem;
  color: #64748b;
  line-height: 1.45;
}

.criterion__inputs {
  display: grid;
  grid-template-columns: 120px 1fr 160px;
  gap: 0.75rem;
}

.score-input {
  text-align: center;
}

/* ── Submit row ── */
.submit-row {
  display: flex;
  align-items: center;
  gap: 1.25rem;
  margin-top: 1.25rem;
  padding-top: 1.25rem;
  border-top: 1px solid rgba(15, 23, 42, 0.06);
  flex-wrap: wrap;
}

.average-info {
  display: flex;
  align-items: center;
  gap: 0.4rem;
  font-size: 0.88rem;
}

.average-info__label {
  color: #64748b;
}

.average-info__val {
  font-size: 1.1rem;
  font-weight: 800;
  color: #0f172a;
}

.average-info__hint {
  font-size: 0.78rem;
  color: #94a3b8;
}

/* ── Form fields ── */
.field__label {
  display: block;
  font-size: 0.72rem;
  font-weight: 700;
  letter-spacing: 0.08em;
  text-transform: uppercase;
  color: #64748b;
  margin-bottom: 0.35rem;
}

.field__input {
  width: 100%;
  padding: 0.6rem 0.8rem;
  border-radius: 10px;
  border: 1px solid rgba(79, 70, 229, 0.2);
  background: white;
  font-size: 0.9rem;
  color: #0f172a;
  outline: none;
  transition: border-color 0.15s ease, box-shadow 0.15s ease;
  font-family: inherit;
  box-sizing: border-box;
}

.field__input:focus {
  border-color: #4f46e5;
  box-shadow: 0 0 0 3px rgba(79, 70, 229, 0.1);
}

.field__select {
  cursor: pointer;
}

/* ── Buttons ── */
.btn {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  padding: 0.65rem 1.25rem;
  border-radius: 999px;
  font-weight: 700;
  font-size: 0.9rem;
  cursor: pointer;
  border: none;
  transition: transform 0.15s ease, box-shadow 0.15s ease, background 0.15s ease;
  white-space: nowrap;
}

.btn--primary {
  background: #4f46e5;
  color: white;
  box-shadow: 0 8px 24px rgba(79, 70, 229, 0.22);
}

.btn--primary:hover:not(:disabled) {
  transform: translateY(-1px);
  background: #4338ca;
}

.btn--primary:disabled {
  opacity: 0.55;
  cursor: not-allowed;
}

/* ── Alerts ── */
.alert {
  padding: 0.75rem 1rem;
  border-radius: 10px;
  font-size: 0.88rem;
  margin-bottom: 0.75rem;
}

.alert--error {
  background: rgba(220, 38, 38, 0.08);
  border: 1px solid rgba(220, 38, 38, 0.25);
  color: #991b1b;
}

.alert--ok {
  background: rgba(16, 185, 129, 0.08);
  border: 1px solid rgba(16, 185, 129, 0.25);
  color: #065f46;
}

.empty-msg,
.state-msg {
  color: #94a3b8;
  font-size: 0.9rem;
  padding: 0.5rem 0;
}

@media (max-width: 960px) {
  .workspace {
    grid-template-columns: 1fr;
  }
}

@media (max-width: 640px) {
  .criterion__inputs {
    grid-template-columns: 1fr;
  }
}
</style>
