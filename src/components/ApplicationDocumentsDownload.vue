<template>
  <section class="docs-download" aria-label="Документи заявки">
    <div class="docs-download__head">
      <h2>Матеріали заявки</h2>
      <p class="docs-download__sub">
        Обовʼязкові документи, які подав учасник — для перегляду та завантаження під час оцінювання.
      </p>
    </div>

    <div v-if="loading" class="docs-download__loading">Завантаження списку…</div>
    <p v-else-if="error" class="docs-download__err">{{ error }}</p>
    <div v-else-if="!docs.length" class="docs-download__empty">Документів за цією заявкою немає.</div>

    <ul v-else class="docs-download__list">
      <li
        v-for="doc in docs"
        :key="doc.documentType"
        class="docs-download__row"
        :class="{ 'is-uploaded': doc.uploaded }"
      >
        <div class="docs-download__info">
          <div class="docs-download__title">{{ doc.label || doc.documentType }}</div>
          <p v-if="doc.description" class="docs-download__desc">{{ doc.description }}</p>
          <p v-if="doc.uploaded && doc.fileName" class="docs-download__file">
            📎 {{ doc.fileName }}
          </p>
        </div>
        <div class="docs-download__action">
          <template v-if="doc.uploaded">
            <button
              v-if="isPdfFile(doc)"
              type="button"
              class="btn-preview"
              :disabled="previewBusy"
              @click="openPreview(doc)"
            >
              {{
                previewBusy && openingForType === doc.documentType ? 'Відкриття…' : 'Переглянути'
              }}
            </button>
            <button
              type="button"
              class="btn-dl"
              :disabled="downloading[doc.documentType]"
              @click="downloadOne(doc)"
            >
              {{ downloading[doc.documentType] ? 'Завантаження…' : 'Завантажити' }}
            </button>
          </template>
          <span v-else class="docs-download__missing">Не подано</span>
        </div>
      </li>
    </ul>
    <p v-if="downloadMessage" class="docs-download__msg">{{ downloadMessage }}</p>

    <Teleport to="body">
      <div
        v-if="previewOpen && previewBlobUrl"
        class="doc-preview-modal"
        role="dialog"
        aria-modal="true"
        :aria-label="'Перегляд: ' + (previewTitle || 'документ')"
        @click.self="closePreview"
      >
        <div class="doc-preview-panel">
          <div class="doc-preview-bar">
            <span class="doc-preview-title">{{ previewTitle || 'Документ PDF' }}</span>
            <button type="button" class="doc-preview-close" @click="closePreview">
              Закрити
            </button>
          </div>
          <iframe class="doc-preview-iframe" title="PDF документ" :src="previewBlobUrl" />
        </div>
      </div>
    </Teleport>
  </section>
</template>

<script setup>
import { onMounted, reactive, ref, watch } from 'vue'
import { applicationsApi } from '@/api/applications'

const props = defineProps({
  applicationId: { type: Number, required: true },
})

const docs = ref([])
const loading = ref(true)
const error = ref('')
const downloading = reactive({})
const downloadMessage = ref('')

const previewOpen = ref(false)
const previewBlobUrl = ref('')
const previewTitle = ref('')
const previewBusy = ref(false)
const openingForType = ref('')

function parseFilenameFromDisposition(cd) {
  if (!cd || typeof cd !== 'string') return ''
  const m = /filename\*=UTF-8''([^;\n]+)|filename="([^"]+)"|filename=([^;\n]+)/i.exec(cd)
  const raw = m ? (m[1] || m[2] || m[3] || '').trim() : ''
  try {
    return decodeURIComponent(raw.replace(/^["']|["']$/g, ''))
  } catch {
    return raw
  }
}

async function blobLooksLikeJsonError(blob) {
  if (!blob || blob.size > 65536) return null
  const t = await blob.slice(0, 2048).text()
  const s = t.trimStart()
  if (s.startsWith('{') || s.startsWith('[')) {
    try {
      const j = JSON.parse(t)
      return j.message || j.error || JSON.stringify(j)
    } catch {
      return t
    }
  }
  return null
}

function triggerFileDownload(blob, filename) {
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = filename || 'document'
  a.rel = 'noopener'
  document.body.appendChild(a)
  a.click()
  a.remove()
  URL.revokeObjectURL(url)
}

function isPdfFile(doc) {
  const name = (doc?.fileName || '').toLowerCase()
  return name.endsWith('.pdf')
}

function closePreview() {
  if (previewBlobUrl.value.startsWith('blob:')) {
    URL.revokeObjectURL(previewBlobUrl.value)
  }
  previewBlobUrl.value = ''
  previewTitle.value = ''
  previewOpen.value = false
  openingForType.value = ''
}

async function openPreview(doc) {
  downloadMessage.value = ''
  const id = props.applicationId
  const dt = doc.documentType
  const isPdf = isPdfFile(doc)
  if (!isPdf) {
    downloadMessage.value = 'Перегляд у вікні доступний лише для PDF. Скористайтесь «Завантажити».'
    return
  }
  previewBusy.value = true
  openingForType.value = dt
  try {
    const res = await applicationsApi.fetchDocumentBlob(id, dt, 'inline')
    const blob = res.data
    const ct = res.headers?.['content-type'] || blob.type || ''
    if (ct.includes('application/json') || ct.includes('text/')) {
      const errText = await blobLooksLikeJsonError(blob)
      if (errText) {
        downloadMessage.value = errText
        return
      }
    }
    const pdfBlob =
      blob.type && blob.type.includes('pdf')
        ? blob
        : new Blob([blob], { type: 'application/pdf' })
    closePreview()
    previewBlobUrl.value = URL.createObjectURL(pdfBlob)
    previewTitle.value = doc.label || doc.fileName || dt
    previewOpen.value = true
  } catch (e) {
    const d = e.response?.data
    if (d instanceof Blob) {
      downloadMessage.value = (await blobLooksLikeJsonError(d)) || 'Не вдалося відкрити файл.'
    } else {
      downloadMessage.value =
        e.response?.data?.message || e.response?.data?.error || 'Не вдалося відкрити файл.'
    }
  } finally {
    previewBusy.value = false
    openingForType.value = ''
  }
}

async function downloadOne(doc) {
  downloadMessage.value = ''
  const id = props.applicationId
  const dt = doc.documentType
  downloading[dt] = true
  try {
    const res = await applicationsApi.downloadDocument(id, dt)
    const blob = res.data
    const ct = res.headers?.['content-type'] || ''
    if (ct.includes('application/json') || ct.includes('text/')) {
      const errText = await blobLooksLikeJsonError(blob)
      if (errText) {
        downloadMessage.value = errText
        return
      }
    }
    let filename =
      parseFilenameFromDisposition(res.headers?.['content-disposition']) || doc.fileName || dt
    triggerFileDownload(blob, filename)
  } catch (e) {
    const d = e.response?.data
    if (d instanceof Blob) {
      const errText = await blobLooksLikeJsonError(d)
      downloadMessage.value = errText || 'Не вдалося отримати файл.'
    } else {
      downloadMessage.value =
        e.response?.data?.message || e.response?.data?.error || 'Не вдалося завантажити файл.'
    }
  } finally {
    downloading[dt] = false
  }
}

async function loadDocs() {
  if (!props.applicationId) return
  loading.value = true
  error.value = ''
  downloadMessage.value = ''
  try {
    const res = await applicationsApi.getDocumentStatus(props.applicationId)
    docs.value = Array.isArray(res.data) ? res.data : []
  } catch (e) {
    error.value = e.response?.data?.message || 'Не вдалося завантажити перелік документів.'
    docs.value = []
  } finally {
    loading.value = false
  }
}

onMounted(loadDocs)
watch(
  () => props.applicationId,
  () => {
    closePreview()
    loadDocs()
  },
)
</script>

<style scoped>
.docs-download {
  border-radius: 16px;
  padding: 1.1rem 1.15rem;
  background: #f0f9ff;
  border: 1px solid #bae6fd;
}

.docs-download__head h2 {
  margin: 0 0 0.35rem;
  font-size: 1.05rem;
  color: #0c4a6e;
}

.docs-download__sub {
  margin: 0 0 0.75rem;
  font-size: 0.82rem;
  color: #0369a1;
  line-height: 1.35;
}

.docs-download__loading,
.docs-download__empty {
  font-size: 0.88rem;
  color: #64748b;
}

.docs-download__err {
  margin: 0;
  font-size: 0.88rem;
  color: #b91c1c;
}

.docs-download__list {
  list-style: none;
  margin: 0;
  padding: 0;
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.docs-download__row {
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  gap: 12px;
  padding: 12px 14px;
  border-radius: 10px;
  border: 1px solid #e5e7eb;
  background: #fff;
}

.docs-download__row.is-uploaded {
  border-color: #86efac;
  background: #f0fdf4;
}

.docs-download__title {
  font-size: 0.875rem;
  font-weight: 600;
  color: #111827;
}

.docs-download__desc {
  margin: 4px 0 0;
  font-size: 0.78rem;
  color: #6b7280;
  line-height: 1.35;
}

.docs-download__file {
  margin: 6px 0 0;
  font-size: 0.75rem;
  color: #059669;
}

.docs-download__action {
  flex-shrink: 0;
  padding-top: 2px;
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
  justify-content: flex-end;
}

.btn-preview {
  border: 1px solid #0f766e;
  border-radius: 8px;
  background: #ecfdf5;
  color: #0f766e;
  font-weight: 600;
  font-size: 0.78rem;
  padding: 6px 12px;
  cursor: pointer;
  white-space: nowrap;
}

.btn-preview:disabled {
  opacity: 0.65;
  cursor: not-allowed;
}

.btn-dl {
  border: none;
  border-radius: 8px;
  background: #0ea5e9;
  color: #fff;
  font-weight: 600;
  font-size: 0.78rem;
  padding: 6px 12px;
  cursor: pointer;
  white-space: nowrap;
}

.btn-dl:disabled {
  opacity: 0.65;
  cursor: not-allowed;
}

.docs-download__missing {
  font-size: 0.78rem;
  color: #94a3b8;
}

.docs-download__msg {
  margin: 0.65rem 0 0;
  font-size: 0.82rem;
  color: #b45309;
  background: #fffbeb;
  border-radius: 8px;
  padding: 0.45rem 0.55rem;
}

.doc-preview-modal {
  position: fixed;
  inset: 0;
  z-index: 10020;
  background: rgba(15, 23, 42, 0.55);
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 1rem;
}

.doc-preview-panel {
  width: min(960px, 100%);
  height: min(90vh, 900px);
  background: #fff;
  border-radius: 12px;
  overflow: hidden;
  display: flex;
  flex-direction: column;
  box-shadow: 0 25px 50px rgba(0, 0, 0, 0.2);
}

.doc-preview-bar {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 0.75rem;
  padding: 0.6rem 0.85rem;
  background: #0c4a6e;
  color: #fff;
}

.doc-preview-title {
  font-weight: 700;
  font-size: 0.9rem;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.doc-preview-close {
  flex-shrink: 0;
  border: none;
  border-radius: 8px;
  background: rgba(255, 255, 255, 0.2);
  color: #fff;
  font-weight: 600;
  padding: 0.35rem 0.65rem;
  cursor: pointer;
}

.doc-preview-iframe {
  flex: 1;
  width: 100%;
  border: 0;
  min-height: 0;
}
</style>
