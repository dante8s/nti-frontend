<template>
  <div class="page">
    <h1>Запити на завершення проекту</h1>
    <p class="lead">
      Команди Програми B надіслали запити на завершення проекту. Підтвердіть або відхиліть кожен запит.
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

        <!-- Результатні документи -->
        <div class="request-card__docs">
          <p class="request-card__docs-label">Результатні документи</p>
          <div v-if="docsLoading[app.id]" class="docs-loading">Завантаження...</div>
          <div v-else-if="!docsList[app.id]?.length" class="docs-empty">Документи не знайдено</div>
          <div v-else class="docs-list">
            <div
              v-for="doc in resultDocs(app.id)"
              :key="doc.documentType"
              class="doc-chip"
            >
              <span class="doc-chip__icon">📎</span>
              {{ doc.label }}: {{ doc.fileName || 'не завантажено' }}
            </div>
          </div>
        </div>

        <div class="request-card__actions">
          <button class="btn-approve" :disabled="busy[app.id]" @click="approve(app)">
            ✓ Підтвердити завершення
          </button>
          <button class="btn-reject" :disabled="busy[app.id]" @click="reject(app)">
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

const requests = ref([])
const loading = ref(false)
const error = ref('')
const busy = reactive({})
const messages = reactive({})
const docsList = reactive({})
const docsLoading = reactive({})

const RESULT_LABELS = {
  RESULT_1: 'Документ 1',
  RESULT_2: 'Документ 2',
}

onMounted(load)

async function load() {
  loading.value = true
  error.value = ''
  try {
    const res = await applicationsApi.getPOCompletionRequests()
    requests.value = res.data || []
    for (const app of requests.value) {
      docsLoading[app.id] = true
      applicationsApi.getDocumentStatus(app.id)
        .then(r => { docsList[app.id] = r.data })
        .catch(() => { docsList[app.id] = [] })
        .finally(() => { docsLoading[app.id] = false })
    }
  } catch (e) {
    error.value = e.response?.data?.message || 'Не вдалося завантажити запити.'
  } finally {
    loading.value = false
  }
}

function resultDocs(appId) {
  const docs = docsList[appId] || []
  return ['RESULT_1', 'RESULT_2'].map(type => {
    const found = docs.find(d => d.documentType === type)
    return {
      documentType: type,
      label: RESULT_LABELS[type],
      fileName: found?.fileName || null,
      uploaded: !!found?.uploaded,
    }
  })
}

async function approve(app) {
  busy[app.id] = true
  messages[app.id] = ''
  try {
    await applicationsApi.approveCompletionPO(app.id)
    messages[app.id] = '✓ Завершення підтверджено. Заявку передано адміністратору.'
    setTimeout(() => {
      requests.value = requests.value.filter(r => r.id !== app.id)
    }, 1500)
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
    await applicationsApi.rejectCompletionPO(app.id)
    messages[app.id] = '✕ Запит відхилено. Команда отримала повідомлення.'
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
.page { max-width: 900px; }

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

.state { text-align: center; padding: 2rem; color: #64748b; }
.state--error { color: #b91c1c; }

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

.request-card__id { font-size: 0.8rem; color: #94a3b8; font-weight: 600; }

.request-card__program { display: block; color: #0f172a; font-size: 1rem; }
.request-card__call { font-size: 0.82rem; color: #64748b; }

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

.request-card__docs { margin-bottom: 1rem; }

.request-card__docs-label {
  font-size: 0.75rem;
  text-transform: uppercase;
  letter-spacing: 0.04em;
  color: #64748b;
  margin-bottom: 0.5rem;
}

.docs-loading, .docs-empty { font-size: 0.85rem; color: #94a3b8; }

.docs-list { display: flex; flex-direction: column; gap: 4px; }

.doc-chip {
  display: inline-flex;
  align-items: center;
  gap: 6px;
  font-size: 0.82rem;
  color: #374151;
  padding: 4px 8px;
  background: #f3f4f6;
  border-radius: 6px;
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

.btn-approve:hover:not(:disabled) { background: #4338ca; }

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

.btn-reject:hover:not(:disabled) { background: rgba(220, 38, 38, 0.06); }

.btn-approve:disabled,
.btn-reject:disabled { opacity: 0.5; cursor: not-allowed; }

.request-card__msg { margin-top: 0.7rem; font-size: 0.85rem; color: #334155; }
</style>
