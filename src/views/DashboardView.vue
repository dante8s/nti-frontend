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
      <p v-if="leaderWelcomeLine" class="welcome__pill-line">
        <span class="welcome__pill">Лідер команди</span>
        {{ leaderWelcomeLine }}
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

    <section v-if="isFirm && firmChecked && !firmHasOrg" class="firm">
      <p class="firm__hint">
        You haven’t registered an organization yet.
      </p>
      <router-link
        to="/app/org/register"
        class="firm__btn"
      >
        Register Organization
      </router-link>
    </section>

    <section v-if="rolesLine" class="meta">
      <span class="meta__label">Ваші ролі:</span>
      {{ rolesLine }}
    </section>
  </div>
</template>

<script setup>
import { computed, onMounted, ref } from 'vue'
import { useAuthStore } from '@/stores/auth'
import { useOrganizationStore } from '@/stores/organization'
import { hasStudentPortalAccess, hasTeamLeaderRole } from '@/utils/roles'

const auth = useAuthStore()
const orgStore = useOrganizationStore()

const isSuperAdmin = computed(() => auth.roles?.includes('SUPER_ADMIN'))
const isAdmin = computed(() =>
  auth.roles?.some((r) => r === 'ADMIN' || r === 'SUPER_ADMIN'),
)
const canStudentPortal = computed(() => hasStudentPortalAccess(auth.roles))
const isCommissionMember = computed(() =>
  auth.roles?.some((r) => r === 'EVALUATOR' || r === 'SUPER_EVALUATOR'),
)
const isFirm = computed(() => auth.roles?.includes('FIRM'))
const isOrgUser = computed(() => auth.roles?.some((r) => r === 'FIRM' || r === 'FIRM_USER'))
const isMentor = computed(() => auth.roles?.includes('MENTOR'))

const firmChecked = ref(false)
const firmHasOrg = ref(false)

const roleLabels = {
  STUDENT: 'Студент',
  TEAM_LEADER: 'Лідер команди',
  FIRM: 'Компанія',
  FIRM_USER: 'Представник фірми',
  MENTOR: 'Ментор',
  EVALUATOR: 'Комісія (перегляд)',
  SUPER_EVALUATOR: 'Комісія — рішення',
  ADMIN: 'Адмін',
  SUPER_ADMIN: 'Супер-адмін',
}

const rolesLine = computed(() =>
  (auth.user?.roles || [])
    .map((r) => roleLabels[r] || r)
    .join(', '),
)

const leaderWelcomeLine = computed(() => {
  if (!hasTeamLeaderRole(auth.user?.roles)) return ''
  return 'У вашому профілі активна роль лідера: запросіть учасників у «Моїй команді» та подайте заявку на програму від команди.'
})

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

  if (isSuperAdmin.value || isAdmin.value) {
    out.push({
      to: '/app/admin/mentorships',
      title: 'Mentorships',
      desc: 'Managing mentorships',
      icon: '✦',
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
        to: '/app/admin/milestone-approvals',
        title: 'Milestone approvals',
        desc: 'Review and approve pending milestones',
        icon: '✓',
      },
      {
        to: '/app/admin/programs',
        title: 'Програми та виклики',
        desc: 'Редагування програм і дедлайнів',
        icon: '◇',
      },
      {
        to: '/app/admin/program-review-queue',
        title: 'Черга Program B',
        desc: 'Перегляд нових пропозицій програми B',
        icon: '◬',
      },
      {
        to: '/app/admin/organizations',
        title: 'Організації',
        desc: 'Каталог організацій-партнерів',
        icon: '◈',
      },
      {
        to: '/app/reporting',
        title: 'Звітність',
        desc: 'Панель статистики та експорти CSV/XLSX/PDF/DOCX',
        icon: '⬒',
      },
    )
  }

  if (canStudentPortal.value || isSuperAdmin.value) {
    out.push(
      {
        to: '/app/my-applications',
        title: 'Мої заявки',
        desc: 'Статуси подань та коментарі комісії',
        icon: '▸',
      },
      {
        to: '/app/my-profile',
        title: 'Мій профіль',
        desc: 'Редагування даних профілю та CV',
        icon: '◉',
      },
      {
        to: '/app/teams',
        title: 'Моя команда',
        desc: 'Створення команди та керування інвайтами',
        icon: '◍',
      },
    )
  }

  if (isCommissionMember.value || isSuperAdmin.value) {
    out.push(
      {
        to: '/app/commission',
        title: 'Комісія',
        desc: 'Черга заявок і матеріали; скоринг і рішення — лише для SUPER_EVALUATOR / адмінів',
        icon: '◌',
      },
      {
        to: '/app/reporting',
        title: 'Звітність',
        desc: 'Перевірки готовності та експорт звітів',
        icon: '⬒',
      },
    )
  }

  if (isMentor.value) {
    out.push({
      to: '/app/mentor/my-mentorships',
      title: 'My Mentorships',
      desc: 'Track your active mentorships',
      icon: '◷',
    })
  }

  if (isOrgUser.value && firmChecked.value && firmHasOrg.value) {
    out.push({
      to: '/app/org/profile',
      title: 'My Organization',
      desc: 'Manage organization profile and members',
      icon: '◉',
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

onMounted(checkFirmOrg)

async function checkFirmOrg() {
  if (!isOrgUser.value) return
  try {
    const my = await orgStore.getMy()
    firmHasOrg.value = Array.isArray(my) ? my.length > 0 : (my?.length > 0)
  } catch {
    // If the endpoint fails, we simply keep the dashboard visible.
  } finally {
    firmChecked.value = true
  }
}
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

.welcome__pill-line {
  margin: 0.85rem 0 0;
  max-width: 40rem;
  display: flex;
  flex-wrap: wrap;
  align-items: flex-start;
  gap: 0.5rem 0.65rem;
  font-size: 0.88rem;
  color: #0f766e;
  line-height: 1.5;
}

.welcome__pill {
  flex-shrink: 0;
  display: inline-block;
  padding: 0.2rem 0.55rem;
  border-radius: 999px;
  font-size: 0.68rem;
  font-weight: 800;
  letter-spacing: 0.04em;
  text-transform: uppercase;
  background: linear-gradient(135deg, #d1fae5, #a7f3d0);
  color: #065f46;
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

.firm {
  margin-top: 1.25rem;
  padding: 1rem 1.1rem;
  border-radius: 16px;
  background: rgba(255, 255, 255, 0.95);
  border: 1px solid rgba(79, 70, 229, 0.1);
  box-shadow: 0 12px 32px rgba(15, 23, 42, 0.06);
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 1rem;
  flex-wrap: wrap;
}

.firm__hint {
  margin: 0;
  color: #475569;
  line-height: 1.5;
}

.firm__btn {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  padding: 0.75rem 1.15rem;
  border-radius: 999px;
  background: #4f46e5;
  color: white;
  font-weight: 800;
  text-decoration: none;
  transition: transform 0.15s ease, box-shadow 0.15s ease, background 0.15s ease;
  box-shadow: 0 18px 40px rgba(79, 70, 229, 0.28);
}

.firm__btn:hover {
  transform: translateY(-2px);
  background: #4338ca;
  box-shadow: 0 20px 44px rgba(67, 56, 202, 0.24);
}
</style>
