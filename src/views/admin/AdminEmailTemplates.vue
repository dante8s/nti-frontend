<script setup>
import { ref, onMounted } from 'vue'
import { emailTemplatesApi } from '@/api/emailTemplates'

const templates = ref([])
const selected  = ref(null)
const form      = ref({ subject: '', body: '' })
const saving    = ref(false)
const saved     = ref(false)
const error     = ref('')

const TYPE_LABELS = {
  VERIFICATION:                'Підтвердження email',
  RESET_PASSWORD:              'Скидання пароля',
  WELCOME:                     'Вітальний лист',
  APPLICATION_STATUS_CHANGED:  'Зміна статусу заявки',
  NEW_USER_NOTIFICATION:       'Новий користувач (адмін)',
  MENTOR_INVITE:               'Запрошення ментора',
  ORG_MEMBER_INVITE:           'Запрошення до організації',
  ACCOUNT_APPROVED:            'Акаунт схвалено',
  ACCOUNT_REJECTED:            'Акаунт відхилено',
  ACCOUNT_SUSPENDED:           'Акаунт заблоковано',
  MENTOR_ASSIGNED:             'Ментор призначений',
  DEADLINE_REMINDER:           'Нагадування дедлайну',
  PROJECT_CLOSED:              'Проєкт завершено',
  BULK_MESSAGE:                'Масова розсилка',
  COMPLETION_REJECTED:         'Відхилення завершення проекту',
  TEAM_INVITE_UNREGISTERED:    'Запрошення до команди (новий)',
}

onMounted(async () => {
  const { data } = await emailTemplatesApi.getAll()
  templates.value = data
})

function select(tpl) {
  selected.value = tpl
  form.value = { subject: tpl.subject, body: tpl.body }
  saved.value = false
  error.value = ''
}

async function save() {
  if (!selected.value) return
  saving.value = true
  error.value  = ''
  try {
    const { data } = await emailTemplatesApi.update(selected.value.id, form.value)
    const idx = templates.value.findIndex(t => t.id === data.id)
    if (idx !== -1) templates.value[idx] = data
    selected.value = data
    saved.value = true
    setTimeout(() => (saved.value = false), 3000)
  } catch {
    error.value = 'Помилка збереження. Спробуйте ще раз.'
  } finally {
    saving.value = false
  }
}
</script>

<template>
  <div class="et">
    <div class="et__sidebar">
      <p class="et__sidebar-title">Шаблони листів</p>
      <button
        v-for="tpl in templates"
        :key="tpl.id"
        class="et__item"
        :class="{ 'et__item--active': selected?.id === tpl.id }"
        @click="select(tpl)"
      >
        {{ TYPE_LABELS[tpl.type] || tpl.type }}
      </button>
    </div>

    <div class="et__editor">
      <template v-if="!selected">
        <p class="et__placeholder">Оберіть шаблон зі списку зліва</p>
      </template>

      <template v-else>
        <h2 class="et__title">{{ TYPE_LABELS[selected.type] || selected.type }}</h2>

        <div class="et__vars" v-if="selected.variables?.length">
          <span class="et__vars-label">Доступні змінні:</span>
          <code v-for="v in selected.variables" :key="v" class="et__var">{{ v }}</code>
        </div>

        <label class="et__label">Тема листа
          <input v-model="form.subject" class="et__input" type="text"/>
        </label>

        <label class="et__label">Текст листа
          <textarea v-model="form.body" class="et__textarea" rows="14"/>
        </label>

        <div class="et__actions">
          <button class="et__save" :disabled="saving" @click="save">
            {{ saving ? 'Збереження...' : 'Зберегти' }}
          </button>
          <span v-if="saved" class="et__ok">✓ Збережено</span>
          <span v-if="error" class="et__err">{{ error }}</span>
        </div>
      </template>
    </div>
  </div>
</template>

<style scoped>
.et {
  display: flex;
  gap: 1.5rem;
  min-height: 70vh;
}

.et__sidebar {
  width: 240px;
  flex-shrink: 0;
  background: #fff;
  border: 1px solid #e2e8f0;
  border-radius: 14px;
  padding: 1rem 0.75rem;
  display: flex;
  flex-direction: column;
  gap: 0.25rem;
}

.et__sidebar-title {
  font-size: 0.7rem;
  font-weight: 700;
  letter-spacing: 0.1em;
  text-transform: uppercase;
  color: #94a3b8;
  margin: 0 0 0.5rem 0.5rem;
}

.et__item {
  text-align: left;
  padding: 0.55rem 0.75rem;
  border-radius: 10px;
  border: none;
  background: transparent;
  color: #475569;
  font-size: 0.88rem;
  font-weight: 500;
  cursor: pointer;
  transition: background 0.15s;
}
.et__item:hover { background: #f1f5f9; }
.et__item--active { background: rgba(79,70,229,.1); color: #3730a3; font-weight: 700; }

.et__editor {
  flex: 1;
  background: #fff;
  border: 1px solid #e2e8f0;
  border-radius: 14px;
  padding: 1.75rem 2rem;
  display: flex;
  flex-direction: column;
  gap: 1.1rem;
}

.et__placeholder {
  color: #94a3b8;
  margin: auto;
  font-size: 1rem;
}

.et__title {
  margin: 0;
  font-size: 1.1rem;
  font-weight: 800;
  color: #1e293b;
}

.et__vars {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  gap: 0.4rem;
  padding: 0.65rem 0.9rem;
  background: #f8fafc;
  border: 1px solid #e2e8f0;
  border-radius: 10px;
  font-size: 0.83rem;
}

.et__vars-label {
  color: #64748b;
  font-weight: 600;
  margin-right: 0.25rem;
}

.et__var {
  background: rgba(79,70,229,.1);
  color: #3730a3;
  padding: 2px 8px;
  border-radius: 6px;
  font-size: 0.8rem;
}

.et__label {
  display: flex;
  flex-direction: column;
  gap: 0.4rem;
  font-size: 0.88rem;
  font-weight: 600;
  color: #374151;
}

.et__input,
.et__textarea {
  padding: 0.6rem 0.85rem;
  border: 1px solid #cbd5e1;
  border-radius: 10px;
  font-size: 0.93rem;
  font-family: inherit;
  color: #1e293b;
  resize: vertical;
  transition: border-color 0.15s;
}
.et__input:focus,
.et__textarea:focus {
  outline: none;
  border-color: #6366f1;
  box-shadow: 0 0 0 3px rgba(99,102,241,.12);
}

.et__actions {
  display: flex;
  align-items: center;
  gap: 1rem;
}

.et__save {
  padding: 0.6rem 1.5rem;
  background: #4f46e5;
  color: #fff;
  border: none;
  border-radius: 10px;
  font-weight: 700;
  font-size: 0.93rem;
  cursor: pointer;
  transition: background 0.15s;
}
.et__save:hover:not(:disabled) { background: #4338ca; }
.et__save:disabled { opacity: 0.6; cursor: not-allowed; }

.et__ok  { color: #16a34a; font-weight: 600; font-size: 0.9rem; }
.et__err { color: #dc2626; font-size: 0.88rem; }
</style>
