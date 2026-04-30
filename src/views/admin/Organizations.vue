<template>
  <div class="page">
    <p class="lead">
      Список організацій у системі. Тут можна створювати нові та змінювати їхній статус.
    </p>

    <div class="toolbar">
      <input
        v-model="search"
        type="search"
        class="search"
        placeholder="Пошук за назвою, ICO, сектором, статусом…"
        aria-label="Пошук"
      >

      <button type="button" class="btn-refresh" :disabled="loading" @click="load">
        Оновити
      </button>
      <button type="button" class="btn-refresh" @click="openCreate">
        Створити організацію
      </button>
    </div>

    <div v-if="loading" class="state">
      Завантаження…
    </div>
    <div v-else-if="error" class="state state--error">
      {{ error }}
    </div>
    <div v-else-if="filtered.length === 0" class="state">
      Нічого не знайдено.
    </div>
    <div v-else class="table-wrap">
      <table class="table">
        <thead>
          <tr>
            <th>ID</th>
            <th>Організація</th>
            <th>Контакт</th>
            <th>Статус</th>
            <th>Оновлено</th>
            <th />
          </tr>
        </thead>
        <tbody>
          <tr v-for="row in filtered" :key="row.id">
            <td class="mono">
              #{{ shortId(row.id) }}
            </td>
            <td>
              <div class="cell-title">
                {{ row.name || '—' }}
              </div>
              <div class="cell-meta">
                ICO: {{ row.ico || '—' }}
                <span v-if="row.sector"> · {{ row.sector }}</span>
              </div>
            </td>
            <td class="muted">
              <div>{{ row.contactEmail || '—' }}</div>
              <div>{{ row.contactPhone || '' }}</div>
            </td>
            <td>
              <span class="pill" :class="pillClass(row.status)">{{ row.status || '—' }}</span>
            </td>
            <td class="muted">
              {{ formatDt(row.updatedAt) }}
            </td>
            <td class="actions">
              <button type="button" class="btn-sm btn-sm--ghost" @click="openDetails(row)">
                Деталі
              </button>
              <button type="button" class="btn-sm" @click="openStatus(row)">
                Змінити статус
              </button>
            </td>
          </tr>
        </tbody>
      </table>
    </div>

    <!-- Create modal -->
    <div v-if="createModal.show" class="modal-overlay" @click.self="createModal.show = false">
      <div class="modal">
        <h3>Створити організацію</h3>
        <p class="modal-meta">
          Заповніть поля згідно з профілем організації.
        </p>

        <label class="field">
          <span>Назва *</span>
          <input v-model="createModal.form.name" type="text" placeholder="Напр., NTI Nitra s.r.o." />
        </label>

        <label class="field">
          <span>ICO *</span>
          <input v-model="createModal.form.ico" type="text" placeholder="Напр., 12345678" />
        </label>

        <label class="field">
          <span>Сектор</span>
          <input v-model="createModal.form.sector" type="text" placeholder="Напр., IT" />
        </label>

        <label class="field">
          <span>Опис</span>
          <textarea
            v-model="createModal.form.description"
            rows="3"
            placeholder="Коротко про діяльність"
          />
        </label>

        <label class="field">
          <span>Email для зв’язку</span>
          <input v-model="createModal.form.contactEmail" type="email" placeholder="name@company.com" />
        </label>

        <label class="field">
          <span>Телефон</span>
          <input v-model="createModal.form.contactPhone" type="tel" placeholder="+421..." />
        </label>

        <label class="field">
          <span>Сайт</span>
          <input v-model="createModal.form.website" type="url" placeholder="https://..." />
        </label>

        <div class="modal-actions">
          <button type="button" class="btn-secondary" @click="createModal.show = false">
            Скасувати
          </button>
          <button
            type="button"
            class="btn-primary"
            :disabled="creating || !createModal.form.name.trim() || !createModal.form.ico.trim()"
            @click="submitCreate"
          >
            {{ creating ? 'Створення…' : 'Створити' }}
          </button>
        </div>
      </div>
    </div>

    <!-- Status modal -->
    <div v-if="statusModal.show" class="modal-overlay" @click.self="statusModal.show = false">
      <div class="modal">
        <h3>Змінити статус</h3>
        <p class="modal-meta">
          {{ statusModal.row?.name }} · ICO: {{ statusModal.row?.ico }}
        </p>

        <p>
          Поточний статус:
          <strong>{{ statusModal.row?.status || '—' }}</strong>
        </p>

        <label class="field">
          <span>Новий статус</span>
          <select v-model="statusModal.nextStatus">
            <option disabled value="">
              Оберіть…
            </option>
            <option v-for="s in statusOptions" :key="s" :value="s">
              {{ s }}
            </option>
          </select>
        </label>

        <div class="modal-actions">
          <button type="button" class="btn-secondary" @click="statusModal.show = false">
            Скасувати
          </button>
          <button
            type="button"
            class="btn-primary"
            :disabled="savingStatus || !statusModal.row || !statusModal.nextStatus"
            @click="submitStatus"
          >
            {{ savingStatus ? 'Збереження…' : 'Зберегти' }}
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
import { computed, onMounted, reactive, ref } from 'vue'
import { storeToRefs } from 'pinia'
import { useRouter } from 'vue-router'
import { useOrganizationStore } from '@/stores/organization'

const orgStore = useOrganizationStore()
const router = useRouter()
const { organizations } = storeToRefs(orgStore)

const loading = ref(true)
const error = ref('')
const search = ref('')
const creating = ref(false)
const savingStatus = ref(false)

const createModal = reactive({
  show: false,
  form: {
    name: '',
    ico: '',
    sector: '',
    description: '',
    contactEmail: '',
    contactPhone: '',
    website: '',
  },
})

const statusModal = reactive({
  show: false,
  row: null,
  nextStatus: '',
})

const toast = reactive({
  show: false,
  message: '',
  type: 'success',
})

const statusOptions = computed(() => Object.values(orgStore.OrgStatus))

const filtered = computed(() => {
  const q = search.value.trim().toLowerCase()
  if (!q) return organizations.value || []
  return (organizations.value || []).filter((r) => {
    const blob = [
      r?.id,
      r?.name,
      r?.ico,
      r?.sector,
      r?.status,
      r?.contactEmail,
      r?.contactPhone,
      r?.website,
    ]
      .filter(Boolean)
      .join(' ')
      .toLowerCase()
    return blob.includes(q)
  })
})

onMounted(load)

async function load() {
  loading.value = true
  error.value = ''
  try {
    await orgStore.getAll()
  } catch (e) {
    error.value = e.response?.data?.message || 'Не вдалося завантажити організації'
  } finally {
    loading.value = false
  }
}

function openCreate() {
  createModal.form = {
    name: '',
    ico: '',
    sector: '',
    description: '',
    contactEmail: '',
    contactPhone: '',
    website: '',
  }
  createModal.show = true
}

async function submitCreate() {
  creating.value = true
  try {
    const payload = {
      name: createModal.form.name?.trim(),
      ico: createModal.form.ico?.trim(),
      sector: createModal.form.sector?.trim() || null,
      description: createModal.form.description?.trim() || null,
      contactEmail: createModal.form.contactEmail?.trim() || null,
      contactPhone: createModal.form.contactPhone?.trim() || null,
      website: createModal.form.website?.trim() || null,
    }
    await orgStore.create(payload)
    createModal.show = false
    showToast('Організацію створено', 'success')
    await load()
  } catch (e) {
    const msg = e.response?.data?.message
      || (typeof e.response?.data === 'string' ? e.response.data : null)
      || 'Не вдалося створити організацію'
    showToast(msg, 'error')
  } finally {
    creating.value = false
  }
}

function openStatus(row) {
  statusModal.row = row
  statusModal.nextStatus = row?.status || ''
  statusModal.show = true
}

function openDetails(row) {
  if (!row?.id) return
  router.push(`/app/admin/organizations/${row.id}`)
}

async function submitStatus() {
  if (!statusModal.row?.id || !statusModal.nextStatus) return
  savingStatus.value = true
  try {
    await orgStore.changeStatus(statusModal.row.id, statusModal.nextStatus)
    showToast('Статус оновлено', 'success')
    statusModal.show = false
    await load()
  } catch (e) {
    const msg = e.response?.data?.message
      || (typeof e.response?.data === 'string' ? e.response.data : null)
      || 'Не вдалося оновити статус'
    showToast(msg, 'error')
  } finally {
    savingStatus.value = false
  }
}

function pillClass(status) {
  const map = {
    [orgStore.OrgStatus.PENDING]: 'pill--warn',
    [orgStore.OrgStatus.ACTIVE]: 'pill--ok',
    [orgStore.OrgStatus.SUSPENDED]: 'pill--bad',
  }
  return map[status] || 'pill--muted'
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

function shortId(id) {
  if (!id) return '—'
  const s = String(id)
  return s.length > 8 ? s.slice(0, 8) : s
}

function showToast(message, type = 'success') {
  toast.message = message
  toast.type = type
  toast.show = true
  setTimeout(() => {
    toast.show = false
  }, 3200)
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
  max-width: 52rem;
}

.toolbar {
  display: flex;
  gap: 0.75rem;
  margin-bottom: 1rem;
  flex-wrap: wrap;
}

.search {
  flex: 1;
  min-width: 200px;
  padding: 0.65rem 1rem;
  border-radius: 12px;
  border: 1px solid rgba(79, 70, 229, 0.2);
  font-size: 0.95rem;
  background: rgba(255, 255, 255, 0.95);
}

.btn-refresh {
  padding: 0.65rem 1.1rem;
  border-radius: 12px;
  border: 1px solid rgba(79, 70, 229, 0.25);
  background: white;
  font-weight: 600;
  color: #4338ca;
  cursor: pointer;
}

.btn-refresh:hover {
  background: rgba(79, 70, 229, 0.06);
}

.btn-refresh:disabled {
  opacity: 0.6;
  cursor: not-allowed;
}

.state {
  text-align: center;
  padding: 2.5rem 1rem;
  color: #64748b;
}

.state--error {
  color: #b91c1c;
}

.table-wrap {
  overflow: auto;
  border-radius: 16px;
  border: 1px solid rgba(79, 70, 229, 0.12);
  background: rgba(255, 255, 255, 0.95);
  box-shadow: 0 14px 40px rgba(15, 23, 42, 0.06);
}

.table {
  width: 100%;
  border-collapse: collapse;
  font-size: 0.9rem;
}

.table th,
.table td {
  padding: 0.85rem 1rem;
  text-align: left;
  border-bottom: 1px solid rgba(15, 23, 42, 0.06);
}

.table th {
  font-size: 0.72rem;
  text-transform: uppercase;
  letter-spacing: 0.06em;
  color: #64748b;
  background: rgba(79, 70, 229, 0.04);
}

.mono {
  font-variant-numeric: tabular-nums;
  color: #64748b;
  white-space: nowrap;
}

.cell-title {
  font-weight: 600;
  color: #0f172a;
}

.cell-meta {
  font-size: 0.78rem;
  color: #94a3b8;
  margin-top: 0.15rem;
}

.muted {
  color: #64748b;
  white-space: nowrap;
}

.pill {
  display: inline-block;
  padding: 0.25rem 0.65rem;
  border-radius: 999px;
  font-size: 0.78rem;
  font-weight: 600;
}

.pill--muted {
  background: #f1f5f9;
  color: #475569;
}

.pill--warn {
  background: #fef3c7;
  color: #92400e;
}

.pill--ok {
  background: #d1fae5;
  color: #065f46;
}

.pill--bad {
  background: #fee2e2;
  color: #991b1b;
}

.actions {
  text-align: right;
  white-space: nowrap;
}

.actions .btn-sm + .btn-sm {
  margin-left: 0.45rem;
}

.btn-sm {
  padding: 0.45rem 0.85rem;
  border-radius: 10px;
  border: none;
  background: #4f46e5;
  color: white;
  font-weight: 600;
  font-size: 0.8rem;
  cursor: pointer;
}

.btn-sm:hover {
  background: #4338ca;
}

.btn-sm--ghost {
  background: white;
  color: #4338ca;
  border: 1px solid rgba(79, 70, 229, 0.25);
}

.btn-sm--ghost:hover {
  background: rgba(79, 70, 229, 0.06);
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
  max-width: 520px;
  background: white;
  border-radius: 16px;
  padding: 1.5rem;
  box-shadow: 0 24px 60px rgba(15, 23, 42, 0.2);
}

.modal h3 {
  margin: 0 0 0.35rem;
}

.modal-meta {
  margin: 0 0 1rem;
  color: #64748b;
  font-size: 0.9rem;
}

.field {
  display: flex;
  flex-direction: column;
  gap: 0.35rem;
  margin: 1rem 0;
  font-size: 0.88rem;
  color: #334155;
}

.field input,
.field select,
.field textarea {
  padding: 0.55rem 0.65rem;
  border-radius: 10px;
  border: 1px solid #cbd5e1;
  font: inherit;
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

.btn-primary {
  padding: 0.55rem 1rem;
  border-radius: 10px;
  border: none;
  background: #4f46e5;
  color: white;
  font-weight: 600;
  cursor: pointer;
}

.btn-primary:disabled {
  opacity: 0.5;
  cursor: not-allowed;
}

.toast {
  position: fixed;
  bottom: 1.5rem;
  right: 1.5rem;
  padding: 0.65rem 1.15rem;
  border-radius: 12px;
  font-size: 0.88rem;
  z-index: 120;
  box-shadow: 0 8px 24px rgba(15, 23, 42, 0.15);
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

