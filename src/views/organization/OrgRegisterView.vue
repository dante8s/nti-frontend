<template>
  <div class="page">
    <section class="header">
      <p class="header__eyebrow">Organization</p>
      <h2 class="header__title">Register your organization</h2>
      <p class="header__text">
        Fill in your organization profile. You can update it later from the organization profile page.
      </p>
    </section>

    <div v-if="loading" class="state">
      Loading…
    </div>
    <div v-else class="card">
      <div v-if="error" class="state state--error">
        {{ error }}
      </div>

      <form class="form" @submit.prevent="submit">
        <label class="field">
          <span>Name *</span>
          <input v-model="form.name" type="text" placeholder="Company name" autocomplete="organization" />
        </label>

        <label class="field">
          <span>ICO *</span>
          <input v-model="form.ico" type="text" placeholder="Registration number (ICO)" />
        </label>

        <label class="field">
          <span>Sector</span>
          <input v-model="form.sector" type="text" placeholder="e.g. IT, Manufacturing" />
        </label>

        <label class="field">
          <span>Description</span>
          <textarea v-model="form.description" rows="4" placeholder="What does your organization do?" />
        </label>

        <div class="grid">
          <label class="field">
            <span>Contact email</span>
            <input v-model="form.contactEmail" type="email" placeholder="name@company.com" />
          </label>

          <label class="field">
            <span>Contact phone</span>
            <input v-model="form.contactPhone" type="tel" placeholder="+421..." />
          </label>
        </div>

        <label class="field">
          <span>Website</span>
          <input v-model="form.website" type="url" placeholder="https://..." />
        </label>

        <div class="actions">
          <button type="button" class="btn-secondary" :disabled="saving" @click="cancel">
            Cancel
          </button>
          <button
            type="submit"
            class="btn-primary"
            :disabled="saving || !form.name.trim() || !form.ico.trim()"
          >
            {{ saving ? 'Creating…' : 'Create organization' }}
          </button>
        </div>
      </form>
    </div>
  </div>
</template>

<script setup>
import { onMounted, reactive, ref } from 'vue'
import { useRouter } from 'vue-router'
import { useOrganizationStore } from '@/stores/organization'

const router = useRouter()
const orgStore = useOrganizationStore()

const loading = ref(true)
const saving = ref(false)
const error = ref('')

const form = reactive({
  name: '',
  ico: '',
  sector: '',
  description: '',
  contactEmail: '',
  contactPhone: '',
  website: '',
})

onMounted(init)

async function init() {
  loading.value = true
  error.value = ''
  try {
    const my = await orgStore.getMy()
    if (Array.isArray(my) && my.length > 0) {
      router.replace({ name: 'org-profile' })
      return
    }
  } catch {
    // ignore and allow user to try registering anyway
  } finally {
    loading.value = false
  }
}

function cancel() {
  router.push({ name: 'dashboard' })
}

async function submit() {
  saving.value = true
  error.value = ''
  try {
    const payload = {
      name: form.name?.trim(),
      ico: form.ico?.trim(),
      sector: form.sector?.trim() || null,
      description: form.description?.trim() || null,
      contactEmail: form.contactEmail?.trim() || null,
      contactPhone: form.contactPhone?.trim() || null,
      website: form.website?.trim() || null,
    }
    await orgStore.create(payload)
    router.replace({ name: 'org-profile' })
  } catch (e) {
    if (e.response?.status === 409) {
      error.value = 'This ICO is already registered.'
    } else {
      error.value = e.response?.data?.message
        || (typeof e.response?.data === 'string' ? e.response.data : null)
        || 'Failed to create organization.'
    }
  } finally {
    saving.value = false
  }
}
</script>

<style scoped>
.page {
  width: 100%;
}

.header {
  margin-bottom: 1.25rem;
}

.header__eyebrow {
  margin: 0 0 0.35rem;
  font-size: 0.75rem;
  font-weight: 800;
  letter-spacing: 0.14em;
  text-transform: uppercase;
  color: #64748b;
}

.header__title {
  margin: 0 0 0.5rem;
  font-size: clamp(1.5rem, 3vw, 2rem);
  font-weight: 900;
  letter-spacing: -0.03em;
  color: #0f172a;
}

.header__text {
  margin: 0;
  max-width: 44rem;
  color: #475569;
  line-height: 1.6;
}

.card {
  border-radius: 18px;
  background: rgba(255, 255, 255, 0.95);
  border: 1px solid rgba(79, 70, 229, 0.1);
  box-shadow: 0 12px 32px rgba(15, 23, 42, 0.06);
  padding: 1.25rem;
}

.state {
  text-align: center;
  padding: 1.25rem 0.75rem;
  color: #64748b;
}

.state--error {
  text-align: left;
  padding: 0.85rem 0.95rem;
  border-radius: 12px;
  background: #fee2e2;
  color: #991b1b;
  margin-bottom: 1rem;
}

.form {
  display: flex;
  flex-direction: column;
  gap: 0.85rem;
}

.grid {
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: 0.85rem;
}

.field {
  display: flex;
  flex-direction: column;
  gap: 0.35rem;
  font-size: 0.9rem;
  color: #334155;
}

.field input,
.field textarea {
  padding: 0.7rem 0.8rem;
  border-radius: 12px;
  border: 1px solid rgba(148, 163, 184, 0.7);
  background: white;
  font: inherit;
}

.actions {
  display: flex;
  justify-content: flex-end;
  gap: 0.5rem;
  margin-top: 0.25rem;
}

.btn-secondary {
  padding: 0.65rem 1rem;
  border-radius: 12px;
  border: 1px solid #cbd5e1;
  background: white;
  font-weight: 800;
  cursor: pointer;
}

.btn-primary {
  padding: 0.65rem 1rem;
  border-radius: 12px;
  border: none;
  background: #4f46e5;
  color: white;
  font-weight: 800;
  cursor: pointer;
}

.btn-primary:disabled,
.btn-secondary:disabled {
  opacity: 0.55;
  cursor: not-allowed;
}

@media (max-width: 720px) {
  .grid {
    grid-template-columns: 1fr;
  }
}
</style>

