<template>
  <div v-if="modelValue" class="modal-overlay" @click.self="handleClose">
    <div class="modal">
      <h3 class="modal__title">{{ isEditMode ? 'Edit Milestone' : 'Create Milestone' }}</h3>

      <p v-if="errorMessage" class="modal__error">
        {{ errorMessage }}
      </p>

      <label class="field">
        <span>Title</span>
        <input
          v-model.trim="form.title"
          type="text"
          maxlength="255"
          placeholder="Enter milestone title"
          :disabled="saving"
        >
      </label>

      <label class="field">
        <span>Description</span>
        <textarea
          v-model.trim="form.description"
          rows="4"
          placeholder="Add details"
          :disabled="saving"
        />
      </label>

      <label class="field">
        <span>Due Date</span>
        <input
          v-model="form.dueDate"
          type="date"
          :min="todayDate"
          :disabled="saving"
        >
      </label>

      <div class="actions">
        <button type="button" class="btn btn--secondary" :disabled="saving" @click="handleClose">
          Cancel
        </button>
        <button
          type="button"
          class="btn btn--primary"
          :disabled="saving || !canSubmit"
          @click="handleSubmit"
        >
          {{ saving ? 'Saving…' : (isEditMode ? 'Save' : 'Create') }}
        </button>
      </div>
    </div>
  </div>
</template>

<script setup>
import { computed, reactive, ref, watch } from 'vue'
import { storeToRefs } from 'pinia'
import { useRoute } from 'vue-router'
import { useMilestoneStore } from '@/stores/milestone'
import { useMentorshipStore } from '@/stores/mentorship'

const props = defineProps({
  modelValue: {
    type: Boolean,
    default: false,
  },
  applicationId: {
    type: [Number, String],
    default: null,
  },
  milestone: {
    type: Object,
    default: null,
  },
})

const emit = defineEmits(['update:modelValue', 'created'])

const route = useRoute()
const milestoneStore = useMilestoneStore()
const mentorshipStore = useMentorshipStore()
const { mentorshipsByApplication } = storeToRefs(mentorshipStore)

const saving = ref(false)
const errorMessage = ref('')
const form = reactive({
  title: '',
  description: '',
  dueDate: '',
})

const isEditMode = computed(() => !!props.milestone?.id)

const todayDate = new Date().toISOString().split('T')[0]

const canSubmit = computed(() =>
  !!form.title && !!form.description && !!form.dueDate,
)

function resetForm() {
  if (isEditMode.value) {
    form.title = props.milestone?.title || ''
    form.description = props.milestone?.description || ''
    form.dueDate = (props.milestone?.dueDate || '').slice(0, 10)
  } else {
    form.title = ''
    form.description = ''
    form.dueDate = ''
  }
  errorMessage.value = ''
}

function handleClose() {
  if (saving.value) return
  resetForm()
  emit('update:modelValue', false)
}

function resolveApplicationIdFromRoute() {
  const propId = Number(props.applicationId)
  if (Number.isFinite(propId) && propId > 0) return propId
  const routeId = Number(route.params?.id)
  if (Number.isFinite(routeId) && routeId > 0) return routeId
  return null
}

async function resolveMentorshipId(applicationId) {
  const key = String(applicationId)
  if (!mentorshipsByApplication.value?.[key]) {
    await mentorshipStore.getByApplication(applicationId)
  }
  const linked = mentorshipsByApplication.value?.[key] || []
  return linked[0]?.id || null
}

async function handleSubmit() {
  const applicationId = Number(props.milestone?.applicationId) || resolveApplicationIdFromRoute()
  if (!applicationId) {
    errorMessage.value = 'Application id is missing in route.'
    return
  }

  if (!canSubmit.value) {
    errorMessage.value = 'Please fill all fields.'
    return
  }

  saving.value = true
  errorMessage.value = ''

  try {
    const payload = {
      title: form.title,
      description: form.description,
      dueDate: form.dueDate,
      applicationId,
    }
    let result
    if (isEditMode.value) {
      result = await milestoneStore.update(props.milestone.id, payload)
    } else {
      const mentorshipId = await resolveMentorshipId(applicationId)
      result = await milestoneStore.create({
        ...payload,
        ...(mentorshipId ? { mentorshipId } : {}),
      })
    }
    emit('created', result)
    handleClose()
  } catch (e) {
    errorMessage.value = e.response?.data?.message
      || (typeof e.response?.data === 'string' ? e.response.data : null)
      || 'Failed to create milestone.'
  } finally {
    saving.value = false
  }
}

watch(
  () => [props.modelValue, props.milestone],
  () => {
    if (props.modelValue) resetForm()
  },
  { immediate: true, deep: true },
)
</script>

<style scoped>
.modal-overlay {
  position: fixed;
  inset: 0;
  background: rgba(15, 23, 42, 0.45);
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 100;
  padding: 1rem;
}

.modal {
  width: 100%;
  max-width: 480px;
  background: white;
  border-radius: 16px;
  padding: 1.25rem;
  box-shadow: 0 24px 60px rgba(15, 23, 42, 0.2);
}

.modal__title {
  margin: 0 0 0.75rem;
}

.modal__error {
  margin: 0 0 0.75rem;
  padding: 0.6rem 0.75rem;
  border-radius: 10px;
  background: #fee2e2;
  color: #991b1b;
  font-size: 0.88rem;
}

.field {
  display: flex;
  flex-direction: column;
  gap: 0.35rem;
  margin: 0.8rem 0;
  font-size: 0.88rem;
  color: #334155;
}

.field input,
.field textarea {
  padding: 0.6rem 0.7rem;
  border-radius: 10px;
  border: 1px solid #cbd5e1;
  font: inherit;
}

.actions {
  display: flex;
  justify-content: flex-end;
  gap: 0.5rem;
  margin-top: 1rem;
}

.btn {
  padding: 0.55rem 1rem;
  border-radius: 10px;
  font-weight: 600;
  cursor: pointer;
}

.btn--secondary {
  border: 1px solid #cbd5e1;
  background: white;
}

.btn--primary {
  border: none;
  background: #4f46e5;
  color: white;
}

.btn:disabled {
  opacity: 0.55;
  cursor: not-allowed;
}
</style>

