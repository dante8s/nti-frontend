<template>
    <div class="page">
        <div v-if="loading" class="loading">
            Завантаження...
        </div>

        <template v-else-if="program">
            <div class="back">
                <router-link :to="`/programs/${route.params.type}`">← {{
                    program.type === 'PROGRAM_A'
                        ? 'Каталог програми A' : 'Каталог програми B'
                }}</router-link>
            </div>

            <div class="header">
                <span class="badge">
                    {{ program.type === 'PROGRAM_A'
                        ? 'Програма A' : 'Програма B' }}
                </span>
                <h1>{{ program.name }}</h1>
                <p>{{ program.description }}</p>
            </div>

            <div v-if="isLoggedIn && showLeaderApplyHint" class="leader-hint">
                <span class="leader-hint__pill">Лідер команди</span>
                Кнопка «Подати заявку» доступна вам як лідеру з правами студентського порталу.
            </div>

            <div class="calls-section">
                <h2>Активні виклики</h2>
                <p v-if="isLoggedIn && canApply && !rolesIncludeAdmin" class="apply-prereq">
                    Після створення команди (ви — лідер) та завершення профілю з CV можете подати заявку на виклик нижче.
                </p>

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
                            {{ isLoggedIn ? (canApply ? 'Подати заявку' : 'Недоступно для вашої ролі') : 'Зареєструватись щоб подати' }}
                        </button>
                    </div>
                </div>
            </div>
        </template>

        <div
            v-if="applyModal.show"
            class="apply-modal-overlay"
            role="dialog"
            aria-modal="true"
            aria-labelledby="apply-modal-title"
            @click.self="closeApplyModal"
        >
            <div class="apply-modal">
                <h3 id="apply-modal-title" class="apply-modal__title">
                    Як ви подаєте заявку?
                </h3>
                <p class="apply-modal__hint">
                    Оберіть режим. Для подачі «від команди» перевіряємо, що ви — лідер існуючої команди в системі.
                </p>
                <p v-if="applyModal.gateError" class="apply-modal__error" role="alert">
                    {{ applyModal.gateError }}
                    <router-link
                        v-if="applyModal.gateReason === 'no_team'"
                        to="/app/teams"
                        class="apply-modal__error-link"
                        @click="closeApplyModal"
                    >
                        Перейти до «Моя команда»
                    </router-link>
                </p>
                <div class="apply-modal__actions">
                    <button
                        type="button"
                        class="btn-apply-modal btn-apply-modal--ghost"
                        :disabled="applyModal.checking"
                        @click="submitApplyAsIndividual"
                    >
                        Як учасник (індивідуально)
                    </button>
                    <button
                        type="button"
                        class="btn-apply-modal"
                        :disabled="applyModal.checking"
                        @click="submitApplyAsTeamLeader"
                    >
                        {{ applyModal.checking ? 'Перевірка…' : 'Від імені команди (я — лідер)' }}
                    </button>
                </div>
                <button type="button" class="apply-modal__cancel" @click="closeApplyModal">
                    Скасувати
                </button>
            </div>
        </div>
    </div>
</template>

<script setup>
import { ref, onMounted, watch, computed, reactive } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { programsApi } from '@/api/programs'
import { useAuthStore } from '@/stores/auth'
import { hasStudentPortalAccess, hasTeamLeaderRole } from '@/utils/roles'
import { resolveTeamLeaderApply } from '@/composables/teamApplyGate'

const route = useRoute()
const router = useRouter()
const auth = useAuthStore()

const program = ref(null)
const calls = ref([])
const loading = ref(true)

const applyModal = reactive({
    show: false,
    call: null,
    checking: false,
    gateError: '',
    gateReason: '',
})
const isLoggedIn = computed(() => auth.isLoggedIn)
const canApply = computed(() => {
    const roles = auth.user?.roles || []
    return hasStudentPortalAccess(roles) || roles.includes('SUPER_ADMIN')
})

const showLeaderApplyHint = computed(() => {
    const roles = auth.user?.roles || []
    return hasTeamLeaderRole(roles) && canApply.value
})

const rolesIncludeAdmin = computed(() => {
    const roles = auth.user?.roles || []
    return roles.includes('SUPER_ADMIN') || roles.includes('ADMIN')
})

function closeApplyModal() {
    applyModal.show = false
    applyModal.call = null
    applyModal.checking = false
    applyModal.gateError = ''
    applyModal.gateReason = ''
}

function goToApplyForm(call, applyMode) {
    const programKey = program.value.type === 'PROGRAM_A' ? 'a' : 'b'
    closeApplyModal()
    router.push({
        name: `apply-${programKey}`,
        params: { callId: call.id },
        query: { applyMode },
    })
}

function handleApply(call) {
    if (!isLoggedIn.value) {
        router.push({ name: 'login' })
        return
    }

    // STUDENT / TEAM_LEADER або SUPER_ADMIN (тест).
    if (!canApply.value) {
        alert('Подати заявку можуть студенти, лідери команд (TEAM_LEADER) або SUPER_ADMIN')
        return
    }

    applyModal.show = true
    applyModal.call = call
    applyModal.gateError = ''
    applyModal.gateReason = ''
}

function submitApplyAsIndividual() {
    if (!applyModal.call) return
    goToApplyForm(applyModal.call, 'individual')
}

async function submitApplyAsTeamLeader() {
    if (!applyModal.call) return
    applyModal.checking = true
    applyModal.gateError = ''
    applyModal.gateReason = ''
    const uid = auth.user?.id
    const result = await resolveTeamLeaderApply(uid)
    applyModal.checking = false
    if (!result.ok) {
        applyModal.gateError = result.message
        applyModal.gateReason = result.reason
        return
    }
    goToApplyForm(applyModal.call, 'team')
}

async function fetchData() {
    loading.value = true
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
}

onMounted(fetchData)

// Спостерігати за змінами параметрів маршруту
watch([() => route.params.id, () => route.params.type], () => {
    fetchData()
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

.leader-hint {
    display: flex;
    flex-wrap: wrap;
    align-items: center;
    gap: 0.5rem 0.65rem;
    margin-top: 1.25rem;
    padding: 0.65rem 0.85rem;
    border-radius: 10px;
    background: linear-gradient(90deg, #ecfdf5, #f0fdf4);
    border: 1px solid rgba(16, 185, 129, 0.28);
    font-size: 0.875rem;
    color: #0f766e;
    line-height: 1.45;
}

.leader-hint__pill {
    display: inline-block;
    padding: 0.2rem 0.55rem;
    border-radius: 999px;
    font-size: 0.7rem;
    font-weight: 800;
    background: rgba(79, 70, 229, 0.1);
    color: #4338ca;
}

.calls-section {
    margin-top: 2rem;
}

.calls-section h2 {
    margin-bottom: 1rem;
}

.apply-prereq {
    font-size: 0.875rem;
    color: #4b5563;
    margin: -0.35rem 0 1rem;
    line-height: 1.45;
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

.apply-modal-overlay {
    position: fixed;
    inset: 0;
    z-index: 1200;
    display: flex;
    align-items: center;
    justify-content: center;
    padding: 1rem;
    background: rgba(15, 23, 42, 0.45);
}

.apply-modal {
    width: min(440px, 100%);
    border-radius: 14px;
    padding: 1.35rem 1.35rem 1rem;
    background: #fff;
    box-shadow:
        0 25px 50px rgba(15, 23, 42, 0.12),
        0 10px 20px rgba(15, 23, 42, 0.08);
    border: 1px solid rgba(148, 163, 184, 0.25);
}

.apply-modal__title {
    margin: 0 0 0.5rem;
    font-size: 1.1rem;
    color: #0f172a;
}

.apply-modal__hint {
    margin: 0 0 1rem;
    font-size: 0.88rem;
    color: #64748b;
    line-height: 1.45;
}

.apply-modal__error {
    margin: 0 0 0.95rem;
    padding: 0.55rem 0.65rem;
    border-radius: 10px;
    font-size: 0.82rem;
    font-weight: 600;
    color: #991b1b;
    background: #fef2f2;
    border: 1px solid #fecaca;
    line-height: 1.45;
}

.apply-modal__error-link {
    display: inline-block;
    margin-top: 0.35rem;
    font-weight: 700;
    color: #4f46e5;
    text-decoration: none;
}

.apply-modal__error-link:hover {
    text-decoration: underline;
}

.apply-modal__actions {
    display: flex;
    flex-direction: column;
    gap: 0.55rem;
    margin-bottom: 0.75rem;
}

.btn-apply-modal {
    padding: 0.55rem 0.85rem;
    border-radius: 10px;
    border: none;
    background: #4f46e5;
    color: #fff;
    font-weight: 700;
    font-size: 0.875rem;
    cursor: pointer;
}

.btn-apply-modal:disabled {
    opacity: 0.65;
    cursor: wait;
}

.btn-apply-modal--ghost {
    background: #f8fafc;
    color: #0f172a;
    border: 1px solid #cbd5e1;
}

.apply-modal__cancel {
    display: block;
    width: 100%;
    margin-top: 0.15rem;
    padding: 0.35rem;
    border: none;
    background: transparent;
    color: #64748b;
    font-size: 0.82rem;
    cursor: pointer;
}

.apply-modal__cancel:hover {
    color: #0f172a;
}
</style>