import { teamsApi } from '@/api/teams'

/**
 * Перевірка для сценарію «подати від імені команди»: GET /api/teams/user/:userId
 * (на бекенді дозволено лише для себе або адміна).
 *
 * @param {number|string|null|undefined} userId
 * @returns {Promise<{
 *   ok: boolean,
 *   reason: 'no_user'|'no_team'|'not_leader'|'error',
 *   team: object|null,
 *   message: string
 * }>}
 */
export async function resolveTeamLeaderApply(userId) {
  if (userId == null || !Number.isFinite(Number(userId))) {
    return {
      ok: false,
      reason: 'no_user',
      team: null,
      message: 'Не вдалося визначити користувача. Увійдіть знову.',
    }
  }
  const uid = Number(userId)
  try {
    const res = await teamsApi.getMyTeam(uid)
    const team = res.data
    if (!team || team.id == null) {
      return {
        ok: false,
        reason: 'no_team',
        team: null,
        message:
          'Команда не знайдена. Спочатку створіть команду — ви маєте бути її лідером.',
      }
    }
    const isLeader = Number(team.leaderId) === uid
    if (!isLeader) {
      return {
        ok: false,
        reason: 'not_leader',
        team,
        message:
          'Подати заявку від імені команди може лише лідер. Зверніться до лідера вашої команди.',
      }
    }
    return { ok: true, reason: null, team, message: '' }
  } catch (e) {
    if (e?.response?.status === 404) {
      return {
        ok: false,
        reason: 'no_team',
        team: null,
        message:
          'Команда не знайдена. Спочатку створіть команду на сторінці «Моя команда».',
      }
    }
    return {
      ok: false,
      reason: 'error',
      team: null,
      message:
        e?.response?.data?.message ||
        'Не вдалося перевірити команду. Спробуйте пізніше.',
    }
  }
}
