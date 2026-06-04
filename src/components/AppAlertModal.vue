<template>
  <Teleport to="body">
    <div
      v-if="modelValue"
      class="alert-overlay"
      role="presentation"
      @click.self="close"
    >
      <div
        class="alert-modal"
        role="alertdialog"
        aria-modal="true"
        :aria-labelledby="titleId"
        :aria-describedby="messageId"
      >
        <div class="alert-modal__accent" :class="`alert-modal__accent--${variant}`" />
        <div class="alert-modal__body">
          <div class="alert-modal__icon" :class="`alert-modal__icon--${variant}`" aria-hidden="true">
            {{ iconChar }}
          </div>
          <h3 :id="titleId" class="alert-modal__title">
            {{ title }}
          </h3>
          <p :id="messageId" class="alert-modal__message">
            {{ message }}
          </p>
          <div class="alert-modal__actions">
            <router-link
              v-if="showTeamsLink"
              class="alert-modal__btn alert-modal__btn--secondary"
              to="/app/teams"
              @click="close"
            >
              Моя команда
            </router-link>
            <button
              type="button"
              class="alert-modal__btn alert-modal__btn--primary"
              @click="close"
            >
              {{ confirmLabel }}
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
  title: { type: String, default: 'Повідомлення' },
  message: { type: String, default: '' },
  variant: {
    type: String,
    default: 'info',
    validator: (v) => ['info', 'warning', 'error'].includes(v),
  },
  confirmLabel: { type: String, default: 'Зрозуміло' },
  showTeamsLink: { type: Boolean, default: false },
})

const emit = defineEmits(['update:modelValue'])

const titleId = 'app-alert-title'
const messageId = 'app-alert-message'

const iconChar = computed(() => {
  if (props.variant === 'warning') return '!'
  if (props.variant === 'error') return '×'
  return 'i'
})

function close() {
  emit('update:modelValue', false)
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
      if (e.key === 'Escape') close()
    }
    window.addEventListener('keydown', escHandler)
  },
)
</script>

<style scoped>
.alert-overlay {
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

.alert-modal {
  position: relative;
  width: 100%;
  max-width: 440px;
  background: #fff;
  border-radius: 16px;
  overflow: hidden;
  box-shadow:
    0 24px 60px rgba(15, 23, 42, 0.18),
    0 0 0 1px rgba(79, 70, 229, 0.08);
}

.alert-modal__accent {
  height: 4px;
}

.alert-modal__accent--info {
  background: linear-gradient(90deg, #4f46e5, #6366f1);
}

.alert-modal__accent--warning {
  background: linear-gradient(90deg, #d97706, #f59e0b);
}

.alert-modal__accent--error {
  background: linear-gradient(90deg, #dc2626, #ef4444);
}

.alert-modal__body {
  padding: 1.25rem 1.35rem 1.15rem;
}

.alert-modal__icon {
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

.alert-modal__icon--info {
  background: #eef2ff;
  color: #4f46e5;
}

.alert-modal__icon--warning {
  background: #fffbeb;
  color: #b45309;
}

.alert-modal__icon--error {
  background: #fef2f2;
  color: #b91c1c;
}

.alert-modal__title {
  margin: 0 0 0.5rem;
  font-size: 1.05rem;
  font-weight: 700;
  color: #0f172a;
  line-height: 1.35;
}

.alert-modal__message {
  margin: 0 0 1.1rem;
  font-size: 0.9rem;
  color: #475569;
  line-height: 1.55;
}

.alert-modal__actions {
  display: flex;
  flex-wrap: wrap;
  justify-content: flex-end;
  gap: 0.5rem;
}

.alert-modal__btn {
  border: none;
  border-radius: 999px;
  padding: 0.5rem 1rem;
  font-weight: 700;
  font-size: 0.88rem;
  cursor: pointer;
  text-decoration: none;
  display: inline-flex;
  align-items: center;
  justify-content: center;
}

.alert-modal__btn--primary {
  background: #4f46e5;
  color: #fff;
}

.alert-modal__btn--primary:hover {
  background: #4338ca;
}

.alert-modal__btn--secondary {
  background: #f8fafc;
  color: #334155;
  border: 1px solid #cbd5e1;
}

.alert-modal__btn--secondary:hover {
  background: #f1f5f9;
}
</style>
