<template>
  <div class="page">
    <section class="page__head">
      <p class="eyebrow">Student</p>
      <h2 class="page__title">My team</h2>
      <p class="page__sub">Create a team or join an existing one</p>
    </section>

    <div v-if="loading" class="state-msg">Loading...</div>
    <div v-else-if="loadError" class="alert alert--error">{{ loadError }}</div>

    <div v-else class="content">
      <!-- Pending invitations -->
      <div v-if="invites.length" class="card">
        <div class="card__head">
          <h3 class="card__title">
            <span class="badge badge--warn">{{ invites.length }}</span>
            Team invitations
          </h3>
        </div>
        <div class="invites-list">
          <div v-for="inv in invites" :key="inv.id" class="invite-row">
            <div class="invite-row__info">
              <span class="invite-row__team">Team: <strong>{{ inv.teamId }}</strong></span>
              <span class="invite-row__date">{{ formatDate(inv.invitedAt) }}</span>
            </div>
            <div class="invite-row__actions">
              <button
                type="button"
                class="btn btn--primary btn--sm"
                :disabled="respondingId === inv.id"
                @click="respond(inv, true)"
              >
                Accept
              </button>
              <button
                type="button"
                class="btn btn--ghost btn--sm"
                :disabled="respondingId === inv.id"
                @click="respond(inv, false)"
              >
                Decline
              </button>
            </div>
          </div>
        </div>
        <div v-if="respondError" class="alert alert--error">{{ respondError }}</div>
      </div>

      <!-- No team: create form -->
      <div v-if="!team" class="card">
        <div class="card__head">
          <h3 class="card__title">You don't have a team yet</h3>
        </div>
        <p class="hint-text">Create a new team or wait for an invitation from a leader.</p>

        <div v-if="!showCreateForm" class="create-trigger">
          <button type="button" class="btn btn--primary" @click="showCreateForm = true">
            + Create team
          </button>
        </div>

        <div v-else class="create-form">
          <div v-if="createError" class="alert alert--error">{{ createError }}</div>
          <div class="form">
            <div class="form__row">
              <div class="field">
                <label class="field__label">Team name *</label>
                <input v-model="createForm.name" class="field__input" placeholder="E.g.: Innovators" />
              </div>
              <div class="field">
                <label class="field__label">Max members</label>
                <input
                  v-model.number="createForm.maxCapacity"
                  class="field__input"
                  type="number"
                  min="2"
                  max="10"
                  placeholder="5"
                />
              </div>
            </div>
            <div class="field field--full">
              <label class="field__label">Competencies</label>
              <input
                v-model="createForm.competencies"
                class="field__input"
                placeholder="E.g.: Backend, ML, Design"
              />
            </div>
            <div class="field field--full">
              <label class="field__label">Description</label>
              <textarea
                v-model="createForm.description"
                class="field__input field__textarea"
                rows="3"
                placeholder="Brief team description"
              />
            </div>
          </div>
          <div class="form__actions">
            <button type="button" class="btn btn--primary" :disabled="creating" @click="createTeam">
              {{ creating ? 'Creating...' : 'Create' }}
            </button>
            <button type="button" class="btn btn--ghost" @click="showCreateForm = false">Cancel</button>
          </div>
        </div>
      </div>

      <!-- Existing team -->
      <div v-if="team" class="card">
        <div class="card__head">
          <div>
            <h3 class="card__title">{{ team.name }}</h3>
            <p class="card__sub-text">{{ team.description || 'No description' }}</p>
          </div>
          <span class="badge badge--info">{{ memberCount }}/{{ team.maxCapacity }} members</span>
        </div>

        <div v-if="team.competencies" class="competencies">
          <span class="field__label">Competencies:</span>
          <span class="competency-tag" v-for="c in competencyList" :key="c">{{ c }}</span>
        </div>

        <!-- Members table -->
        <div class="members-wrap">
          <table class="members-table">
            <thead>
              <tr>
                <th>Member</th>
                <th>Role</th>
                <th>Status</th>
                <th>Join date</th>
              </tr>
            </thead>
            <tbody>
              <tr v-for="m in team.members" :key="m.id">
                <td class="cell-name">{{ m.memberDisplayName || m.userId }}</td>
                <td>
                  <span class="pill" :class="m.role === 'LEADER' ? 'pill--leader' : 'pill--member'">
                    {{ m.role === 'LEADER' ? 'Leader' : 'Member' }}
                  </span>
                </td>
                <td>
                  <span class="pill" :class="statusPillClass(m.inviteStatus)">
                    {{ statusLabel(m.inviteStatus) }}
                  </span>
                </td>
                <td class="muted">{{ formatDate(m.joinedAt) }}</td>
              </tr>
            </tbody>
          </table>
        </div>

        <!-- Invite member (leader only) -->
        <div v-if="isLeader" class="invite-section">
          <h4 class="invite-section__title">Invite member</h4>
          <div v-if="inviteError" class="alert alert--error">{{ inviteError }}</div>
          <div v-if="inviteSuccess" class="alert alert--ok">Invitation sent</div>
          <div class="invite-input-row">
            <input
              v-model="inviteUserId"
              class="field__input"
              placeholder="User ID"
              @keyup.enter="inviteMember"
            />
            <button
              type="button"
              class="btn btn--primary"
              :disabled="inviting || !inviteUserId.trim()"
              @click="inviteMember"
            >
              {{ inviting ? '...' : 'Invite' }}
            </button>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, computed, onMounted } from 'vue'
import { useAuthStore } from '@/stores/auth'
import { teamsApi } from '@/api/teams'

const auth = useAuthStore()

const loading = ref(true)
const loadError = ref('')
const team = ref(null)
const invites = ref([])

const showCreateForm = ref(false)
const creating = ref(false)
const createError = ref('')
const createForm = ref({ name: '', maxCapacity: 5, competencies: '', description: '' })

const respondingId = ref(null)
const respondError = ref('')

const inviteUserId = ref('')
const inviting = ref(false)
const inviteError = ref('')
const inviteSuccess = ref(false)

const userId = computed(() => auth.user?.id ?? auth.user?.userId ?? null)

const isLeader = computed(
  () => team.value?.leaderId === userId.value,
)

const memberCount = computed(
  () => team.value?.members?.filter((m) => m.inviteStatus === 'ACCEPTED').length ?? 0,
)

const competencyList = computed(() =>
  (team.value?.competencies || '')
    .split(',')
    .map((s) => s.trim())
    .filter(Boolean),
)

onMounted(load)

async function load() {
  if (!userId.value) {
    loading.value = false
    return
  }
  loading.value = true
  loadError.value = ''
  try {
    const [teamRes, invitesRes] = await Promise.allSettled([
      teamsApi.getForUser(userId.value),
      teamsApi.getInvites(userId.value),
    ])
    if (teamRes.status === 'fulfilled') {
      team.value = teamRes.value.data || null
    }
    if (invitesRes.status === 'fulfilled') {
      invites.value = Array.isArray(invitesRes.value.data) ? invitesRes.value.data : []
    }
  } catch (e) {
    loadError.value = 'Failed to load team data'
  } finally {
    loading.value = false
  }
}

async function createTeam() {
  if (!createForm.value.name.trim()) return
  creating.value = true
  createError.value = ''
  try {
    const res = await teamsApi.create({ ...createForm.value })
    team.value = res.data
    showCreateForm.value = false
  } catch (e) {
    createError.value = e.response?.data?.message || e.response?.data || 'Failed to create team'
  } finally {
    creating.value = false
  }
}

async function respond(invite, accepted) {
  respondingId.value = invite.id
  respondError.value = ''
  try {
    await teamsApi.respond(invite.teamId, userId.value, accepted)
    invites.value = invites.value.filter((i) => i.id !== invite.id)
    if (accepted) await load()
  } catch (e) {
    respondError.value = e.response?.data?.message || 'Failed to respond to invitation'
  } finally {
    respondingId.value = null
  }
}

async function inviteMember() {
  if (!inviteUserId.value.trim()) return
  inviting.value = true
  inviteError.value = ''
  inviteSuccess.value = false
  try {
    await teamsApi.invite(team.value.id, inviteUserId.value.trim())
    inviteSuccess.value = true
    inviteUserId.value = ''
    const res = await teamsApi.getById(team.value.id)
    team.value = res.data
  } catch (e) {
    inviteError.value = e.response?.data?.message || e.response?.data || 'Failed to send invitation'
  } finally {
    inviting.value = false
  }
}

function statusLabel(s) {
  return { PENDING: 'Pending', ACCEPTED: 'Accepted', DECLINED: 'Declined', REMOVED: 'Removed' }[s] || s
}

function statusPillClass(s) {
  return {
    PENDING: 'pill--warn',
    ACCEPTED: 'pill--ok',
    DECLINED: 'pill--muted',
    REMOVED: 'pill--muted',
  }[s] || 'pill--muted'
}

function formatDate(date) {
  if (!date) return '—'
  return new Date(date).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' })
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

.content {
  display: flex;
  flex-direction: column;
  gap: 1.25rem;
}

/* ── Card ── */
.card {
  background: rgba(255, 255, 255, 0.95);
  border: 1px solid rgba(79, 70, 229, 0.1);
  border-radius: 16px;
  box-shadow: 0 12px 32px rgba(15, 23, 42, 0.06);
  padding: 1.5rem;
}

.card__head {
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  margin-bottom: 1.25rem;
  gap: 1rem;
  flex-wrap: wrap;
}

.card__title {
  margin: 0;
  font-size: 1.05rem;
  font-weight: 700;
  color: #0f172a;
  display: flex;
  align-items: center;
  gap: 0.5rem;
}

.card__sub-text {
  margin: 0.25rem 0 0;
  font-size: 0.86rem;
  color: #64748b;
}

.hint-text {
  margin: 0 0 1.25rem;
  color: #475569;
  font-size: 0.92rem;
}

/* ── Invitations ── */
.invites-list {
  display: flex;
  flex-direction: column;
  gap: 0.6rem;
}

.invite-row {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 1rem;
  padding: 0.85rem 1rem;
  border-radius: 12px;
  background: rgba(245, 158, 11, 0.06);
  border: 1px solid rgba(245, 158, 11, 0.2);
  flex-wrap: wrap;
}

.invite-row__info {
  display: flex;
  flex-direction: column;
  gap: 0.15rem;
}

.invite-row__team {
  font-size: 0.9rem;
  color: #1e293b;
}

.invite-row__date {
  font-size: 0.78rem;
  color: #64748b;
}

.invite-row__actions {
  display: flex;
  gap: 0.5rem;
}

/* ── Create form ── */
.create-trigger {
  margin-top: 0.5rem;
}

.create-form {
  margin-top: 0.5rem;
}

.form {
  display: flex;
  flex-direction: column;
  gap: 0.85rem;
}

.form__row {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 1rem;
}

.form__actions {
  display: flex;
  gap: 0.6rem;
  margin-top: 0.5rem;
}

.field {
  display: flex;
  flex-direction: column;
  gap: 0.4rem;
}

.field--full {
  grid-column: 1 / -1;
}

.field__label {
  font-size: 0.78rem;
  font-weight: 700;
  letter-spacing: 0.08em;
  text-transform: uppercase;
  color: #64748b;
}

.field__input {
  padding: 0.65rem 0.85rem;
  border-radius: 10px;
  border: 1px solid rgba(79, 70, 229, 0.2);
  background: #f8fafc;
  font-size: 0.92rem;
  color: #0f172a;
  outline: none;
  transition: border-color 0.15s ease, box-shadow 0.15s ease;
  font-family: inherit;
}

.field__input:focus {
  border-color: #4f46e5;
  box-shadow: 0 0 0 3px rgba(79, 70, 229, 0.1);
  background: white;
}

.field__textarea {
  resize: vertical;
  min-height: 80px;
}

/* ── Members table ── */
.competencies {
  display: flex;
  align-items: center;
  gap: 0.5rem;
  flex-wrap: wrap;
  margin-bottom: 1.25rem;
}

.competency-tag {
  padding: 0.25rem 0.65rem;
  border-radius: 999px;
  background: rgba(79, 70, 229, 0.1);
  color: #4338ca;
  font-size: 0.8rem;
  font-weight: 600;
}

.members-wrap {
  overflow-x: auto;
}

.members-table {
  width: 100%;
  border-collapse: collapse;
  font-size: 0.875rem;
}

.members-table th {
  text-align: left;
  padding: 0.5rem 0.75rem;
  font-size: 0.75rem;
  font-weight: 700;
  letter-spacing: 0.08em;
  text-transform: uppercase;
  color: #64748b;
  border-bottom: 1px solid rgba(15, 23, 42, 0.08);
}

.members-table td {
  padding: 0.7rem 0.75rem;
  border-bottom: 1px solid rgba(15, 23, 42, 0.05);
  color: #1e293b;
}

.members-table tbody tr:last-child td {
  border-bottom: none;
}

.cell-name {
  font-weight: 600;
}

.muted {
  color: #94a3b8;
  font-size: 0.82rem;
}

/* ── Invite section ── */
.invite-section {
  margin-top: 1.5rem;
  padding-top: 1.25rem;
  border-top: 1px solid rgba(15, 23, 42, 0.06);
}

.invite-section__title {
  margin: 0 0 0.75rem;
  font-size: 0.9rem;
  font-weight: 700;
  color: #1e293b;
}

.invite-input-row {
  display: flex;
  gap: 0.65rem;
  flex-wrap: wrap;
}

.invite-input-row .field__input {
  flex: 1;
  min-width: 160px;
}

/* ── Pills ── */
.pill {
  display: inline-block;
  padding: 0.22rem 0.65rem;
  border-radius: 999px;
  font-size: 0.75rem;
  font-weight: 600;
}

.pill--leader {
  background: rgba(79, 70, 229, 0.12);
  color: #4338ca;
}

.pill--member {
  background: rgba(15, 23, 42, 0.06);
  color: #475569;
}

.pill--ok {
  background: rgba(16, 185, 129, 0.12);
  color: #065f46;
}

.pill--warn {
  background: rgba(245, 158, 11, 0.12);
  color: #92400e;
}

.pill--muted {
  background: rgba(15, 23, 42, 0.06);
  color: #64748b;
}

/* ── Badge ── */
.badge {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  min-width: 1.4rem;
  height: 1.4rem;
  padding: 0 0.35rem;
  border-radius: 999px;
  font-size: 0.72rem;
  font-weight: 700;
}

.badge--warn {
  background: rgba(245, 158, 11, 0.18);
  color: #92400e;
}

.badge--info {
  background: rgba(79, 70, 229, 0.12);
  color: #4338ca;
  padding: 0.25rem 0.65rem;
  font-size: 0.8rem;
  height: auto;
}

/* ── Buttons ── */
.btn {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  padding: 0.6rem 1.1rem;
  border-radius: 999px;
  font-weight: 700;
  font-size: 0.88rem;
  cursor: pointer;
  border: none;
  transition: transform 0.15s ease, box-shadow 0.15s ease, background 0.15s ease;
  white-space: nowrap;
}

.btn--sm {
  padding: 0.4rem 0.85rem;
  font-size: 0.82rem;
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

.btn--ghost {
  background: transparent;
  color: #4f46e5;
  border: 1px solid rgba(79, 70, 229, 0.3);
}

.btn--ghost:hover:not(:disabled) {
  background: rgba(79, 70, 229, 0.06);
}

.btn--ghost:disabled {
  opacity: 0.5;
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

.state-msg {
  color: #94a3b8;
  padding: 3rem;
  text-align: center;
}

@media (max-width: 640px) {
  .form__row {
    grid-template-columns: 1fr;
  }
}
</style>
