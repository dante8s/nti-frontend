<template>
  <div class="application-details">
    <button type="button" class="application-details__back-btn" @click="goBack">
      ← Back
    </button>

    <div v-if="loading" class="application-details__state">
      Loading application...
    </div>
    <div v-else-if="error" class="application-details__state application-details__state--error">
      {{ error }}
    </div>
    <div v-else-if="!application" class="application-details__state">
      Application was not found.
    </div>
    <div v-else class="application-details__content">
      <header class="application-details__header">
        <div>
          <h1 class="application-details__title">
            {{ application.programName || 'Application' }}
          </h1>
          <p class="application-details__subtitle">
            {{ application.callTitle || '—' }}
          </p>
        </div>
        <div class="application-details__header-actions">
          <!-- <button
            v-if="programProposalRoute"
            type="button"
            class="application-details__proposal-btn"
            @click="openProgramProposal"
          >
            Open Program Proposal
          </button> -->
          <StatusBadge :status="application.status" :label="statusLabel(application.status)" />
        </div>
      </header>

      <section v-if="canAssignProductOwner" class="application-details__product-owner">
        <div class="application-details__section-head">
          <h2 class="application-details__section-title">Product Owner</h2>
        </div>
        <p v-if="productOwnerError" class="application-details__error">
          {{ productOwnerError }}
        </p>
        <p v-if="membersError" class="application-details__error">
          {{ membersError }}
        </p>
        <div v-if="membersLoading" class="application-details__meta">
          Loading organization members...
        </div>
        <div v-else-if="!applicationOrganizationId" class="application-details__meta">
          Organization not found for this application.
        </div>
        <div v-else-if="eligibleOrganizationMembers.length === 0" class="application-details__meta">
          No eligible organization members found.
        </div>
        <div v-else class="application-details__product-owner-row">
          <select
            v-model="productOwnerUserId"
            class="application-details__select"
            :disabled="assigningProductOwner"
            @change="onAssignProductOwner"
          >
            <option value="">
              Assign Product Owner
            </option>
            <option
  v-for="member in eligibleOrganizationMembers"
  :key="member.id"
  :value="String(member.userId ?? member.id)"
>
  {{ memberDisplayName(member) }}
</option>
          </select>
          <span class="application-details__meta">
            {{ assigningProductOwner ? 'Saving...' : 'Organization members' }}
          </span>
        </div>

        <div v-if="currentProductOwnerName" class="application-details__current-po">
          <span class="application-details__current-po-label">Current Product Owner:</span>
          <strong class="application-details__current-po-value">{{ currentProductOwnerName }}</strong>
        </div>
      </section>

      <nav class="application-details__tabs" aria-label="Application sections">
        <button
          v-for="tab in tabs"
          :key="tab.key"
          type="button"
          class="application-details__tab-btn"
          :class="{ 'application-details__tab-btn--active': activeTab === tab.key }"
          @click="activeTab = tab.key"
        >
          {{ tab.label }}
        </button>
      </nav>

      <section v-if="activeTab === 'overview'" class="application-details__panel">
        <dl class="application-details__overview-grid">
          <div class="application-details__overview-item">
            <dt>Application ID</dt>
            <dd>#{{ application.id }}</dd>
          </div>
          <div class="application-details__overview-item">
            <dt>Program type</dt>
            <dd>{{ application.programType || '—' }}</dd>
          </div>
          <div class="application-details__overview-item">
            <dt>Created</dt>
            <dd>{{ formatDateTime(application.createdAt) }}</dd>
          </div>
          <div class="application-details__overview-item">
            <dt>Last update</dt>
            <dd>{{ formatDateTime(application.updatedAt) }}</dd>
          </div>
          <div class="application-details__overview-item application-details__overview-item--wide">
            <dt>Admin comment</dt>
            <dd>{{ application.adminComment || '—' }}</dd>
          </div>
        </dl>
      </section>

      <section v-else-if="activeTab === 'milestone'" class="application-details__panel">
        <div class="application-details__section-head">
          <h2 class="application-details__section-title">Milestones</h2>
          <button
            v-if="canCreateMilestone"
            type="button"
            class="application-details__primary-btn"
            @click="openCreateMilestoneModal"
          >
            Add Milestone
          </button>
        </div>

        <div v-if="milestoneList.length === 0" class="application-details__empty">
          No milestones yet.
        </div>
        <div v-else class="application-details__timeline">
          <article v-for="milestone in milestoneList" :key="milestone.id" class="application-details__card application-details__timeline-item">
            <span class="application-details__timeline-dot" aria-hidden="true" />
            <div class="application-details__card-head">
              <h3 class="application-details__card-title">
                {{ milestone.title || '—' }}
              </h3>
              <div class="application-details__status-controls">
                <StatusBadge :status="milestone.status" />
                <template v-if="canUpdateMilestoneStatus(milestone)">
                  <select
                    v-model="milestoneNextStatuses[milestone.id]"
                    class="application-details__select"
                  >
                    <option disabled value="">
                      Update status...
                    </option>
                    <option
                      v-for="nextStatus in allowedStatusOptions(milestone)"
                      :key="`${milestone.id}-${nextStatus}`"
                      :value="nextStatus"
                    >
                      {{ nextStatus }}
                    </option>
                  </select>
                  <button
                    type="button"
                    class="application-details__secondary-btn"
                    :disabled="!milestoneNextStatuses[milestone.id]"
                    @click="updateMilestoneStatus(milestone)"
                  >
                    Update Status
                  </button>
                </template>
              </div>
            </div>
            <p class="application-details__meta">
              Due: {{ formatDate(milestone.dueDate) }}
            </p>
            <p class="application-details__description">
              {{ milestone.description || '—' }}
            </p>

            <MilestoneDetailsPanel :milestone-id="milestone.id" />

            <div class="application-details__actions">
              <button
                v-if="canEditMilestone(milestone)"
                type="button"
                class="application-details__secondary-btn"
                @click="openEditMilestoneModal(milestone)"
              >
                Edit
              </button>
              <button
                v-if="canDeleteMilestone(milestone)"
                type="button"
                class="application-details__danger-btn"
                @click="deleteMilestone(milestone)"
              >
                Remove
              </button>

              <button
                v-if="isAdmin && milestone.status === MilestoneStatus.PENDING_APPROVAL"
                type="button"
                class="application-details__primary-btn"
                @click="approveMilestone(milestone)"
              >
                Approve
              </button>
            </div>
          </article>
        </div>
      </section>

      <section v-else-if="activeTab === 'mentorship'" class="application-details__panel">
        <div class="application-details__section-head">
          <h2 class="application-details__section-title">Mentorship</h2>
          <button
            v-if="isAdmin"
            type="button"
            class="application-details__primary-btn"
            :class="{ 'application-details__primary-btn--disabled': hasActiveMentorship }"
            :disabled="hasActiveMentorship"
            @click="openAssignMentorModal"
          >
            Assign Mentor
          </button>
        </div>
        <p v-if="mentorshipError" class="application-details__error">
          {{ mentorshipError }}
        </p>

        <div v-if="mentorshipList.length === 0" class="application-details__empty">
          No mentorship records.
        </div>
        <div v-else class="application-details__list">
          <article
            v-for="(mentorship, index) in mentorshipList"
            :key="mentorship.id"
            class="application-details__card"
          >
            <div class="application-details__card-head">
              <h3 class="application-details__card-title">
                {{ mentorship.mentorName || 'Unknown mentor' }}
                <span v-if="index === 0" class="application-details__current-tag">Current</span>
              </h3>
              <StatusBadge :status="mentorship.status" />
            </div>
            <p class="application-details__meta">
              Assigned: {{ formatDateTime(mentorship.startDate || mentorship.createdAt) }}
            </p>
            <ConsultationsPanel :mentorship-id="mentorship.id" />
            <div v-if="isAdmin && mentorship.status === MentorshipStatus.ACTIVE" class="application-details__actions">
              <select v-model="mentorshipNextStatuses[mentorship.id]" class="application-details__select">
                <option disabled value="">
                  Close as...
                </option>
                <option :value="MentorshipStatus.COMPLETED">
                  COMPLETED
                </option>
                <option :value="MentorshipStatus.CANCELLED">
                  CANCELLED
                </option>
              </select>
              <button
                type="button"
                class="application-details__secondary-btn"
                :disabled="!mentorshipNextStatuses[mentorship.id]"
                @click="updateMentorshipStatus(mentorship)"
              >
                Change Status
              </button>
            </div>
          </article>
        </div>
      </section>

      <section v-else class="application-details__panel">
        <div class="application-details__section-head">
          <h2 class="application-details__section-title">Consultation Notes</h2>
          <button
            v-if="isMentor"
            type="button"
            class="application-details__primary-btn"
            @click="openCreateNoteModal"
          >
            Add Note
          </button>
        </div>

        <div v-if="noteList.length === 0" class="application-details__empty">
          No notes yet.
        </div>
        <div v-else class="application-details__list">
          <article v-for="note in noteList" :key="note.id" class="application-details__card">
            <div class="application-details__card-head">
              <h3 class="application-details__card-title">
                {{ note.createdByName || '—' }}
              </h3>
              <span class="application-details__meta">{{ formatDateTime(note.createdAt) }}</span>
            </div>
            <p class="application-details__description">
              {{ note.content || '—' }}
            </p>
            <div v-if="canManageNote(note)" class="application-details__actions">
              <button
                type="button"
                class="application-details__secondary-btn"
                @click="openEditNoteModal(note)"
              >
                Edit
              </button>
              <button
                type="button"
                class="application-details__danger-btn"
                @click="deleteNote(note)"
              >
                Delete
              </button>
            </div>
          </article>
        </div>
      </section>
    </div>

    <MilestoneFormModal
      v-model="milestoneModalOpen"
      :application-id="applicationIdNumber"
      :milestone="editingMilestone"
      @created="onMilestoneSaved"
    />

    <div v-if="assignModalOpen" class="application-details__modal-overlay" @click.self="assignModalOpen = false">
      <div class="application-details__modal">
        <h3 class="application-details__modal-title">Assign Mentor</h3>
        <label class="application-details__field">
          <span>Mentor</span>
          <select v-model="assignMentorUserId" class="application-details__select">
            <option disabled value="">
              Select mentor...
            </option>
            <option v-for="mentor in publicMentors" :key="mentor.id" :value="String(mentor.id)">
              {{ mentor.name }}
            </option>
          </select>
        </label>
        <div class="application-details__actions">
          <button type="button" class="application-details__secondary-btn" @click="assignModalOpen = false">
            Cancel
          </button>
          <button
            type="button"
            class="application-details__primary-btn"
            :disabled="!assignMentorUserId"
            @click="submitAssignMentor"
          >
            Assign
          </button>
        </div>
      </div>
    </div>

    <div v-if="noteModalOpen" class="application-details__modal-overlay" @click.self="closeNoteModal">
      <div class="application-details__modal">
        <h3 class="application-details__modal-title">
          {{ editingNote ? 'Edit Note' : 'Add Note' }}
        </h3>
        <label class="application-details__field">
          <span>Content</span>
          <textarea
            v-model.trim="noteFormContent"
            rows="5"
            class="application-details__textarea"
            placeholder="Write consultation note..."
          />
        </label>
        <div class="application-details__actions">
          <button type="button" class="application-details__secondary-btn" @click="closeNoteModal">
            Cancel
          </button>
          <button
            type="button"
            class="application-details__primary-btn"
            :disabled="!noteFormContent"
            @click="submitNote"
          >
            Save
          </button>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup>
import { computed, onMounted, ref, watch } from 'vue'
import { storeToRefs } from 'pinia'
import { useRoute, useRouter } from 'vue-router'
import { applicationsApi } from '@/api/applications'
import StatusBadge from '@/components/StatusBadge.vue'
import MilestoneFormModal from '@/components/MilestoneFormModal.vue'
import ConsultationsPanel from '@/components/ConsultationsPanel.vue'
import MilestoneDetailsPanel from '@/components/MilestoneDetailsPanel.vue'
import { MilestoneStatus, useMilestoneStore } from '@/stores/milestone'
import { MentorshipStatus, useMentorshipStore } from '@/stores/mentorship'
import { useNoteStore } from '@/stores/note'
import { useAuthStore } from '@/stores/auth'
import { useOrganizationStore } from '@/stores/organization'
import { useApplicationsStore } from '@/stores/applications'
import { statusLabel } from '@/utils/applicationStatus'

const route = useRoute()
const router = useRouter()
const authStore = useAuthStore()
const milestoneStore = useMilestoneStore()
const mentorshipStore = useMentorshipStore()
const noteStore = useNoteStore()
const organizationStore = useOrganizationStore()
const applicationsStore = useApplicationsStore()

const { milestones } = storeToRefs(milestoneStore)
const { mentorshipsByApplication, publicMentors } = storeToRefs(mentorshipStore)
const { notesByApplication } = storeToRefs(noteStore)
const { members: organizationMembers } = storeToRefs(organizationStore)

const loading = ref(true)
const error = ref('')
const application = ref(null)
const activeTab = ref('overview')

const milestoneModalOpen = ref(false)
const editingMilestone = ref(null)
const milestoneNextStatuses = ref({})

const assignModalOpen = ref(false)
const assignMentorUserId = ref('')
const mentorshipNextStatuses = ref({})
const mentorshipError = ref('')

const noteModalOpen = ref(false)
const editingNote = ref(null)
const noteFormContent = ref('')
const productOwnerUserId = ref('')
const assigningProductOwner = ref(false)
const productOwnerError = ref('')
const loadedMembersOrgId = ref(null)
const membersLoading = ref(false)
const membersError = ref('')

const tabs = [
  { key: 'overview', label: 'Overview' },
  { key: 'milestone', label: 'Milestone' },
  { key: 'mentorship', label: 'Mentorship' },
  { key: 'notes', label: 'Consultation Notes' },
]

const roles = computed(() => authStore.roles || [])
const isAdmin = computed(() => roles.value.some((r) => r === 'ADMIN' || r === 'SUPER_ADMIN'))
const isStudent = computed(() => roles.value.includes('STUDENT'))
const isMentor = computed(() => roles.value.includes('MENTOR'))
const isFirm = computed(() => roles.value.includes('FIRM'))
const isFirmUser = computed(() => roles.value.includes('FIRM_USER'))
const isProgramBApplication = computed(() =>
  application.value?.call?.program?.type === 'PROGRAM_B'
  || application.value?.programType === 'PROGRAM_B',
)

/** Same navigation shape as AdminPrograms.openProgramDetails — program from nested call.program or flattened application fields */
const programProposalRoute = computed(() => {
  const app = application.value
  console.log('Computed Triggered. Application Value:', app)

  if (!app) return null

  // Based on your console log, let's try these specific fields:
  // 1. Check for programId, then fallback to program.id, then call.programId
  // If your API doesn't provide programId, we might need to use callId or similar
  const pId = app.programId ||
              app.program?.id ||
              app.call?.programId ||
              app.call?.program?.id ||
              app.callId; // Adding callId as a desperate fallback

  // 2. Resolve Type
  const rawType = app.programType || (app.program?.type) || '';

  console.log('ID check:', { pId, rawType });

  if (!pId) return null

  const isTypeB = String(rawType).toUpperCase().includes('B')

  return {
    name: 'program-detail',
    params: {
      type: isTypeB ? 'b' : 'a',
      id: String(pId)
    },
    query: {
      type: isTypeB ? 'B' : 'A'
    }
  }
})
const canAssignProductOwner = computed(() => isAdmin.value && !!application.value?.id)
const applicationOrganizationId = computed(() =>
  application.value?.call?.program?.organization?.id
  ?? application.value?.call?.program?.organizationId
  ?? application.value?.organizationId
  ?? null,
)
const selectedProductOwnerId = computed(() =>
  application.value?.productOwnerId
  ?? application.value?.productOwner?.id
  ?? application.value?.assignedProductOwnerId
  ?? null,
)
const canCreateMilestone = computed(() =>
  isAdmin.value
  || isStudent.value
  || ((isFirm.value || isFirmUser.value) && isProgramBApplication.value),
)

const applicationIdNumber = computed(() => Number(route.params.id))

const milestoneList = computed(() =>
  [...(milestones.value?.[String(applicationIdNumber.value)] || [])].sort(
    (a, b) => new Date(a?.dueDate || 0) - new Date(b?.dueDate || 0),
  ),
)

const mentorshipList = computed(() =>
  [...(mentorshipsByApplication.value?.[applicationIdNumber.value] || [])].sort(
    (a, b) => new Date(b?.createdAt || 0) - new Date(a?.createdAt || 0),
  ),
)

const hasActiveMentorship = computed(() =>
  mentorshipList.value.some((m) => m?.status === MentorshipStatus.ACTIVE),
)

const noteList = computed(() =>
  [...(notesByApplication.value?.[String(applicationIdNumber.value)] || [])].sort(
    (a, b) => new Date(b?.createdAt || 0) - new Date(a?.createdAt || 0),
  ),
)

onMounted(loadApplicationDetails)
watch(() => route.params.id, loadApplicationDetails)
watch(selectedProductOwnerId, (value) => {
  productOwnerUserId.value = value != null ? String(value) : ''
})
watch(applicationOrganizationId, async (orgId) => {
  if (!canAssignProductOwner.value) return
  if (!orgId) return
  await loadOrganizationMembers(orgId)
})

async function loadApplicationDetails() {
  if (!Number.isFinite(applicationIdNumber.value) || applicationIdNumber.value <= 0) {
    error.value = 'Invalid application id.'
    loading.value = false
    return
  }
  loading.value = true
  error.value = ''
  productOwnerError.value = ''
  membersError.value = ''
  try {
    const appResponse = await applicationsApi.getOne(applicationIdNumber.value)
    application.value = appResponse.data
    if (applicationOrganizationId.value) await loadOrganizationMembers(applicationOrganizationId.value)
    const [fetchedMilestones] = await Promise.all([
      milestoneStore.fetchByApplication(applicationIdNumber.value),
      mentorshipStore.getByApplication(applicationIdNumber.value),
      noteStore.fetchNotesByApplication(applicationIdNumber.value),
    ])
    const milestoneIds = (fetchedMilestones || [])
      .map((milestone) => milestone?.id)
      .filter(Boolean)
    await Promise.all(milestoneIds.map((milestoneId) => milestoneStore.getComments(milestoneId)))
  } catch (e) {
    error.value = e.response?.data?.message || 'Failed to load application details.'
  } finally {
    loading.value = false
  }
}

async function loadOrganizationMembers(organizationId) {
  if (!organizationId) return
  if (loadedMembersOrgId.value === organizationId && (organizationMembers.value || []).length > 0) return
  membersLoading.value = true
  membersError.value = ''
  try {
    await organizationStore.fetchMembers(organizationId)
    loadedMembersOrgId.value = organizationId
  } catch (e) {
    membersError.value = e?.response?.data?.message || 'Failed to load organization members.'
  } finally {
    membersLoading.value = false
  }
}

// FIX 1: Safely supports checking nesting in case the api returns a user details object inside member
function memberDisplayName(member) {
  if (!member) return '—'
  return (
    member.userName ||
    member.name ||
    member.fullName ||
    member.userEmail ||
    member.email ||
    `User #${member.userId || member.id || '—'}`
  )
}

const eligibleOrganizationMembers = computed(() => {
  const raw = organizationMembers.value || []
  // If backend returns user roles, keep only FIRM/FIRM_USER; otherwise fall back to full list.
  const withRoleInfo = raw.filter((m) => Array.isArray(m?.userRoles) || Array.isArray(m?.roles))
  if (!withRoleInfo.length) return raw
  return raw.filter((m) => {
    const rolesList = m?.userRoles || m?.roles || []
    return rolesList.includes('FIRM') || rolesList.includes('FIRM_USER')
  })
})

// FIX 2: Resolves the display name of the selected Product Owner securely
const currentProductOwnerName = computed(() => {
  if (!selectedProductOwnerId.value) return null

  // 1. Look for matching member in loaded organization list (by member.id or nested user.id)
  const member = (organizationMembers.value || []).find((m) => {
    const memberId = String(m?.id)
    const userId = String(m?.user?.id || m?.userId || '')
    const targetId = String(selectedProductOwnerId.value)
    return memberId === targetId || userId === targetId
  })

  if (member) {
    return memberDisplayName(member)
  }

  // 2. Fallback directly to the application's nested product owner profile payload if loaded
  if (application.value?.productOwner) {
    const po = application.value.productOwner
    return po.name || po.fullName || po.email || `User #${po.id}`
  }

  return `User #${selectedProductOwnerId.value}`
})

async function onAssignProductOwner() {
  if (!application.value?.id || !productOwnerUserId.value) return
  assigningProductOwner.value = true
  productOwnerError.value = ''
  try {
    const updatedApplication = await applicationsStore.assignProductOwner(
      application.value.id,
      Number(productOwnerUserId.value),
    )
    application.value = updatedApplication
  } catch (e) {
    productOwnerError.value = e?.response?.data?.message || 'Failed to assign Product Owner.'
  } finally {
    assigningProductOwner.value = false
  }
}

function goBack() {
  router.back()
}

function openProgramProposal() {
  const route = programProposalRoute.value
  if (!route) return
  router.push(route)
}

function formatDateTime(value) {
  if (!value) return '—'
  return new Date(value).toLocaleString('uk-UA', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  })
}

function formatDate(value) {
  if (!value) return '—'
  return new Date(value).toLocaleDateString('uk-UA', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
  })
}

function canEditMilestone(milestone) {
  if (isAdmin.value) return true
  return isStudent.value && milestone?.status === MilestoneStatus.PENDING_APPROVAL
}

function canDeleteMilestone() {
  return isAdmin.value
}

function canUpdateMilestoneStatus(milestone) {
  if (isAdmin.value) return true
  if (isMentor.value) return allowedStatusOptions(milestone).length > 0
  return false
}

function allowedStatusOptions(milestone) {
  if (!milestone?.status) return []
  return milestoneStore.getAllowedTransitions(milestone.status) || []
}

function openCreateMilestoneModal() {
  editingMilestone.value = null
  milestoneModalOpen.value = true
}

function openEditMilestoneModal(milestone) {
  editingMilestone.value = milestone
  milestoneModalOpen.value = true
}

async function onMilestoneSaved() {
  await milestoneStore.fetchByApplication(applicationIdNumber.value)
  milestoneModalOpen.value = false
  editingMilestone.value = null
}

async function deleteMilestone(milestone) {
  await milestoneStore.delete(milestone.id, applicationIdNumber.value)
  await milestoneStore.fetchByApplication(applicationIdNumber.value)
}

async function updateMilestoneStatus(milestone) {
  const nextStatus = milestoneNextStatuses.value[milestone.id]
  if (!nextStatus) return
  await milestoneStore.changeStatus(milestone.id, nextStatus, applicationIdNumber.value)
  milestoneNextStatuses.value[milestone.id] = ''
}

async function approveMilestone(milestone) {
  await milestoneStore.changeStatus(milestone.id, MilestoneStatus.PLANNED, applicationIdNumber.value)
}

async function openAssignMentorModal() {
  mentorshipError.value = ''
  if (hasActiveMentorship.value) {
    mentorshipError.value = 'Active mentorship already exists for this application.'
    return
  }
  assignMentorUserId.value = ''
  assignModalOpen.value = true
  if (!publicMentors.value?.length) {
    await mentorshipStore.getPublicMentors()
  }
}

async function submitAssignMentor() {
  if (!assignMentorUserId.value) return
  if (hasActiveMentorship.value) {
    mentorshipError.value = 'Active mentorship already exists for this application.'
    assignModalOpen.value = false
    return
  }
  await mentorshipStore.create({
    mentorUserId: Number(assignMentorUserId.value),
    applicationId: applicationIdNumber.value,
  })
  await mentorshipStore.getByApplication(applicationIdNumber.value)
  assignModalOpen.value = false
}

async function updateMentorshipStatus(mentorship) {
  const nextStatus = mentorshipNextStatuses.value[mentorship.id]
  if (!nextStatus) return
  await mentorshipStore.changeStatus(mentorship.id, nextStatus)
  await mentorshipStore.getByApplication(applicationIdNumber.value)
  mentorshipNextStatuses.value[mentorship.id] = ''
}

function openCreateNoteModal() {
  editingNote.value = null
  noteFormContent.value = ''
  noteModalOpen.value = true
}

function openEditNoteModal(note) {
  editingNote.value = note
  noteFormContent.value = note?.content || ''
  noteModalOpen.value = true
}

function closeNoteModal() {
  editingNote.value = null
  noteFormContent.value = ''
  noteModalOpen.value = false
}

function canManageNote(note) {
  if (!isMentor.value) return false
  const userEmail = authStore.user?.email
  const userName = authStore.user?.name
  return note?.createdByEmail === userEmail || note?.createdByName === userName
}

async function submitNote() {
  if (!noteFormContent.value) return
  if (editingNote.value?.id) {
    await noteStore.updateNote(editingNote.value.id, {
      applicationId: applicationIdNumber.value,
      content: noteFormContent.value,
    })
  } else {
    await noteStore.createNote({
      applicationId: applicationIdNumber.value,
      content: noteFormContent.value,
    })
  }
  await noteStore.fetchNotesByApplication(applicationIdNumber.value)
  closeNoteModal()
}

async function deleteNote(note) {
  await noteStore.deleteNote(note.id, applicationIdNumber.value)
  await noteStore.fetchNotesByApplication(applicationIdNumber.value)
}
</script>

<style scoped>
.application-details {
  width: 100%;
}

.application-details__back-btn {
  border: 1px solid rgba(79, 70, 229, 0.2);
  background: white;
  border-radius: 10px;
  padding: 0.45rem 0.8rem;
  color: #4338ca;
  font-weight: 600;
  cursor: pointer;
  margin-bottom: 1rem;
}

.application-details__back-btn:hover {
  background: rgba(79, 70, 229, 0.06);
}

.application-details__state {
  text-align: center;
  padding: 2rem 1rem;
  color: #64748b;
}

.application-details__state--error {
  color: #b91c1c;
}

.application-details__content {
  border-radius: 16px;
  border: 1px solid rgba(79, 70, 229, 0.12);
  background: rgba(255, 255, 255, 0.95);
  box-shadow: 0 14px 40px rgba(15, 23, 42, 0.06);
  padding: 1rem;
}

.application-details__header {
  display: flex;
  justify-content: space-between;
  align-items: flex-start;
  gap: 1rem;
  margin-bottom: 1rem;
}

.application-details__header-actions {
  display: flex;
  flex-direction: column;
  align-items: flex-end;
  gap: 0.5rem;
}

.application-details__proposal-btn {
  border: 1px solid rgba(79, 70, 229, 0.25);
  background: white;
  color: #4338ca;
  border-radius: 10px;
  padding: 0.43rem 0.8rem;
  font-size: 0.82rem;
  font-weight: 600;
  cursor: pointer;
  white-space: nowrap;
}

.application-details__proposal-btn:hover {
  background: rgba(79, 70, 229, 0.06);
}

.application-details__title {
  margin: 0;
  color: #0f172a;
}

.application-details__subtitle {
  margin: 0.35rem 0 0;
  color: #64748b;
}

.application-details__tabs {
  display: flex;
  flex-wrap: wrap;
  gap: 0.5rem;
  border-bottom: 1px solid rgba(15, 23, 42, 0.06);
  padding-bottom: 0.8rem;
}

.application-details__tab-btn {
  border: 1px solid rgba(79, 70, 229, 0.16);
  background: white;
  color: #4338ca;
  border-radius: 999px;
  padding: 0.4rem 0.8rem;
  font-weight: 600;
  cursor: pointer;
}

.application-details__tab-btn--active {
  background: #4f46e5;
  color: white;
  border-color: #4f46e5;
}

.application-details__tab-btn:hover:not(.application-details__tab-btn--active) {
  background: rgba(79, 70, 229, 0.06);
}

.application-details__panel {
  margin-top: 1rem;
}

.application-details__product-owner {
  margin-top: 0.9rem;
  border: 1px solid rgba(79, 70, 229, 0.12);
  border-radius: 12px;
  padding: 0.8rem;
  background: rgba(99, 102, 241, 0.03);
}

.application-details__product-owner-row {
  display: flex;
  gap: 0.6rem;
  align-items: center;
  flex-wrap: wrap;
}

/* styles for newly introduced product owner text component */
.application-details__current-po {
  margin-top: 0.75rem;
  padding-top: 0.75rem;
  border-top: 1px dashed rgba(79, 70, 229, 0.15);
  font-size: 0.9rem;
  display: flex;
  gap: 0.45rem;
  align-items: center;
}

.application-details__current-po-label {
  color: #64748b;
}

.application-details__current-po-value {
  color: #0f172a;
  font-weight: 600;
}

.application-details__overview-grid {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(180px, 1fr));
  gap: 0.8rem;
  margin: 0;
}

.application-details__overview-item {
  border: 1px solid rgba(79, 70, 229, 0.12);
  border-radius: 12px;
  padding: 0.7rem;
}

.application-details__overview-item--wide {
  grid-column: 1 / -1;
}

.application-details__overview-item dt {
  margin: 0;
  font-size: 0.75rem;
  text-transform: uppercase;
  color: #64748b;
  letter-spacing: 0.04em;
}

.application-details__overview-item dd {
  margin: 0.4rem 0 0;
  color: #0f172a;
}

.application-details__section-head {
  display: flex;
  justify-content: space-between;
  align-items: center;
  gap: 0.75rem;
  margin-bottom: 0.8rem;
}

.application-details__section-title {
  margin: 0;
  color: #0f172a;
}

.application-details__empty {
  color: #64748b;
}

.application-details__error {
  margin: 0 0 0.8rem;
  color: #b91c1c;
  font-size: 0.88rem;
}

.application-details__list {
  display: flex;
  flex-direction: column;
  gap: 0.7rem;
}

.application-details__timeline {
  position: relative;
  display: flex;
  flex-direction: column;
  gap: 0.9rem;
  padding-left: 1.2rem;
}

.application-details__timeline::before {
  content: '';
  position: absolute;
  left: 0.35rem;
  top: 0.1rem;
  bottom: 0.1rem;
  width: 2px;
  background: rgba(79, 70, 229, 0.2);
}

.application-details__card {
  border: 1px solid rgba(79, 70, 229, 0.12);
  border-radius: 12px;
  padding: 0.8rem;
}

.application-details__timeline-item {
  position: relative;
}

.application-details__timeline-dot {
  position: absolute;
  left: -1.02rem;
  top: 1rem;
  width: 10px;
  height: 10px;
  border-radius: 50%;
  background: #4f46e5;
  box-shadow: 0 0 0 3px rgba(79, 70, 229, 0.16);
}

.application-details__card-head {
  display: flex;
  justify-content: space-between;
  align-items: center;
  gap: 0.8rem;
}

.application-details__status-controls {
  display: flex;
  align-items: center;
  gap: 0.45rem;
  justify-content: flex-end;
  flex-wrap: wrap;
}

.application-details__card-title {
  margin: 0;
  color: #0f172a;
  font-size: 0.98rem;
}

.application-details__current-tag {
  margin-left: 0.35rem;
  font-size: 0.76rem;
  color: #334155;
}

.application-details__meta {
  color: #64748b;
  font-size: 0.83rem;
}

.application-details__description {
  margin: 0.45rem 0 0;
  white-space: pre-wrap;
  color: #334155;
}

.application-details__actions {
  margin-top: 0.65rem;
  display: flex;
  flex-wrap: wrap;
  gap: 0.45rem;
  align-items: center;
}

.application-details__milestone-details {
  margin-top: 0.75rem;
  border: 1px solid rgba(79, 70, 229, 0.12);
  border-radius: 12px;
  padding: 0.7rem;
  background: rgba(99, 102, 241, 0.03);
}

.application-details__milestone-details-head {
  display: flex;
  justify-content: flex-end;
}

.application-details__milestone-details-body {
  margin-top: 0.6rem;
}

.application-details__mini-tabs {
  display: flex;
  gap: 0.45rem;
  margin-bottom: 0.6rem;
}

.application-details__mini-tab-btn {
  border: 1px solid rgba(79, 70, 229, 0.2);
  border-radius: 999px;
  background: white;
  color: #4338ca;
  font-size: 0.76rem;
  font-weight: 600;
  padding: 0.25rem 0.6rem;
  cursor: pointer;
}

.application-details__mini-tab-btn--active {
  background: #4f46e5;
  color: white;
  border-color: #4f46e5;
}

.application-details__mini-panel {
  display: flex;
  flex-direction: column;
  gap: 0.55rem;
}

.application-details__mini-item {
  border: 1px solid rgba(79, 70, 229, 0.12);
  border-radius: 10px;
  padding: 0.55rem 0.65rem;
  background: white;
}

.application-details__mini-item-head {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 0.6rem;
}

.application-details__comment-composer {
  display: flex;
  flex-direction: column;
  gap: 0.5rem;
}

.application-details__upload {
  display: flex;
  flex-direction: column;
  gap: 0.35rem;
}

.application-details__file-input {
  border: 1px solid #cbd5e1;
  border-radius: 10px;
  padding: 0.35rem 0.5rem;
  background: white;
}

.application-details__link {
  color: #4338ca;
  text-decoration: none;
  font-weight: 600;
}

.application-details__link:hover {
  text-decoration: underline;
}

.application-details__icon-btn {
  border: 1px solid rgba(79, 70, 229, 0.2);
  background: white;
  border-radius: 8px;
  cursor: pointer;
  font-size: 0.9rem;
  line-height: 1;
  padding: 0.2rem 0.35rem;
}

.application-details__icon-btn--danger {
  border-color: rgba(220, 38, 38, 0.25);
  color: #b91c1c;
}

.application-details__primary-btn,
.application-details__secondary-btn,
.application-details__danger-btn {
  border-radius: 10px;
  padding: 0.43rem 0.8rem;
  font-size: 0.82rem;
  font-weight: 600;
}

.application-details__primary-btn {
  border: none;
  background: #4f46e5;
  color: white;
}

.application-details__primary-btn:hover:not(:disabled) {
  background: #4338ca;
}

.application-details__primary-btn--disabled {
  background: #94a3b8;
}

.application-details__secondary-btn {
  border: 1px solid rgba(79, 70, 229, 0.25);
  background: white;
  color: #4338ca;
}

.application-details__secondary-btn:hover:not(:disabled) {
  background: rgba(79, 70, 229, 0.06);
}

.application-details__danger-btn {
  border: 1px solid rgba(220, 38, 38, 0.25);
  background: white;
  color: #b91c1c;
}

.application-details__danger-btn:hover:not(:disabled) {
  background: rgba(220, 38, 38, 0.08);
}

.application-details__select,
.application-details__textarea {
  border: 1px solid #cbd5e1;
  border-radius: 10px;
  padding: 0.5rem 0.62rem;
  font: inherit;
}

.application-details__modal-overlay {
  position: fixed;
  inset: 0;
  background: rgba(15, 23, 42, 0.45);
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 110;
  padding: 1rem;
}

.application-details__modal {
  width: 100%;
  max-width: 520px;
  background: white;
  border-radius: 16px;
  padding: 1.25rem;
}

.application-details__modal-title {
  margin: 0 0 0.8rem;
}

.application-details__field {
  display: flex;
  flex-direction: column;
  gap: 0.35rem;
  margin-bottom: 0.6rem;
}
</style>
