<template>
    <div class="page">
        <div v-if="loading" class="loading">
            Завантаження...
        </div>

        <template v-else-if="program">
            <div class="back">
                <router-link :to="`/programs/${(route.query.type || route.params.type || 'a').toLowerCase()}`">← {{ program.type === 'PROGRAM_A' ? 'Програма A' :
                    'Програма B' }}</router-link>
            </div>

            <div class="header">
                <span class="badge">
                    {{ program.type === 'PROGRAM_A'
                        ? 'Програма A' : 'Програма B' }}
                </span>
                <h1>{{ program.name }}</h1>
                <p>{{ program.description }}</p>
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
            </div>

            <div v-if="program.type === 'PROGRAM_B'" class="requirements">
                <h2>Program B Requirements</h2>

                <div v-if="canManageRequirements" class="requirements__upload-grid">
                    <label class="requirements__file-btn">
                        Upload Specification
                        <input
                            type="file"
                            class="requirements__file-input"
                            :disabled="requirementsLoading"
                            @change="onSpecificationSelected($event)"
                        >
                    </label>
                    <label class="requirements__file-btn">
                        Upload Budget
                        <input
                            type="file"
                            class="requirements__file-input"
                            :disabled="requirementsLoading"
                            @change="onBudgetSelected($event)"
                        >
                    </label>
                </div>

                <p v-if="requirements?.specificationName" class="requirements__row">
                    <span class="requirements__name">
                        Specification: {{ requirements.specificationName }}
                    </span>
                    <span class="requirements__actions">
                        <button type="button" class="btn-file-action" :disabled="requirementsLoading" @click="viewRequirement('specification')">
                            View
                        </button>
                        <button type="button" class="btn-file-action" :disabled="requirementsLoading" @click="downloadRequirement('specification')">
                            Download
                        </button>
                    </span>
                </p>

                <p v-if="requirements?.budgetName" class="requirements__row">
                    <span class="requirements__name">
                        Budget: {{ requirements.budgetName }}
                    </span>
                    <span class="requirements__actions">
                        <button type="button" class="btn-file-action" :disabled="requirementsLoading" @click="viewRequirement('budget')">
                            View
                        </button>
                        <button type="button" class="btn-file-action" :disabled="requirementsLoading" @click="downloadRequirement('budget')">
                            Download
                        </button>
                    </span>
                </p>

                <div v-if="requirementsError" class="requirements__error">
                    {{ requirementsError }}
                </div>

                <div v-if="!requirements?.specificationName && !requirements?.budgetName" class="empty">
                    Наразі файли вимог відсутні
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

        <div v-else-if="!loading" class="empty">
            {{ notFoundMessage }}
        </div>

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
import { useOrganizationStore } from '@/stores/organization'
import { apiErrorMessage } from '@/utils/apiError'
import { hasStudentPortalAccess, hasTeamLeaderRole } from '@/utils/roles'
import { resolveTeamLeaderApply } from '@/composables/teamApplyGate'

const route = useRoute()
const router = useRouter()
const auth = useAuthStore()
const orgStore = useOrganizationStore()

const program = ref(null)
const calls = ref([])
const loading = ref(true)
const notFoundMessage = ref('Програму не знайдено або вона недоступна')
const requirements = ref(null)
const requirementsLoading = ref(false)
const requirementsError = ref('')
const isLoggedIn = computed(() => auth.isLoggedIn)
const canManageRequirements = computed(() =>
    (auth.roles || []).some((role) => ['FIRM', 'ADMIN', 'SUPER_ADMIN'].includes(role)),
)

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

function showPresentedBy(p) {
    return p?.type === 'PROGRAM_B'
        && p.organizationId != null
        && p.organizationId !== ''
}

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
    requirementsError.value = ''
    try {
        const programId = route.params.id
        // Check query first, then params
        const typeMarker = (route.query?.type || route.params.type || '').toString().toUpperCase()

        const isProgramB = typeMarker === 'B' || typeMarker === 'PROGRAM_B'
        const isProgramA = typeMarker === 'A' || typeMarker === 'PROGRAM_A'

        console.log('Fetching program:', programId, 'Detected Type B:', isProgramB)

        const programRequest = isProgramB
          ? programsApi.fetchProgramB(programId)
          : isProgramA
            ? programsApi.fetchProgramA(programId)
            : programsApi.getOne(programId)

        const [progRes, callsRes] = await Promise.all([
            programRequest,
            programsApi.getCallsByProgram(programId),
            programsApi.getOneByType(route.params.id, type),
            programsApi.getCallsByProgram(route.params.id),
        ])
        if (progRes.data?.status !== 'APPROVED') {
            program.value = null
            calls.value = []
            notFoundMessage.value = 'Програма недоступна для публічного перегляду'
            return
        }
        program.value = progRes.data
        calls.value = callsRes.data
        if (program.value?.type === 'PROGRAM_B' && program.value?.id != null) {
            await loadRequirements(program.value.id)
        } else {
            requirements.value = null
        }
    } catch (e) {
        console.error(e)
        program.value = null
        calls.value = []
        requirements.value = null
        notFoundMessage.value = 'Програму не знайдено або вона недоступна'
    } finally {
        loading.value = false
    }
}

onMounted(fetchData)

// Спостерігати за змінами параметрів маршруту
watch([() => route.params.id, () => route.params.type, () => route.query?.type], () => {
    fetchData()
})

function formatDate(date) {
    return new Date(date).toLocaleDateString('uk-UA', {
        day: '2-digit',
        month: 'long',
        year: 'numeric'
    })
}

async function loadRequirements(programId) {
    if (!programId) return
    requirementsLoading.value = true
    try {
        requirements.value = await orgStore.fetchRequirements(programId)
    } catch {
        requirements.value = null
    } finally {
        requirementsLoading.value = false
    }
}

async function onSpecificationSelected(event) {
    const file = event?.target?.files?.[0]
    if (!program.value?.id || !file) return
    requirementsLoading.value = true
    requirementsError.value = ''
    try {
        requirements.value = await orgStore.uploadSpecFile(program.value.id, file)
    } catch (error) {
        requirementsError.value = apiErrorMessage(error, 'Failed to upload specification')
    } finally {
        event.target.value = ''
        requirementsLoading.value = false
    }
}

async function onBudgetSelected(event) {
    const file = event?.target?.files?.[0]
    if (!program.value?.id || !file) return
    requirementsLoading.value = true
    requirementsError.value = ''
    try {
        requirements.value = await orgStore.uploadBudgetFile(program.value.id, file)
    } catch (error) {
        requirementsError.value = apiErrorMessage(error, 'Failed to upload budget')
    } finally {
        event.target.value = ''
        requirementsLoading.value = false
    }
}

function filenameFromContentDisposition(contentDisposition, fallback) {
    if (!contentDisposition) return fallback
    const utf8Match = contentDisposition.match(/filename\*=UTF-8''([^;]+)/i)
    if (utf8Match?.[1]) return decodeURIComponent(utf8Match[1])
    const plainMatch = contentDisposition.match(/filename="?([^"]+)"?/i)
    if (plainMatch?.[1]) return plainMatch[1]
    return fallback
}

async function openRequirement(fileType, inline) {
    if (!program.value?.id) return
    requirementsLoading.value = true
    requirementsError.value = ''
    try {
        const response = fileType === 'specification'
            ? await orgStore.downloadSpecificationFile(program.value.id, inline)
            : await orgStore.downloadBudgetFile(program.value.id, inline)

        const blob = response.data instanceof Blob
            ? response.data
            : new Blob([response.data], { type: response.headers?.['content-type'] || 'application/octet-stream' })
        const objectUrl = URL.createObjectURL(blob)

        if (inline) {
            window.open(objectUrl, '_blank', 'noopener')
            setTimeout(() => URL.revokeObjectURL(objectUrl), 60000)
            return
        }

        const fallback = `${fileType}-${program.value.id}`
        const filename = filenameFromContentDisposition(response.headers?.['content-disposition'], fallback)
        const link = document.createElement('a')
        link.style.display = 'none'
        link.href = objectUrl
        link.download = filename
        document.body.appendChild(link)
        link.click()
        link.remove()
        URL.revokeObjectURL(objectUrl)
    } catch (error) {
        requirementsError.value = apiErrorMessage(error, `Failed to ${inline ? 'view' : 'download'} ${fileType}`)
    } finally {
        requirementsLoading.value = false
    }
}

async function viewRequirement(fileType) {
    await openRequirement(fileType, true)
}

async function downloadRequirement(fileType) {
    await openRequirement(fileType, false)
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

.presented-by {
    font-size: 0.875rem;
    color: #475569;
    margin-top: 0.75rem;
}

.presented-by__link {
    color: #4f46e5;
    font-weight: 600;
    text-decoration: none;
}

.presented-by__link:hover {
    text-decoration: underline;
}

.requirements {
    margin-top: 1.5rem;
    border: 1px solid #e5e7eb;
    border-radius: 10px;
    padding: 1rem 1.1rem;
    background: white;
}

.requirements h2 {
    margin: 0 0 0.75rem;
    font-size: 1.1rem;
}

.requirements__upload-grid {
    display: grid;
    grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
    gap: 0.7rem;
    margin-bottom: 0.6rem;
}

.requirements__file-btn {
    border: 1px solid rgba(79, 70, 229, 0.25);
    background: #fff;
    color: #4338ca;
    border-radius: 10px;
    padding: 0.4rem 0.75rem;
    font-weight: 600;
    cursor: pointer;
    width: fit-content;
}

.requirements__file-input {
    display: none;
}

.requirements__row {
    margin: 0.45rem 0 0;
    display: flex;
    justify-content: space-between;
    align-items: center;
    gap: 0.65rem;
    flex-wrap: wrap;
}

.requirements__name {
    font-size: 0.9rem;
    color: #334155;
    word-break: break-word;
}

.requirements__actions {
    display: flex;
    gap: 0.45rem;
}

.requirements__error {
    color: #b91c1c;
    margin-top: 0.5rem;
    font-size: 0.88rem;
}

.btn-file-action {
    border-radius: 8px;
    border: 1px solid #cbd5e1;
    background: white;
    color: #334155;
    font-size: 0.82rem;
    font-weight: 600;
    padding: 0.36rem 0.68rem;
    cursor: pointer;
}

.btn-file-action:disabled {
    opacity: 0.6;
    cursor: not-allowed;
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