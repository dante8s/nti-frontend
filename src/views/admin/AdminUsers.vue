<template>
    <div class="admin-page">

        <div class="page-header">
            <h1>Панель адміністратора</h1>
            <p>Управління користувачами системи</p>
        </div>

        <div class="invite-mentor-card">
            <h2>Запросити ментора</h2>
            <p>Надішліть запрошення на email для завершення реєстрації ментора.</p>

            <form class="invite-mentor-form" @submit.prevent="inviteMentor">
                <input v-model.trim="mentorEmail" type="email" placeholder="mentor@example.com" required />
                <button type="submit" :disabled="isInviting || !mentorEmail">
                    {{ isInviting ? 'Надсилання...' : 'Надіслати запрошення' }}
                </button>
            </form>

            <div v-if="inviteError" class="invite-error">
                {{ inviteError }}
            </div>
        </div>

        <!-- Вкладки -->
        <div class="tabs">
            <button :class="['tab', { active: activeTab === 'pending' }]" @click="activeTab = 'pending'">
                Очікують схвалення
                <span v-if="pendingCount" class="badge">
                    {{ pendingCount }}
                </span>
            </button>
            <button :class="['tab', { active: activeTab === 'all' }]" @click="activeTab = 'all'; loadAll()">
                Всі користувачі
            </button>
        </div>

        <!-- Вкладка: очікують -->
        <div v-if="activeTab === 'pending'">
            <div v-if="loadingPending" class="loading">
                Завантаження...
            </div>
            <div v-else-if="pendingUsers.length === 0" class="empty">
                Немає заявок на схвалення
            </div>
            <div v-else class="users-list">
                <div v-for="user in pendingUsers" :key="user.id" class="user-card pending">
                    <div class="user-info">
                        <div class="user-avatar">
                            {{ user.name.charAt(0).toUpperCase() }}
                        </div>
                        <div class="user-details">
                            <div class="user-name">{{ user.name }}</div>
                            <div class="user-email">{{ user.email }}</div>
                            <div class="user-meta">
                                <span v-for="role in user.roles" :key="role" class="role-chip">
                                    {{ roleLabel(role) }}
                                </span>
                                <span class="date">
                                    {{ formatDate(user.createdAt) }}
                                </span>
                            </div>
                        </div>
                    </div>

                    <div class="user-actions">
                        <button class="btn-approve" :disabled="processing === user.id" @click="approve(user)">
                            ✓ Схвалити
                        </button>
                        <button class="btn-reject" :disabled="processing === user.id" @click="openRejectModal(user)">
                            ✗ Відхилити
                        </button>
                    </div>
                </div>
            </div>
        </div>

        <!-- Вкладка: всі -->
        <div v-if="activeTab === 'all'">
            <div v-if="loadingAll" class="loading">
                Завантаження...
            </div>
            <div v-else>
                <!-- Фільтр -->
                <div class="filters">
                    <select v-model="filterStatus">
                        <option value="">Всі статуси</option>
                        <option value="PENDING">Очікують</option>
                        <option value="APPROVED">Схвалені</option>
                        <option value="REJECTED">Відхилені</option>
                        <option value="SUSPENDED">Заблоковані</option>
                    </select>
                    <input v-model="search" type="text" placeholder="Пошук по імені або email..." />
                </div>

                <div class="users-list">
                    <div v-for="user in filteredUsers" :key="user.id" class="user-card"
                        :class="user.accountStatus.toLowerCase()">
                        <div class="user-info">
                            <div class="user-avatar">
                                {{ user.name.charAt(0).toUpperCase() }}
                            </div>
                            <div class="user-details">
                                <div class="user-name">{{ user.name }}</div>
                                <div class="user-email">
                                    {{ user.email }}
                                </div>
                                <div class="user-meta">
                                    <span v-for="role in user.roles" :key="role" class="role-chip">
                                        {{ roleLabel(role) }}
                                    </span>
                                    <span class="status-chip" :class="user.accountStatus.toLowerCase()">
                                        {{ statusLabel(user.accountStatus) }}
                                    </span>
                                </div>
                            </div>
                        </div>

                        <div class="user-actions">
                            <button v-if="user.accountStatus !== 'APPROVED'" class="btn-approve" @click="approve(user)">
                                ✓ Схвалити
                            </button>
                            <button v-if="user.accountStatus !== 'SUSPENDED'" class="btn-suspend"
                                @click="openSuspendModal(user)">
                                ⊘ Блокувати
                            </button>
                            <button class="btn-roles" @click="openRolesModal(user)">
                                ⚙ Ролі
                            </button>
                        </div>
                    </div>
                </div>
            </div>
        </div>

        <!-- Модальне: відхилити -->
        <div v-if="rejectModal.show" class="modal-overlay" @click.self="rejectModal.show = false">
            <div class="modal">
                <h3>Відхилити акаунт</h3>
                <p>
                    Юзер <strong>{{ rejectModal.user?.name }}</strong>
                    отримає email з причиною відхилення.
                </p>
                <div class="field">
                    <label>Причина відхилення</label>
                    <textarea v-model="rejectModal.reason" rows="3" placeholder="Вкажіть причину..." />
                </div>
                <div class="modal-actions">
                    <button class="btn-cancel" @click="rejectModal.show = false">
                        Скасувати
                    </button>
                    <button class="btn-reject" :disabled="!rejectModal.reason" @click="reject()">
                        Відхилити
                    </button>
                </div>
            </div>
        </div>

        <!-- Модальне: блокувати -->
        <div v-if="suspendModal.show" class="modal-overlay" @click.self="suspendModal.show = false">
            <div class="modal">
                <h3>Заблокувати акаунт</h3>
                <p>
                    Юзер <strong>{{ suspendModal.user?.name }}</strong>
                    не зможе входити в систему.
                </p>
                <div class="field">
                    <label>Причина блокування</label>
                    <textarea v-model="suspendModal.reason" rows="3" placeholder="Вкажіть причину..." />
                </div>
                <div class="modal-actions">
                    <button class="btn-cancel" @click="suspendModal.show = false">
                        Скасувати
                    </button>
                    <button class="btn-reject" :disabled="!suspendModal.reason" @click="suspend()">
                        Заблокувати
                    </button>
                </div>
            </div>
        </div>

        <!-- Модальне: ролі -->
        <div v-if="rolesModal.show" class="modal-overlay" @click.self="rolesModal.show = false">
            <div class="modal">
                <h3>
                    Ролі користувача:
                    {{ rolesModal.user?.name }}
                </h3>
                <div class="roles-list">
                    <div v-for="role in allRoles" :key="role" class="role-row">
                        <span>{{ roleLabel(role) }}</span>
                        <button v-if="rolesModal.user?.roles.includes(role)" class="btn-remove-role"
                            @click="removeRole(role)">
                            Видалити
                        </button>
                        <button v-else class="btn-add-role" @click="addRole(role)">
                            Додати
                        </button>
                    </div>
                </div>
                <div class="modal-actions">
                    <button class="btn-cancel" @click="rolesModal.show = false">
                        Закрити
                    </button>
                </div>
            </div>
        </div>

        <!-- Повідомлення -->
        <div v-if="toast.show" class="toast" :class="toast.type">
            {{ toast.message }}
        </div>

    </div>
</template>

<script setup>
import { ref, computed, onMounted, reactive } from 'vue'
import { adminApi } from '@/api/admin'

const activeTab = ref('pending')
const pendingUsers = ref([])
const allUsers = ref([])
const loadingPending = ref(true)
const loadingAll = ref(false)
const processing = ref(null)
const search = ref('')
const filterStatus = ref('')
const mentorEmail = ref('')
const isInviting = ref(false)
const inviteError = ref('')

const allRoles = [
    'STUDENT', 'FIRM', 'FIRM_USER',
    'MENTOR', 'EVALUATOR', 'SUPER_EVALUATOR', 'ADMIN', 'SUPER_ADMIN'
]

const rejectModal = reactive({
    show: false,
    user: null,
    reason: ''
})

const suspendModal = reactive({
    show: false,
    user: null,
    reason: ''
})

const rolesModal = reactive({
    show: false,
    user: null
})

const toast = reactive({
    show: false,
    message: '',
    type: 'success'
})

const pendingCount = computed(
    () => pendingUsers.value.length
)

const filteredUsers = computed(() => {
    return allUsers.value.filter(u => {
        const matchStatus = !filterStatus.value
            || u.accountStatus === filterStatus.value
        const matchSearch = !search.value
            || u.name.toLowerCase().includes(
                search.value.toLowerCase()
            )
            || u.email.toLowerCase().includes(
                search.value.toLowerCase()
            )
        return matchStatus && matchSearch
    })
})

onMounted(async () => {
    await loadPending()
})

async function loadPending() {
    loadingPending.value = true
    try {
        const res = await adminApi.getPendingUsers()
        pendingUsers.value = res.data
    } catch (e) {
        showToast('Помилка завантаження', 'error')
    } finally {
        loadingPending.value = false
    }
}

async function loadAll() {
    loadingAll.value = true
    try {
        const res = await adminApi.getAllUsers()
        allUsers.value = res.data
    } catch (e) {
        showToast('Помилка завантаження', 'error')
    } finally {
        loadingAll.value = false
    }
}

async function inviteMentor() {
    if (!mentorEmail.value) {
        return
    }

    inviteError.value = ''
    isInviting.value = true
    try {
        await adminApi.inviteMentor(mentorEmail.value)
        showToast(`Запрошення успішно надіслано на ${mentorEmail.value}`, 'success')
        mentorEmail.value = ''
    } catch (e) {
        inviteError.value = e.response?.data?.message || e.response?.data || 'Помилка надсилання запрошення'
        showToast(inviteError.value, 'error')
    } finally {
        isInviting.value = false
    }
}

async function approve(user) {
    processing.value = user.id
    try {
        await adminApi.approveUser(user.id)
        pendingUsers.value = pendingUsers.value
            .filter(u => u.id !== user.id)
        showToast(
            `${user.name} — акаунт схвалено!`, 'success'
        )
        if (activeTab.value === 'all') {
            await loadAll()
        }
    } catch (e) {
        showToast('Помилка', 'error')
    } finally {
        processing.value = null
    }
}

function openRejectModal(user) {
    rejectModal.user = user
    rejectModal.reason = ''
    rejectModal.show = true
}

async function reject() {
    const user = rejectModal.user
    processing.value = user.id
    try {
        await adminApi.rejectUser(user.id, rejectModal.reason)
        pendingUsers.value = pendingUsers.value
            .filter(u => u.id !== user.id)
        rejectModal.show = false
        showToast(`${user.name} — відхилено`, 'info')
    } catch (e) {
        showToast('Помилка', 'error')
    } finally {
        processing.value = null
    }
}

function openSuspendModal(user) {
    suspendModal.user = user
    suspendModal.reason = ''
    suspendModal.show = true
}

async function suspend() {
    const user = suspendModal.user
    try {
        await adminApi.suspendUser(user.id, suspendModal.reason)
        suspendModal.show = false
        showToast(`${user.name} — заблоковано`, 'info')
        await loadAll()
    } catch (e) {
        showToast('Помилка', 'error')
    }
}

function openRolesModal(user) {
    rolesModal.user = {
        ...user,
        roles: [...user.roles]
    }
    rolesModal.show = true
}

async function addRole(role) {
    try {
        await adminApi.addRole(rolesModal.user.id, role)
        rolesModal.user.roles.push(role)
        showToast(`Роль ${roleLabel(role)} додано`, 'success')
        await loadAll()
    } catch (e) {
        showToast('Помилка', 'error')
    }
}

async function removeRole(role) {
    try {
        await adminApi.removeRole(rolesModal.user.id, role)
        rolesModal.user.roles =
            rolesModal.user.roles.filter(r => r !== role)
        showToast(
            `Роль ${roleLabel(role)} видалено`, 'info'
        )
        await loadAll()
    } catch (e) {
        showToast('Помилка', 'error')
    }
}

function showToast(message, type = 'success') {
    toast.message = message
    toast.type = type
    toast.show = true
    setTimeout(() => { toast.show = false }, 3000)
}

function roleLabel(role) {
    const labels = {
        STUDENT: 'Студент',
        FIRM: 'Компанія',
        FIRM_USER: 'Представник фірми',
        MENTOR: 'Ментор',
        EVALUATOR: 'Комісія (перегляд)',
        SUPER_EVALUATOR: 'Комісія — рішення / скоринг',
        ADMIN: 'Адмін',
        SUPER_ADMIN: 'Супер адмін'
    }
    return labels[role] || role
}

function statusLabel(status) {
    const labels = {
        PENDING: 'Очікує',
        APPROVED: 'Схвалений',
        REJECTED: 'Відхилений',
        SUSPENDED: 'Заблокований'
    }
    return labels[status] || status
}

function formatDate(date) {
    return new Date(date).toLocaleDateString('uk-UA', {
        day: '2-digit',
        month: 'long',
        year: 'numeric',
        hour: '2-digit',
        minute: '2-digit'
    })
}
</script>

<style scoped>
.admin-page {
    width: 100%;
    max-width: 960px;
    margin: 0 auto;
    padding: 0;
}

.page-header {
    margin-bottom: 1.5rem;
}

.page-header h1 {
    font-size: 1.75rem;
    margin-bottom: 4px;
}

.page-header p {
    color: #6b7280;
}

.tabs {
    display: flex;
    gap: 0;
    border-bottom: 1px solid #e5e7eb;
    margin-bottom: 1.5rem;
}

.invite-mentor-card {
    background: white;
    border: 1px solid #e5e7eb;
    border-radius: 12px;
    padding: 1rem;
    margin-bottom: 1.5rem;
}

.invite-mentor-card h2 {
    font-size: 1.1rem;
    margin-bottom: 0.25rem;
}

.invite-mentor-card p {
    color: #6b7280;
    margin-bottom: 0.75rem;
}

.invite-mentor-form {
    display: flex;
    gap: 10px;
}

.invite-mentor-form input {
    flex: 1;
    padding: 8px 12px;
    border: 1px solid #d1d5db;
    border-radius: 8px;
    font-size: 0.875rem;
}

.invite-mentor-form button {
    padding: 8px 14px;
    background: #4f46e5;
    color: white;
    border: none;
    border-radius: 8px;
    cursor: pointer;
    font-size: 0.875rem;
}

.invite-error {
    margin-top: 0.5rem;
    color: #b91c1c;
    font-size: 0.875rem;
}

.tab {
    padding: 10px 20px;
    border: none;
    background: none;
    cursor: pointer;
    font-size: 0.9rem;
    color: #6b7280;
    border-bottom: 2px solid transparent;
    display: flex;
    align-items: center;
    gap: 6px;
}

.tab.active {
    color: #4f46e5;
    border-bottom-color: #4f46e5;
    font-weight: 500;
}

.badge {
    background: #ef4444;
    color: white;
    font-size: 0.7rem;
    padding: 1px 6px;
    border-radius: 20px;
    font-weight: 600;
}

.filters {
    display: flex;
    gap: 10px;
    margin-bottom: 1rem;
}

.filters select,
.filters input {
    padding: 8px 12px;
    border: 1px solid #d1d5db;
    border-radius: 8px;
    font-size: 0.875rem;
}

.filters input {
    flex: 1;
}

.users-list {
    display: flex;
    flex-direction: column;
    gap: 10px;
}

.user-card {
    display: flex;
    justify-content: space-between;
    align-items: center;
    padding: 1rem 1.25rem;
    border: 1px solid #e5e7eb;
    border-radius: 10px;
    background: white;
    border-left: 4px solid #e5e7eb;
}

.user-card.pending {
    border-left-color: #f59e0b;
}

.user-card.approved {
    border-left-color: #10b981;
}

.user-card.rejected {
    border-left-color: #ef4444;
}

.user-card.suspended {
    border-left-color: #6b7280;
}

.user-info {
    display: flex;
    align-items: center;
    gap: 12px;
}

.user-avatar {
    width: 40px;
    height: 40px;
    border-radius: 50%;
    background: #e0e7ff;
    color: #4f46e5;
    display: flex;
    align-items: center;
    justify-content: center;
    font-weight: 600;
    font-size: 1rem;
    flex-shrink: 0;
}

.user-name {
    font-weight: 500;
    font-size: 0.95rem;
}

.user-email {
    font-size: 0.8rem;
    color: #6b7280;
    margin-bottom: 4px;
}

.user-meta {
    display: flex;
    flex-wrap: wrap;
    gap: 5px;
    align-items: center;
}

.role-chip {
    font-size: 0.7rem;
    padding: 1px 7px;
    border-radius: 20px;
    background: #e0e7ff;
    color: #4338ca;
}

.status-chip {
    font-size: 0.7rem;
    padding: 1px 7px;
    border-radius: 20px;
    font-weight: 500;
}

.status-chip.pending {
    background: #fef3c7;
    color: #92400e;
}

.status-chip.approved {
    background: #d1fae5;
    color: #065f46;
}

.status-chip.rejected {
    background: #fee2e2;
    color: #991b1b;
}

.status-chip.suspended {
    background: #f3f4f6;
    color: #374151;
}

.date {
    font-size: 0.75rem;
    color: #9ca3af;
}

.user-actions {
    display: flex;
    gap: 8px;
    flex-shrink: 0;
}

.btn-approve {
    padding: 6px 14px;
    background: #10b981;
    color: white;
    border: none;
    border-radius: 6px;
    cursor: pointer;
    font-size: 0.8rem;
}

.btn-reject {
    padding: 6px 14px;
    background: #ef4444;
    color: white;
    border: none;
    border-radius: 6px;
    cursor: pointer;
    font-size: 0.8rem;
}

.btn-suspend {
    padding: 6px 14px;
    background: #6b7280;
    color: white;
    border: none;
    border-radius: 6px;
    cursor: pointer;
    font-size: 0.8rem;
}

.btn-roles {
    padding: 6px 14px;
    background: #4f46e5;
    color: white;
    border: none;
    border-radius: 6px;
    cursor: pointer;
    font-size: 0.8rem;
}

button:disabled {
    opacity: 0.5;
    cursor: not-allowed;
}

.modal-overlay {
    position: fixed;
    inset: 0;
    background: rgba(0, 0, 0, 0.4);
    display: flex;
    align-items: center;
    justify-content: center;
    z-index: 100;
}

.modal {
    background: white;
    border-radius: 12px;
    padding: 1.5rem;
    width: 100%;
    max-width: 440px;
}

.modal h3 {
    margin-bottom: 0.75rem;
}

.modal p {
    color: #6b7280;
    margin-bottom: 1rem;
}

.field {
    margin-bottom: 1rem;
}

.field label {
    display: block;
    font-size: 0.875rem;
    margin-bottom: 4px;
}

.field textarea {
    width: 100%;
    padding: 8px 12px;
    border: 1px solid #d1d5db;
    border-radius: 8px;
    font-family: inherit;
    font-size: 0.875rem;
    box-sizing: border-box;
}

.modal-actions {
    display: flex;
    gap: 8px;
    justify-content: flex-end;
    margin-top: 1rem;
}

.btn-cancel {
    padding: 8px 16px;
    border: 1px solid #d1d5db;
    background: white;
    border-radius: 6px;
    cursor: pointer;
}

.roles-list {
    display: flex;
    flex-direction: column;
    gap: 8px;
    margin-bottom: 1rem;
}

.role-row {
    display: flex;
    justify-content: space-between;
    align-items: center;
    padding: 6px 10px;
    border-radius: 6px;
    background: #f9fafb;
    font-size: 0.875rem;
}

.btn-add-role {
    padding: 3px 10px;
    background: #10b981;
    color: white;
    border: none;
    border-radius: 4px;
    cursor: pointer;
    font-size: 0.75rem;
}

.btn-remove-role {
    padding: 3px 10px;
    background: #ef4444;
    color: white;
    border: none;
    border-radius: 4px;
    cursor: pointer;
    font-size: 0.75rem;
}

.toast {
    position: fixed;
    bottom: 2rem;
    right: 2rem;
    padding: 10px 20px;
    border-radius: 8px;
    font-size: 0.875rem;
    z-index: 200;
    box-shadow: 0 4px 12px rgba(0, 0, 0, 0.15);
}

.toast.success {
    background: #10b981;
    color: white;
}

.toast.error {
    background: #ef4444;
    color: white;
}

.toast.info {
    background: #6b7280;
    color: white;
}

.loading {
    text-align: center;
    padding: 3rem;
    color: #9ca3af;
}

.empty {
    text-align: center;
    padding: 3rem;
    color: #9ca3af;
}
</style>