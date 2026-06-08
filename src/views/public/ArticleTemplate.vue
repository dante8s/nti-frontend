<script setup>
import { ref, computed } from 'vue'
import { useRoute, useRouter } from 'vue-router'

const route = useRoute()
const router = useRouter()

const articles = ref([
  {
    id: 1,
    title: 'NTI otvára nový inkubačný program pre startupy',
    date: '15. mája 2024',
    category: 'Programy',
    image: 'https://images.unsplash.com/photo-1559136555-9303baea8ebd?w=1200&h=600&fit=crop',
    content: `
      <p>Nitra Technology Institute (NTI) s hrdosťou oznamuje spustenie nového inkubačného programu zameraného na podporu startupov a inovatívnych projektov v regióne. Program je navrhnutý tak, aby poskytol študentom a mladým podnikateľom komplexnú podporu od počiatočnej fázy až po komercializáciu ich nápadov.</p>

      <h2>Kľúčové prvky programu</h2>
      <p>Inkubačný program zahŕňa niekoľko kľúčových komponentov:</p>
      <ul>
        <li><strong>Mentoring:</strong> Každý tím priradíme skúseného mentora z praxe, ktorý mu pomôže navigovať výzvy podnikania.</li>
        <li><strong>Vzdelávanie:</strong> Pravidelné workshopy a školenia zamerané na podnikateľské zručnosti, marketing, financie a technológie.</li>
        <li><strong>Financovanie:</strong> Prístup k počiatočnému financovaniu a možnosť získať investície od našich partnerov.</li>
        <li><strong>Networking:</strong> Príležitosti na stretnutie s potenciálnymi investormi, partnermi a ostatnými zakladateľmi.</li>
      </ul>

      <h2>Kto sa môže zapojiť?</h2>
      <p>Program je otvorený pre študentov Univerzity Konštantína Filozofa v Nitre, absolventov do 3 rokov po ukončení štúdia, a mladých podnikateľov do 30 rokov z regiónu. Hľadáme tímy s inovatívnymi nápadmi v oblastiach ako sú technológie, zdravotníctvo, vzdelávanie a udržateľnosť.</p>

      <h2>Ako sa prihlásiť?</h2>
      <p>Prihlášky sú otvorené do 30. júna 2024. Zaujímaví uchádzači budú pozvaní na osobný pohovor, kde predstavia svoj projekt a víziu. Vybrané tímy začnú program v septembri 2024.</p>

      <p>Nezmeškajte túto jedinečnú príležitosť rozvíjať svoj nápad s podporou NTI. Viac informácií nájdete na našej webovej stránke alebo nás kontaktujte priamo.</p>
    `
  },
  {
    id: 2,
    title: 'Úspešný workshop o AI a strojovom učení',
    date: '10. mája 2024',
    category: 'Workshopy',
    image: 'https://images.unsplash.com/photo-1485827404703-89b55fcc595e?w=1200&h=600&fit=crop',
    content: `
      <p>Viac ako 50 študentov sa zúčastnilo nášho workshopu zameraného na praktické aplikácie umelej inteligencie a strojového učenia v podnikaní. Workshop, ktorý sa konal 8. mája 2024 v priestoroch Fakulty prírodných vied, priniesol účastníkom cenné poznatky a praktické skúsenosti.</p>

      <h2>Čo účastníci naučili</h2>
      <p>Workshop bol rozdelený na teoretickú a praktickú časť. Účastníci sa naučili:</p>
      <ul>
        <li>Základy umelej inteligencie a strojového učenia</li>
        <li>Aplikácie AI v rôznych odvetviach podnikania</li>
        <li>Prácu s populárnymi nástrojmi a frameworkmi</li>
        <li>Návrh a implementáciu jednoduchých ML modelov</li>
        <li>Ethické aspekty používania AI v praxi</li>
      </ul>

      <h2>Ohlas účastníkov</h2>
      <p>"Workshop mi otvoril oči v tom, ako môžu byť AI technológie použité v reálnom podnikaní. Veľmi oceňujem praktický prístup lektorov a možnosť vyskúšať si všetko naživo," povedal jeden z účastníkov, študent informatiky.</p>

      <p>Plánujeme pokračovať v sérii workshopov zameraných na moderné technológie. Sledujte naše novinky, aby ste nezmeškali nadchádzajúce udalosti.</p>
    `
  },
  {
    id: 3,
    title: 'Partnerstvá s lokálnymi technologickými firmami',
    date: '5. mája 2024',
    category: 'Partnerstvá',
    image: 'https://images.unsplash.com/photo-1552664730-d307ca884978?w=1200&h=600&fit=crop',
    content: `
      <p>NTI s hrdosťou oznamuje uzavretie strategických partnerstiev s piatimi vedúcimi technologickými spoločnosťami v regióne. Tieto partnerstvá sú kľúčovým krokom v našej misii vytvoriť silný technologický ekosystém v Nitre.</p>

      <h2>Noví partneri</h2>
      <p>Medzi našich nových partnerov patria:</p>
      <ul>
        <li><strong>TechSolutions s.r.o.</strong> - Softvérová spoločnosť zameraná na enterprise riešenia</li>
        <li><strong>DataFlow a.s.</strong> - Spoločnosť špecializujúca sa na dáta a analytiku</li>
        <li><strong>InnoLab s.r.o.</strong> - Inkubátor pre technologické startupy</li>
        <li><strong>CloudTech a.s.</strong> - Poskytovateľ cloudových služieb</li>
        <li><strong>SmartDev s.r.o.</strong> - Vývojová spoločnosť zameraná na IoT</li>
      </ul>

      <h2>Výhody pre študentov</h2>
      <p>Díky týmto partnerstvám budú študenti NTI mať prístup k:</p>
      <ul>
        <li>Praktickým stážam a pracovným príležitostiam</li>
        <li>Mentoringu od skúsených profesionálov z priemyslu</li>
        <li>Real-world projektom a case studies</li>
        <li>Networkingovým udalostiam s priemyselnými expertmi</li>
      </ul>

      <p>Tieto partnerstvá posilnia náš ekosystém a poskytnú študentom jedinečné príležitosti na profesionálny rast.</p>
    `
  },
  {
    id: 4,
    title: 'Študentský startup získal investíciu',
    date: '28. apríla 2024',
    category: 'Úspechy',
    image: 'https://images.unsplash.com/photo-1553729459-efe14ef6055d?w=1200&h=600&fit=crop',
    content: `
      <p>Tím študentov z programu NTI úspešne získal počiatočnú investíciu 50 000 eur na rozvoj svojho inovatívneho projektu. Projekt, zameraný na smart riešenia pre poľnohospodárstvo, zaujal investorov svojím potenciálom a realizovateľnosťou.</p>

      <h2>O projekte</h2>
      <p>Startup AgriTech Solutions vyvíja IoT senzory a softvérovú platformu pre optimalizáciu poľnohospodárskej výroby. Ich riešenie pomáha farmárom monitorovať pôdu, počasie a rastliny v reálnom čase, čo vedie k vyššej úrodnosti a nižším nákladom.</p>

      <h2>Cesta k úspechu</h2>
      <p>Tím začal svoju cestu v inkubačnom programe NTI, kde získal mentoring, vzdelávanie a prístup k sieťam kontaktov. Po šiestich mesiacoch intenzívneho vývoja a testovania predstavili svoj prototyp investorom, ktorý bol okamžite prijatý.</p>

      <h2>Budúcnosť projektu</h2>
      <p>S získanou investíciou plánuje tím rozšíriť svoj tím, spustiť pilotný projekt s 20 farmami a pripraviť sa na komerčný launch. Ich cieľom je stať sa vedúcim poskytovateľom smart poľnohospodárskych riešení na Slovensku.</p>

      <p>Tento úspech je dôkazom, že NTI program funguje a pomáha študentom realizovať ich sny. Gratulujeme tímu AgriTech Solutions!</p>
    `
  }
])

const article = computed(() => {
  const id = parseInt(route.params.id)
  return articles.value.find(a => a.id === id) || articles.value[0]
})

function goBack() {
  router.push({ name: 'news' })
}
</script>

<template>
  <div class="article-page">
    <section class="hero" :style="{ backgroundImage: `url(${article.image})` }">
      <div class="hero-overlay">
        <div class="container">
          <button class="back-button" @click="goBack">← Späť na novinky</button>
          <div class="article-meta">
            <span class="article-category">{{ article.category }}</span>
            <span class="article-date">{{ article.date }}</span>
          </div>
          <h1>{{ article.title }}</h1>
        </div>
      </div>
    </section>

    <section class="section content">
      <div class="container">
        <div class="article-body" v-html="article.content"></div>
      </div>
    </section>
  </div>
</template>

<style scoped>
/* Main wrapper matching the premium layout guidelines */
.article-page {
  min-height: 100vh;
  width: 100%;
  background: #f8fafc; /* Soft slate base to complement clean white content cards */
}

/* Hero layout managing image backdrop and rich text readability mask */
.hero {
  position: relative;
  min-height: 380px;
  background-size: cover;
  background-position: center;
  background-repeat: no-repeat;
  display: flex;
  align-items: flex-end;
}

/* Dark professional gradient overlay ensuring crisp white text contrast */
.hero-overlay {
  width: 100%;
  background: linear-gradient(to bottom, rgba(15, 23, 42, 0.85) 0%, rgba(30, 41, 59, 0.65) 100%);
  padding: 4rem 2rem 3rem;
  color: white;
}

.container {
  max-width: 900px;
  margin: 0 auto;
  width: 100%;
}

/* Back button matching application-details action mechanics with glassmorphism adjustments */
.back-button {
  background: rgba(255, 255, 255, 0.12);
  border: 1px solid rgba(255, 255, 255, 0.2);
  color: white;
  padding: 0.45rem 0.9rem;
  border-radius: 10px;
  font-size: 0.84rem;
  font-weight: 600;
  cursor: pointer;
  transition: background 0.15s ease, transform 0.15s ease;
  margin-bottom: 2rem;
  display: inline-flex;
  align-items: center;
}

.back-button:hover {
  background: rgba(255, 255, 255, 0.22);
  transform: translateX(-3px);
}

.article-meta {
  display: flex;
  align-items: center;
  gap: 0.85rem;
  margin-bottom: 1rem;
  flex-wrap: wrap;
}

/* Category Badge utilizing the specific pill token rules */
.article-category {
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

/* Date aligned with eyebrow text formatting variables */
.article-date {
  font-size: 0.75rem;
  font-weight: 700;
  letter-spacing: 0.12em;
  text-transform: uppercase;
  color: rgba(255, 255, 255, 0.75);
}

.hero h1 {
  font-size: clamp(1.75rem, 4vw, 2.5rem);
  font-weight: 800;
  margin: 0;
  line-height: 1.25;
  letter-spacing: -0.02em;
  color: white;
}

.section {
  padding: 2.5rem 2rem 4rem;
}

/* Content Container matching application-details__content tokens exactly */
.article-body {
  background: rgba(255, 255, 255, 0.95);
  padding: 3rem;
  border-radius: 16px;
  border: 1px solid rgba(79, 70, 229, 0.1);
  box-shadow: 0 14px 40px rgba(15, 23, 42, 0.06);
}

/* Structured typography styling guidelines for inner HTML render injections */
.article-body :deep(h2) {
  font-size: 1.5rem;
  font-weight: 700;
  color: #0f172a;
  margin: 2rem 0 1rem 0;
  letter-spacing: -0.01em;
}

.article-body :deep(p) {
  color: #475569;
  line-height: 1.75;
  margin: 0 0 1.25rem 0;
  font-size: 0.96rem;
}

.article-body :deep(ul) {
  color: #475569;
  line-height: 1.75;
  margin: 0 0 1.25rem 0;
  padding-left: 1.5rem;
}

.article-body :deep(li) {
  margin-bottom: 0.4rem;
}

.article-body :deep(strong) {
  color: #0f172a;
  font-weight: 700;
}

/* Adaptive mobile layout adjustments */
@media (max-width: 768px) {
  .hero {
    min-height: 300px;
  }

  .hero-overlay {
    padding: 2.5rem 1rem 2rem;
  }

  .section {
    padding: 1.5rem 1rem 3rem;
  }

  .article-body {
    padding: 2rem 1.25rem;
  }

  .article-body :deep(h2) {
    font-size: 1.35rem;
    margin: 1.5rem 0 0.85rem 0;
  }
}
</style>
