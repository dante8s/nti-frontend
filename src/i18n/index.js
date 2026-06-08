import { createI18n } from 'vue-i18n'
import sk from './locales/sk'
import en from './locales/en'
import uk from './locales/uk'

const savedLocale = localStorage.getItem('locale') || 'sk'

const i18n = createI18n({
  legacy: false,
  locale: savedLocale,
  fallbackLocale: 'sk',
  messages: { sk, en, uk },
})

export default i18n
