<template>
    <div class="page">
        <div class="hero">
            <h1>{{ programLabel }}</h1>
            <p>Оберіть {{ programLabel.toLowerCase() }} яка підходить саме вам</p>
        </div>

        <div v-if="loading" class="loading">
            Завантаження...
        </div>

        <div v-else class="programs-grid">
            <div v-for="program in approvedPrograms" :key="program.id" class="program-card" :class="program.type.toLowerCase()">
                <h2>{{ program.name }}</h2>
                <p
                    v-if="showPresentedBy(program)"
                    class="presented-by"
                >
                    Presented by:
                    <router-link
                        class="presented-by__link"
                        :to="{ name: 'public-organization', params: { id: String(program.organizationId) } }"
                    >
                        {{ program.organizationName }}
                    </router-link>
                </p>
                <p>{{ program.description }}</p>
                <div class="card-footer">
                    <router-link :to="`/programs/${route.params.type}/${program.id}`" class="btn-primary">
                        Дізнатись більше
                    </router-link>
                </div>
            </div>
        </div>
    </div>
</template>

<script setup>
import { ref, onMounted, watch, computed } from 'vue'
import { useRoute } from 'vue-router'
import { programsApi } from '@/api/programs'

const route = useRoute()
const programs = ref([])
const loading = ref(true)
const approvedPrograms = computed(() => programs.value.filter((program) => program?.status === 'APPROVED'))

const type = computed(() => route.params.type?.toUpperCase() || 'A')
const programLabel = computed(() => type.value === 'A' ? 'Програма A' : 'Програма B')

function showPresentedBy(program) {
    return program?.type === 'PROGRAM_B'
        && program.organizationId != null
        && program.organizationId !== ''
}

async function fetchPrograms() {
    loading.value = true
    try {
        const res = await programsApi.getAllByType(type.value)
        programs.value = res.data || []
    } catch (e) {
        console.error('Помилка завантаження програм', e)
    } finally {
        loading.value = false
    }
}

onMounted(fetchPrograms)

// Спостерігати за змінами параметрів маршруту
watch(() => route.params.type, () => {
    fetchPrograms()
})
</script>

<style scoped>
.page {
    max-width: 1000px;
    margin: 0 auto;
    padding: 2rem;
}

.hero {
    text-align: center;
    margin-bottom: 2rem;
}

.hero h1 {
    font-size: 2rem;
    margin-bottom: 0.5rem;
}

.hero p {
    color: #666;
}

.programs-grid {
    display: grid;
    grid-template-columns: repeat(auto-fit, minmax(300px, 1fr));
    gap: 1.5rem;
}

.program-card {
    border: 1px solid #e5e7eb;
    border-radius: 12px;
    padding: 1.5rem;
    background: white;
    box-shadow: 0 1px 4px rgba(0, 0, 0, 0.06);
}

.program_a {
    border-top: 4px solid #4f46e5;
}

.program_b {
    border-top: 4px solid #059669;
}

.card-badge {
    font-size: 0.75rem;
    font-weight: 600;
    color: #4f46e5;
    margin-bottom: 0.5rem;
    text-transform: uppercase;
}

.presented-by {
    font-size: 0.8125rem;
    color: #475569;
    margin: 0 0 0.5rem;
}

.presented-by__link {
    color: #4f46e5;
    font-weight: 600;
    text-decoration: none;
}

.presented-by__link:hover {
    text-decoration: underline;
}

h2 {
    font-size: 1.25rem;
    margin-bottom: 0.5rem;
}

p {
    color: #6b7280;
    line-height: 1.6;
    margin-bottom: 1rem;
}

.card-footer {
    margin-top: auto;
}

.btn-primary {
    display: inline-block;
    padding: 8px 16px;
    background: #4f46e5;
    color: white;
    border-radius: 8px;
    text-decoration: none;
    font-size: 0.875rem;
}

.loading {
    text-align: center;
    padding: 3rem;
    color: #666;
}
</style>