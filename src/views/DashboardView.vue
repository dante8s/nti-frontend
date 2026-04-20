<template>
  <div class="dash">
    <section class="welcome">
      <p class="welcome__eyebrow">
        Вітаємо
      </p>
      <h2 class="welcome__title">
        {{ auth.user?.name || 'Користувач' }}
      </h2>
      <p class="welcome__text">
        Це ваш кабінет NTI: швидкі дії та розділи залежно від ролі.
      </p>
    </section>

    <div class="grid">
      <router-link
        v-for="card in cards"
        :key="card.to"
        :to="card.to"
        class="card"
      >
        <span class="card__icon" aria-hidden="true">{{ card.icon }}</span>
        <div>
          <h3 class="card__title">
            {{ card.title }}
          </h3>
          <p class="card__desc">
            {{ card.desc }}
          </p>
        </div>
        <span class="card__arrow">→</span>
      </router-link>
    </div>

    <section v-if="rolesLine" class="meta">
      <span class="meta__label">Ваші ролі:</span>
      {{ rolesLine }}
    </section>
  </div>
</template>

<script setup>
import { computed } from 'vue'
import { useAuthStore } from '@/stores/auth'

const auth = useAuthStore()

const isSuperAdmin = computed(() => auth.roles?.includes('SUPER_ADMIN'))
const isAdmin = computed(() =>
  auth.roles?.some((r) => r === 'ADMIN' || r === 'SUPER_ADMIN'),
)
const isStudent = computed(() => auth.roles?.includes('STUDENT'))

const roleLabels = {
  STUDENT: 'Студент',
  FIRM: 'Компанія',
  FIRM_USER: 'Представник фірми',
  MENTOR: 'Ментор',
  EVALUATOR: 'Комісія',
  ADMIN: 'Адмін',
  SUPER_ADMIN: 'Супер-адмін',
}

const rolesLine = computed(() =>
  (auth.user?.roles || [])
    .map((r) => roleLabels[r] || r)
    .join(', '),
)

const cards = computed(() => {
  const out = []

  if (isSuperAdmin.value) {
    out.push({
      to: '/app/admin/users',
      title: 'Користувачі',
      desc: 'Схвалення акаунтів, ролі, блокування',
      icon: '◎',
    })
  }

  if (isAdmin.value) {
    out.push(
      {
        to: '/app/admin/applications',
        title: 'Заявки',
        desc: 'Усі подання та зміна статусів',
        icon: '◆',
      },
      {
        to: '/app/admin/programs',
        title: 'Програми та виклики',
        desc: 'Редагування програм і дедлайнів',
        icon: '◇',
      },
    )
  }

  if (isStudent.value) {
    out.push({
      to: '/app/my-applications',
      title: 'Мої заявки',
      desc: 'Статуси подань та коментарі комісії',
      icon: '▸',
    })
  }

  out.push(
    {
      to: '/programs/a',
      title: 'Каталог програми A',
      desc: 'Переглянути програми та виклики',
      icon: 'A',
    },
    {
      to: '/programs/b',
      title: 'Каталог програми B',
      desc: 'Переглянути програми та виклики',
      icon: 'B',
    },
  )

  return out
})
</script>

<style scoped>
.dash {
  width: 100%;
}

.welcome {
  margin-bottom: 1.75rem;
}

.welcome__eyebrow {
  margin: 0 0 0.35rem;
  font-size: 0.75rem;
  font-weight: 700;
  letter-spacing: 0.14em;
  text-transform: uppercase;
  color: #64748b;
}

.welcome__title {
  margin: 0 0 0.5rem;
  font-size: clamp(1.5rem, 3vw, 2rem);
  font-weight: 800;
  letter-spacing: -0.03em;
  color: #0f172a;
}

.welcome__text {
  margin: 0;
  max-width: 36rem;
  color: #475569;
  line-height: 1.6;
}

.grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(260px, 1fr));
  gap: 1rem;
}

.card {
  display: flex;
  align-items: flex-start;
  gap: 0.85rem;
  padding: 1.15rem 1.2rem;
  border-radius: 16px;
  text-decoration: none;
  color: inherit;
  background: rgba(255, 255, 255, 0.95);
  border: 1px solid rgba(79, 70, 229, 0.1);
  box-shadow: 0 12px 32px rgba(15, 23, 42, 0.06);
  transition: transform 0.15s ease, box-shadow 0.15s ease;
}

.card:hover {
  transform: translateY(-2px);
  box-shadow: 0 18px 44px rgba(79, 70, 229, 0.12);
}

.card__icon {
  width: 2.25rem;
  height: 2.25rem;
  display: flex;
  align-items: center;
  justify-content: center;
  border-radius: 12px;
  background: rgba(79, 70, 229, 0.12);
  color: #4338ca;
  font-weight: 800;
  font-size: 0.95rem;
  flex-shrink: 0;
}

.card__title {
  margin: 0 0 0.25rem;
  font-size: 1.02rem;
  font-weight: 700;
  color: #0f172a;
}

.card__desc {
  margin: 0;
  font-size: 0.86rem;
  color: #64748b;
  line-height: 1.45;
}

.card__arrow {
  margin-left: auto;
  color: #94a3b8;
  font-weight: 600;
}

.meta {
  margin-top: 2rem;
  padding: 0.85rem 1rem;
  border-radius: 12px;
  background: rgba(79, 70, 229, 0.06);
  font-size: 0.88rem;
  color: #475569;
}

.meta__label {
  font-weight: 700;
  color: #334155;
}
</style>
