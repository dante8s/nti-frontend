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
  DRAFT: 'Чернетка',
  SUBMITTED: 'Надіслано',
  IN_REVIEW: 'На розгляді',
  NEEDS_REVISION: 'Потрібне доопрацювання',
  APPROVED: 'Схвалено',
  REJECTED: 'Відхилено',
})

const labelText = computed(() => STATUS_LABELS[props.status] || props.status || '—')
</script>
