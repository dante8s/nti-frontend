<template>
    <div class="timeline">
        <div class="timeline-header">
            <span class="timeline-title">Історія заявки</span>
            <button class="btn-refresh" :disabled="loading" @click="load" title="Оновити">
                {{ loading ? '...' : '↻' }}
            </button>
        </div>

        <div v-if="loading" class="loading">
            Завантаження...
        </div>

        <div v-else-if="events.length === 0" class="empty">
            Поки немає подій
        </div>

        <div v-else class="events">
            <div v-for="(event, index) in events" :key="event.id" class="event-row">
                <div class="line-wrap">
                    <div class="dot" :class="dotClass(event.action)"></div>
                    <div v-if="index < events.length - 1" class="line"></div>
                </div>
                <div class="event-content">
                    <div class="event-desc">
                        {{ event.description }}
                    </div>
                    <div class="event-meta">
                        <span class="actor">{{ event.actorName }}</span>
                        <span class="sep">·</span>
                        <span class="date">
                            {{ formatDate(event.createdAt) }}
                        </span>
                    </div>
                </div>
            </div>
        </div>
    </div>
</template>

<script setup>
import { ref, onMounted } from 'vue'
import api from '@/api/axios'

const props = defineProps({
    applicationId: { type: Number, required: true }
})

const events = ref([])
const loading = ref(false)

onMounted(load)

// Публічний метод — викликається з батьківського компонента
async function load() {
    loading.value = true
    try {
        const res = await api.get(
            `/api/applications/${props.applicationId}/audit`
        )
        events.value = res.data
    } catch (e) {
        console.error(e)
    } finally {
        loading.value = false
    }
}

defineExpose({ reload: load })

function dotClass(action) {
    return {
        'STATUS_CHANGED': 'dot-status',
        'DOCUMENT_UPLOADED': 'dot-file',
        'APPLICATION_CREATED': 'dot-created',
        'APPLICATION_UPDATED': 'dot-updated'
    }[action] || 'dot-default'
}

function formatDate(date) {
    return new Date(date).toLocaleDateString('uk-UA', {
        day: '2-digit', month: 'short',
        year: 'numeric', hour: '2-digit', minute: '2-digit'
    })
}
</script>

<style scoped>
.timeline {
    margin-top: 2rem;
}

.timeline-header {
    display: flex;
    justify-content: space-between;
    align-items: center;
    margin-bottom: 1rem;
    padding-bottom: 0.5rem;
    border-bottom: 1px solid #f3f4f6;
}

.timeline-title {
    font-weight: 600;
    font-size: 0.9rem;
    color: #374151;
}

.btn-refresh {
    padding: 4px 10px;
    background: #f3f4f6;
    border: none;
    border-radius: 6px;
    cursor: pointer;
    font-size: 0.875rem;
    color: #374151;
}

.btn-refresh:hover {
    background: #e5e7eb;
}

.btn-refresh:disabled {
    opacity: 0.5;
    cursor: default;
}

.events {
    display: flex;
    flex-direction: column;
}

.event-row {
    display: flex;
    gap: 12px;
}

.line-wrap {
    display: flex;
    flex-direction: column;
    align-items: center;
    flex-shrink: 0;
}

.dot {
    width: 12px;
    height: 12px;
    border-radius: 50%;
    margin-top: 3px;
    flex-shrink: 0;
}

.dot-status {
    background: #4f46e5;
}

.dot-file {
    background: #10b981;
}

.dot-created {
    background: #f59e0b;
}

.dot-updated {
    background: #6b7280;
}

.dot-default {
    background: #d1d5db;
}

.line {
    width: 2px;
    flex: 1;
    background: #e5e7eb;
    margin: 4px 0;
    min-height: 16px;
}

.event-content {
    padding-bottom: 14px;
    flex: 1;
}

.event-desc {
    font-size: 0.875rem;
    color: #111827;
    margin-bottom: 2px;
}

.event-meta {
    display: flex;
    gap: 6px;
    font-size: 0.75rem;
    color: #9ca3af;
    align-items: center;
}

.actor {
    color: #6b7280;
    font-weight: 500;
}

.sep {
    color: #d1d5db;
}

.loading,
.empty {
    font-size: 0.875rem;
    color: #9ca3af;
    padding: 1rem 0;
}
</style>