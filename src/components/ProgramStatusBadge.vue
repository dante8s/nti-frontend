<template>
  <StatusBadge :status="status" :label="labelText" />
</template>

<script setup>
import { computed } from 'vue'
import StatusBadge from '@/components/StatusBadge.vue'

const props = defineProps({
  status: {
    type: String,
    default: '',
  },
})

const STATUS_LABELS = Object.freeze({
  DRAFT: 'Draft',
  SUBMITTED: 'Submitted',
  IN_REVIEW: 'In review',
  NEEDS_REVISION: 'Needs revision',
  APPROVED: 'Approved',
  REJECTED: 'Rejected',
})

const labelText = computed(() => STATUS_LABELS[props.status] || props.status || '—')
</script>
