<template>
    <div class="wrap">
        <div class="box">
            <h1>Увійти до NTI</h1>

            <div v-if="error" class="error">{{ error }}</div>

            <form @submit.prevent="handleLogin">
                <div class="field">
                    <label>Email</label>
                    <input v-model="email" type="email" required />
                </div>

                <div class="field">
                    <label>Пароль</label>
                    <input v-model="password" type="password" required />
                </div>

                <!-- CAPTCHA -->
                <div class="field">
                    <div id="recaptcha-login" class="g-recaptcha"
                        data-sitekey="6Lfl56gsAAAAAOBIsD-BT1Krdd9aGvTz7iWIZnDL"></div>
                    <span v-if="captchaError" class="error-text">
                        Підтвердіть, що ви не робот
                    </span>
                    <div v-if="captchaLoadError" class="error">
                        Не вдалося завантажити капчу. Перевірте, що ви відкрили сайт через http://localhost:5173.
                    </div>
                </div>

                <button type="submit" :disabled="loading">
                    {{ loading ? 'Завантаження...' : 'Увійти' }}
                </button>
            </form>

            <p>
                <router-link to="/forgot-password">
                    Забули пароль?
                </router-link>
            </p>

            <p>
                Немає аккаунту?
                <router-link to="/register">
                    Зареєструватися
                </router-link>
            </p>
        </div>
    </div>
</template>

<script setup>
import { ref, onMounted } from 'vue'
import { useRouter } from 'vue-router'
import { useAuthStore } from '@/stores/auth'

const SITE_KEY = '6Lfl56gsAAAAAOBIsD-BT1Krdd9aGvTz7iWIZnDL'

const router = useRouter()
const auth = useAuthStore()

const email = ref('')
const password = ref('')
const loading = ref(false)
const error = ref('')
const captchaError = ref(false)
const captchaLoadError = ref(false)
const captchaToken = ref('')

onMounted(() => {
    const tryRender = setInterval(() => {
        if (window.grecaptcha?.render) {
            clearInterval(tryRender)
            window.grecaptcha.render('recaptcha-login', {
                sitekey: SITE_KEY,
                callback: token => {
                    console.log('reCAPTCHA token:', token)
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
        }
    }, 5000)
})

async function handleLogin() {
    if (!captchaToken.value) {
        captchaError.value = true
        return
    }

    error.value = ''
    loading.value = true
    try {
        const data = await auth.login(
            email.value,
            password.value,
            captchaToken.value
        )

        if (data.role === 'ADMIN') {
            router.push('/admin')
        } else {
            router.push('/dashboard')
        }
    } catch (e) {
        error.value = e.response?.data?.message || e.response?.data || 'Невірний email або пароль'
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

p {
    text-align: center;
    margin-top: 1rem;
    font-size: 0.875rem;
}

a {
    color: #4f46e5;
}
</style>
