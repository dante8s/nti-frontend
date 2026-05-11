<template>
  <div class="milestone-details">
    <div class="milestone-details__head">
      <button type="button" class="milestone-details__toggle" @click="toggleOpen">
        {{ isOpen ? 'Hide Details' : 'Show Details' }}
      </button>
    </div>

    <div v-if="isOpen" class="milestone-details__body">
      <div class="milestone-details__tabs">
        <button
          type="button"
          class="milestone-details__tab"
          :class="{ 'milestone-details__tab--active': activeTab === 'comments' }"
          @click="activeTab = 'comments'"
        >
          Comments
        </button>
        <button
          type="button"
          class="milestone-details__tab"
          :class="{ 'milestone-details__tab--active': activeTab === 'attachments' }"
          @click="activeTab = 'attachments'"
        >
          Attachments
        </button>
      </div>

      <div v-if="activeTab === 'comments'" class="milestone-details__panel">
        <p v-if="commentsError" class="milestone-details__error">
          {{ commentsError.response?.data?.message || 'Failed to load comments.' }}
        </p>
        <div v-if="commentsLoading" class="milestone-details__empty">Loading comments...</div>
        <div v-else-if="comments.length === 0" class="milestone-details__empty">No comments yet.</div>
        <div v-else class="milestone-details__list">
          <article v-for="comment in comments" :key="comment.id" class="milestone-details__item">
            <div class="milestone-details__item-head">
              <span class="milestone-details__meta">
                {{ comment.createdByName || 'User' }} • {{ formatDateTime(comment.createdAt) }}
              </span>
              <button
                type="button"
                class="milestone-details__danger-text"
                title="Delete comment"
                @click="removeComment(comment.id)"
              >
                Delete
              </button>
            </div>
            <p class="milestone-details__text">{{ comment.content || '—' }}</p>
          </article>
        </div>

        <div v-if="authStore.isLoggedIn" class="milestone-details__composer">
          <textarea
            v-model.trim="commentDraft"
            rows="3"
            class="milestone-details__textarea"
            placeholder="Write a comment..."
          />
          <button
            type="button"
            class="milestone-details__primary"
            :disabled="!commentDraft || commentSaving"
            @click="submitComment"
          >
            {{ commentSaving ? 'Sending...' : 'Send' }}
          </button>
        </div>
      </div>

      <div v-else class="milestone-details__panel">
        <p v-if="attachmentsError" class="milestone-details__error">
          {{ attachmentsError.response?.data?.message || 'Failed to load attachments.' }}
        </p>
        <div v-if="attachmentsLoading" class="milestone-details__empty">Loading attachments...</div>
        <div v-else-if="attachments.length === 0" class="milestone-details__empty">No attachments yet.</div>
        <div v-else class="milestone-details__list">
          <article v-for="attachment in attachments" :key="attachment.id" class="milestone-details__item">
            <div class="milestone-details__item-head">
              <span class="milestone-details__link">
                {{ attachment.fileName || attachment.originalFileName || 'Attachment' }}
              </span>
              <div class="milestone-details__item-actions">
                <button
                  type="button"
                  class="milestone-details__secondary"
                  @click="viewAttachment(attachment)"
                >
                  View
                </button>
                <button
                  type="button"
                  class="milestone-details__secondary"
                  @click="downloadAttachment(attachment)"
                >
                  Download
                </button>
                <button
                  v-if="canDeleteAttachment(attachment)"
                  type="button"
                  class="milestone-details__danger-text"
                  @click="removeAttachment(attachment.id)"
                >
                  Delete
                </button>
              </div>
            </div>
            <p class="milestone-details__meta">
              Uploaded by {{ attachment.uploadedByName || 'User' }} •
              {{ formatDateTime(attachment.createdAt || attachment.uploadedAt) }}
            </p>
          </article>
        </div>

        <div v-if="canUploadAttachments" class="milestone-details__upload">
          <p class="milestone-details__meta">{{ attachments.length }}/10 attachments used.</p>
          <div class="milestone-details__file-row">
            <label class="milestone-details__file-btn">
              Choose file
              <input type="file" class="milestone-details__file-input" @change="onFilePicked">
            </label>
            <span class="milestone-details__file-name">{{ selectedFile?.name || 'No file selected' }}</span>
            <button
              type="button"
              class="milestone-details__primary"
              :disabled="!selectedFile || isAttachmentLimitReached || attachmentSaving"
              @click="uploadSelectedFile"
            >
              {{ attachmentSaving ? 'Uploading...' : 'Upload' }}
            </button>
          </div>
          <p v-if="isAttachmentLimitReached" class="milestone-details__error">
            Attachment limit reached (max 10).
          </p>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup>
import { computed, ref } from 'vue'
import { storeToRefs } from 'pinia'
import { useMilestoneStore } from '@/stores/milestone'
import { useAuthStore } from '@/stores/auth'

const props = defineProps({
  milestoneId: {
    type: [Number, String],
    required: true,
  },
})

const milestoneStore = useMilestoneStore()
const authStore = useAuthStore()
const {
  commentsByMilestone,
  attachmentsByMilestone,
  commentsLoading,
  commentsError,
  attachmentsLoading,
  attachmentsError,
} = storeToRefs(milestoneStore)

const isOpen = ref(false)
const activeTab = ref('comments')
const commentDraft = ref('')
const commentSaving = ref(false)
const attachmentSaving = ref(false)
const selectedFile = ref(null)

const roles = computed(() => authStore.roles || [])
const isAdmin = computed(() => roles.value.some((r) => r === 'ADMIN' || r === 'SUPER_ADMIN'))
const canUploadAttachments = computed(
  () => isAdmin.value || roles.value.includes('STUDENT') || roles.value.includes('MENTOR'),
)

const key = computed(() => String(props.milestoneId))
const comments = computed(() => {
  const raw = commentsByMilestone.value?.[key.value] || []
  return [...raw].sort((a, b) => new Date(b?.createdAt || 0) - new Date(a?.createdAt || 0))
})
const attachments = computed(() => {
  const raw = attachmentsByMilestone.value?.[key.value] || []
  return [...raw].sort(
    (a, b) => new Date(b?.createdAt || b?.uploadedAt || 0) - new Date(a?.createdAt || a?.uploadedAt || 0),
  )
})
const isAttachmentLimitReached = computed(() => attachments.value.length >= 10)

async function toggleOpen() {
  isOpen.value = !isOpen.value
  if (!isOpen.value) return
  await ensureLoaded()
}

async function ensureLoaded() {
  if (!commentsByMilestone.value?.[key.value]) await milestoneStore.getComments(props.milestoneId)
  if (!attachmentsByMilestone.value?.[key.value]) await milestoneStore.getAttachments(props.milestoneId)
}

async function submitComment() {
  if (!commentDraft.value) return
  commentSaving.value = true
  try {
    await milestoneStore.addComment(props.milestoneId, commentDraft.value)
    commentDraft.value = ''
  } finally {
    commentSaving.value = false
  }
}

async function removeComment(commentId) {
  await milestoneStore.deleteComment(props.milestoneId, commentId)
}

function canDeleteAttachment(attachment) {
  const userId = authStore.user?.id
  if (isAdmin.value) return true
  return Boolean(userId && userId === attachment?.uploadedById)
}

function onFilePicked(event) {
  selectedFile.value = event.target?.files?.[0] || null
}

async function uploadSelectedFile() {
  if (!selectedFile.value || isAttachmentLimitReached.value) return
  attachmentSaving.value = true
  try {
    await milestoneStore.addAttachment(props.milestoneId, selectedFile.value)
    selectedFile.value = null
  } finally {
    attachmentSaving.value = false
  }
}

async function removeAttachment(attachmentId) {
  await milestoneStore.deleteAttachment(props.milestoneId, attachmentId)
}

async function viewAttachment(attachment) {
  if (!attachment?.id) return
  const fallbackName = attachment.fileName || attachment.originalFileName || 'attachment'
  await milestoneStore.openAttachmentFile(props.milestoneId, attachment.id, true, fallbackName)
}

async function downloadAttachment(attachment) {
  if (!attachment?.id) return
  const fallbackName = attachment.fileName || attachment.originalFileName || 'attachment'
  await milestoneStore.openAttachmentFile(props.milestoneId, attachment.id, false, fallbackName)
}

function formatDateTime(value) {
  if (!value) return '—'
  return new Date(value).toLocaleString('uk-UA', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  })
}
</script>

<style scoped>
.milestone-details { margin-top: 0.75rem; border: 1px solid rgba(79,70,229,.12); border-radius: 12px; padding: .7rem; background: rgba(99,102,241,.03); }
.milestone-details__head { display:flex; justify-content:flex-end; }
.milestone-details__toggle { border:1px solid rgba(79,70,229,.25); background:#fff; color:#4338ca; border-radius:10px; padding:.35rem .7rem; font-weight:600; cursor:pointer; }
.milestone-details__tabs { display:flex; gap:.45rem; margin:.6rem 0; }
.milestone-details__tab { border:1px solid rgba(79,70,229,.2); border-radius:999px; background:#fff; color:#4338ca; padding:.25rem .6rem; font-size:.76rem; font-weight:600; cursor:pointer; }
.milestone-details__tab--active { background:#4f46e5; border-color:#4f46e5; color:#fff; }
.milestone-details__list { display:flex; flex-direction:column; gap:.55rem; }
.milestone-details__item { border:1px solid rgba(79,70,229,.12); border-radius:10px; background:#fff; padding:.55rem .65rem; }
.milestone-details__item-head { display:flex; justify-content:space-between; gap:.6rem; }
.milestone-details__item-actions { display:flex; gap:.4rem; align-items:center; flex-wrap:wrap; }
.milestone-details__meta { color:#64748b; font-size:.8rem; margin:0; }
.milestone-details__text { margin:.4rem 0 0; white-space:pre-wrap; color:#334155; }
.milestone-details__composer { margin-top:.55rem; display:flex; flex-direction:column; gap:.5rem; }
.milestone-details__textarea { border:1px solid #cbd5e1; border-radius:10px; padding:.5rem .62rem; font:inherit; }
.milestone-details__primary { border:none; border-radius:10px; background:#4f46e5; color:#fff; padding:.43rem .8rem; font-weight:600; cursor:pointer; }
.milestone-details__secondary { border:1px solid rgba(79,70,229,.25); border-radius:8px; background:#fff; color:#4338ca; padding:.2rem .45rem; cursor:pointer; font-size:.75rem; }
.milestone-details__danger-text { border:1px solid rgba(220,38,38,.25); border-radius:8px; background:#fff; color:#b91c1c; padding:.2rem .45rem; cursor:pointer; font-size:.75rem; }
.milestone-details__empty { color:#64748b; font-size:.86rem; }
.milestone-details__error { color:#b91c1c; margin:0 0 .45rem; font-size:.84rem; }
.milestone-details__link { color:#4338ca; text-decoration:none; font-weight:600; }
.milestone-details__file-row { display:flex; align-items:center; gap:.5rem; flex-wrap:wrap; }
.milestone-details__file-btn { border:1px solid rgba(79,70,229,.25); background:#fff; color:#4338ca; border-radius:10px; padding:.4rem .75rem; font-weight:600; cursor:pointer; }
.milestone-details__file-input { display:none; }
.milestone-details__file-name { color:#64748b; font-size:.82rem; }
</style>
