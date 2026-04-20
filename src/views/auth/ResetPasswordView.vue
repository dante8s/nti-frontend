<template>
    <div class="wrap">
        <div class="box">

            <!-- Успішно змінено -->
            <div v-if="success" class="success">
                <h2>Пароль змінено!</h2>
                <p>Тепер можете увійти з новим паролем.</p>
                <router-link to="/login">
                    Увійти
                </router-link>
            </div>

            <!-- Токен відсутній -->
            <div v-else-if="!token" class="error-page">
                <h2>Невірне посилання</h2>
                <p>
                    Посилання недійсне або прострочене.
                    Запросіть скидання знову.
                </p>
                <router-link to="/forgot-password">
                    Запросити знову
                </router-link>
            </div>

            <!-- Форма нового пароля -->
            <template v-else>
                <h1>Новий пароль</h1>
                <p class="hint">Введіть новий пароль для акаунту.</p>

                <div v-if="error" class="error">{{ error }}</div>

                <form @submit.prevent="handleSubmit">
                    <div class="field">
                        <label>Новий пароль</label>
                        <input v-model="newPassword" type="password" placeholder="Мінімум 6 символів" required
                            minlength="6" />
                    </div>
                    <div class="field">
                        <label>Повторіть пароль</label>
                        <input v-model="confirmPassword" type="password" placeholder="Повторіть пароль" required />
                    </div>
                    <button type="submit" :disabled="loading">
                        {{
                            loading ? 'Збереження...' : 'Зберегти пароль'
                        }}
                    </button>
                </form>
            </template>

        </div>
    </div>
</template>

<script setup>
import { ref, onMounted } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { useAuthStore } from '@/stores/auth'

const route = useRoute()
const router = useRouter()
const auth = useAuthStore()

// Беремо токен з URL: /reset-password?token=UUID
const token = ref('')
const newPassword = ref('')
const confirmPassword = ref('')
const loading = ref(false)
const error = ref('')
const success = ref(false)

onMounted(() => {
    token.value = route.query.token || ''
})

async function handleSubmit() {
    error.value = ''

    // Перевірка що паролі співпадають
    if (newPassword.value !== confirmPassword.value) {
        error.value = 'Паролі не співпадають'
        return
    }

    if (newPassword.value.length < 6) {
        error.value = 'Пароль мінімум 6 символів'
        return
    }

    loading.value = true
    try {
        await auth.resetPassword(
            token.value,
            newPassword.value
        )
        success.value = true
    } catch (e) {
        error.value =
            e.response?.data ||
            'Посилання недійсне або прострочене'
    } finally {
        loading.value = false
    }
}
</script>

<style scoped>
.wrap {
    min-height: 100vh;
    display: flex;
    align-items: center;
    justify-content: center;
    background: #f5f5f5;
}

.box {
    background: white;
    padding: 2rem;
    border-radius: 12px;
    width: 100%;
    max-width: 400px;
    box-shadow: 0 2px 12px rgba(0, 0, 0, 0.1);
}

h1 {
    margin-bottom: 0.5rem;
    font-size: 1.5rem;
    text-align: center;
}

h2 {
    margin-bottom: 1rem;
    text-align: center;
}

.hint {
    text-align: center;
    color: #777;
    font-size: 0.875rem;
    margin-bottom: 1.5rem;
}

.field {
    margin-bottom: 1rem;
}

label {
    display: block;
    font-size: 0.875rem;
    margin-bottom: 4px;
    color: #555;
}

input {
    width: 100%;
    padding: 10px 12px;
    border: 1px solid #ddd;
    border-radius: 8px;
    font-size: 1rem;
    box-sizing: border-box;
}

input:focus {
    outline: none;
    border-color: #4f46e5;
}

button {
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

button:disabled {
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

.error-page {
    text-align: center;
    padding: 1rem 0;
}

.error-page p {
    color: #555;
    margin-bottom: 1rem;
    font-size: 0.9rem;
}

.success {
    text-align: center;
    padding: 1rem 0;
}

.success p {
    margin-bottom: 1rem;
    color: #555;
    font-size: 0.9rem;
}

a {
    color: #4f46e5;
}
</style>