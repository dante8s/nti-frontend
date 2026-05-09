<template>
  <div class="page">
    <h1>Program B від компанії</h1>
    <p class="lead">
      Створіть заявку компанії, додайте тему та цілі. Після submit вона піде супер-адміну на перевірку.
    </p>

    <div class="card">
      <label>Назва програми</label>
      <input v-model="form.name" type="text">

      <label>Тема</label>
      <input v-model="form.topic" type="text">

      <label>Опис</label>
      <textarea v-model="form.description" rows="3" />

      <label>Цілі / opts</label>
      <textarea v-model="form.objectives" rows="3" />

      <div class="actions">
        <button class="btn" @click="saveDraft">
          Зберегти чернетку
        </button>
        <button class="btn btn-primary" :disabled="!draftId" @click="submitDraft">
          Надіслати супер-адміну
        </button>
      </div>

      <h4>Файли компанії</h4>
      <div v-for="doc in requiredDocs" :key="doc.value" class="doc-row">
        <span>{{ doc.label }}</span>
        <input type="file" accept=".pdf,.docx" @change="onFilePicked(doc.value, $event)">
      </div>
    </div>

    <div class="card">
      <h3>Мої подачі Program B</h3>
      <ul v-if="rows.length" class="list">
        <li v-for="r in rows" :key="r.id">
          <strong>{{ r.name }}</strong> - {{ r.reviewStatus }}
          <span v-if="r.reviewComment"> ({{ r.reviewComment }})</span>
        </li>
      </ul>
      <p v-else class="muted">
        Поки що немає подач.
      </p>
    </div>
  </div>
</template>

<script setup>
import { onMounted, reactive, ref } from 'vue'
import { programsApi } from '@/api/programs'
import { apiErrorMessage } from '@/utils/apiError'

const form = reactive({
  name: '',
  topic: '',
  description: '',
  objectives: '',
})

const rows = ref([])
const draftId = ref(null)
const requiredDocs = [
  { value: 'COMPANY_TECHNICAL_SPECIFICATION', label: 'Технічні характеристики' },
  { value: 'COMPANY_BUDGET_PLAN', label: 'Бюджет' },
  { value: 'COMPANY_PRODUCT_OWNER_CONFIRMATION', label: 'Власник продукту' },
]

onMounted(loadMy)

async function saveDraft() {
  try {
    const res = await programsApi.saveProgramBDraft({
      id: draftId.value,
      name: form.name,
      topic: form.topic,
      description: form.description,
      objectives: form.objectives,
      type: 'PROGRAM_B',
      isActive: false,
    })
    draftId.value = res.data?.id || null
    await loadMy()
  } catch (e) {
    alert(apiErrorMessage(e, 'Помилка збереження'))
  }
}

async function submitDraft() {
  try {
    await programsApi.submitProgramBDraft(draftId.value)
    await loadMy()
  } catch (e) {
    alert(apiErrorMessage(e, 'Не вдалося надіслати'))
  }
}

async function loadMy() {
  const res = await programsApi.getMyProgramBSubmissions()
  rows.value = res.data || []
}

async function onFilePicked(docType, event) {
  const file = event.target.files?.[0]
  if (!file || !draftId.value) return
  try {
    await programsApi.uploadProgramBDocument(draftId.value, docType, file)
  } catch (e) {
    alert(apiErrorMessage(e, 'Помилка завантаження файлу'))
  }
}
</script>

<style scoped>
.page { max-width: 900px; margin: 0 auto; padding: 1rem; }
.card { background: #fff; border: 1px solid #ddd; border-radius: 10px; padding: 1rem; margin-bottom: 1rem; display: flex; flex-direction: column; gap: 0.5rem; }
.actions { display: flex; gap: 0.5rem; }
.btn { padding: 0.5rem 0.9rem; border: 1px solid #bbb; background: #fff; border-radius: 8px; cursor: pointer; }
.btn-primary { background: #4f46e5; color: #fff; border-color: #4f46e5; }
.list { margin: 0; padding-left: 1.2rem; }
.muted { color: #64748b; }
.doc-row { display: flex; gap: 0.7rem; align-items: center; }
</style>
