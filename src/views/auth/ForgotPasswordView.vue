<template>
    <div class="wrap">
        <div class="box">

            <div v-if="sent" class="success">
                <h2>{{ t('auth.emailSentTitle') }}</h2>
                <p>{{ t('auth.emailSentText', { email }) }}</p>
                <p>{{ t('auth.checkInbox') }}</p>
                <router-link to="/login">
                    {{ t('auth.backToLogin') }}
                </router-link>
            </div>

            <template v-else>
                <h1>{{ t('auth.forgotTitle') }}</h1>
                <p class="hint">{{ t('auth.forgotHint') }}</p>

                <div v-if="error" class="error">{{ error }}</div>

                <form @submit.prevent="handleSubmit">
                    <div class="field">
                        <label>{{ t('auth.email') }}</label>
                        <input v-model="email" type="email" placeholder="your@email.com" required />
                    </div>
                    <button type="submit" :disabled="loading">
                        {{ loading ? t('auth.sending') : t('auth.sendLink') }}
                    </button>
                </form>

                <p>
                    <router-link to="/login">
                        {{ t('auth.backToLogin') }}
                    </router-link>
                </p>
            </template>

        </div>
    </div>
</template>

<script setup>
import { ref } from 'vue'
import { useI18n } from 'vue-i18n'
import { useAuthStore } from '@/stores/auth'

const { t } = useI18n()
const auth = useAuthStore()

const email = ref('')
const loading = ref(false)
const error = ref('')
const sent = ref(false)

async function handleSubmit() {
    error.value = ''
    loading.value = true
    try {
        await auth.forgotPassword(email.value)
        sent.value = true
    } catch (e) {
        sent.value = true
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

.success {
    text-align: center;
    padding: 1rem 0;
}

.success p {
    margin-bottom: 0.75rem;
    color: #555;
    font-size: 0.9rem;
}

.success a {
    color: #4f46e5;
}

p {
    text-align: center;
    margin-top: 1rem;
    font-size: 0.875rem;
}

a {
    color: #4f46e5;
}
</style>
