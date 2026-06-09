<script setup>
import { ref, computed, onMounted } from 'vue'

const props = defineProps({
  /** When provided, skips public API fetch (used by admin live preview). */
  items: {
    type: Array,
    default: null,
  },
  /** Show unpublished items — admin preview only. */
  preview: {
    type: Boolean,
    default: false,
  },
})

const fetchedSections = ref([])
const isLoading = ref(!props.items)
const error = ref('')
const openId = ref(null)

const faqItems = computed(() => {
  const source = props.items ?? fetchedSections.value
  if (!Array.isArray(source)) return []

  return source
    .filter((s) => s.sectionType === 'faq_item')
    .filter((s) => props.preview || s.published !== false)
    .sort((a, b) => (a.sortOrder ?? 0) - (b.sortOrder ?? 0))
})

function answerParagraphs(content) {
  if (!content) return []
  return content.split(/\n\n+/).filter((p) => p.trim())
}

function toggle(id) {
  openId.value = openId.value === id ? null : id
}

async function fetchFaq() {
  if (props.items) return

  isLoading.value = true
  error.value = ''

  try {
    const response = await fetch('/api/public/cms/pages/faq')
    if (!response.ok) throw new Error(`HTTP ${response.status}`)
    fetchedSections.value = await response.json()
  } catch (e) {
    console.error('Nepodarilo sa načítať FAQ', e)
    error.value = 'Nepodarilo sa načítať často kladené otázky. Skúste to prosím neskôr.'
    fetchedSections.value = []
  } finally {
    isLoading.value = false
  }
}

onMounted(fetchFaq)
</script>

<template>
  <div class="faq-page">
    <section class="hero">
      <div class="hero-content">
        <h1>Často kladené otázky</h1>
        <p class="hero-subtitle">Odpovede na najčastejšie otázky o NTI a našich programoch</p>
      </div>
    </section>

    <section class="section">
      <div class="container">
        <div v-if="isLoading && !items" class="faq-state faq-state--loading">
          Načítavam otázky...
        </div>

        <div v-else-if="error && !items" class="faq-state faq-state--error">
          {{ error }}
        </div>

        <div v-else-if="!faqItems.length" class="faq-state faq-state--empty">
          Zatiaľ nie sú k dispozícii žiadne otázky.
        </div>

        <div v-else class="faq-accordion" role="list">
          <article
            v-for="item in faqItems"
            :key="item.id"
            class="faq-item"
            :class="{ 'faq-item--open': openId === item.id }"
            role="listitem"
          >
            <button
              type="button"
              class="faq-question"
              :aria-expanded="openId === item.id"
              @click="toggle(item.id)"
            >
              <span class="faq-question__text">{{ item.title }}</span>
              <span class="faq-chevron" aria-hidden="true">{{ openId === item.id ? '−' : '+' }}</span>
            </button>

            <Transition name="faq-collapse">
              <div v-show="openId === item.id" class="faq-answer">
                <p
                  v-for="(paragraph, index) in answerParagraphs(item.content)"
                  :key="index"
                >
                  {{ paragraph }}
                </p>
              </div>
            </Transition>
          </article>
        </div>
      </div>
    </section>
  </div>
</template>

<style scoped>
.faq-page {
  min-height: 100vh;
  width: 100%;
  background: #f8fafc;
}

.hero {
  padding: 3.5rem 2rem 1.5rem;
  border-bottom: 1px solid rgba(15, 23, 42, 0.06);
  text-align: center;
}

.hero-content h1 {
  margin: 0 0 0.35rem;
  font-size: 3rem;
  font-weight: 800;
  letter-spacing: -0.03em;
  color: #0f172a;
}

.hero-subtitle {
  margin: 0 auto;
  max-width: 36rem;
  font-size: 1.25rem;
  color: #475569;
  line-height: 1.6;
}

.section {
  padding: 3rem 2rem 5rem;
}

.container {
  max-width: 800px;
  margin: 0 auto;
  width: 100%;
}

.faq-state {
  text-align: center;
  padding: 2rem 1rem;
  border-radius: 1rem;
  font-size: 0.95rem;
}

.faq-state--loading {
  color: #64748b;
  background: rgba(255, 255, 255, 0.95);
  border: 1px solid rgba(79, 70, 229, 0.1);
}

.faq-state--error {
  color: #b91c1c;
  background: #fef2f2;
  border: 1px solid #fecaca;
}

.faq-state--empty {
  color: #64748b;
  background: rgba(255, 255, 255, 0.95);
  border: 1px dashed rgba(79, 70, 229, 0.2);
}

.faq-accordion {
  display: flex;
  flex-direction: column;
  gap: 0.85rem;
}

.faq-item {
  background: rgba(255, 255, 255, 0.95);
  border-radius: 1rem;
  border: 1px solid rgba(79, 70, 229, 0.1);
  box-shadow: 0 12px 32px rgba(15, 23, 42, 0.06);
  overflow: hidden;
  transition: transform 0.2s ease, box-shadow 0.2s ease, border-color 0.2s ease;
}

.faq-item:hover {
  transform: translateY(-2px);
  box-shadow: 0 16px 40px rgba(79, 70, 229, 0.1);
}

.faq-item--open {
  border-color: rgba(79, 70, 229, 0.25);
  box-shadow: 0 18px 44px rgba(79, 70, 229, 0.12);
}

.faq-question {
  width: 100%;
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 1rem;
  padding: 1.25rem 1.5rem;
  background: transparent;
  border: none;
  cursor: pointer;
  text-align: left;
  font: inherit;
}

.faq-question__text {
  font-size: 1.05rem;
  font-weight: 700;
  color: #0f172a;
  line-height: 1.45;
}

.faq-chevron {
  flex-shrink: 0;
  width: 1.75rem;
  height: 1.75rem;
  display: flex;
  align-items: center;
  justify-content: center;
  border-radius: 999px;
  background: rgba(79, 70, 229, 0.08);
  color: #4f46e5;
  font-size: 1.1rem;
  font-weight: 700;
  transition: background 0.2s ease, color 0.2s ease, transform 0.2s ease;
}

.faq-item--open .faq-chevron {
  background: #4f46e5;
  color: #fff;
  transform: rotate(180deg);
}

.faq-answer {
  padding: 0 1.5rem 1.35rem;
  border-top: 1px solid rgba(79, 70, 229, 0.08);
}

.faq-answer p {
  margin: 0 0 0.85rem;
  color: #475569;
  line-height: 1.75;
  font-size: 0.95rem;
}

.faq-answer p:last-child {
  margin-bottom: 0;
}

.faq-collapse-enter-active,
.faq-collapse-leave-active {
  transition: opacity 0.2s ease, transform 0.2s ease;
  overflow: hidden;
}

.faq-collapse-enter-from,
.faq-collapse-leave-to {
  opacity: 0;
  transform: translateY(-6px);
}

@media (max-width: 768px) {
  .hero {
    padding: 2.5rem 1rem 1rem;
  }

  .hero-content h1 {
    font-size: 2rem;
  }

  .hero-subtitle {
    font-size: 1.05rem;
  }

  .section {
    padding: 2rem 1rem 4rem;
  }

  .faq-question {
    padding: 1rem 1.1rem;
  }

  .faq-question__text {
    font-size: 0.98rem;
  }

  .faq-answer {
    padding: 0 1.1rem 1.1rem;
  }
}
</style>
