<template>
    <div class="wrap">
        <div class="box">
            <h1>{{ t('auth.registerTitle') }}</h1>

            <div v-if="error" class="error">{{ error }}</div>
            <div v-if="success" class="success">{{ success }}</div>

            <form @submit.prevent="handleRegister">
                <div class="field">
                    <label>{{ t('auth.fullName') }}</label>
                    <input v-model="form.name" type="text" :placeholder="t('auth.namePlaceholder')" required />
                </div>

                <div class="field">
                    <label>{{ t('auth.email') }}</label>
                    <input
                        v-model="form.email"
                        type="email"
                        placeholder="meno.priezvisko@student.ukf.sk"
                        required
                        :class="{ 'input-error': emailDomainInvalid }"
                        @blur="checkEmailDomain"
                    />
                    <span v-if="emailDomainInvalid" class="field-error">
                        {{ t('auth.emailDomainError') }}
                    </span>
                    <span v-else class="field-hint">{{ t('auth.emailDomainHint') }}</span>
                </div>

                <div class="field">
                    <label>{{ t('auth.password') }}</label>
                    <input v-model="form.password" type="password" :placeholder="t('auth.passwordPlaceholder')" required />
                </div>

                <div class="field">
                    <label>{{ t('auth.iAm') }}</label>
                    <select v-model="form.role" required>
                        <option value="">{{ t('auth.chooseRole') }}</option>
                        <option value="STUDENT">{{ t('auth.student') }}</option>
                        <option value="FIRM">{{ t('auth.company') }}</option>
                        <option value="MENTOR">{{ t('auth.mentor') }}</option>
                    </select>
                </div>

                <div class="field checkbox">
                    <input v-model="form.gdprConsent" type="checkbox" id="gdpr" />
                    <label for="gdpr">
                        {{ t('auth.gdprConsent') }}
                    </label>
                </div>

                <div class="field">
                    <div id="recaptcha-register" class="g-recaptcha"
                        data-sitekey="6Lfl56gsAAAAAOBIsD-BT1Krdd9aGvTz7iWIZnDL"></div>
                    <span v-if="captchaError" class="error-text">
                        {{ t('auth.captchaErrorReg') }}
                    </span>
                    <div v-if="captchaLoadError" class="error">
                        {{ t('auth.captchaLoadError') }}
                    </div>
                </div>

                <button type="submit" :disabled="loading || !form.gdprConsent">
                    {{ loading ? t('auth.registering') : t('auth.registerBtn') }}
                </button>
            </form>

            <p>
                {{ t('auth.haveAccount') }}
                <router-link to="/login">{{ t('auth.signIn') }}</router-link>
            </p>
        </div>
    </div>
</template>

<script setup>
import { ref, reactive, onMounted, onUnmounted } from 'vue'
import { useRouter } from 'vue-router'
import { useI18n } from 'vue-i18n'
import { useAuthStore } from '@/stores/auth'

const { t } = useI18n()
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
const captchaLoadError = ref(false)
const emailDomainInvalid = ref(false)

let captchaInterval = null

function checkEmailDomain() {
    emailDomainInvalid.value =
        form.email.length > 0 && !form.email.toLowerCase().endsWith('@student.ukf.sk')
}

onMounted(() => {
    captchaInterval = setInterval(() => {
        if (window.grecaptcha?.render) {
            clearInterval(captchaInterval)
            captchaInterval = null
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

    setTimeout(() => {
        if (!form.captchaToken && !window.grecaptcha?.render) {
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

async function handleRegister() {
    checkEmailDomain()
    if (emailDomainInvalid.value) return

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
        success.value = message || t('auth.registerSuccess')
    } catch (e) {
        error.value = e.response?.data?.message || e.response?.data || t('auth.registerError')
        window.grecaptcha?.reset()
        form.captchaToken = ''
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

.error-text {
    color: #dc2626;
    font-size: 0.8rem;
    margin-top: 4px;
    display: block;
}

.field-error {
    color: #dc2626;
    font-size: 0.78rem;
    margin-top: 4px;
    display: block;
}

.field-hint {
    color: #6b7280;
    font-size: 0.78rem;
    margin-top: 4px;
    display: block;
}

.input-error {
    border-color: #dc2626 !important;
}

.input-error:focus {
    border-color: #dc2626 !important;
    outline-color: #dc2626;
}

.success {
    background: #ecfdf5;
    color: #166534;
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
