<template>
    <div class="wrap">
        <div class="box">

            <div v-if="success" class="success">
                <h2>{{ t('auth.passwordChanged') }}</h2>
                <p>{{ t('auth.passwordChangedText') }}</p>
                <router-link to="/login">
                    {{ t('auth.signIn') }}
                </router-link>
            </div>

            <div v-else-if="!token" class="error-page">
                <h2>{{ t('auth.invalidLink') }}</h2>
                <p>{{ t('auth.invalidLinkText') }}</p>
                <router-link to="/forgot-password">
                    {{ t('auth.requestAgain') }}
                </router-link>
            </div>

            <template v-else>
                <h1>{{ t('auth.resetTitle') }}</h1>
                <p class="hint">{{ t('auth.resetHint') }}</p>

                <div v-if="error" class="error">{{ error }}</div>

                <form @submit.prevent="handleSubmit">
                    <div class="field">
                        <label>{{ t('auth.newPassword') }}</label>
                        <input v-model="newPassword" type="password" :placeholder="t('auth.passwordPlaceholder')" required minlength="6" />
                    </div>
                    <div class="field">
                        <label>{{ t('auth.confirmPassword') }}</label>
                        <input v-model="confirmPassword" type="password" :placeholder="t('auth.confirmPassword')" required />
                    </div>
                    <button type="submit" :disabled="loading">
                        {{ loading ? t('auth.saving') : t('auth.savePassword') }}
                    </button>
                </form>
            </template>

        </div>
    </div>
</template>

<script setup>
import { ref, onMounted } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { useI18n } from 'vue-i18n'
import { useAuthStore } from '@/stores/auth'

const { t } = useI18n()
const route = useRoute()
const router = useRouter()
const auth = useAuthStore()

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

    if (newPassword.value !== confirmPassword.value) {
        error.value = t('auth.passwordMismatch')
        return
    }

    if (newPassword.value.length < 6) {
        error.value = t('auth.passwordTooShort')
        return
    }

    loading.value = true
    try {
        await auth.resetPassword(token.value, newPassword.value)
        success.value = true
    } catch (e) {
        error.value = e.response?.data || t('auth.resetError')
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
