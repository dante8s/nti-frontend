<template>
  <div class="result-docs-section">
    <div class="section-title">
      <span>Документи результатів проекту</span>
      <span class="progress-text">{{ uploadedCount }}/2 завантажено</span>
    </div>
    <p class="section-desc">
      Завантажте два документи з результатами проекту (Word, PDF або PPTX, до 10 МБ).
      Обидва файли обов'язкові для завершення проекту.
    </p>

    <div v-if="loading" class="loading">Завантаження...</div>

    <div v-else class="docs-list">
      <div
        v-for="doc in resultDocs"
        :key="doc.documentType"
        class="doc-row"
        :class="{ uploaded: doc.uploaded }"
      >
        <div class="doc-status-icon">
          <span v-if="doc.uploaded" class="icon-done">✓</span>
          <span v-else class="icon-missing">○</span>
        </div>

        <div class="doc-info">
          <div class="doc-label">{{ doc.label }}</div>
          <div v-if="doc.uploaded" class="doc-filename">📎 {{ doc.fileName }}</div>
          <div v-if="uploading[doc.documentType] !== undefined" class="progress-wrap">
            <div class="progress-bar" :style="{ width: uploading[doc.documentType] + '%' }"></div>
          </div>
          <div v-if="errors[doc.documentType]" class="doc-error">{{ errors[doc.documentType] }}</div>
        </div>

        <div class="doc-action">
          <button
            v-if="doc.uploaded"
            type="button"
            class="btn-view"
            :disabled="previewing[doc.documentType]"
            @click="viewDoc(doc)"
          >
            👁 Переглянути
          </button>
          <label class="btn-upload">
            {{ doc.uploaded ? '↻ Замінити' : '↑ Завантажити' }}
            <input
              type="file"
              accept=".pdf,.doc,.docx,.ppt,.pptx"
              style="display:none"
              :disabled="uploading[doc.documentType] !== undefined"
              @change="e => onFileSelect(e, doc)"
            />
          </label>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, computed, onMounted, reactive, watch } from 'vue'
import { applicationsApi } from '@/api/applications'

const props = defineProps({
  applicationId: { type: Number, required: true }
})

const emit = defineEmits(['change'])

const loading = ref(true)
const allDocs = ref([])
const uploading = reactive({})
const previewing = reactive({})
const errors = reactive({})

const RESULT_TYPES = [
  { documentType: 'RESULT_1', label: 'Результатний документ 1' },
  { documentType: 'RESULT_2', label: 'Результатний документ 2' },
]

const resultDocs = computed(() =>
  RESULT_TYPES.map(rt => {
    const found = allDocs.value.find(d => d.documentType === rt.documentType)
    return {
      ...rt,
      uploaded: !!found?.uploaded,
      fileName: found?.fileName || null,
    }
  })
)

const uploadedCount = computed(() => resultDocs.value.filter(d => d.uploaded).length)

onMounted(loadDocs)

async function loadDocs() {
  loading.value = true
  try {
    const res = await applicationsApi.getDocumentStatus(props.applicationId)
    allDocs.value = res.data
  } catch (e) {
    console.error('Помилка завантаження статусу документів:', e)
  } finally {
    loading.value = false
  }
}

watch(uploadedCount, (count) => {
  emit('change', count === 2)
})

async function viewDoc(doc) {
  previewing[doc.documentType] = true
  try {
    const res = await applicationsApi.fetchDocumentBlob(
      props.applicationId,
      doc.documentType,
      'inline'
    )
    const blob = new Blob([res.data], { type: res.data.type })
    const url = URL.createObjectURL(blob)
    window.open(url, '_blank')
    // Звільняємо пам'ять після відкриття
    setTimeout(() => URL.revokeObjectURL(url), 10000)
  } catch (e) {
    errors[doc.documentType] = 'Не вдалося відкрити файл'
  } finally {
    previewing[doc.documentType] = false
  }
}

async function onFileSelect(event, doc) {
  const file = event.target.files[0]
  if (!file) return

  delete errors[doc.documentType]

  const name = file.name.toLowerCase()
  const validExt = name.endsWith('.pdf') || name.endsWith('.docx')
    || name.endsWith('.doc') || name.endsWith('.pptx') || name.endsWith('.ppt')
  if (!validExt) {
    errors[doc.documentType] = 'Дозволені тільки PDF, DOCX та PPTX файли'
    event.target.value = ''
    return
  }

  if (file.size > 10 * 1024 * 1024) {
    errors[doc.documentType] = 'Файл не може бути більше 10MB'
    event.target.value = ''
    return
  }

  uploading[doc.documentType] = 0

  try {
    await applicationsApi.uploadDocument(
      props.applicationId,
      doc.documentType,
      file,
      (percent) => { uploading[doc.documentType] = percent }
    )
    await loadDocs()
  } catch (e) {
    errors[doc.documentType] = e.response?.data || 'Помилка завантаження'
  } finally {
    delete uploading[doc.documentType]
    event.target.value = ''
  }
}
</script>

<style scoped>
.result-docs-section {
  margin-top: 1.5rem;
  padding: 1rem 1.25rem;
  border: 1.5px dashed #a5b4fc;
  border-radius: 10px;
  background: #f5f3ff;
}

.section-title {
  display: flex;
  justify-content: space-between;
  font-weight: 600;
  font-size: 0.9rem;
  color: #374151;
  margin-bottom: 0.4rem;
}

.progress-text {
  font-size: 0.75rem;
  font-weight: 400;
  color: #6b7280;
}

.section-desc {
  font-size: 0.78rem;
  color: #6b7280;
  margin-bottom: 0.75rem;
}

.docs-list {
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.doc-row {
  border: 1px solid #e5e7eb;
  border-radius: 10px;
  padding: 10px 12px;
  display: flex;
  align-items: flex-start;
  gap: 10px;
  background: white;
}

.doc-row.uploaded {
  border-color: #86efac;
  background: #f0fdf4;
}

.doc-status-icon { flex-shrink: 0; margin-top: 2px; }

.icon-done {
  display: flex;
  width: 20px;
  height: 20px;
  background: #10b981;
  color: white;
  border-radius: 50%;
  align-items: center;
  justify-content: center;
  font-size: 0.7rem;
  font-weight: 700;
}

.icon-missing {
  display: flex;
  width: 20px;
  height: 20px;
  border: 2px solid #d1d5db;
  border-radius: 50%;
  align-items: center;
  justify-content: center;
  color: #d1d5db;
}

.doc-info { flex: 1; }

.doc-label {
  font-size: 0.875rem;
  font-weight: 500;
  color: #111827;
  margin-bottom: 2px;
}

.doc-filename {
  font-size: 0.75rem;
  color: #059669;
  margin-top: 4px;
}

.progress-wrap {
  height: 4px;
  background: #e5e7eb;
  border-radius: 2px;
  margin-top: 6px;
}

.progress-bar {
  height: 4px;
  background: #4f46e5;
  border-radius: 2px;
  transition: width 0.3s;
}

.doc-error {
  font-size: 0.75rem;
  color: #dc2626;
  margin-top: 4px;
}

.doc-action {
  flex-shrink: 0;
  display: flex;
  flex-direction: column;
  gap: 6px;
  align-items: flex-end;
}

.btn-view {
  display: inline-block;
  padding: 6px 12px;
  background: white;
  color: #4f46e5;
  border: 1px solid rgba(79, 70, 229, 0.35);
  border-radius: 6px;
  font-size: 0.78rem;
  cursor: pointer;
  white-space: nowrap;
  transition: background 0.15s;
}

.btn-view:hover:not(:disabled) {
  background: #f5f3ff;
}

.btn-view:disabled {
  opacity: 0.5;
  cursor: not-allowed;
}

.btn-upload {
  display: inline-block;
  padding: 6px 12px;
  background: #4f46e5;
  color: white;
  border-radius: 6px;
  font-size: 0.78rem;
  cursor: pointer;
  white-space: nowrap;
}

.loading {
  text-align: center;
  padding: 1rem;
  color: #9ca3af;
}
</style>
