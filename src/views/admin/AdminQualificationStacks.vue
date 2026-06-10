<template>
    <div class="page">
        <h1>Kvalifikačné stacky</h1>
        <p class="subtitle">Správa predmetov pre každú tematickú kategóriu Programu A</p>

        <div v-if="loading" class="loading">Завантаження...</div>

        <div v-else class="stacks">
            <div v-for="stack in stacks" :key="stack.id" class="stack-card">
                <div class="stack-header">
                    <span class="stack-num">Stack {{ String(stack.stackNumber).padStart(2, '0') }}</span>
                    <h2>{{ stack.specializationName }}</h2>
                </div>

                <ul class="subjects">
                    <li v-for="s in stack.subjects" :key="s.id" class="subject-row">
                        <span>{{ s.subjectName }}</span>
                        <button class="btn-remove" @click="remove(stack, s.id)" title="Видалити">✕</button>
                    </li>
                    <li v-if="!stack.subjects.length" class="empty">Немає предметів</li>
                </ul>

                <div class="add-row">
                    <input
                        v-model="newSubject[stack.id]"
                        type="text"
                        placeholder="Назва нового предмету..."
                        @keydown.enter.prevent="add(stack)"
                    />
                    <button class="btn-add" :disabled="!newSubject[stack.id]?.trim()" @click="add(stack)">
                        + Додати
                    </button>
                </div>
            </div>
        </div>
    </div>
</template>

<script setup>
import { ref, reactive, onMounted } from 'vue'
import { qualificationApi } from '@/api/qualificationStacks'

const stacks = ref([])
const loading = ref(true)
const newSubject = reactive({})

onMounted(async () => {
    try {
        const { data } = await qualificationApi.getAllAdmin()
        stacks.value = data
    } finally {
        loading.value = false
    }
})

async function add(stack) {
    const name = newSubject[stack.id]?.trim()
    if (!name) return
    const { data } = await qualificationApi.addSubject(stack.id, name)
    const idx = stacks.value.findIndex(s => s.id === stack.id)
    if (idx !== -1) stacks.value[idx] = data
    newSubject[stack.id] = ''
}

async function remove(stack, subjectId) {
    const { data } = await qualificationApi.removeSubject(stack.id, subjectId)
    const idx = stacks.value.findIndex(s => s.id === stack.id)
    if (idx !== -1) stacks.value[idx] = data
}
</script>

<style scoped>
.page { max-width: 900px; margin: 0 auto; padding: 2rem; }
.subtitle { color: #6b7280; margin-bottom: 2rem; }
.stacks { display: flex; flex-direction: column; gap: 1.5rem; }

.stack-card {
    background: #fff;
    border: 1px solid #e5e7eb;
    border-radius: 12px;
    padding: 1.25rem 1.5rem;
}
.stack-header { display: flex; align-items: center; gap: 0.75rem; margin-bottom: 1rem; }
.stack-num {
    background: #4f46e5;
    color: #fff;
    font-size: 0.75rem;
    font-weight: 700;
    padding: 0.2rem 0.6rem;
    border-radius: 6px;
    white-space: nowrap;
}
.stack-header h2 { margin: 0; font-size: 1.05rem; font-weight: 600; color: #111827; }

.subjects { list-style: none; margin: 0 0 1rem; padding: 0; display: flex; flex-direction: column; gap: 0.35rem; }
.subject-row {
    display: flex;
    align-items: center;
    justify-content: space-between;
    padding: 0.4rem 0.75rem;
    background: #f9fafb;
    border-radius: 6px;
    font-size: 0.9rem;
}
.empty { color: #9ca3af; font-size: 0.85rem; padding: 0.4rem 0; }

.btn-remove {
    background: none;
    border: none;
    color: #ef4444;
    cursor: pointer;
    font-size: 0.85rem;
    padding: 0 0.25rem;
    line-height: 1;
}
.btn-remove:hover { color: #b91c1c; }

.add-row { display: flex; gap: 0.5rem; }
.add-row input {
    flex: 1;
    padding: 0.45rem 0.75rem;
    border: 1px solid #d1d5db;
    border-radius: 6px;
    font-size: 0.9rem;
}
.add-row input:focus { outline: none; border-color: #4f46e5; }
.btn-add {
    padding: 0.45rem 1rem;
    background: #4f46e5;
    color: #fff;
    border: none;
    border-radius: 6px;
    cursor: pointer;
    font-size: 0.9rem;
    white-space: nowrap;
}
.btn-add:disabled { opacity: 0.45; cursor: default; }
.btn-add:not(:disabled):hover { background: #4338ca; }
.loading { color: #6b7280; padding: 2rem 0; }
</style>
