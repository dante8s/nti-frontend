<template>
    <div class="docs-section">
        <div class="section-title">
            <span>Обов'язкові документи</span>
            <span class="progress-text">
                {{ uploadedCount }}/{{ docs.length }} завантажено
            </span>
        </div>

        <div v-if="loading" class="loading">
            Завантаження...
        </div>

        <div v-else class="docs-list">
            <div v-for="doc in docs" :key="doc.documentType" class="doc-row" :class="{ uploaded: doc.uploaded }">
                <div class="doc-status-icon">
                    <span v-if="doc.uploaded" class="icon-done">
                        ✓
                    </span>
                    <span v-else class="icon-missing">○</span>
                </div>

                <div class="doc-info">
                    <div class="doc-label">
                        {{ doc.label }}
                        <span class="required-badge">Обов'язково</span>
                    </div>
                    <div class="doc-desc">{{ doc.description }}</div>
                    <div v-if="doc.uploaded" class="doc-filename">
                        📎 {{ doc.fileName }}
                    </div>
                    <!-- Прогрес -->
                    <div v-if="uploading[doc.documentType] !== undefined" class="progress-wrap">
                        <div class="progress-bar" :style="{
                            width: uploading[doc.documentType] + '%'
                        }"></div>
                    </div>
                    <!-- Помилка конкретного файлу -->
                    <div v-if="errors[doc.documentType]" class="doc-error">
                        {{ errors[doc.documentType] }}
                    </div>
                </div>

                <div class="doc-action">
                    <template v-if="!isLocked">
                        <label class="btn-upload">
                            {{ doc.uploaded ? '↻ Замінити' : '↑ Завантажити' }}
                            <input type="file" accept=".pdf,.doc,.docx" style="display:none" :disabled="uploading[doc.documentType] !== undefined
                                " @change="e => onFileSelect(e, doc)" />
                        </label>
                    </template>
                    <template v-else>
                        <span class="locked-text">
                            {{ doc.uploaded
                                ? '✓ Завантажено'
                                : '— Не завантажено' }}
                        </span>
                    </template>
                </div>
            </div>
        </div>

        <div v-if="isLocked" class="locked-notice">
            🔒 Документи не можна змінювати після відправки
        </div>
    </div>
</template>

<script setup>
import { ref, computed, onMounted, reactive } from 'vue'
import { applicationsApi } from '@/api/applications'

const props = defineProps({
    applicationId: { type: Number, required: true },
    applicationStatus: { type: String, required: true }
})

const emit = defineEmits(['change'])

const docs = ref([])
const loading = ref(true)
const uploading = reactive({})
const errors = reactive({})

const isLocked = computed(() =>
    props.applicationStatus !== 'DRAFT'
    && props.applicationStatus !== 'NEEDS_REVISION'
)

const uploadedCount = computed(() =>
    docs.value.filter(d => d.uploaded).length
)

onMounted(loadDocs)

async function loadDocs() {
    loading.value = true
    try {
        const res = await applicationsApi
            .getDocumentStatus(props.applicationId)
        docs.value = res.data
    } catch (e) {
        console.error('Помилка завантаження статусу:', e)
    } finally {
        loading.value = false
    }
}

async function onFileSelect(event, doc) {
    const file = event.target.files[0]
    if (!file) return

    // Очищаємо попередню помилку
    delete errors[doc.documentType]

    const name = file.name.toLowerCase()
    if (!name.endsWith('.pdf')
        && !name.endsWith('.docx')
        && !name.endsWith('.doc')) {
        errors[doc.documentType] =
            'Дозволені тільки PDF і DOCX файли'
        event.target.value = ''
        return
    }

    if (file.size > 10 * 1024 * 1024) {
        errors[doc.documentType] =
            'Файл не може бути більше 10MB'
        event.target.value = ''
        return
    }

    uploading[doc.documentType] = 0

    try {
        await applicationsApi.uploadDocument(
            props.applicationId,
            doc.documentType,
            file,
            (percent) => {
                uploading[doc.documentType] = percent
            }
        )
        await loadDocs()
        emit('change')
    } catch (e) {
        errors[doc.documentType] =
            e.response?.data || 'Помилка завантаження'
    } finally {
        delete uploading[doc.documentType]
        event.target.value = ''
    }
}
</script>

<style scoped>
.docs-section {
    margin-top: 1.5rem;
}

.section-title {
    display: flex;
    justify-content: space-between;
    font-weight: 600;
    font-size: 0.9rem;
    color: #374151;
    margin-bottom: 1rem;
    padding-bottom: 0.5rem;
    border-bottom: 1px solid #f3f4f6;
}

.progress-text {
    font-size: 0.75rem;
    font-weight: 400;
    color: #6b7280;
}

.docs-list {
    display: flex;
    flex-direction: column;
    gap: 8px;
}

.doc-row {
    border: 1px solid #e5e7eb;
    border-radius: 10px;
    padding: 12px 14px;
    display: flex;
    align-items: flex-start;
    gap: 12px;
    background: white;
}

.doc-row.uploaded {
    border-color: #86efac;
    background: #f0fdf4;
}

.doc-status-icon {
    flex-shrink: 0;
    margin-top: 2px;
}

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

.doc-info {
    flex: 1;
}

.doc-label {
    font-size: 0.875rem;
    font-weight: 500;
    color: #111827;
    display: flex;
    align-items: center;
    gap: 6px;
    margin-bottom: 2px;
}

.required-badge {
    font-size: 0.65rem;
    padding: 1px 5px;
    background: #fee2e2;
    color: #991b1b;
    border-radius: 4px;
    font-weight: 400;
}

.doc-desc {
    font-size: 0.78rem;
    color: #6b7280;
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

.locked-text {
    font-size: 0.78rem;
    color: #6b7280;
}

.locked-notice {
    margin-top: 8px;
    font-size: 0.78rem;
    color: #6b7280;
    padding: 8px 12px;
    background: #f9fafb;
    border-radius: 6px;
}

.loading {
    text-align: center;
    padding: 2rem;
    color: #9ca3af;
}
</style>