<template>
    <div class="page">
        <div class="back">
            <router-link to="/programs/b">
                ← Назад до програм
            </router-link>
        </div>

        <div class="form-box">
            <h1>Заявка — Програма B</h1>
            <p class="subtitle">Živá prax — реальні проекти від фірм</p>

            <div v-if="callInfo" class="call-info">
                <span class="call-label">Завдання:</span>
                <strong>{{ callInfo.title }}</strong>
                <span class="deadline">
                    Дедлайн: {{ formatDate(callInfo.deadline) }}
                </span>
            </div>

            <div v-if="error" class="error">{{ error }}</div>
            <div v-if="success" class="success">
                <h3>Заявку збережено!</h3>
                <p>
                    Завантажте резюме команди і перейдіть до
                    кабінету щоб відправити заявку.
                </p>
                <router-link to="/app/my-applications">
                    Перейти до моїх заявок
                </router-link>
            </div>

            <form v-if="!success" @submit.prevent="handleSubmit">
                <div class="section-title">Команда</div>

                <div class="field">
                    <label>Склад команди *</label>
                    <textarea v-model="form.teamDescription" rows="3"
                        placeholder="Назвіть учасників і їх спеціалізацію..." required />
                </div>

                <div class="field">
                    <label>Технічні навички команди *</label>
                    <input v-model="form.skills" type="text" placeholder="Java, Vue.js, Docker, PostgreSQL..."
                        required />
                </div>

                <div class="section-title" style="margin-top:1.5rem">
                    Пропозиція рішення
                </div>

                <div class="field">
                    <label>Як ви вирішите завдання? *</label>
                    <textarea v-model="form.solution" rows="5" placeholder="Опишіть ваш підхід до вирішення завдання..."
                        required />
                </div>

                <div class="field">
                    <label>Очікувані результати *</label>
                    <textarea v-model="form.expectedResults" rows="3" placeholder="Що буде результатом вашої роботи?"
                        required />
                </div>

                <div class="field">
                    <label>Мотивація команди *</label>
                    <textarea v-model="form.motivation" rows="3"
                        placeholder="Чому ваша команда підходить для цього проекту?" required />
                </div>

                <div class="actions">
                    <button type="submit" :disabled="loading" class="btn-success">
                        {{ loading
                            ? 'Збереження...'
                            : 'Зберегти як чернетку' }}
                    </button>
                </div>
            </form>
        </div>
    </div>
</template>

<script setup>
import { ref, reactive, onMounted } from 'vue'
import { useRoute } from 'vue-router'
import { programsApi } from '@/api/programs'
import { applicationsApi } from '@/api/applications'

const route = useRoute()
const callId = Number(route.params.callId)

const callInfo = ref(null)
const loading = ref(false)
const error = ref('')
const success = ref(false)

const form = reactive({
    teamDescription: '',
    skills: '',
    solution: '',
    expectedResults: '',
    motivation: ''
})

onMounted(async () => {
    try {
        const res = await programsApi.getCall(callId)
        callInfo.value = res.data
    } catch (e) {
        console.error(e)
    }
})

async function handleSubmit() {
    error.value = ''
    loading.value = true
    try {
        await applicationsApi.create({ 
            callId,
            teamDescription: form.teamDescription,
            skills: form.skills,
            solution: form.solution,
            expectedResults: form.expectedResults,
            motivation: form.motivation
        })
        success.value = true
    } catch (e) {
        error.value =
            e.response?.data || 'Помилка при збереженні'
    } finally {
        loading.value = false
    }
}

function formatDate(date) {
    return new Date(date).toLocaleDateString('uk-UA', {
        day: '2-digit', month: 'long', year: 'numeric'
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
    background: #f0fdf4;
    border: 1px solid #86efac;
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

.actions {
    margin-top: 1.5rem;
}

.btn-success {
    width: 100%;
    padding: 10px;
    background: #059669;
    color: white;
    border: none;
    border-radius: 8px;
    font-size: 1rem;
    cursor: pointer;
}

.btn-success:disabled {
    opacity: 0.6;
    cursor: not-allowed;
}

.error {
    background: #fee2e2;
    color: #dc2626;
    padding: 10px;
    border-radius: 8px;
    margin-bottom: 1rem;
    font-size: 0.875rem;
}

.success {
    background: #f0fdf4;
    border: 1px solid #86efac;
    border-radius: 8px;
    padding: 1rem;
    text-align: center;
}

.success h3 {
    color: #166534;
    margin-bottom: 0.5rem;
}

.success p {
    color: #4b7a58;
    margin-bottom: 1rem;
}

.success a {
    color: #059669;
}
</style>