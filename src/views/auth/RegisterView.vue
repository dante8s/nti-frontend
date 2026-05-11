<template>
    <div class="wrap">
        <div class="box">
            <h1>Реєстрація в NTI</h1>

            <div v-if="error" class="error">{{ error }}</div>
            <div v-if="success" class="success">{{ success }}</div>

            <form @submit.prevent="handleRegister">
                <div class="field">
                    <label>Ім'я та прізвище</label>
                    <input v-model="form.name" type="text" placeholder="Іван Петренко" required />
                </div>

                <div class="field">
                    <label>Email</label>
                    <input v-model="form.email" type="email" placeholder="your@email.com" required />
                </div>

                <div class="field">
                    <label>Пароль</label>
                    <input v-model="form.password" type="password" placeholder="Мінімум 6 символів" required />
                </div>

                <div class="field">
                    <label>Я є</label>
                    <select v-model="form.role" required>
                        <option value="">Оберіть тип акаунту</option>
                        <option value="STUDENT">Студент</option>
                        <option value="FIRM">Компанія / Партнер</option>
                        <option value="MENTOR">Mentor</option>
                    </select>
                </div>

                <div class="field checkbox">
                    <input v-model="form.gdprConsent" type="checkbox" id="gdpr" />
                    <label for="gdpr">
                        Я погоджуюсь на обробку персональних даних
                    </label>
                </div>

                <!-- ✅ CAPTCHA -->
                <div class="field">
                    <div id="recaptcha-register" class="g-recaptcha"
                        data-sitekey="6Lfl56gsAAAAAOBIsD-BT1Krdd9aGvTz7iWIZnDL"></div>
                    <span v-if="captchaError" class="error-text">
                        Підтвердіть що ви не робот
                    </span>
                </div>

                <button type="submit" :disabled="loading || !form.gdprConsent">
                    {{ loading ? 'Реєстрація...' : 'Зареєструватись' }}
                </button>
            </form>

            <p>
                Вже є акаунт?
                <router-link to="/login">Увійти</router-link>
            </p>
        </div>
    </div>
</template>

<script setup>
import { ref, reactive, onMounted } from 'vue'
import { useRouter } from 'vue-router'
import { useAuthStore } from '@/stores/auth'

const SITE_KEY = '6Lfl56gsAAAAAOBIsD-BT1Krdd9aGvTz7iWIZnDL'

const router = useRouter()
const auth = useAuthStore()

const form = reactive({
    name: '',
    email: '',
    password: '',
    role: '',
    gdprConsent: false,
    captchaToken: ''
})

const loading = ref(false)
const error = ref('')
const success = ref('')
const captchaError = ref(false)

onMounted(() => {
    const tryRender = setInterval(() => {
        if (window.grecaptcha?.render) {
            clearInterval(tryRender)
            window.grecaptcha.render('recaptcha-register', {
                sitekey: SITE_KEY,
                callback: token => {
                    form.captchaToken = token
                    captchaError.value = false
                },
                'expired-callback': () => {
                    form.captchaToken = ''
                }
            })
        }
    }, 100)
})

async function handleRegister() {
    if (!form.captchaToken) {
        captchaError.value = true
        return
    }

    error.value = ''
    success.value = ''
    loading.value = true
    try {
        const payload = {
            name: form.name,
            email: form.email,
            password: form.password,
            gdprConsent: form.gdprConsent,
            captchaToken: form.captchaToken,
            roles: [form.role]
        }
        const message = await auth.register(payload)
        success.value = message || 'Реєстрація пройшла успішно. Перевірте пошту.'
    } catch (e) {
        error.value = e.response?.data?.message || e.response?.data || e.message || 'Помилка реєстрації'
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
    max-width: 420px;
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

input,
select {
    width: 100%;
    padding: 10px 12px;
    border: 1px solid #ddd;
    border-radius: 8px;
    font-size: 1rem;
    box-sizing: border-box;
}

input:focus,
select:focus {
    outline: none;
    border-color: #4f46e5;
}

.checkbox {
    display: flex;
    align-items: center;
    gap: 8px;
}

.checkbox input {
    width: auto;
}

.checkbox label {
    margin: 0;
    font-size: 0.875rem;
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
    background: #ecfdf5;
    color: #166534;
    padding: 10px;
    border-radius: 8px;
    margin-bottom: 1rem;
    font-size: 0.875rem;
}

</style>
