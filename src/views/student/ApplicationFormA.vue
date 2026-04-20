<template>
    <div class="page">
        <div class="back">
            <router-link to="/programs/a">
                ← Назад до програм
            </router-link>
        </div>

        <div class="form-box">
            <h1>Заявка — Програма A</h1>
            <p class="subtitle">Гrantový inkubačný program</p>

            <div v-if="callInfo" class="call-info">
                <span class="call-label">Виклик:</span>
                <strong>{{ callInfo.title }}</strong>
                <span class="deadline">
                    Дедлайн: {{ formatDate(callInfo.deadline) }}
                </span>
            </div>

            <div v-if="error" class="error">{{ error }}</div>
            <div v-if="success" class="success">
                <h3>Заявку збережено!</h3>
                <p>
                    Ви можете завантажити документи і відправити
                    заявку у вашому кабінеті.
                </p>
                <router-link to="/student/applications">
                    Перейти до моїх заявок
                </router-link>
            </div>

            <form v-if="!success" @submit.prevent="handleSubmit">
                <div class="section-title">
                    Інформація про проект
                </div>

                <div class="field">
                    <label>Назва проекту *</label>
                    <input v-model="form.projectName" type="text" placeholder="Назва вашого проекту" required />
                </div>

                <div class="field">
                    <label>Короткий опис проекту *</label>
                    <textarea v-model="form.description" rows="4" placeholder="Опишіть ідею вашого проекту..."
                        required />
                </div>

                <div class="field">
                    <label>Тематична категорія *</label>
                    <select v-model="form.category" required>
                        <option value="">Оберіть категорію</option>
                        <option value="software">
                            Розробка програмного забезпечення
                        </option>
                        <option value="ai">
                            AI та дані
                        </option>
                        <option value="web">
                            Веб-застосунки
                        </option>
                        <option value="game">
                            Геймдев
                        </option>
                        <option value="iot">
                            IoT та embedded
                        </option>
                    </select>
                </div>

                <div class="field">
                    <label>Технологічний стек *</label>
                    <input v-model="form.techStack" type="text" placeholder="React, Spring Boot, PostgreSQL..."
                        required />
                </div>

                <div class="section-title" style="margin-top:1.5rem">
                    Команда
                </div>

                <div class="field">
                    <label>Склад команди *</label>
                    <textarea v-model="form.teamDescription" rows="3" placeholder="Опишіть членів команди і їх ролі..."
                        required />
                </div>

                <div class="field">
                    <label>Мотивація *</label>
                    <textarea v-model="form.motivation" rows="3" placeholder="Чому хочете брати участь у програмі?"
                        required />
                </div>

                <div class="actions">
                    <button type="submit" :disabled="loading" class="btn-primary">
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
    projectName: '',
    description: '',
    category: '',
    techStack: '',
    teamDescription: '',
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
            projectName: form.projectName,
            description: form.description,
            category: form.category,
            techStack: form.techStack,
            teamDescription: form.teamDescription,
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
    color: #4f46e5;
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

.actions {
    margin-top: 1.5rem;
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
}

.btn-primary:disabled {
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
    color: #4f46e5;
}
</style>