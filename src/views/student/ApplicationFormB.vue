<template>
    <div class="page">
        <div class="back">
            <router-link to="/programs/b">{{ t('appForm.backToProgramB') }}</router-link>
        </div>

        <div class="form-box">
            <h1>{{ t('appForm.titleB') }}</h1>
            <p class="subtitle">{{ t('appForm.subtitleB') }}</p>

            <div v-if="callInfo" class="call-info green">
                <span class="call-label">{{ t('appForm.task') }}</span>
                <strong>{{ callInfo.title }}</strong>
                <span class="deadline">{{ t('appForm.deadline') }} {{ formatDate(callInfo.deadline) }}</span>
            </div>

            <div v-if="isDeadlinePassed" class="deadline-banner">
                {{ t('appForm.deadlinePassed') }}
            </div>

            <div v-if="initialLoading" class="loading">{{ t('appForm.loading') }}</div>

            <template v-else-if="!isDeadlinePassed">
                <!-- Step 1 — form -->
                <div v-if="!application">
                    <div v-if="error" class="error">{{ error }}</div>

                    <form @submit.prevent="saveForm">
                        <div class="section-title">{{ t('appForm.sectionTeam') }}</div>

                        <div class="field">
                            <label>{{ t('appForm.teamName') }}</label>
                            <input v-model="form.teamName" type="text" :placeholder="t('appForm.teamNamePh')" required />
                        </div>
                        <div class="field">
                            <label>{{ t('appForm.teamComp') }}</label>
                            <textarea v-model="form.teamDescription" rows="3"
                                :placeholder="t('appForm.teamCompPh')" required />
                        </div>
                        <div class="field">
                            <label>{{ t('appForm.techSkills') }}</label>
                            <input v-model="form.skills" type="text" :placeholder="t('appForm.techSkillsPh')"
                                required />
                        </div>

                        <div class="section-title" style="margin-top:1.5rem">{{ t('appForm.sectionSolution') }}</div>

                        <div class="field">
                            <label>{{ t('appForm.howSolve') }}</label>
                            <textarea v-model="form.solution" rows="4" :placeholder="t('appForm.howSolvePh')" required />
                        </div>
                        <div class="field">
                            <label>{{ t('appForm.expectedResults') }}</label>
                            <textarea v-model="form.expectedResults" rows="3"
                                :placeholder="t('appForm.expectedResultsPh')" required />
                        </div>
                        <div class="field">
                            <label>{{ t('appForm.motivation') }}</label>
                            <textarea v-model="form.motivation" rows="3" :placeholder="t('appForm.motivationPh')"
                                required />
                        </div>

                        <button type="submit" :disabled="loading" class="btn-primary green">
                            {{ loading ? t('appForm.saving') : t('appForm.saveProceed') }}
                        </button>
                    </form>
                </div>

                <!-- Step 2 — documents -->
                <div v-else>
                    <div class="step-header">
                        <div class="step-done">{{ t('appForm.infoSaved') }}</div>
                        <div v-if="savedFormData" class="saved-summary">
                            <strong>{{ savedFormData.teamName }}</strong>
                            <span class="muted"> · {{ savedFormData.skills }}</span>
                        </div>
                        <button v-if="application.status === 'DRAFT' || application.status === 'NEEDS_REVISION'"
                            type="button" class="btn-back-form" @click="application = null">
                            {{ t('appForm.editData') }}
                        </button>
                    </div>

                    <DocumentUpload :application-id="application.id" :application-status="application.status"
                        @change="checkReadyToSubmit" />

                    <div class="submit-section">
                        <div v-if="!canSubmit" class="submit-hint">
                            {{ t('appForm.docsRequired4') }}
                        </div>
                        <div class="submit-actions">
                            <button class="btn-draft" @click="$router.push('/app/my-applications')">
                                {{ t('appForm.saveAsDraft') }}
                            </button>
                            <button class="btn-submit" :disabled="!canSubmit || submitting" @click="submitApplication">
                                {{ submitting ? t('appForm.submitting') : t('appForm.submitApp') }}
                            </button>
                        </div>
                    </div>

                    <div v-if="submitError" class="error">{{ submitError }}</div>

                    <div v-if="submitted" class="success">
                        <h3>{{ t('appForm.submitted') }}</h3>
                        <p>{{ t('appForm.trackStatusB') }}</p>
                        <router-link to="/app/my-applications">{{ t('appForm.myAppsLink') }}</router-link>
                    </div>
                </div>
            </template>
        </div>
    </div>
</template>

<script setup>
import { ref, reactive, computed, onMounted } from 'vue'
import { useI18n } from 'vue-i18n'
import { useRoute } from 'vue-router'

const { t } = useI18n()
import { programsApi } from '@/api/programs'
import { applicationsApi } from '@/api/applications'
import { getCallApplicationEligibility } from '@/api/profileApi'
import { useAuthStore } from '@/stores/auth'
import { apiErrorMessage } from '@/utils/apiError'
import DocumentUpload from '@/components/DocumentUpload.vue'

const route = useRoute()
const auth = useAuthStore()
const callId = Number(route.params.callId)

const callInfo = ref(null)
const application = ref(null)
const initialLoading = ref(true)
const loading = ref(false)
const submitting = ref(false)
const error = ref('')
const submitError = ref('')
const submitted = ref(false)
const docsStatus = ref([])

const form = reactive({
    teamName: '',
    teamDescription: '',
    skills: '',
    solution: '',
    expectedResults: '',
    motivation: '',
})

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
                error.value = t('appForm.notTeamLeader')
                return
            }
            if (!eligibility?.teamFull) {
                error.value = t('appForm.teamNotComplete')
                return
            }
        }

        const [callRes, existingRes] = await Promise.allSettled([
            programsApi.getCall(callId),
            applicationsApi.getMyByCall(callId),
        ])

        if (callRes.status === 'fulfilled') {
            callInfo.value = callRes.value.data
        }

        if (existingRes.status === 'fulfilled') {
            application.value = existingRes.value.data

            const saved = savedFormData.value
            if (saved) {
                form.teamName = saved.teamName || ''
                form.teamDescription = saved.teamDescription || ''
                form.skills = saved.skills || ''
                form.solution = saved.solution || ''
                form.expectedResults = saved.expectedResults || ''
                form.motivation = saved.motivation || ''
            }

            await checkReadyToSubmit()
        }
    } catch (e) {
        console.error(e)
    } finally {
        initialLoading.value = false
    }
})

async function saveForm() {
    error.value = ''
    loading.value = true
    try {
        const formData = JSON.stringify({
            teamName: form.teamName,
            teamDescription: form.teamDescription,
            skills: form.skills,
            solution: form.solution,
            expectedResults: form.expectedResults,
            motivation: form.motivation,
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
    return new Date(date).toLocaleDateString('en-GB', {
        day: '2-digit', month: 'long', year: 'numeric',
    })
}
</script>

<style scoped>
.page {
    max-width: 700px;
    margin: 0 auto;
    padding: 2rem;
}

.back {
    margin-bottom: 1.5rem;
}

.back a {
    color: #059669;
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
    border-radius: 8px;
    padding: 10px 14px;
    margin-bottom: 1.5rem;
    display: flex;
    align-items: center;
    gap: 8px;
    flex-wrap: wrap;
}

.call-info.green {
    background: #f0fdf4;
    border: 1px solid #86efac;
}

.call-label {
    font-size: 0.875rem;
    color: #166534;
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

.section-title {
    font-weight: 600;
    font-size: 0.875rem;
    color: #374151;
    margin-bottom: 0.75rem;
    padding-bottom: 0.5rem;
    border-bottom: 1px solid #f3f4f6;
}

.field {
    margin-bottom: 1rem;
}

label {
    display: block;
    font-size: 0.875rem;
    margin-bottom: 4px;
    color: #374151;
}

input,
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
textarea:focus {
    outline: none;
    border-color: #059669;
}

textarea {
    resize: vertical;
}

.btn-primary {
    width: 100%;
    padding: 10px;
    border: none;
    border-radius: 8px;
    font-size: 1rem;
    cursor: pointer;
    margin-top: 0.5rem;
    color: white;
}

.btn-primary.green {
    background: #059669;
}

.btn-primary:disabled {
    opacity: 0.6;
    cursor: not-allowed;
}

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
    color: #059669;
    cursor: pointer;
}

.btn-back-form:hover {
    background: #f0fdf4;
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
    background: #059669;
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
    color: #059669;
}
</style>