<script setup>
const successProjects = [
  {
    title: 'AgriTech Solutions',
    description: 'Smart IoT senzory pre optimalizáciu poľnohospodárstva',
    image: 'https://images.unsplash.com/photo-1574943320219-553eb213f72d?w=600&h=400&fit=crop',
    investment: '50 000 €',
    status: 'Aktívny'
  },
  {
    title: 'EduLearn Platform',
    description: 'Online platforma pre interaktívne vzdelávanie',
    image: 'https://images.unsplash.com/photo-1501504905252-473c47e087f8?w=600&h=400&fit=crop',
    investment: '35 000 €',
    status: 'Rozvoj'
  },
  {
    title: 'HealthTrack App',
    description: 'Mobilná aplikácia pre monitorovanie zdravia',
    image: 'https://images.unsplash.com/photo-1576091160399-112ba8d25d1d?w=600&h=400&fit=crop',
    investment: '40 000 €',
    status: 'Pilot'
  }
]

const testimonials = [
  {
    name: 'Martin Kováč',
    role: 'Zakladateľ, AgriTech Solutions',
    quote: 'NTI mi dal nielen mentoring a financie, ale hlavne sebauveru a sieť kontaktov, ktorá je kľúčová v podnikaní. Bez ich podpory by sme nikdy nedostali takúto investíciu.',
    image: 'https://api.dicebear.com/7.x/avataaars/svg?seed=Martin'
  },
  {
    name: 'Zuzana Horváthová',
    role: 'Študentka, Program A',
    quote: 'Program NTI mi otvoril oči v tom, čo všetko je možné. Mentori mi pomohli premeniť môj nápad na reálny projekt, ktorý teraz má potenciál zmeniť vzdelávanie.',
    image: 'https://api.dicebear.com/7.x/avataaars/svg?seed=Zuzana'
  },
  {
    name: 'Peter Szabó',
    role: 'CEO, TechSolutions s.r.o.',
    quote: 'Spolupráca s NTI nám umožnila prístup k talentovaným študentom a inovatívnym projektom. Je to win-win situácia pre obe strany.',
    image: 'https://api.dicebear.com/7.x/avataaars/svg?seed=Peter2'
  },
  {
    name: 'Anna Nováková',
    role: 'Mentorka, NTI',
    quote: 'Vidieť, ako študenti rastú a rozvíjajú svoje nápady, je neuveriteľne motivujúce. NTI vytvára prostredie, kde inovácia môže rozkvitnúť.',
    image: 'https://api.dicebear.com/7.x/avataaars/svg?seed=Anna2'
  }
]
</script>

<template>
  <div class="success-stories-page">
    <section class="hero">
      <div class="hero-content">
        <h1>Úspešné projekty</h1>
        <p class="hero-subtitle">Inšpirácie a príbehy z nášho ekosystému</p>
      </div>
    </section>

    <!-- Success Projects Section -->
    <section class="section projects">
      <div class="container">
        <h2 class="section-title">Naše úspešné projekty</h2>
        <div class="projects-grid">
          <div v-for="project in successProjects" :key="project.title" class="project-card">
            <div class="project-image">
              <img :src="project.image" :alt="project.title" />
            </div>
            <div class="project-content">
              <div class="project-meta">
                <span class="project-investment">{{ project.investment }}</span>
                <span class="project-status" :class="project.status.toLowerCase()">{{ project.status }}</span>
              </div>
              <h3>{{ project.title }}</h3>
              <p>{{ project.description }}</p>
            </div>
          </div>
        </div>
      </div>
    </section>

    <!-- Testimonials Section -->
    <section class="section testimonials">
      <div class="container">
        <h2 class="section-title">Čo hovoria o nás</h2>
        <div class="testimonials-grid">
          <div v-for="testimonial in testimonials" :key="testimonial.name" class="testimonial-card">
            <div class="quote-icon">"</div>
            <p class="quote">{{ testimonial.quote }}</p>
            <div class="author">
              <div class="author-image">
                <img :src="testimonial.image" :alt="testimonial.name" />
              </div>
              <div class="author-info">
                <h4>{{ testimonial.name }}</h4>
                <span>{{ testimonial.role }}</span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>

    <!-- Stats Section -->
    <section class="section stats">
      <div class="container">
        <div class="stats-grid">
          <div class="stat-item">
            <div class="stat-number">30+</div>
            <div class="stat-label">Úspešných projektov</div>
          </div>
          <div class="stat-item">
            <div class="stat-number">500K €</div>
            <div class="stat-label">Získané investície</div>
          </div>
          <div class="stat-item">
            <div class="stat-number">150+</div>
            <div class="stat-label">Absolventov programov</div>
          </div>
          <div class="stat-item">
            <div class="stat-number">95%</div>
            <div class="stat-label">Spokojnosť účastníkov</div>
          </div>
        </div>
      </div>
    </section>
  </div>
</template>

<style scoped>
/* Main canvas alignment using the premium slate dashboard background */
.success-stories-page {
  min-height: 100vh;
  width: 100%;
  background: #f8fafc;
}

/* Typography-driven header replacing saturated gradients for a clean look */
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

/* Layout structural rules and container scaling */
.section {
  padding: 3rem 2rem;
}

.container {
  max-width: 1200px;
  margin: 0 auto;
  width: 100%;
}

.section-title {
  font-size: 1.75rem;
  font-weight: 800;
  letter-spacing: -0.02em;
  color: #0f172a;
  text-align: center;
  margin-bottom: 2.5rem;
}

/* Grid configurations maintaining original sizing bounds */
.projects-grid,
.testimonials-grid {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(320px, 1fr));
  gap: 2rem;
}

/* Base Card architecture matching premium shadow tokens precisely */
.project-card,
.testimonial-card,
.stat-item {
  background: rgba(255, 255, 255, 0.95);
  border-radius: 16px;
  border: 1px solid rgba(79, 70, 229, 0.1);
  box-shadow: 0 12px 32px rgba(15, 23, 42, 0.06);
  overflow: hidden;
  /* Keeping original hover transition duration properties */
  transition: transform 0.2s ease, box-shadow 0.2s ease;
}

.project-card:hover,
.testimonial-card:hover {
  transform: translateY(-4px);
  box-shadow: 0 18px 44px rgba(79, 70, 229, 0.15);
}

/* Project section UI elements */
.project-image {
  height: 200px;
  overflow: hidden;
  border-bottom: 1px solid rgba(79, 70, 229, 0.06);
}

.project-image img {
  width: 100%;
  height: 100%;
  object-fit: cover;
}

.project-content {
  padding: 1.5rem;
}

.project-meta {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 1rem;
  gap: 0.5rem;
}

/* Specific Pill-token transformations matching custom pill layout designs */
.project-investment {
  display: inline-block;
  padding: 0.2rem 0.65rem;
  border-radius: 999px;
  font-size: 0.72rem;
  font-weight: 800;
  letter-spacing: 0.04em;
  text-transform: uppercase;
  background: rgba(79, 70, 229, 0.08);
  color: #4338ca;
  border: 1px solid rgba(79, 70, 229, 0.12);
}

.project-status {
  padding: 0.2rem 0.65rem;
  border-radius: 999px;
  font-size: 0.68rem;
  font-weight: 800;
  letter-spacing: 0.04em;
  text-transform: uppercase;
}

.project-status.aktívny {
  background: linear-gradient(135deg, #d1fae5, #a7f3d0);
  color: #065f46;
}

.project-status.rozvoj {
  background: linear-gradient(135deg, #dbeafe, #bfdbfe);
  color: #1e40af;
}

.project-status.pilot {
  background: linear-gradient(135deg, #fef3c7, #fde68a);
  color: #92400e;
}

.project-card h3 {
  font-size: 1.2rem;
  font-weight: 700;
  color: #0f172a;
  margin: 0 0 0.65rem 0;
}

.project-card p {
  color: #475569;
  font-size: 0.92rem;
  line-height: 1.6;
  margin: 0;
}

/* Testimonial card internal structural overrides */
.testimonial-card {
  padding: 2rem;
  display: flex;
  flex-direction: column;
}

.quote-icon {
  font-size: 3.5rem;
  color: #4338ca;
  opacity: 0.15;
  line-height: 1;
  margin-bottom: -0.5rem;
  font-family: serif;
}

.quote {
  color: #475569;
  line-height: 1.65;
  font-style: italic;
  font-size: 0.95rem;
  margin: 0 0 1.5rem 0;
  flex-grow: 1;
}

.author {
  display: flex;
  align-items: center;
  gap: 0.85rem;
  padding-top: 1.2rem;
  border-top: 1px dashed rgba(79, 70, 229, 0.12);
}

.author-image {
  width: 46px;
  height: 46px;
  border-radius: 50%;
  overflow: hidden;
  border: 2px solid rgba(79, 70, 229, 0.15);
  flex-shrink: 0;
}

.author-image img {
  width: 100%;
  height: 100%;
  object-fit: cover;
}

.author-info h4 {
  font-size: 0.98rem;
  font-weight: 700;
  color: #0f172a;
  margin: 0 0 0.15rem 0;
}

.author-info span {
  color: #64748b;
  font-size: 0.82rem;
}

/* Core Platform Performance Metrics dashboard block rules */
.stats-grid {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(220px, 1fr));
  gap: 1.5rem;
}

.stat-item {
  text-align: center;
  padding: 2rem 1.5rem;
}

.stat-number {
  font-size: 2.75rem;
  font-weight: 800;
  color: #4f46e5;
  letter-spacing: -0.02em;
  margin-bottom: 0.35rem;
}

.stat-label {
  color: #64748b;
  font-size: 0.84rem;
  font-weight: 700;
  letter-spacing: 0.04em;
  text-transform: uppercase;
}

/* Fluid interface viewport adjustments */
@media (max-width: 768px) {
  .hero {
    padding: 2.5rem 1rem 1rem;
  }

  .hero-content h1 {
    font-size: 2rem;
  }

  .section {
    padding: 2rem 1rem;
  }

  .section-title {
    font-size: 1.5rem;
    margin-bottom: 1.75rem;
  }

  .projects-grid,
  .testimonials-grid,
  .stats-grid {
    grid-template-columns: 1fr;
    gap: 1.25rem;
  }

  .stat-number {
    font-size: 2.25rem;
  }
}
</style>
