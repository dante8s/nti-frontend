<template>
  <div class="page">
    <div class="page-header">
      <h1>Журнал аудиту</h1>
      <p class="subtitle">Всі адміністративні дії в системі</p>
    </div>

    <!-- Фільтри -->
    <div class="filters">
      <select v-model="filterEntityType" class="filter-select" @change="load">
        <option value="">Всі типи</option>
        <option value="USER">Користувачі</option>
        <option value="APPLICATION">Заявки</option>
        <option value="PROGRAM">Програми</option>
        <option value="CALL">Виклики</option>
      </select>

      <select v-model="filterAction" class="filter-select" @change="load">
        <option value="">Всі дії</option>
        <optgroup label="Користувачі">
          <option value="USER_APPROVED">Схвалення акаунта</option>
          <option value="USER_REJECTED">Відхилення акаунта</option>
          <option value="USER_SUSPENDED">Блокування акаунта</option>
          <option value="USER_ROLE_ADDED">Додавання ролі</option>
          <option value="USER_ROLE_REMOVED">Видалення ролі</option>
        </optgroup>
        <optgroup label="Заявки">
          <option value="APPLICATION_CREATED">Створення заявки</option>
          <option value="APPLICATION_UPDATED">Оновлення заявки</option>
          <option value="STATUS_CHANGED">Зміна статусу</option>
        </optgroup>
        <optgroup label="Комісія">
          <option value="EVALUATION_SUBMITTED">Оцінка комісії</option>
        </optgroup>
        <optgroup label="Програми та виклики">
          <option value="PROGRAM_CREATED">Створення програми</option>
          <option value="PROGRAM_REVIEWED">Рішення по програмі</option>
          <option value="PROGRAM_DEACTIVATED">Деактивація програми</option>
          <option value="CALL_CREATED">Створення виклику</option>
          <option value="CALL_CLOSED">Закриття виклику</option>
        </optgroup>
        <optgroup label="Розсилка">
          <option value="BULK_MESSAGE_SENT">Масова розсилка</option>
        </optgroup>
        <optgroup label="Експорт">
          <option value="EXPORT">Експорт даних</option>
        </optgroup>
      </select>

      <button class="btn-reset" :disabled="!hasFilters" @click="resetFilters">Скинути</button>

      <span class="count">{{ events.length }} записів</span>
    </div>

    <!-- Таблиця -->
    <div v-if="loading" class="loading">Завантаження...</div>

    <div v-else-if="events.length === 0" class="empty">
      Записів не знайдено
    </div>

    <div v-else class="table-wrapper">
      <table class="audit-table">
        <thead>
          <tr>
            <th>Дата і час</th>
            <th>Хто</th>
            <th>Дія</th>
            <th>Тип об'єкта</th>
            <th>ID об'єкта</th>
            <th>Опис</th>
          </tr>
        </thead>
        <tbody>
          <tr v-for="e in events" :key="e.id" :class="actionClass(e.action)">
            <td class="cell-date">{{ formatDate(e.createdAt) }}</td>
            <td class="cell-actor">{{ e.actorName }}</td>
            <td class="cell-action">
              <span class="action-badge" :class="actionClass(e.action)">
                {{ formatAction(e.action) }}
              </span>
            </td>
            <td class="cell-entity">{{ e.entityType ?? '—' }}</td>
            <td class="cell-id">{{ e.entityId ?? '—' }}</td>
            <td class="cell-desc">{{ e.description }}</td>
          </tr>
        </tbody>
      </table>
    </div>
  </div>
</template>

<script setup>
import { ref, computed, onMounted } from 'vue'
import { auditApi } from '@/api/audit'

const events = ref([])
const loading = ref(false)
const filterEntityType = ref('')
const filterAction = ref('')
const hasFilters = computed(() => filterEntityType.value !== '' || filterAction.value !== '')

async function load() {
  loading.value = true
  try {
    const res = await auditApi.getAll({
      entityType: filterEntityType.value || undefined,
      action: filterAction.value || undefined,
    })
    events.value = res.data || []
  } catch (e) {
    console.error('Помилка завантаження аудиту', e)
  } finally {
    loading.value = false
  }
}

function resetFilters() {
  filterEntityType.value = ''
  filterAction.value = ''
  load()
}

function formatDate(iso) {
  if (!iso) return '—'
  return new Date(iso).toLocaleString('uk-UA', {
    day: '2-digit', month: '2-digit', year: 'numeric',
    hour: '2-digit', minute: '2-digit', second: '2-digit',
  })
}

const ACTION_LABELS = {
  USER_APPROVED:       'Схвалено акаунт',
  USER_REJECTED:       'Відхилено акаунт',
  USER_SUSPENDED:      'Заблоковано акаунт',
  USER_ROLE_ADDED:     'Роль додано',
  USER_ROLE_REMOVED:   'Роль видалено',
  APPLICATION_CREATED: 'Заявку створено',
  APPLICATION_UPDATED: 'Заявку оновлено',
  STATUS_CHANGED:      'Статус змінено',
  EVALUATION_SUBMITTED:'Оцінка виставлена',
  PROGRAM_CREATED:     'Програму створено',
  PROGRAM_REVIEWED:    'Рішення по програмі',
  PROGRAM_DEACTIVATED: 'Програму деактивовано',
  CALL_CREATED:        'Виклик створено',
  CALL_CLOSED:          'Виклик закрито',
  BULK_MESSAGE_SENT:    'Масова розсилка',
  EXPORT:               'Експорт даних',
}

function formatAction(action) {
  return ACTION_LABELS[action] ?? action
}

function actionClass(action) {
  if (!action) return ''
  if (action.includes('REJECTED') || action.includes('SUSPENDED') || action.includes('DEACTIVATED') || action.includes('REMOVED') || action.includes('CLOSED'))
    return 'danger'
  if (action.includes('APPROVED') || action.includes('CREATED'))
    return 'success'
  if (action.includes('EXPORT') || action.includes('EVALUATION'))
    return 'info'
  return 'neutral'
}

onMounted(load)
</script>

<style scoped>
.page {
  max-width: 1200px;
  margin: 0 auto;
  padding: 2rem;
}

.page-header {
  margin-bottom: 1.5rem;
}

.page-header h1 {
  font-size: 1.75rem;
  font-weight: 700;
  margin-bottom: 0.25rem;
}

.subtitle {
  color: #6b7280;
  font-size: 0.9rem;
}

.filters {
  display: flex;
  align-items: center;
  gap: 0.75rem;
  margin-bottom: 1.5rem;
  flex-wrap: wrap;
}

.filter-select {
  padding: 0.4rem 0.75rem;
  border: 1px solid #d1d5db;
  border-radius: 6px;
  font-size: 0.875rem;
  background: white;
  cursor: pointer;
}

.btn-reset {
  padding: 0.4rem 0.75rem;
  border: 1px solid #d1d5db;
  border-radius: 6px;
  background: white;
  font-size: 0.875rem;
  cursor: pointer;
}

.btn-reset:hover:not(:disabled) {
  background: #f3f4f6;
}

.btn-reset:disabled {
  opacity: 0.4;
  cursor: not-allowed;
}

.count {
  margin-left: auto;
  font-size: 0.875rem;
  color: #6b7280;
}

.table-wrapper {
  overflow-x: auto;
  border-radius: 10px;
  border: 1px solid #e5e7eb;
}

.audit-table {
  width: 100%;
  border-collapse: collapse;
  font-size: 0.875rem;
}

.audit-table thead {
  background: #f9fafb;
}

.audit-table th {
  padding: 0.75rem 1rem;
  text-align: left;
  font-weight: 600;
  color: #374151;
  border-bottom: 1px solid #e5e7eb;
  white-space: nowrap;
}

.audit-table td {
  padding: 0.625rem 1rem;
  border-bottom: 1px solid #f3f4f6;
  vertical-align: top;
}

.audit-table tbody tr:hover {
  background: #f9fafb;
}

.cell-date {
  white-space: nowrap;
  color: #6b7280;
  font-size: 0.8rem;
}

.cell-actor {
  font-weight: 500;
  white-space: nowrap;
}

.cell-entity,
.cell-id {
  color: #6b7280;
  font-size: 0.8rem;
}

.cell-desc {
  color: #374151;
  max-width: 350px;
}

.action-badge {
  display: inline-block;
  padding: 0.2rem 0.5rem;
  border-radius: 4px;
  font-size: 0.75rem;
  font-weight: 600;
  white-space: nowrap;
}

.action-badge.success { background: #d1fae5; color: #065f46; }
.action-badge.danger  { background: #fee2e2; color: #991b1b; }
.action-badge.info    { background: #dbeafe; color: #1e40af; }
.action-badge.neutral { background: #f3f4f6; color: #374151; }

.loading,
.empty {
  text-align: center;
  padding: 3rem;
  color: #6b7280;
}
</style>
