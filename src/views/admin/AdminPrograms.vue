<template>
  <div class="page">
    <p class="lead">
      Керуйте програмами A/B та викликами (дедлайни). Деактивація приховує програму з публічного каталогу.
    </p>

    <div class="tabs">
      <button type="button" :class="['tab', { active: tab === 'A' }]" @click="tab = 'A'; loadTab()">
        Програма A
      </button>
      <button type="button" :class="['tab', { active: tab === 'B' }]" @click="tab = 'B'; loadTab()">
        Програма B
      </button>
    </div>

    <div class="toolbar">
      <button type="button" class="btn-primary" @click="openProgramModal(null)">
        + Нова програма ({{ tab }})
      </button>
      <button type="button" class="btn-ghost" @click="loadTab">
        Оновити
      </button>
    </div>

    <div v-if="loading" class="state">
      Завантаження…
    </div>
    <div v-else-if="error" class="state state--error">
      {{ error }}
    </div>
    <div v-else class="program-list">
      <article v-for="p in programs" :key="p.id" class="program-card">
        <div class="program-card__head">
          <div>
            <h2>{{ p.name }}</h2>
            <p class="desc">
              {{ p.description || '—' }}
            </p>
            <span v-if="!p.isActive" class="badge-inactive">Неактивна</span>
          </div>
          <div class="program-card__actions">
            <button type="button" class="btn-sm" @click="openProgramModal(p)">
              Редагувати
            </button>
            <button v-if="p.isActive" type="button" class="btn-sm btn-sm--danger" @click="deactivateProgram(p)">
              Деактивувати
            </button>
          </div>
        </div>

        <section class="calls">
          <div class="calls__head">
            <h3>Виклики</h3>
            <button type="button" class="btn-sm" @click="openCallModal(p)">
              + Додати виклик
            </button>
          </div>

          <div v-if="callsByProgram[p.id]?.loading" class="muted">
            Завантаження викликів…
          </div>
          <div v-else-if="!(callsByProgram[p.id]?.items || []).length" class="muted">
            Поки немає викликів.
          </div>
          <ul v-else class="call-rows">
            <li v-for="c in callsByProgram[p.id].items" :key="c.id" class="call-row">
              <div>
                <div class="call-title">
                  {{ c.title }}
                </div>
                <div class="call-meta">
                  Дедлайн: {{ formatDt(c.deadline) }} · {{ c.status }}
                </div>
              </div>
              <button v-if="c.status === 'OPEN'" type="button" class="btn-sm btn-sm--warn" @click="closeCall(c)">
                Закрити
              </button>
            </li>
          </ul>
        </section>
      </article>
    </div>

    <!-- Program modal -->
    <div v-if="programModal.show" class="modal-overlay" @click.self="programModal.show = false">
      <div class="modal">
        <h3>{{ programModal.edit ? 'Редагувати програму' : 'Нова програма' }}</h3>
        <label class="field">
          <span>Назва</span>
          <input v-model="programModal.name" type="text">
        </label>
        <label class="field">
          <span>Опис</span>
          <textarea v-model="programModal.description" rows="3" />
        </label>
        <label v-if="programModal.edit" class="field row">
          <input id="active" v-model="programModal.isActive" type="checkbox">
          <span for="active">Активна (видима в каталозі)</span>
        </label>
        <div class="modal-actions">
          <button type="button" class="btn-secondary" @click="programModal.show = false">
            Скасувати
          </button>
          <button type="button" class="btn-primary-solid" @click="saveProgram">
            Зберегти
          </button>
        </div>
      </div>
    </div>

    <!-- Call modal -->
    <div v-if="callModal.show" class="modal-overlay" @click.self="callModal.show = false">
      <div class="modal">
        <h3>Новий виклик</h3>
        <p class="muted small">
          Дедлайн має бути в майбутньому (перевірка на сервері).
        </p>
        <label class="field">
          <span>Назва</span>
          <input v-model="callModal.title" type="text">
        </label>
        <label class="field">
          <span>Дедлайн</span>
          <input v-model="callModal.deadlineLocal" type="datetime-local">
        </label>
        <label class="field">
          <span>Критерії оцінювання (необов’язково)</span>
          <textarea v-model="callModal.evaluationCriteria" rows="2" />
        </label>
        <div class="modal-actions">
          <button type="button" class="btn-secondary" @click="callModal.show = false">
            Скасувати
          </button>
          <button type="button" class="btn-primary-solid" @click="saveCall">
            Створити
          </button>
        </div>
      </div>
    </div>

    <div v-if="toast.show" class="toast" :class="toast.type">
      {{ toast.message }}
    </div>
  </div>
</template>

<script setup>
import { reactive, ref, watch } from 'vue'
import { programsApi } from '@/api/programs'
import { apiErrorMessage } from '@/utils/apiError'

const tab = ref('A')
const programs = ref([])
const loading = ref(true)
const error = ref('')

const callsByProgram = reactive({})

const programModal = reactive({
  show: false,
  edit: false,
  id: null,
  name: '',
  description: '',
  isActive: true,
})

const callModal = reactive({
  show: false,
  program: null,
  title: '',
  deadlineLocal: '',
  evaluationCriteria: '',
})

const toast = reactive({
  show: false,
  message: '',
  type: 'success',
})

watch(tab, () => {
  loadTab()
}, { immediate: true })

async function loadTab() {
  loading.value = true
  error.value = ''
  const type = tab.value === 'A' ? 'A' : 'B'
  try {
    const res = await programsApi.getAllByType(type)
    programs.value = res.data || []
    for (const p of programs.value) {
      loadCalls(p.id)
    }
  } catch (e) {
    error.value = apiErrorMessage(e, 'Не вдалося завантажити програми')
  } finally {
    loading.value = false
  }
}

async function loadCalls(programId) {
  if (!callsByProgram[programId]) {
    callsByProgram[programId] = { loading: true, items: [] }
  } else {
    callsByProgram[programId].loading = true
  }
  try {
    const res = await programsApi.getCallsByProgram(programId)
    callsByProgram[programId].items = res.data || []
  } catch {
    callsByProgram[programId].items = []
  } finally {
    callsByProgram[programId].loading = false
  }
}

function openProgramModal(p) {
  if (p) {
    programModal.edit = true
    programModal.id = p.id
    programModal.name = p.name
    programModal.description = p.description || ''
    programModal.isActive = p.isActive
  } else {
    programModal.edit = false
    programModal.id = null
    programModal.name = ''
    programModal.description = ''
    programModal.isActive = true
  }
  programModal.show = true
}

async function saveProgram() {
  const type = tab.value
  const body = {
    name: programModal.name,
    description: programModal.description,
    type,
    isActive: programModal.isActive,
  }
  if (programModal.edit) {
    body.id = programModal.id
  }
  try {
    if (programModal.edit) {
      await programsApi.update(programModal.id, body)
      showToast('Програму оновлено', 'success')
    } else {
      await programsApi.create(body)
      showToast('Програму створено', 'success')
    }
    programModal.show = false
    await loadTab()
  } catch (e) {
    showToast(apiErrorMessage(e, 'Помилка збереження'), 'error')
  }
}

async function deactivateProgram(p) {
  if (!confirm(`Деактивувати «${p.name}»?`)) return
  try {
    await programsApi.update(p.id, {
      name: p.name,
      description: p.description,
      type: p.type,
      isActive: false,
    })
    showToast('Програму деактивовано', 'success')
    await loadTab()
  } catch (e) {
    showToast(apiErrorMessage(e, 'Помилка'), 'error')
  }
}

/** Рядок для <input type="datetime-local"> у локальному часі браузера. */
function toDatetimeLocalValue(d) {
  const pad = (n) => String(n).padStart(2, '0')
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`
}

/**
 * Значення з datetime-local → "YYYY-MM-DDTHH:mm:ss" без перетворення в UTC,
 * щоб LocalDateTime на сервері збігався з тим, що обрав користувач.
 */
function deadlineFromLocalInput(localStr) {
  if (!localStr || typeof localStr !== 'string') return null
  const t = localStr.trim()
  if (t.length === 16) return `${t}:00`
  if (t.length >= 19) return t.slice(0, 19)
  return null
}

function openCallModal(program) {
  callModal.program = program
  callModal.title = ''
  const t = new Date()
  t.setDate(t.getDate() + 7)
  callModal.deadlineLocal = toDatetimeLocalValue(t)
  callModal.evaluationCriteria = ''
  callModal.show = true
}

async function saveCall() {
  const p = callModal.program
  if (!p || !callModal.title.trim()) return
  const deadline = deadlineFromLocalInput(callModal.deadlineLocal)
  if (!deadline) {
    showToast('Оберіть дедлайн', 'error')
    return
  }
  try {
    await programsApi.createCall(p.id, {
      title: callModal.title.trim(),
      deadline,
      evaluationCriteria: callModal.evaluationCriteria?.trim() || null,
    })
    showToast('Виклик створено', 'success')
    callModal.show = false
    await loadCalls(p.id)
  } catch (e) {
    showToast(
      apiErrorMessage(e, 'Перевірте дедлайн (має бути в майбутньому відносно сервера)'),
      'error',
    )
  }
}

async function closeCall(c) {
  if (!confirm('Закрити виклик для нових заявок?')) return
  try {
    await programsApi.closeCall(c.id)
    showToast('Виклик закрито', 'success')
    await loadCalls(c.programId)
  } catch (e) {
    showToast(apiErrorMessage(e, 'Не вдалося закрити виклик'), 'error')
  }
}

function formatDt(iso) {
  if (!iso) return '—'
  return new Date(iso).toLocaleString('uk-UA', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  })
}

function showToast(message, type = 'success') {
  toast.message = message
  toast.type = type
  toast.show = true
  setTimeout(() => { toast.show = false }, 3000)
}
</script>

<style scoped>
.page {
  width: 100%;
}

.lead {
  margin: 0 0 1.25rem;
  color: #475569;
  line-height: 1.6;
  max-width: 48rem;
}

.tabs {
  display: flex;
  gap: 0.5rem;
  margin-bottom: 1rem;
}

.tab {
  padding: 0.55rem 1.2rem;
  border-radius: 999px;
  border: 1px solid rgba(79, 70, 229, 0.2);
  background: white;
  font-weight: 600;
  color: #64748b;
  cursor: pointer;
}

.tab.active {
  background: rgba(79, 70, 229, 0.15);
  color: #312e81;
  border-color: rgba(79, 70, 229, 0.35);
}

.toolbar {
  display: flex;
  gap: 0.75rem;
  margin-bottom: 1.25rem;
  flex-wrap: wrap;
}

.btn-primary {
  padding: 0.6rem 1.1rem;
  border-radius: 12px;
  border: none;
  background: #4f46e5;
  color: white;
  font-weight: 600;
  cursor: pointer;
}

.btn-ghost {
  padding: 0.6rem 1rem;
  border-radius: 12px;
  border: 1px solid #cbd5e1;
  background: white;
  font-weight: 600;
  cursor: pointer;
}

.state {
  padding: 2rem;
  text-align: center;
  color: #64748b;
}

.state--error {
  color: #b91c1c;
}

.program-list {
  display: flex;
  flex-direction: column;
  gap: 1.25rem;
}

.program-card {
  border-radius: 18px;
  padding: 1.35rem 1.5rem;
  background: rgba(255, 255, 255, 0.95);
  border: 1px solid rgba(79, 70, 229, 0.1);
  box-shadow: 0 14px 36px rgba(15, 23, 42, 0.06);
}

.program-card h2 {
  margin: 0 0 0.35rem;
  font-size: 1.2rem;
}

.desc {
  margin: 0;
  color: #64748b;
  font-size: 0.92rem;
  line-height: 1.5;
}

.badge-inactive {
  display: inline-block;
  margin-top: 0.5rem;
  font-size: 0.72rem;
  font-weight: 700;
  text-transform: uppercase;
  letter-spacing: 0.06em;
  color: #b45309;
  background: #ffedd5;
  padding: 0.2rem 0.5rem;
  border-radius: 6px;
}

.program-card__head {
  display: flex;
  justify-content: space-between;
  gap: 1rem;
  align-items: flex-start;
}

.program-card__actions {
  display: flex;
  flex-direction: column;
  gap: 0.35rem;
}

.btn-sm {
  padding: 0.4rem 0.75rem;
  border-radius: 10px;
  border: 1px solid rgba(79, 70, 229, 0.25);
  background: white;
  color: #4338ca;
  font-weight: 600;
  font-size: 0.8rem;
  cursor: pointer;
}

.btn-sm--danger {
  border-color: rgba(220, 38, 38, 0.35);
  color: #b91c1c;
}

.btn-sm--warn {
  border-color: rgba(217, 119, 6, 0.4);
  color: #b45309;
}

.calls {
  margin-top: 1.25rem;
  padding-top: 1rem;
  border-top: 1px solid rgba(15, 23, 42, 0.06);
}

.calls__head {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 0.65rem;
}

.calls h3 {
  margin: 0;
  font-size: 0.95rem;
}

.call-rows {
  list-style: none;
  margin: 0;
  padding: 0;
}

.call-row {
  display: flex;
  justify-content: space-between;
  gap: 0.75rem;
  padding: 0.65rem 0;
  border-bottom: 1px solid rgba(15, 23, 42, 0.05);
}

.call-title {
  font-weight: 600;
  font-size: 0.9rem;
}

.call-meta {
  font-size: 0.78rem;
  color: #64748b;
  margin-top: 0.15rem;
}

.muted {
  color: #94a3b8;
  font-size: 0.88rem;
}

.small {
  font-size: 0.82rem;
  margin-top: 0;
}

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
  max-width: 420px;
  background: white;
  border-radius: 16px;
  padding: 1.5rem;
}

.modal h3 {
  margin: 0 0 1rem;
}

.field {
  display: flex;
  flex-direction: column;
  gap: 0.35rem;
  margin-bottom: 0.85rem;
  font-size: 0.88rem;
}

.field input,
.field textarea {
  padding: 0.5rem 0.65rem;
  border-radius: 10px;
  border: 1px solid #cbd5e1;
  font: inherit;
}

.field.row {
  flex-direction: row;
  align-items: center;
  gap: 0.5rem;
}

.modal-actions {
  display: flex;
  justify-content: flex-end;
  gap: 0.5rem;
  margin-top: 0.5rem;
}

.btn-secondary {
  padding: 0.55rem 1rem;
  border-radius: 10px;
  border: 1px solid #cbd5e1;
  background: white;
  font-weight: 600;
  cursor: pointer;
}

.btn-primary-solid {
  padding: 0.55rem 1rem;
  border-radius: 10px;
  border: none;
  background: #4f46e5;
  color: white;
  font-weight: 600;
  cursor: pointer;
}

.toast {
  position: fixed;
  bottom: 1.5rem;
  right: 1.5rem;
  padding: 0.65rem 1.1rem;
  border-radius: 12px;
  font-size: 0.88rem;
  z-index: 120;
}

.toast.success {
  background: #059669;
  color: white;
}

.toast.error {
  background: #dc2626;
  color: white;
}
</style>
