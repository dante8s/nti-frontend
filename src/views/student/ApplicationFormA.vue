<template>
    <div class="page">
        <div class="back">
            <router-link to="/programs/a">← Назад до програми А</router-link>
        </div>

        <div class="form-box">
            <h1>Заявка — Програма A</h1>
            <p class="subtitle">Grантовий інкубаційний програм</p>

            <div v-if="callInfo" class="call-info">
                <span class="call-label">Виклик:</span>
                <strong>{{ callInfo.title }}</strong>
                <span class="deadline">Дедлайн: {{ formatDate(callInfo.deadline) }}</span>
            </div>

            <div v-if="initialLoading" class="loading">Завантаження...</div>

            <template v-else>
                <!-- Крок 1 — форма (нова або редагування) -->
                <div v-if="!application">
                    <div v-if="error" class="error">{{ error }}</div>

                    <form @submit.prevent="saveForm">
                        <div class="field">
                            <label>Назва проекту *</label>
                            <input v-model="form.projectName" type="text" placeholder="Назва вашого проекту" required />
                        </div>
                        <div class="field">
                            <label>Короткий опис *</label>
                            <textarea v-model="form.description" rows="4" placeholder="Опишіть вашу ідею..." required />
                        </div>
                        <div class="field">
                            <label>Тематична категорія *</label>
                            <select v-model="form.category" required>
                                <option value="">Оберіть категорію</option>
                                <option value="software">Розробка ПЗ</option>
                                <option value="ai">AI та дані</option>
                                <option value="web">Веб-застосунки</option>
                                <option value="game">Геймдев</option>
                                <option value="iot">IoT та embedded</option>
                            </select>
                        </div>
                        <div class="field">
                            <label>Технологічний стек *</label>
                            <input v-model="form.techStack" type="text" placeholder="React, Spring Boot..." required />
                        </div>
                        <div class="field">
                            <label>Склад команди *</label>
                            <textarea v-model="form.teamDescription" rows="3" required />
                        </div>

                        <button type="submit" :disabled="loading" class="btn-primary">
                            {{ loading ? 'Збереження...' : 'Зберегти і перейти до документів' }}
                        </button>
                    </form>
                </div>

                <!-- Крок 2 — документи -->
                <div v-else>
                    <div class="step-header">
                        <div class="step-done">✓ Інформація збережена</div>
                        <!-- Показуємо збережені дані -->
                        <div v-if="savedFormData" class="saved-summary">
                            <strong>{{ savedFormData.projectName }}</strong>
                            <span class="muted"> · {{ savedFormData.category }}</span>
                        </div>
                        <!-- Кнопка повернутись до редагування форми -->
                        <button v-if="application.status === 'DRAFT' || application.status === 'NEEDS_REVISION'"
                            type="button" class="btn-back-form" @click="application = null">
                            Редагувати дані ↩
                        </button>
                    </div>

                    <DocumentUpload :application-id="application.id" :application-status="application.status"
                        @change="checkReadyToSubmit" />

                    <div class="submit-section">
                        <div v-if="!canSubmit" class="submit-hint">
                            Завантажте всі обов'язкові документи щоб відправити заявку
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
                        <p>Ви можете відстежувати статус у кабінеті.</p>
                        <router-link to="/app/my-applications">Перейти до моїх заявок</router-link>
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
const application = ref(null)   // null = ще не збережена / показати форму
const initialLoading = ref(true)
const loading = ref(false)
const submitting = ref(false)
const error = ref('')
const submitError = ref('')
const submitted = ref(false)
const docsStatus = ref([])

const form = reactive({
    projectName: '',
    description: '',
    category: '',
    techStack: '',
    teamDescription: '',
})

// Збережені дані для відображення підсумку на кроці 2
const savedFormData = computed(() => {
    if (!application.value?.formData) return null
    try { return JSON.parse(application.value.formData) } catch { return null }
})

const canSubmit = computed(() =>
    docsStatus.value.length > 0 && docsStatus.value.every((d) => d.uploaded),
)

onMounted(async () => {
    try {
        // Паралельно завантажуємо інфо про call і перевіряємо чи є вже заявка
        const [callRes, existingRes] = await Promise.allSettled([
            programsApi.getCall(callId),
            applicationsApi.getMyByCall(callId),
        ])

        if (callRes.status === 'fulfilled') {
            callInfo.value = callRes.value.data
        }

        if (existingRes.status === 'fulfilled') {
            // Заявка вже є — підтягуємо дані і переходимо на крок 2
            application.value = existingRes.value.data

            // Заповнюємо форму збереженими даними (на випадок якщо повернуться до кроку 1)
            const saved = savedFormData.value
            if (saved) {
                form.projectName = saved.projectName || ''
                form.description = saved.description || ''
                form.category = saved.category || ''
                form.techStack = saved.techStack || ''
                form.teamDescription = saved.teamDescription || ''
            }

            await checkReadyToSubmit()
        }
        // якщо 404 — existingRes.status === 'rejected', application залишається null → показуємо форму
    } catch (e) {
        console.error(e)
    } finally {
        initialLoading.value = false
    }
})

/**
 * saveForm — викликається при Submit форми (крок 1).
 * Якщо заявки ще немає — створюємо, потім зберігаємо formData.
 * Якщо заявка вже є (редагування) — тільки оновлюємо formData.
 */
async function saveForm() {
    error.value = ''
    loading.value = true
    try {
        const formData = JSON.stringify({
            projectName: form.projectName,
            description: form.description,
            category: form.category,
            techStack: form.techStack,
            teamDescription: form.teamDescription,
        })

        if (!application.value) {
            // Нова заявка: спочатку create, потім update з formData
            const res = await applicationsApi.createDraft(callId)
            const created = res.data
            const updated = await applicationsApi.updateDraft(created.id, formData)
            application.value = updated.data
        } else {
            // Редагування: тільки оновлюємо formData
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
    color: #4f46e5;
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
    background: #f0f9ff;
    border: 1px solid #bae6fd;
    border-radius: 8px;
    padding: 10px 14px;
    margin-bottom: 1.5rem;
    display: flex;
    align-items: center;
    gap: 8px;
    flex-wrap: wrap;
}

.call-label {
    font-size: 0.875rem;
    color: #0369a1;
}

.deadline {
    margin-left: auto;
    font-size: 0.8rem;
    color: #ef4444;
    font-weight: 500;
}

.field {
    margin-bottom: 1rem;
}

label {
    display: block;
    font-size: 0.875rem;
    margin-bottom: 4px;
}

input,
select,
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
select:focus,
textarea:focus {
    outline: none;
    border-color: #4f46e5;
}

textarea {
    resize: vertical;
}

.btn-primary {
    width: 100%;
    padding: 10px;
    background: #4f46e5;
    color: white;
    border: none;
    border-radius: 8px;
    font-size: 1rem;
    cursor: pointer;
    margin-top: 0.5rem;
}

.btn-primary:disabled {
    opacity: 0.6;
    cursor: not-allowed;
}

/* Крок 2 */
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
    color: #4f46e5;
    cursor: pointer;
}

.btn-back-form:hover {
    background: #f5f3ff;
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
    background: #10b981;
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
    color: #4f46e5;
}
</style>