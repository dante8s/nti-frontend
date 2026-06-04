<template>
  <Teleport to="body">
    <div
      v-if="modelValue"
      class="confirm-overlay"
      role="presentation"
      @click.self="onCancel"
    >
      <div
        class="confirm-modal"
        role="alertdialog"
        aria-modal="true"
        :aria-labelledby="titleId"
        :aria-describedby="messageId"
      >
        <div class="confirm-modal__accent" :class="`confirm-modal__accent--${variant}`" />
        <div class="confirm-modal__body">
          <div
            class="confirm-modal__icon"
            :class="`confirm-modal__icon--${variant}`"
            aria-hidden="true"
          >
            {{ iconChar }}
          </div>
          <h3 :id="titleId" class="confirm-modal__title">
            {{ title }}
          </h3>
          <p :id="messageId" class="confirm-modal__message">
            {{ message }}
          </p>
          <p v-if="highlight" class="confirm-modal__highlight">
            <router-link
              v-if="profileLink"
              class="confirm-modal__highlight-link"
              :to="profileLink"
              @click="onCancel"
            >
              {{ highlight }}
            </router-link>
            <span v-else>{{ highlight }}</span>
          </p>
          <div class="confirm-modal__actions">
            <button
              type="button"
              class="confirm-modal__btn confirm-modal__btn--secondary"
              :disabled="loading"
              @click="onCancel"
            >
              {{ cancelLabel }}
            </button>
            <button
              type="button"
              class="confirm-modal__btn"
              :class="confirmBtnClass"
              :disabled="loading"
              @click="onConfirm"
            >
              {{ loading ? loadingLabel : confirmLabel }}
            </button>
          </div>
        </div>
      </div>
    </div>
  </Teleport>
</template>

<script setup>
import { computed, watch } from 'vue'

const props = defineProps({
  modelValue: { type: Boolean, default: false },
  title: { type: String, default: 'Підтвердити дію' },
  message: { type: String, default: '' },
  highlight: { type: String, default: '' },
  profileLink: { type: [Object, String], default: null },
  variant: {
    type: String,
    default: 'danger',
    validator: (v) => ['danger', 'warning'].includes(v),
  },
  confirmLabel: { type: String, default: 'Підтвердити' },
  cancelLabel: { type: String, default: 'Закрити' },
  loadingLabel: { type: String, default: 'Зачекайте…' },
  loading: { type: Boolean, default: false },
})

const emit = defineEmits(['update:modelValue', 'confirm', 'cancel'])

const titleId = 'app-confirm-title'
const messageId = 'app-confirm-message'

const iconChar = computed(() => (props.variant === 'warning' ? '!' : '×'))

const confirmBtnClass = computed(() =>
  props.variant === 'warning'
    ? 'confirm-modal__btn--warning'
    : 'confirm-modal__btn--danger',
)

function onCancel() {
  if (props.loading) return
  emit('cancel')
  emit('update:modelValue', false)
}

function onConfirm() {
  if (props.loading) return
  emit('confirm')
}

let escHandler = null
watch(
  () => props.modelValue,
  (open) => {
    if (escHandler) {
      window.removeEventListener('keydown', escHandler)
      escHandler = null
    }
    if (!open) return
    escHandler = (e) => {
      if (e.key === 'Escape' && !props.loading) onCancel()
    }
    window.addEventListener('keydown', escHandler)
  },
)
</script>

<style scoped>
.confirm-overlay {
  position: fixed;
  inset: 0;
  z-index: 2000;
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 1rem;
  background: rgba(15, 23, 42, 0.45);
  backdrop-filter: blur(2px);
}

.confirm-modal {
  position: relative;
  width: 100%;
  max-width: 460px;
  background: #fff;
  border-radius: 16px;
  overflow: hidden;
  box-shadow:
    0 24px 60px rgba(15, 23, 42, 0.18),
    0 0 0 1px rgba(79, 70, 229, 0.08);
}

.confirm-modal__accent {
  height: 4px;
}

.confirm-modal__accent--danger {
  background: linear-gradient(90deg, #dc2626, #ef4444);
}

.confirm-modal__accent--warning {
  background: linear-gradient(90deg, #d97706, #f59e0b);
}

.confirm-modal__body {
  padding: 1.25rem 1.35rem 1.15rem;
}

.confirm-modal__icon {
  width: 2.25rem;
  height: 2.25rem;
  border-radius: 12px;
  display: flex;
  align-items: center;
  justify-content: center;
  font-weight: 800;
  font-size: 1.1rem;
  margin-bottom: 0.75rem;
}

.confirm-modal__icon--danger {
  background: #fef2f2;
  color: #b91c1c;
}

.confirm-modal__icon--warning {
  background: #fffbeb;
  color: #b45309;
}

.confirm-modal__title {
  margin: 0 0 0.5rem;
  font-size: 1.05rem;
  font-weight: 700;
  color: #0f172a;
  line-height: 1.35;
}

.confirm-modal__message {
  margin: 0;
  font-size: 0.9rem;
  color: #475569;
  line-height: 1.55;
}

.confirm-modal__highlight {
  margin: 0.65rem 0 1.1rem;
  padding: 0.55rem 0.75rem;
  border-radius: 10px;
  background: #f8fafc;
  border: 1px solid rgba(148, 163, 184, 0.35);
  font-size: 0.9rem;
  font-weight: 600;
  color: #1e293b;
  word-break: break-all;
}

.confirm-modal__highlight-link {
  color: #4f46e5;
  text-decoration: none;
}

.confirm-modal__highlight-link:hover {
  text-decoration: underline;
}

.confirm-modal__actions {
  display: flex;
  flex-wrap: wrap;
  justify-content: flex-end;
  gap: 0.5rem;
}

.confirm-modal__btn {
  border: none;
  border-radius: 999px;
  padding: 0.5rem 1rem;
  font-weight: 700;
  font-size: 0.88rem;
  cursor: pointer;
}

.confirm-modal__btn--secondary {
  background: #f8fafc;
  color: #334155;
  border: 1px solid #cbd5e1;
}

.confirm-modal__btn--secondary:hover:not(:disabled) {
  background: #f1f5f9;
}

.confirm-modal__btn--danger {
  background: #dc2626;
  color: #fff;
}

.confirm-modal__btn--danger:hover:not(:disabled) {
  background: #b91c1c;
}

.confirm-modal__btn--warning {
  background: #d97706;
  color: #fff;
}

.confirm-modal__btn--warning:hover:not(:disabled) {
  background: #b45309;
}

.confirm-modal__btn:disabled {
  opacity: 0.65;
  cursor: not-allowed;
}
</style>
