<template>
    <div class="wrap">
        <div class="box">
            <h1>{{ t('auth.loginTitle') }}</h1>

            <div v-if="error" class="error">{{ error }}</div>

            <form @submit.prevent="handleLogin">
                <div class="field">
                    <label>{{ t('auth.email') }}</label>
                    <input v-model="email" type="email" required />
                </div>

                <div class="field">
                    <label>{{ t('auth.password') }}</label>
                    <input v-model="password" type="password" required />
                </div>

                <div v-if="SITE_KEY" class="field">
                    <div id="recaptcha-login" class="g-recaptcha"></div>
                    <span v-if="captchaError" class="error-text">
                        {{ t('auth.captchaError') }}
                    </span>
                    <div v-if="captchaLoadError" class="error">
                        {{ t('auth.captchaLoadError') }}
                    </div>
                </div>

                <button type="submit" :disabled="loading">
                    {{ loading ? t('auth.loading') : t('auth.loginBtn') }}
                </button>
            </form>

            <p>
                <router-link to="/forgot-password">
                    {{ t('auth.forgotPassword') }}
                </router-link>
            </p>

            <p>
                {{ t('auth.noAccount') }}
                <router-link to="/register">
                    {{ t('auth.register') }}
                </router-link>
            </p>
        </div>
    </div>
</template>

<script setup>
import { ref, onMounted, onUnmounted } from 'vue'
import { useRouter } from 'vue-router'
import { useI18n } from 'vue-i18n'
import { useAuthStore } from '@/stores/auth'

const { t } = useI18n()
const SITE_KEY = import.meta.env.VITE_RECAPTCHA_SITE_KEY

const router = useRouter()
const auth = useAuthStore()

const email = ref('')
const password = ref('')
const loading = ref(false)
const error = ref('')
const captchaError = ref(false)
const captchaLoadError = ref(false)
const captchaToken = ref('')

let captchaInterval = null

onMounted(() => {
    if (!SITE_KEY) return

    captchaInterval = setInterval(() => {
        if (window.grecaptcha?.render) {
            clearInterval(captchaInterval)
            captchaInterval = null
            window.grecaptcha.render('recaptcha-login', {
                sitekey: SITE_KEY,
                callback: token => {
                    captchaToken.value = token
                    captchaError.value = false
                },
                'expired-callback': () => {
                    captchaToken.value = ''
                },
                'error-callback': () => {
                    captchaToken.value = ''
                }
            })
        }
    }, 100)

    setTimeout(() => {
        if (!captchaToken.value && !window.grecaptcha?.render) {
            captchaLoadError.value = true
            clearInterval(captchaInterval)
            captchaInterval = null
        }
    }, 5000)
})

onUnmounted(() => {
    if (captchaInterval) {
        clearInterval(captchaInterval)
        captchaInterval = null
    }
})

async function handleLogin() {
    if (SITE_KEY && !captchaToken.value) {
        captchaError.value = true
        return
    }

    error.value = ''
    loading.value = true
    try {
        await auth.login(email.value, password.value, captchaToken.value)
        router.push('/app/dashboard')
    } catch (e) {
        error.value = e.response?.data?.message || e.response?.data || t('auth.loginError')
        window.grecaptcha?.reset()
        captchaToken.value = ''
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
    margin-bottom: 1.5rem;
    font-size: 1.5rem;
    text-align: center;
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

.error-text {
    color: #dc2626;
    font-size: 0.8rem;
    margin-top: 4px;
    display: block;
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
