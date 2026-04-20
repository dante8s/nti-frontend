<template>
    <div>
        <h1>Дашборд</h1>
        <button @click="handleLogout">Вийти</button>
    </div>
</template>

<script setup>
import { useRouter } from 'vue-router'
import { useAuthStore } from '@/stores/auth'

const router = useRouter()
const auth = useAuthStore()

function handleLogout() {
    auth.logout()
    router.push('/login')
}
</script>