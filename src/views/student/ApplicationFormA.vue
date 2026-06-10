<template>
    <div class="page">
        <div class="back">
            <router-link to="/programs/a">← Back to Program A</router-link>
        </div>

        <div class="form-box">
            <h1>Application — Program A</h1>
            <p class="subtitle">Grant incubation program</p>

            <div v-if="callInfo" class="call-info">
                <span class="call-label">Call:</span>
                <strong>{{ callInfo.title }}</strong>
                <span class="deadline">Deadline: {{ formatDate(callInfo.deadline) }}</span>
            </div>

            <div v-if="isDeadlinePassed" class="deadline-banner">
                The application deadline for this call has passed
            </div>

            <div v-if="initialLoading" class="loading">Loading...</div>

            <template v-else-if="!isDeadlinePassed">
                <!-- Step 1 — form (new or edit) -->
                <div v-if="!application">
                    <div v-if="error" class="error">{{ error }}</div>

                    <form @submit.prevent="saveForm">
                        <div class="field">
                            <label>Project name *</label>
                            <input v-model="form.projectName" type="text" placeholder="Your project name" required />
                        </div>
                        <div class="field">
                            <label>Short description *</label>
                            <textarea v-model="form.description" rows="4" placeholder="Describe your idea..." required />
                        </div>
                        <div class="field">
                            <label>Topic category *</label>
                            <select v-model="form.category" required>
                                <option value="">Select a category</option>
                                <option value="software">Software development</option>
                                <option value="ai">AI and data</option>
                                <option value="web">Web applications</option>
                                <option value="game">Game development</option>
                                <option value="iot">IoT and embedded</option>
                            </select>
                        </div>
                        <div v-if="stackSubjects.length" class="field stack-subjects">
                            <label>Kvalifikačný stack — predmety</label>
                            <ul class="subjects-list">
                                <li v-for="s in stackSubjects" :key="s.id">{{ s.subjectName }}</li>
                            </ul>
                        </div>

                        <div class="field">
                            <label>Technology stack *</label>
                            <input v-model="form.techStack" type="text" placeholder="React, Spring Boot..." required />
                        </div>
                        <div class="field">
                            <label>Team composition *</label>
                            <textarea v-model="form.teamDescription" rows="3" required />
                        </div>

                        <button type="submit" :disabled="loading" class="btn-primary">
                            {{ loading ? 'Saving...' : 'Save and proceed to documents' }}
                        </button>
                    </form>
                </div>

                <!-- Step 2 — documents -->
                <div v-else>
                    <div class="step-header">
                        <div class="step-done">✓ Information saved</div>
                        <!-- Show saved data -->
                        <div v-if="savedFormData" class="saved-summary">
                            <strong>{{ savedFormData.projectName }}</strong>
                            <span class="muted"> · {{ savedFormData.category }}</span>
                        </div>
                        <!-- Button to return to form editing -->
                        <button v-if="application.status === 'DRAFT' || application.status === 'NEEDS_REVISION'"
                            type="button" class="btn-back-form" @click="application = null">
                            Edit data ↩
                        </button>
                    </div>

                    <DocumentUpload :application-id="application.id" :application-status="application.status"
                        @change="checkReadyToSubmit" />

                    <div class="submit-section">
                        <div v-if="!canSubmit" class="submit-hint">
                            Upload all required documents to submit your application
                        </div>
                        <div class="submit-actions">
                            <button class="btn-draft" @click="$router.push('/app/my-applications')">
                                Save as draft
                            </button>
                            <button class="btn-submit" :disabled="!canSubmit || submitting" @click="submitApplication">
                                {{ submitting ? 'Submitting...' : 'Submit application' }}
                            </button>
                        </div>
                    </div>

                    <div v-if="submitError" class="error">{{ submitError }}</div>

                    <div v-if="submitted" class="success">
                        <h3>Application submitted!</h3>
                        <p>You can track the status in your dashboard.</p>
                        <router-link to="/app/my-applications">Go to my applications</router-link>
                    </div>
                </div>
            </template>
        </div>
    </div>
</template>

<script setup>
import { ref, reactive, computed, onMounted, watch } from 'vue'
import { useRoute } from 'vue-router'
import { programsApi } from '@/api/programs'
import { applicationsApi } from '@/api/applications'
import { getCallApplicationEligibility } from '@/api/profileApi'
import { qualificationApi } from '@/api/qualificationStacks'
import { useAuthStore } from '@/stores/auth'
import { apiErrorMessage } from '@/utils/apiError'
import DocumentUpload from '@/components/DocumentUpload.vue'

const route = useRoute()
const auth = useAuthStore()
const callId = Number(route.params.callId)

const callInfo = ref(null)
const application = ref(null)   // null = not yet saved / show form
const initialLoading = ref(true)
const loading = ref(false)
const submitting = ref(false)
const error = ref('')
const submitError = ref('')
const submitted = ref(false)
const docsStatus = ref([])

const form = reactive({
    projectName: '',
    description: '',
    category: '',
    techStack: '',
    teamDescription: '',
})

const stackSubjects = ref([])

watch(() => form.category, async (key) => {
    if (!key) { stackSubjects.value = []; return }
    try {
        const { data } = await qualificationApi.getByKey(key)
        stackSubjects.value = data.subjects || []
    } catch {
        stackSubjects.value = []
    }
})

// Збережені дані для відображення підсумку на кроці 2
const savedFormData = computed(() => {
    if (!application.value?.formData) return null
    try { return JSON.parse(application.value.formData) } catch { return null }
})

const isDeadlinePassed = computed(() =>
    callInfo.value?.deadline && new Date() > new Date(callInfo.value.deadline),
)

const canSubmit = computed(() => {
    const required = docsStatus.value.filter(
        d => d.documentType !== 'RESULT_1' && d.documentType !== 'RESULT_2'
    )
    return !isDeadlinePassed.value &&
        required.length > 0 &&
        required.every((d) => d.uploaded)
})

onMounted(async () => {
    try {
        const isSuperAdmin = (auth.user?.roles || []).includes('SUPER_ADMIN')
        if (!isSuperAdmin) {
            const eligibility = await getCallApplicationEligibility()
            if (!eligibility?.teamLeader) {
                error.value =
                    'Only the team leader can submit an application for a call. Contact your team leader.'
                return
            }
            if (!eligibility?.teamFull) {
                error.value =
                    'The team is not yet complete. To submit an application, the team must be at full capacity (3 members).'
                return
            }
        }

        // Simultaneously load call info and check if an application already exists
        const [callRes, existingRes] = await Promise.allSettled([
            programsApi.getCall(callId),
            applicationsApi.getMyByCall(callId),
        ])

        if (callRes.status === 'fulfilled') {
            callInfo.value = callRes.value.data
        }

        if (existingRes.status === 'fulfilled') {
            // Application already exists — load data and proceed to step 2
            application.value = existingRes.value.data

            // Fill the form with saved data (in case user returns to step 1)
            const saved = savedFormData.value
            if (saved) {
                form.projectName = saved.projectName || ''
                form.description = saved.description || ''
                form.category = saved.category || ''
                form.techStack = saved.techStack || ''
                form.teamDescription = saved.teamDescription || ''
            }

            await checkReadyToSubmit()
        }
        // if 404 — existingRes.status === 'rejected', application remains null → show form
    } catch (e) {
        console.error(e)
    } finally {
        initialLoading.value = false
    }
})

/**
 * saveForm — called on form submit (step 1).
 * If no application exists yet — create one, then save formData.
 * If application already exists (editing) — only update formData.
 */
async function saveForm() {
    error.value = ''
    loading.value = true
    try {
        const formData = JSON.stringify({
            projectName: form.projectName,
            description: form.description,
            category: form.category,
            techStack: form.techStack,
            teamDescription: form.teamDescription,
        })

        let appId = application.value?.id
        if (!appId) {
            try {
                const existing = await applicationsApi.getMyByCall(callId)
                appId = existing.data?.id
            } catch (lookupErr) {
                if (lookupErr?.response?.status !== 404)
                    throw lookupErr
            }
        }
        if (!appId) {
            const created = await applicationsApi.createDraft(callId)
            appId = created.data.id
        }
        const updated = await applicationsApi.updateDraft(appId, formData)
        application.value = updated.data

        await checkReadyToSubmit()
    } catch (e) {
        error.value = apiErrorMessage(e, 'Save error')
    } finally {
        loading.value = false
    }
}

async function checkReadyToSubmit() {
    if (!application.value) return
    try {
        const res = await applicationsApi.getDocumentStatus(application.value.id)
        docsStatus.value = res.data
    } catch (e) {
        console.error(e)
    }
}

async function submitApplication() {
    submitError.value = ''
    submitting.value = true
    try {
        await applicationsApi.submit(application.value.id)
        submitted.value = true
    } catch (e) {
        submitError.value = apiErrorMessage(e, 'Submission error')
    } finally {
        submitting.value = false
    }
}

function formatDate(date) {
    return new Date(date).toLocaleDateString('uk-UA', {
        day: '2-digit', month: 'long', year: 'numeric',
    })
}
</script>

<style scoped>
.stack-subjects label { font-weight: 600; margin-bottom: 0.4rem; display: block; }
.subjects-list {
    margin: 0;
    padding-left: 1.2rem;
    display: flex;
    flex-wrap: wrap;
    gap: 0.4rem 1.5rem;
    list-style: disc;
}
.subjects-list li { color: #374151; font-size: 0.9rem; }

.page {
    max-width: 700px;
    margin: 0 auto;
    padding: 2rem;
}

.back {
    margin-bottom: 1.5rem;
}

.back a {
    color: #4f46e5;
    text-decoration: none;
}

.loading {
    text-align: center;
    padding: 2rem;
    color: #6b7280;
}

.form-box {
    background: white;
    border: 1px solid #e5e7eb;
    border-radius: 12px;
    padding: 2rem;
}

h1 {
    font-size: 1.5rem;
    margin-bottom: 4px;
}

.subtitle {
    color: #6b7280;
    margin-bottom: 1.5rem;
}

.call-info {
    background: #f0f9ff;
    border: 1px solid #bae6fd;
    border-radius: 8px;
    padding: 10px 14px;
    margin-bottom: 1.5rem;
    display: flex;
    align-items: center;
    gap: 8px;
    flex-wrap: wrap;
}

.call-label {
    font-size: 0.875rem;
    color: #0369a1;
}

.deadline {
    margin-left: auto;
    font-size: 0.8rem;
    color: #ef4444;
    font-weight: 500;
}

.deadline-banner {
    background: #fee2e2;
    color: #b91c1c;
    border: 1px solid #fca5a5;
    border-radius: 10px;
    padding: 0.85rem 1rem;
    font-weight: 600;
    font-size: 0.95rem;
    margin-bottom: 1rem;
    text-align: center;
}

.field {
    margin-bottom: 1rem;
}

label {
    display: block;
    font-size: 0.875rem;
    margin-bottom: 4px;
}

input,
select,
textarea {
    width: 100%;
    padding: 10px 12px;
    border: 1px solid #d1d5db;
    border-radius: 8px;
    font-size: 0.9rem;
    box-sizing: border-box;
    font-family: inherit;
}

input:focus,
select:focus,
textarea:focus {
    outline: none;
    border-color: #4f46e5;
}

textarea {
    resize: vertical;
}

.btn-primary {
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

.btn-primary:disabled {
    opacity: 0.6;
    cursor: not-allowed;
}

/* Step 2 */
.step-header {
    margin-bottom: 1rem;
}

.step-done {
    font-size: 0.875rem;
    color: #059669;
    font-weight: 500;
    margin-bottom: 4px;
}

.saved-summary {
    font-size: 0.875rem;
    color: #374151;
    margin-bottom: 6px;
}

.muted {
    color: #9ca3af;
}

.btn-back-form {
    font-size: 0.78rem;
    padding: 4px 10px;
    border: 1px solid #e5e7eb;
    border-radius: 6px;
    background: white;
    color: #4f46e5;
    cursor: pointer;
}

.btn-back-form:hover {
    background: #f5f3ff;
}

.submit-section {
    margin-top: 1.5rem;
}

.submit-hint {
    font-size: 0.8rem;
    color: #6b7280;
    margin-bottom: 0.75rem;
    text-align: center;
}

.submit-actions {
    display: flex;
    gap: 10px;
}

.btn-draft {
    flex: 1;
    padding: 10px;
    border: 1px solid #d1d5db;
    background: white;
    border-radius: 8px;
    cursor: pointer;
    font-size: 0.9rem;
}

.btn-submit {
    flex: 2;
    padding: 10px;
    background: #10b981;
    color: white;
    border: none;
    border-radius: 8px;
    cursor: pointer;
    font-size: 0.9rem;
}

.btn-submit:disabled {
    opacity: 0.5;
    cursor: not-allowed;
}

.error {
    background: #fee2e2;
    color: #dc2626;
    padding: 10px;
    border-radius: 8px;
    margin-top: 1rem;
    font-size: 0.875rem;
}

.success {
    background: #f0fdf4;
    border: 1px solid #86efac;
    border-radius: 8px;
    padding: 1rem;
    text-align: center;
    margin-top: 1rem;
}

.success h3 {
    color: #166534;
}

.success a {
    color: #4f46e5;
}
</style>