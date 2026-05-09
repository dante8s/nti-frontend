<template>
    <div class="page">
        <div class="back">
            <router-link to="/programs/b">← Назад до програми B</router-link>
        </div>

        <div class="form-box">
            <h1>Заявка — Програма B</h1>
            <p class="subtitle">Živá prax — реальні проекти від фірм</p>

            <div v-if="callInfo" class="call-info green">
                <span class="call-label">Завдання:</span>
                <strong>{{ callInfo.title }}</strong>
                <span class="deadline">Дедлайн: {{ formatDate(callInfo.deadline) }}</span>
            </div>

            <div v-if="initialLoading" class="loading">Завантаження...</div>

            <template v-else>
                <!-- Крок 1 — форма -->
                <div v-if="!application">
                    <div v-if="error" class="error">{{ error }}</div>

                    <form @submit.prevent="saveForm">
                        <div class="section-title">Команда</div>

                        <div class="field">
                            <label>Назва команди *</label>
                            <input v-model="form.teamName" type="text" placeholder="Назва вашої команди" required />
                        </div>
                        <div class="field">
                            <label>Склад команди *</label>
                            <textarea v-model="form.teamDescription" rows="3"
                                placeholder="Перерахуйте учасників і їх ролі..." required />
                        </div>
                        <div class="field">
                            <label>Технічні навички команди *</label>
                            <input v-model="form.skills" type="text" placeholder="Java, Vue.js, Docker, PostgreSQL..."
                                required />
                        </div>

                        <div class="section-title" style="margin-top:1.5rem">Пропозиція рішення</div>

                        <div class="field">
                            <label>Як ви вирішите завдання? *</label>
                            <textarea v-model="form.solution" rows="4" placeholder="Опишіть ваш підхід..." required />
                        </div>
                        <div class="field">
                            <label>Очікувані результати *</label>
                            <textarea v-model="form.expectedResults" rows="3"
                                placeholder="Що буде результатом вашої роботи?" required />
                        </div>
                        <div class="field">
                            <label>Мотивація команди *</label>
                            <textarea v-model="form.motivation" rows="3" placeholder="Чому ваша команда підходить?"
                                required />
                        </div>

                        <button type="submit" :disabled="loading" class="btn-primary green">
                            {{ loading ? 'Збереження...' : 'Зберегти і перейти до документів' }}
                        </button>
                    </form>
                </div>

                <!-- Крок 2 — документи -->
                <div v-else>
                    <div class="step-header">
                        <div class="step-done">✓ Інформація збережена</div>
                        <div v-if="savedFormData" class="saved-summary">
                            <strong>{{ savedFormData.teamName }}</strong>
                            <span class="muted"> · {{ savedFormData.skills }}</span>
                        </div>
                        <button v-if="application.status === 'DRAFT' || application.status === 'NEEDS_REVISION'"
                            type="button" class="btn-back-form" @click="application = null">
                            Редагувати дані ↩
                        </button>
                    </div>

                    <DocumentUpload :application-id="application.id" :application-status="application.status"
                        @change="checkReadyToSubmit" />

                    <div class="submit-section">
                        <div v-if="!canSubmit" class="submit-hint">
                            Завантажте всі 4 обов'язкові документи
                        </div>
                        <div class="submit-actions">
                            <button class="btn-draft" @click="$router.push('/app/my-applications')">
                                Зберегти як чернетку
                            </button>
                            <button class="btn-submit" :disabled="!canSubmit || submitting" @click="submitApplication">
                                {{ submitting ? 'Відправка...' : 'Відправити заявку' }}
                            </button>
                        </div>
                    </div>

                    <div v-if="submitError" class="error">{{ submitError }}</div>

                    <div v-if="submitted" class="success">
                        <h3>Заявку відправлено!</h3>
                        <p>Відстежуйте статус у кабінеті.</p>
                        <router-link to="/app/my-applications">Мої заявки</router-link>
                    </div>
                </div>
            </template>
        </div>
    </div>
</template>

<script setup>
import { ref, reactive, computed, onMounted } from 'vue'
import { useRoute } from 'vue-router'
import { programsApi } from '@/api/programs'
import { applicationsApi } from '@/api/applications'
import DocumentUpload from '@/components/DocumentUpload.vue'

const route = useRoute()
const callId = Number(route.params.callId)

const callInfo = ref(null)
const application = ref(null)
const initialLoading = ref(true)
const loading = ref(false)
const submitting = ref(false)
const error = ref('')
const submitError = ref('')
const submitted = ref(false)
const docsStatus = ref([])

const form = reactive({
    teamName: '',
    teamDescription: '',
    skills: '',
    solution: '',
    expectedResults: '',
    motivation: '',
})

const savedFormData = computed(() => {
    if (!application.value?.formData) return null
    try { return JSON.parse(application.value.formData) } catch { return null }
})

const canSubmit = computed(() =>
    docsStatus.value.length > 0 && docsStatus.value.every((d) => d.uploaded),
)

onMounted(async () => {
    try {
        const [callRes, existingRes] = await Promise.allSettled([
            programsApi.getCall(callId),
            applicationsApi.getMyByCall(callId),
        ])

        if (callRes.status === 'fulfilled') {
            callInfo.value = callRes.value.data
        }

        if (existingRes.status === 'fulfilled') {
            application.value = existingRes.value.data

            const saved = savedFormData.value
            if (saved) {
                form.teamName = saved.teamName || ''
                form.teamDescription = saved.teamDescription || ''
                form.skills = saved.skills || ''
                form.solution = saved.solution || ''
                form.expectedResults = saved.expectedResults || ''
                form.motivation = saved.motivation || ''
            }

            await checkReadyToSubmit()
        }
    } catch (e) {
        console.error(e)
    } finally {
        initialLoading.value = false
    }
})

async function saveForm() {
    error.value = ''
    loading.value = true
    try {
        const formData = JSON.stringify({
            teamName: form.teamName,
            teamDescription: form.teamDescription,
            skills: form.skills,
            solution: form.solution,
            expectedResults: form.expectedResults,
            motivation: form.motivation,
        })

        if (!application.value) {
            const res = await applicationsApi.createDraft(callId)
            const updated = await applicationsApi.updateDraft(res.data.id, formData)
            application.value = updated.data
        } else {
            const updated = await applicationsApi.updateDraft(application.value.id, formData)
            application.value = updated.data
        }

        await checkReadyToSubmit()
    } catch (e) {
        error.value = e.response?.data?.message || e.response?.data || 'Помилка при збереженні'
    } finally {
        loading.value = false
    }
}

async function checkReadyToSubmit() {
    if (!application.value) return
    try {
        const res = await applicationsApi.getDocumentStatus(application.value.id)
        docsStatus.value = res.data
    } catch (e) {
        console.error(e)
    }
}

async function submitApplication() {
    submitError.value = ''
    submitting.value = true
    try {
        await applicationsApi.submit(application.value.id)
        submitted.value = true
    } catch (e) {
        submitError.value = e.response?.data?.message || e.response?.data || 'Помилка при відправці'
    } finally {
        submitting.value = false
    }
}

function formatDate(date) {
    return new Date(date).toLocaleDateString('uk-UA', {
        day: '2-digit', month: 'long', year: 'numeric',
    })
}
</script>

<style scoped>
.page {
    max-width: 700px;
    margin: 0 auto;
    padding: 2rem;
}

.back {
    margin-bottom: 1.5rem;
}

.back a {
    color: #059669;
    text-decoration: none;
}

.loading {
    text-align: center;
    padding: 2rem;
    color: #6b7280;
}

.form-box {
    background: white;
    border: 1px solid #e5e7eb;
    border-radius: 12px;
    padding: 2rem;
}

h1 {
    font-size: 1.5rem;
    margin-bottom: 4px;
}

.subtitle {
    color: #6b7280;
    margin-bottom: 1.5rem;
}

.call-info {
    border-radius: 8px;
    padding: 10px 14px;
    margin-bottom: 1.5rem;
    display: flex;
    align-items: center;
    gap: 8px;
    flex-wrap: wrap;
}

.call-info.green {
    background: #f0fdf4;
    border: 1px solid #86efac;
}

.call-label {
    font-size: 0.875rem;
    color: #166534;
}

.deadline {
    margin-left: auto;
    font-size: 0.8rem;
    color: #ef4444;
    font-weight: 500;
}

.section-title {
    font-weight: 600;
    font-size: 0.875rem;
    color: #374151;
    margin-bottom: 0.75rem;
    padding-bottom: 0.5rem;
    border-bottom: 1px solid #f3f4f6;
}

.field {
    margin-bottom: 1rem;
}

label {
    display: block;
    font-size: 0.875rem;
    margin-bottom: 4px;
    color: #374151;
}

input,
textarea {
    width: 100%;
    padding: 10px 12px;
    border: 1px solid #d1d5db;
    border-radius: 8px;
    font-size: 0.9rem;
    box-sizing: border-box;
    font-family: inherit;
}

input:focus,
textarea:focus {
    outline: none;
    border-color: #059669;
}

textarea {
    resize: vertical;
}

.btn-primary {
    width: 100%;
    padding: 10px;
    border: none;
    border-radius: 8px;
    font-size: 1rem;
    cursor: pointer;
    margin-top: 0.5rem;
    color: white;
}

.btn-primary.green {
    background: #059669;
}

.btn-primary:disabled {
    opacity: 0.6;
    cursor: not-allowed;
}

.step-header {
    margin-bottom: 1rem;
}

.step-done {
    font-size: 0.875rem;
    color: #059669;
    font-weight: 500;
    margin-bottom: 4px;
}

.saved-summary {
    font-size: 0.875rem;
    color: #374151;
    margin-bottom: 6px;
}

.muted {
    color: #9ca3af;
}

.btn-back-form {
    font-size: 0.78rem;
    padding: 4px 10px;
    border: 1px solid #e5e7eb;
    border-radius: 6px;
    background: white;
    color: #059669;
    cursor: pointer;
}

.btn-back-form:hover {
    background: #f0fdf4;
}

.submit-section {
    margin-top: 1.5rem;
}

.submit-hint {
    font-size: 0.8rem;
    color: #6b7280;
    margin-bottom: 0.75rem;
    text-align: center;
}

.submit-actions {
    display: flex;
    gap: 10px;
}

.btn-draft {
    flex: 1;
    padding: 10px;
    border: 1px solid #d1d5db;
    background: white;
    border-radius: 8px;
    cursor: pointer;
    font-size: 0.9rem;
}

.btn-submit {
    flex: 2;
    padding: 10px;
    background: #059669;
    color: white;
    border: none;
    border-radius: 8px;
    cursor: pointer;
    font-size: 0.9rem;
}

.btn-submit:disabled {
    opacity: 0.5;
    cursor: not-allowed;
}

.error {
    background: #fee2e2;
    color: #dc2626;
    padding: 10px;
    border-radius: 8px;
    margin-top: 1rem;
    font-size: 0.875rem;
}

.success {
    background: #f0fdf4;
    border: 1px solid #86efac;
    border-radius: 8px;
    padding: 1rem;
    text-align: center;
    margin-top: 1rem;
}

.success h3 {
    color: #166534;
}

.success a {
    color: #059669;
}
</style>