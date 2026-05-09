<template>
  <div class="page">
    <p class="lead">
      Milestones that require admin approval before planning starts.
    </p>

    <div v-if="loading" class="state">
      Loading…
    </div>
    <div v-else-if="error" class="state state--error">
      {{ error }}
    </div>
    <div v-else-if="pendingMilestones.length === 0" class="state">
      No milestones pending approval.
    </div>
    <div v-else class="table-wrap">
      <table class="table">
        <thead>
          <tr>
            <th>Title</th>
            <th>Application ID</th>
            <th>Created By</th>
            <th>Due Date</th>
            <th />
          </tr>
        </thead>
        <tbody>
          <tr v-for="m in pendingMilestones" :key="m.id">
            <td>{{ m.title || '—' }}</td>
            <td>#{{ m.applicationId ?? '—' }}</td>
            <td>{{ m.createdByName || '—' }}</td>
            <td>{{ formatDate(m.dueDate) }}</td>
            <td class="actions">
              <button
                type="button"
                class="btn-approve"
                :disabled="processingId === m.id"
                @click="approve(m)"
              >
                {{ processingId === m.id ? 'Approving…' : 'Approve' }}
              </button>
              <button type="button" class="btn-edit" @click="openEditModal(m)">
                Edit
              </button>
              <button type="button" class="btn-delete" @click="removeMilestone(m)">
                Delete
              </button>
              <router-link
                class="link-view"
                :to="`/applications/${m.applicationId}`"
              >
                View Application
              </router-link>
            </td>
          </tr>
        </tbody>
      </table>
    </div>

    <MilestoneFormModal
      v-model="milestoneModalOpen"
      :application-id="selectedMilestoneAppId"
      :milestone="editingMilestone"
      @created="onMilestoneSaved"
    />
  </div>
</template>

<script setup>
import { onMounted, ref } from 'vue'
import { storeToRefs } from 'pinia'
import { MilestoneStatus, useMilestoneStore } from '@/stores/milestone'
import MilestoneFormModal from '@/components/MilestoneFormModal.vue'

const milestoneStore = useMilestoneStore()
const { pendingMilestones } = storeToRefs(milestoneStore)

const loading = ref(true)
const error = ref('')
const processingId = ref(null)
const milestoneModalOpen = ref(false)
const selectedMilestoneAppId = ref(null)
const editingMilestone = ref(null)

onMounted(load)

async function load() {
  loading.value = true
  error.value = ''
  try {
    await milestoneStore.getPendingApproval()
  } catch (e) {
    error.value = e.response?.data?.message || 'Failed to load milestone approvals.'
  } finally {
    loading.value = false
  }
}

async function approve(milestone) {
  if (!milestone?.id) return
  processingId.value = milestone.id
  try {
    await milestoneStore.changeStatus(
      milestone.id,
      MilestoneStatus.PLANNED,
      milestone.applicationId,
    )
  } catch (e) {
    error.value = e.response?.data?.message || 'Failed to approve milestone.'
  } finally {
    processingId.value = null
  }
}

function openEditModal(milestone) {
  selectedMilestoneAppId.value = milestone?.applicationId || null
  editingMilestone.value = milestone
  milestoneModalOpen.value = true
}

async function onMilestoneSaved(updated) {
  editingMilestone.value = null
  if (updated?.status !== MilestoneStatus.PENDING_APPROVAL) {
    pendingMilestones.value = pendingMilestones.value.filter((m) => m?.id !== updated?.id)
    return
  }
  await load()
}

async function removeMilestone(milestone) {
  if (!milestone?.id) return
  try {
    await milestoneStore.delete(milestone.id, milestone.applicationId)
  } catch (e) {
    error.value = e.response?.data?.message || 'Failed to delete milestone.'
  }
}

function formatDate(value) {
  if (!value) return '—'
  return new Date(value).toLocaleDateString('uk-UA', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
  })
}
</script>

<style scoped>
.page {
  width: 100%;
}

.lead {
  margin: 0 0 1rem;
  color: #475569;
}

.state {
  text-align: center;
  padding: 2rem 1rem;
  color: #64748b;
}

.state--error {
  color: #b91c1c;
}

.table-wrap {
  overflow: auto;
  border-radius: 14px;
  border: 1px solid rgba(79, 70, 229, 0.12);
  background: rgba(255, 255, 255, 0.95);
}

.table {
  width: 100%;
  border-collapse: collapse;
  font-size: 0.9rem;
}

.table th,
.table td {
  padding: 0.8rem 0.9rem;
  text-align: left;
  border-bottom: 1px solid rgba(15, 23, 42, 0.06);
}

.table th {
  font-size: 0.72rem;
  letter-spacing: 0.06em;
  text-transform: uppercase;
  color: #64748b;
  background: rgba(79, 70, 229, 0.04);
}

.actions {
  display: flex;
  gap: 0.6rem;
  align-items: center;
  justify-content: flex-end;
}

.btn-approve {
  padding: 0.45rem 0.75rem;
  border-radius: 8px;
  border: none;
  background: #10b981;
  color: white;
  font-weight: 600;
  cursor: pointer;
}

.btn-edit,
.btn-delete {
  padding: 0.45rem 0.75rem;
  border-radius: 8px;
  border: 1px solid rgba(79, 70, 229, 0.2);
  background: white;
  font-weight: 600;
  cursor: pointer;
}

.btn-edit {
  color: #4338ca;
}

.btn-delete {
  border-color: rgba(220, 38, 38, 0.25);
  color: #b91c1c;
}

.btn-approve:disabled {
  opacity: 0.55;
  cursor: not-allowed;
}

.link-view {
  color: #4338ca;
  font-weight: 600;
  text-decoration: none;
}

.link-view:hover {
  text-decoration: underline;
}
</style>

