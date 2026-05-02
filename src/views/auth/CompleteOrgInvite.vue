<template>
  <div class="wrap">
    <div class="box">
      <h1>Завершення реєстрації</h1>

      <div v-if="success" class="success">
        Реєстрацію завершено. Ви можете увійти в систему.
      </div>

      <template v-if="!success">
        <div v-if="error" class="error">{{ error }}</div>

        <form @submit.prevent="handleSubmit">
          <div class="field">
            <label for="name">Ім'я</label>
            <input id="name" v-model.trim="name" type="text" required />
          </div>

          <div class="field">
            <label for="password">Пароль</label>
            <input id="password" v-model="password" type="password" minlength="6" required />
          </div>

          <div class="field">
            <label for="confirm-password">Підтвердіть пароль</label>
            <input
              id="confirm-password"
              v-model="confirmPassword"
              type="password"
              minlength="6"
              required
            />
          </div>

          <button type="submit" :disabled="isSubmitting">
            {{ isSubmitting ? 'Збереження...' : 'Завершити реєстрацію' }}
          </button>
        </form>
      </template>

      <p v-if="success">
        <router-link to="/login">Перейти до входу</router-link>
      </p>
    </div>
  </div>
</template>

<script setup>
import { onMounted, ref } from 'vue'
import { useRoute } from 'vue-router'
import { useAuthStore } from '@/stores/auth'

const route = useRoute()
const authStore = useAuthStore()

const inviteToken = ref('')
const name = ref('')
const password = ref('')
const confirmPassword = ref('')
const isSubmitting = ref(false)
const error = ref('')
const success = ref(false)

onMounted(() => {
  const tokenFromQuery = route.query.token
  inviteToken.value = Array.isArray(tokenFromQuery) ? tokenFromQuery[0] : tokenFromQuery || ''

  if (!inviteToken.value) {
    error.value = 'Токен запрошення відсутній або недійсний'
  }
})

async function handleSubmit() {
  if (!inviteToken.value) {
    error.value = 'Токен запрошення відсутній або недійсний'
    return
  }

  if (password.value.length < 6) {
    error.value = 'Пароль має містити щонайменше 6 символів'
    return
  }

  if (password.value !== confirmPassword.value) {
    error.value = 'Паролі не співпадають'
    return
  }

  error.value = ''
  isSubmitting.value = true

  try {
    await authStore.completeOrgMemberInvite(inviteToken.value, name.value, password.value)
    success.value = true
  } catch (e) {
    error.value = e.response?.data?.message || e.response?.data || 'Не вдалося завершити реєстрацію'
  } finally {
    isSubmitting.value = false
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
  background: #dcfce7;
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
