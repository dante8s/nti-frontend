<script setup>
const pillars = [
  {
    title: 'Inkubácia',
    description: 'Podpora startupov a inovatívnych projektov od nápadu až po trh.',
    icon: '🚀'
  },
  {
    title: 'Partnerstvá',
    description: 'Spolupráca s priemyselnými partnermi a univerzitami.',
    icon: '🤝'
  },
  {
    title: 'Mentoring',
    description: 'Individuálny mentoring skúsenými expertmi z praxe.',
    icon: '🎯'
  },
  {
    title: 'Retencia',
    description: 'Zachovanie talentov v regióne a prevencia brain drain.',
    icon: '🎓'
  }
]

const team = [
  {
    name: 'Dr. Ján Novák',
    role: 'Program Director',
    image: 'https://api.dicebear.com/7.x/avataaars/svg?seed=Jan'
  },
  {
    name: 'Mária Kováčová',
    role: 'Head of Incubation',
    image: 'https://api.dicebear.com/7.x/avataaars/svg?seed=Maria'
  },
  {
    name: 'Peter Horváth',
    role: 'Partnership Manager',
    image: 'https://api.dicebear.com/7.x/avataaars/svg?seed=Peter'
  },
  {
    name: 'Anna Szabóová',
    role: 'Mentor Coordinator',
    image: 'https://api.dicebear.com/7.x/avataaars/svg?seed=Anna'
  }
]
</script>

<template>
  <div class="about-page">
    <!-- Hero Section -->
    <section class="hero">
      <div class="hero-content">
        <h1>O NTI</h1>
        <p class="hero-subtitle">Nitra Technology Institute</p>
      </div>
    </section>

    <!-- Mission & Vision -->
    <section class="section mission-vision">
      <div class="container">
        <div class="mission-vision-grid">
          <div class="mission-card">
            <div class="card-icon">🎯</div>
            <h2>Misia</h2>
            <p>
              NTI má za cieľ podporovať technologický talent v regióne Nitra,
              prevenciou brain drain a vytváraním ekosystému pre startupy.
              Poskytujeme študentom a mladým profesionálom príležitosti rozvíjať
              svoje nápady a realizovať ich v praxi.
            </p>
          </div>
          <div class="vision-card">
            <div class="card-icon">🌟</div>
            <h2>Vízia</h2>
            <p>
              Stať sa vedúcim technologickým inkubátorom na Slovensku, ktorý
              spája akademickú sféru s priemyslom. Chceme vytvoriť prosperujúcu
              komunitu inovátorov, ktorí budú formovať budúcnosť regiónu
              a prispievať k jeho ekonomickému rozvoju.
            </p>
          </div>
        </div>
      </div>
    </section>

    <!-- 4 Pillars -->
    <section class="section pillars">
      <div class="container">
        <h2 class="section-title">4 Piliere NTI</h2>
        <div class="pillars-grid">
          <div v-for="pillar in pillars" :key="pillar.title" class="pillar-card">
            <div class="pillar-icon">{{ pillar.icon }}</div>
            <h3>{{ pillar.title }}</h3>
            <p>{{ pillar.description }}</p>
          </div>
        </div>
      </div>
    </section>

    <!-- Ecosystem & Faculty -->
    <section class="section ecosystem">
      <div class="container">
        <div class="ecosystem-content">
          <div class="ecosystem-text">
            <h2 class="section-title">Ekosystém a Fakulta</h2>
            <p>
              NTI úzko spolupracuje s Fakultou prírodných vied Univerzity Konštantína
              Filozofa v Nitre. Toto partnerstvo nám umožňuje využívať akademické
              zdroje, výskumné kapacity a odborné know-how.
            </p>
            <p>
              Naším cieľom je vytvoriť most medzi univerzitou a priemyslom,
              kde študenti môžu aplikovať teoretické znalosti v reálnych projektoch
              a firmy môžu pristupovať k najnovším výskumným trendom a talentom.
            </p>
            <div class="ecosystem-stats">
              <div class="stat">
                <div class="stat-number">50+</div>
                <div class="stat-label">Partnerov</div>
              </div>
              <div class="stat">
                <div class="stat-number">200+</div>
                <div class="stat-label">Študentov</div>
              </div>
              <div class="stat">
                <div class="stat-number">30+</div>
                <div class="stat-label">Startupov</div>
              </div>
            </div>
          </div>
          <div class="ecosystem-visual">
            <div class="connection-diagram">
              <div class="node university">
                <div class="node-icon">🎓</div>
                <span>Univerzita</span>
              </div>
              <div class="connector"></div>
              <div class="node nti">
                <div class="node-icon">💡</div>
                <span>NTI</span>
              </div>
              <div class="connector"></div>
              <div class="node industry">
                <div class="node-icon">🏢</div>
                <span>Priemysel</span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>

    <!-- Team -->
    <section class="section team">
      <div class="container">
        <h2 class="section-title">Náš Tím</h2>
        <div class="team-grid">
          <div v-for="member in team" :key="member.name" class="team-card">
            <div class="team-image">
              <img :src="member.image" :alt="member.name" />
            </div>
            <h3>{{ member.name }}</h3>
            <p class="team-role">{{ member.role }}</p>
          </div>
        </div>
      </div>
    </section>
  </div>
</template>

<style scoped>
.about-page {
  min-height: 100vh;
  background: #f8fafc; /* Premium slate base background instead of heavy indigo tint */
}

/* Hero Section transformed to a clean typography header variant */
.hero {
  background: transparent;
  border-bottom: 1px solid rgba(15, 23, 42, 0.06);
  padding: 4rem 2rem;
  text-align: center;
  color: #0f172a;
}

.hero-content h1 {
  font-size: 3rem;
  font-weight: 800;
  margin: 0 0 0.5rem 0;
  color: #0f172a;
}

.hero-subtitle {
  font-size: 1.25rem;
  opacity: 1;
  margin: 0;
  color: #475569;
}

/* Section Styles */
.section {
  padding: 4rem 2rem;
}

.container {
  max-width: 1200px;
  margin: 0 auto;
}

.section-title {
  font-size: 2.25rem;
  font-weight: 700;
  color: #0f172a;
  text-align: center;
  margin-bottom: 3rem;
}

/* Mission & Vision cards styled using white/glass tokens */
.mission-vision {
  background: transparent;
}

.mission-vision-grid {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(300px, 1fr));
  gap: 2rem;
}

.mission-card,
.vision-card {
  background: rgba(255, 255, 255, 0.95);
  padding: 2.5rem;
  border-radius: 1rem;
  border: 1px solid rgba(79, 70, 229, 0.1);
  box-shadow: 0 12px 32px rgba(15, 23, 42, 0.06);
  transition: transform 0.2s ease, box-shadow 0.2s ease;
}

.mission-card:hover,
.vision-card:hover {
  transform: translateY(-4px);
  box-shadow: 0 18px 44px rgba(79, 70, 229, 0.12);
}

.card-icon {
  font-size: 3rem;
  margin-bottom: 1rem;
}

.mission-card h2,
.vision-card h2 {
  font-size: 1.75rem;
  font-weight: 700;
  color: #0f172a;
  margin: 0 0 1rem 0;
}

.mission-card p,
.vision-card p {
  color: #475569;
  line-height: 1.7;
  margin: 0;
}

/* Pillars grid items mapping identical card visual standards */
.pillars {
  background: transparent;
}

.pillars-grid {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(250px, 1fr));
  gap: 1.5rem;
}

.pillar-card {
  background: rgba(255, 255, 255, 0.95);
  padding: 2rem;
  border-radius: 1rem;
  text-align: center;
  border: 1px solid rgba(79, 70, 229, 0.1);
  box-shadow: 0 12px 32px rgba(15, 23, 42, 0.06);
  transition: transform 0.2s ease, box-shadow 0.2s ease;
}

.pillar-card:hover {
  transform: translateY(-4px);
  box-shadow: 0 18px 44px rgba(79, 70, 229, 0.12);
}

.pillar-icon {
  font-size: 2.5rem;
  margin-bottom: 1rem;
}

.pillar-card h3 {
  font-size: 1.5rem;
  font-weight: 700;
  color: #0f172a;
  margin: 0 0 0.75rem 0;
}

.pillar-card p {
  color: #64748b;
  line-height: 1.6;
  margin: 0;
}

/* Ecosystem and interactive map canvas */
.ecosystem {
  background: transparent;
}

.ecosystem-content {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 4rem;
  align-items: center;
}

.ecosystem-text h2 {
  margin-bottom: 1.5rem;
}

.ecosystem-text p {
  color: #475569;
  line-height: 1.8;
  margin-bottom: 1.5rem;
}

.ecosystem-stats {
  display: flex;
  gap: 2rem;
  margin-top: 2rem;
}

.stat {
  text-align: center;
}

.stat-number {
  font-size: 2.5rem;
  font-weight: 800;
  color: #4f46e5;
  margin-bottom: 0.25rem;
}

.stat-label {
  color: #64748b;
  font-size: 0.875rem;
}

.connection-diagram {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 1rem;
  padding: 2rem;
  background: rgba(99, 102, 241, 0.03);
  border: 1px solid rgba(79, 70, 229, 0.1);
  border-radius: 1rem;
}

.node {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 0.5rem;
  padding: 1.5rem;
  background: rgba(255, 255, 255, 0.95);
  border-radius: 0.75rem;
  border: 2px solid rgba(79, 70, 229, 0.1);
  min-width: 100px;
}

.node-icon {
  font-size: 2rem;
}

.node span {
  font-weight: 600;
  color: #475569;
  font-size: 0.875rem;
}

/* Central Node core token color system adjustments */
.node.nti {
  border-color: #4f46e5;
  background: rgba(99, 102, 241, 0.06);
}

.connector {
  width: 60px;
  height: 3px;
  background: rgba(79, 70, 229, 0.2);
  border-radius: 2px;
}

/* Team layout mapping clean cards variables */
.team {
  background: transparent;
}

.team-grid {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
  gap: 2rem;
}

.team-card {
  background: rgba(255, 255, 255, 0.95);
  padding: 2rem;
  border-radius: 1rem;
  text-align: center;
  border: 1px solid rgba(79, 70, 229, 0.1);
  box-shadow: 0 12px 32px rgba(15, 23, 42, 0.06);
  transition: transform 0.2s ease, box-shadow 0.2s ease;
}

.team-card:hover {
  transform: translateY(-4px);
  box-shadow: 0 18px 44px rgba(79, 70, 229, 0.12);
}

.team-image {
  width: 120px;
  height: 120px;
  margin: 0 auto 1.5rem;
  border-radius: 50%;
  overflow: hidden;
  border: 3px solid rgba(79, 70, 229, 0.15);
  background: rgba(255, 255, 255, 0.95);
}

.team-image img {
  width: 100%;
  height: 100%;
  object-fit: cover;
}

.team-card h3 {
  font-size: 1.125rem;
  font-weight: 700;
  color: #0f172a;
  margin: 0 0 0.5rem 0;
}

.team-role {
  color: #64748b;
  font-size: 0.875rem;
  margin: 0;
}

/* Responsive */
@media (max-width: 768px) {
  .hero-content h1 {
    font-size: 2rem;
  }

  .section-title {
    font-size: 1.75rem;
  }

  .ecosystem-content {
    grid-template-columns: 1fr;
    gap: 2rem;
  }

  .ecosystem-stats {
    flex-wrap: wrap;
    justify-content: center;
  }

  .connection-diagram {
    flex-direction: column;
  }

  .connector {
    width: 3px;
    height: 60px;
  }

  .pillars-grid,
  .team-grid {
    grid-template-columns: 1fr;
  }
}
</style>
