<template>
  <div class="page">
    <p class="lead">
      Заявки в яких лідер команди надіслав запит на завершення проекту. Підтвердіть або відхиліть кожен запит.
    </p>

    <div class="toolbar">
      <button type="button" class="btn-refresh" @click="load">Оновити</button>
    </div>

    <div v-if="loading" class="state">Завантаження...</div>
    <div v-else-if="error" class="state state--error">{{ error }}</div>
    <div v-else-if="!requests.length" class="state">Немає запитів на завершення проекту.</div>

    <div v-else class="requests-list">
      <article v-for="app in requests" :key="app.id" class="request-card">
        <div class="request-card__header">
          <div class="request-card__meta">
            <span class="request-card__id">#{{ app.id }}</span>
            <div>
              <strong class="request-card__program">{{ app.programName }}</strong>
              <span class="request-card__call">{{ app.callTitle }}</span>
            </div>
          </div>
          <span class="request-card__badge">Запит на завершення</span>
        </div>

        <!-- Учасники команди -->
        <div class="request-card__team">
          <p class="request-card__team-label">Учасники команди</p>
          <div v-if="teamsLoading[app.id]" class="request-card__team-loading">Завантаження...</div>
          <div v-else-if="!teams[app.id]" class="request-card__team-empty">Команду не знайдено</div>
          <table v-else class="team-table">
            <thead>
              <tr>
                <th>Ім'я</th>
                <th>Email</th>
                <th>Роль</th>
                <th>Статус</th>
              </tr>
            </thead>
            <tbody>
              <tr v-for="m in teams[app.id].members" :key="m.id">
                <td>{{ m.memberDisplayName || '—' }}</td>
                <td>
                  <router-link
                    v-if="m.userId"
                    :to="{ name: 'member-profile', params: { userId: m.userId } }"
                    class="email-chip"
                  >
                    <span class="email-chip__icon">✉</span>
                    {{ m.memberEmail || '—' }}
                  </router-link>
                  <span v-else>{{ m.memberEmail || '—' }}</span>
                </td>
                <td>{{ m.role }}</td>
                <td>{{ m.inviteStatus }}</td>
              </tr>
            </tbody>
          </table>
        </div>

        <!-- Дії -->
        <div class="request-card__actions">
          <button
            class="btn-approve"
            :disabled="busy[app.id]"
            @click="approve(app)"
          >
            ✓ Підтвердити завершення
          </button>
          <button
            class="btn-reject"
            :disabled="busy[app.id]"
            @click="reject(app)"
          >
            ✕ Відхилити запит
          </button>
        </div>

        <p v-if="messages[app.id]" class="request-card__msg">{{ messages[app.id] }}</p>
      </article>
    </div>
  </div>
</template>

<script setup>
import { onMounted, reactive, ref } from 'vue'
import { applicationsApi } from '@/api/applications'
import { teamsApi } from '@/api/teams'

const requests = ref([])
const loading = ref(false)
const error = ref('')
const busy = reactive({})
const messages = reactive({})
const teams = reactive({})
const teamsLoading = reactive({})

onMounted(load)

async function load() {
  loading.value = true
  error.value = ''
  try {
    const res = await applicationsApi.getCompletionRequests()
    requests.value = res.data || []
    // Завантажуємо команди для кожної заявки
    for (const app of requests.value) {
      if (app.applicantId) {
        teamsLoading[app.id] = true
        teamsApi.getTeamForUser(app.applicantId)
          .then(r => { teams[app.id] = r.data })
          .catch(() => { teams[app.id] = null })
          .finally(() => { teamsLoading[app.id] = false })
      }
    }
  } catch (e) {
    error.value = e.response?.data?.message || 'Не вдалося завантажити запити.'
  } finally {
    loading.value = false
  }
}

async function approve(app) {
  busy[app.id] = true
  messages[app.id] = ''
  try {
    await applicationsApi.approveCompletion(app.id)
    messages[app.id] = '✓ Проект завершено.'
    // Прибираємо зі списку після затримки
    setTimeout(() => {
      requests.value = requests.value.filter(r => r.id !== app.id)
    }, 1200)
  } catch (e) {
    messages[app.id] = e.response?.data?.message || 'Помилка підтвердження.'
  } finally {
    busy[app.id] = false
  }
}

async function reject(app) {
  busy[app.id] = true
  messages[app.id] = ''
  try {
    await applicationsApi.rejectCompletion(app.id)
    messages[app.id] = '✕ Запит відхилено. Лідер отримав повідомлення.'
    setTimeout(() => {
      requests.value = requests.value.filter(r => r.id !== app.id)
    }, 1500)
  } catch (e) {
    messages[app.id] = e.response?.data?.message || 'Помилка відхилення.'
  } finally {
    busy[app.id] = false
  }
}
</script>

<style scoped>
.page {
  max-width: 900px;
}

.lead {
  color: #64748b;
  margin-bottom: 1rem;
  font-size: 0.9rem;
}

.toolbar {
  display: flex;
  justify-content: flex-end;
  margin-bottom: 1.2rem;
}

.btn-refresh {
  border: 1px solid rgba(79, 70, 229, 0.25);
  background: white;
  color: #4338ca;
  border-radius: 10px;
  padding: 0.4rem 0.9rem;
  font-weight: 600;
  cursor: pointer;
}

.state {
  text-align: center;
  padding: 2rem;
  color: #64748b;
}

.state--error {
  color: #b91c1c;
}

.requests-list {
  display: flex;
  flex-direction: column;
  gap: 1.2rem;
}

.request-card {
  border: 1px solid rgba(79, 70, 229, 0.15);
  border-radius: 14px;
  padding: 1.2rem;
  background: white;
  box-shadow: 0 2px 10px rgba(15, 23, 42, 0.05);
}

.request-card__header {
  display: flex;
  justify-content: space-between;
  align-items: flex-start;
  gap: 1rem;
  margin-bottom: 1rem;
}

.request-card__meta {
  display: flex;
  align-items: center;
  gap: 0.75rem;
}

.request-card__id {
  font-size: 0.8rem;
  color: #94a3b8;
  font-weight: 600;
}

.request-card__program {
  display: block;
  color: #0f172a;
  font-size: 1rem;
}

.request-card__call {
  font-size: 0.82rem;
  color: #64748b;
}

.request-card__badge {
  display: inline-block;
  padding: 0.3rem 0.75rem;
  background: rgba(234, 179, 8, 0.1);
  border: 1px solid rgba(234, 179, 8, 0.4);
  color: #92400e;
  border-radius: 999px;
  font-size: 0.78rem;
  font-weight: 600;
  white-space: nowrap;
}

.request-card__team {
  margin-bottom: 1rem;
}

.request-card__team-label {
  font-size: 0.75rem;
  text-transform: uppercase;
  letter-spacing: 0.04em;
  color: #64748b;
  margin-bottom: 0.5rem;
}

.request-card__team-loading,
.request-card__team-empty {
  font-size: 0.85rem;
  color: #94a3b8;
}

.team-table {
  width: 100%;
  border-collapse: collapse;
  font-size: 0.85rem;
}

.team-table th,
.team-table td {
  text-align: left;
  padding: 0.45rem 0.65rem;
  border-bottom: 1px solid rgba(79, 70, 229, 0.08);
}

.team-table th {
  font-size: 0.72rem;
  text-transform: uppercase;
  letter-spacing: 0.04em;
  color: #64748b;
  background: rgba(99, 102, 241, 0.04);
}

.email-chip {
  display: inline-flex;
  align-items: center;
  gap: 0.3rem;
  padding: 0.2rem 0.55rem;
  background: rgba(79, 70, 229, 0.07);
  border: 1px solid rgba(79, 70, 229, 0.2);
  border-radius: 999px;
  color: #4338ca;
  font-size: 0.78rem;
  font-weight: 500;
  text-decoration: none;
  transition: background 0.15s;
}

.email-chip:hover {
  background: rgba(79, 70, 229, 0.14);
}

.email-chip__icon {
  opacity: 0.7;
  font-size: 0.72rem;
}

.request-card__actions {
  display: flex;
  gap: 0.75rem;
  flex-wrap: wrap;
}

.btn-approve {
  padding: 0.5rem 1.1rem;
  background: #4f46e5;
  color: white;
  border: none;
  border-radius: 10px;
  font-weight: 600;
  font-size: 0.88rem;
  cursor: pointer;
  transition: background 0.15s;
}

.btn-approve:hover:not(:disabled) {
  background: #4338ca;
}

.btn-reject {
  padding: 0.5rem 1.1rem;
  background: white;
  color: #b91c1c;
  border: 1px solid rgba(220, 38, 38, 0.3);
  border-radius: 10px;
  font-weight: 600;
  font-size: 0.88rem;
  cursor: pointer;
  transition: background 0.15s;
}

.btn-reject:hover:not(:disabled) {
  background: rgba(220, 38, 38, 0.06);
}

.btn-approve:disabled,
.btn-reject:disabled {
  opacity: 0.5;
  cursor: not-allowed;
}

.request-card__msg {
  margin-top: 0.7rem;
  font-size: 0.85rem;
  color: #334155;
}
</style>
