<template>
  <span class="status-badge" :class="badgeClass">
    {{ resolvedLabel }}
  </span>
</template>

<script setup>
import { computed } from 'vue'

const props = defineProps({
  status: {
    type: String,
    default: '',
  },
  label: {
    type: String,
    default: '',
  },
})

const STATUS_CLASS_MAP = Object.freeze({
  DRAFT: 'status-badge--muted',
  SUBMITTED: 'status-badge--info',
  IN_REVIEW: 'status-badge--warn',
  NEEDS_REVISION: 'status-badge--orange',
  APPROVED: 'status-badge--ok',
  REJECTED: 'status-badge--bad',
  PENDING_APPROVAL: 'status-badge--warn',
  PLANNED: 'status-badge--info',
  IN_PROGRESS: 'status-badge--progress',
  COMPLETED: 'status-badge--ok',
  OVERDUE: 'status-badge--bad',
  BLOCKED: 'status-badge--muted',
  ACTIVE: 'status-badge--info',
  CANCELLED: 'status-badge--bad',
})

const badgeClass = computed(() => STATUS_CLASS_MAP[props.status] || 'status-badge--muted')
const resolvedLabel = computed(() => props.label || props.status || '—')
</script>

<style scoped>
.status-badge {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  padding: 0.28rem 0.7rem;
  border-radius: 999px;
  font-size: 0.78rem;
  font-weight: 700;
  line-height: 1.1;
  white-space: nowrap;
}

.status-badge--muted {
  background: #f1f5f9;
  color: #475569;
}

.status-badge--info {
  background: #e0e7ff;
  color: #3730a3;
}

.status-badge--warn {
  background: #fef3c7;
  color: #92400e;
}

.status-badge--orange {
  background: #ffedd5;
  color: #9a3412;
}

.status-badge--ok {
  background: #d1fae5;
  color: #065f46;
}

.status-badge--bad {
  background: #fee2e2;
  color: #991b1b;
}

.status-badge--progress {
  background: #dbeafe;
  color: #1d4ed8;
}
</style>
