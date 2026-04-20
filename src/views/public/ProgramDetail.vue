<template>
    <div class="page">
        <div v-if="loading" class="loading">
            Завантаження...
        </div>

        <template v-else-if="program">
            <div class="back">
                <router-link :to="`/programs/${route.params.type}`">← {{ program.type === 'PROGRAM_A' ? 'Програма A' :
                    'Програма B' }}</router-link>
            </div>

            <div class="header">
                <span class="badge">
                    {{ program.type === 'PROGRAM_A'
                        ? 'Програма A' : 'Програма B' }}
                </span>
                <h1>{{ program.name }}</h1>
                <p>{{ program.description }}</p>
            </div>

            <div class="calls-section">
                <h2>Активні виклики</h2>

                <div v-if="calls.length === 0" class="empty">
                    Наразі немає активних викликів
                </div>

                <div v-for="call in calls" :key="call.id" class="call-card">
                    <div class="call-info">
                        <h3>{{ call.title }}</h3>
                        <div class="deadline">
                            Дедлайн:
                            {{ formatDate(call.deadline) }}
                        </div>
                        <p v-if="call.evaluationCriteria">
                            {{ call.evaluationCriteria }}
                        </p>
                    </div>
                    <div class="call-actions">
                        <button @click="handleApply(call)" class="btn-apply">
                            {{ isLoggedIn ? 'Подати заявку' : 'Зареєструватись щоб подати' }}
                        </button>
                    </div>
                </div>
            </div>
        </template>
    </div>
</template>

<script setup>
import { ref, onMounted } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { programsApi } from '@/api/programs'
import { useAuthStore } from '@/stores/auth'

const route = useRoute()
const router = useRouter()
const auth = useAuthStore()

const program = ref(null)
const calls = ref([])
const loading = ref(true)
const isLoggedIn = auth.isLoggedIn

function handleApply(call) {
    if (!isLoggedIn.value) {
        router.push({ name: 'register' })
        return
    }

    const programKey = program.value.type === 'PROGRAM_A' ? 'a' : 'b'
    router.push({ name: `apply-${programKey}`, params: { callId: call.id } })
}

onMounted(async () => {
    try {
        const type = route.params.type.toUpperCase()
        const [progRes, callsRes] = await Promise.all([
            programsApi.getOneByType(route.params.id, type),
            programsApi.getCallsByProgram(route.params.id)
        ])
        program.value = progRes.data
        calls.value = callsRes.data
    } catch (e) {
        console.error(e)
    } finally {
        loading.value = false
    }
})

function formatDate(date) {
    return new Date(date).toLocaleDateString('uk-UA', {
        day: '2-digit',
        month: 'long',
        year: 'numeric'
    })
}
</script>

<style scoped>
.page {
    max-width: 800px;
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

.badge {
    font-size: 0.75rem;
    font-weight: 600;
    color: #4f46e5;
    text-transform: uppercase;
}

.header h1 {
    font-size: 1.75rem;
    margin: 0.5rem 0;
}

.header p {
    color: #6b7280;
}

.calls-section {
    margin-top: 2rem;
}

.calls-section h2 {
    margin-bottom: 1rem;
}

.call-card {
    display: flex;
    justify-content: space-between;
    align-items: center;
    padding: 1rem 1.25rem;
    border: 1px solid #e5e7eb;
    border-radius: 10px;
    margin-bottom: 0.75rem;
    background: white;
}

.call-info h3 {
    margin: 0 0 4px;
    font-size: 1rem;
}

.deadline {
    font-size: 0.8rem;
    color: #ef4444;
    font-weight: 500;
}

.call-info p {
    font-size: 0.875rem;
    color: #6b7280;
    margin-top: 4px;
}

.btn-apply {
    padding: 8px 16px;
    background: #4f46e5;
    color: white;
    border-radius: 8px;
    text-decoration: none;
    font-size: 0.875rem;
    white-space: nowrap;
}

.empty {
    color: #9ca3af;
    padding: 1rem 0;
}

.loading {
    text-align: center;
    padding: 3rem;
    color: #666;
}
</style>