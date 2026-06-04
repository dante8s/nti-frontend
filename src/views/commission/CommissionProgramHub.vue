<template>
  <div class="commission-page">
    <header class="commission-page__head">
      <h1>Комісія</h1>
      <p class="commission-page__lead">
        Оберіть програму, щоб переглянути учасників, команди та заявки на оцінювання.
      </p>
    </header>

    <div class="program-grid">
      <section class="panel panel--program panel--a">
        <h2>Програма A</h2>
        <p class="panel__hint">
          Інкубаційний трек: команди та заявки за відкритими викликами програми типу A.
        </p>
        <router-link class="panel__action" :to="{ name: 'commission-participants', params: { programType: 'a' } }">
          Усі учасники
        </router-link>
      </section>

      <section class="panel panel--program panel--b">
        <h2>Програма B</h2>
        <p class="panel__hint">
          Практичний трек: заявки та матеріали за викликами програми типу B.
        </p>
        <router-link class="panel__action" :to="{ name: 'commission-participants', params: { programType: 'b' } }">
          Усі учасники
        </router-link>
      </section>
    </div>

    <p class="commission-page__footer">
      <router-link class="link-muted" :to="{ name: 'dashboard' }">← На дашборд</router-link>
    </p>
  </div>
</template>

<script setup>
</script>

<style scoped>
.commission-page {
  max-width: 960px;
  margin: 0 auto;
  padding: 1.5rem 1rem 2rem;
}

.commission-page__head h1 {
  margin: 0 0 0.35rem;
  font-size: 1.65rem;
}

.commission-page__lead {
  margin: 0 0 1.5rem;
  color: #64748b;
  font-size: 0.95rem;
}

.program-grid {
  display: grid;
  gap: 1.25rem;
  grid-template-columns: repeat(auto-fit, minmax(280px, 1fr));
}

.panel {
  min-height: 220px;
  border-radius: 16px;
  padding: 1.35rem 1.25rem 1.5rem;
  background: #e4e4e8;
  border: 1px solid #c8c8d0;
  display: flex;
  flex-direction: column;
  gap: 0.75rem;
}

.panel--a {
  background: linear-gradient(160deg, #f3e8ff 0%, #e4e4e8 55%);
}

.panel--b {
  background: linear-gradient(160deg, #e0f2fe 0%, #e4e4e8 55%);
}

.panel h2 {
  margin: 0;
  font-size: 1.25rem;
}

.panel__hint {
  margin: 0;
  flex: 1;
  color: #475569;
  font-size: 0.88rem;
  line-height: 1.45;
}

.panel__action {
  align-self: flex-end;
  margin-top: auto;
  font-weight: 700;
  color: #4338ca;
  text-decoration: none;
  padding: 0.45rem 0.85rem;
  border-radius: 999px;
  background: rgba(255, 255, 255, 0.85);
  border: 1px solid rgba(67, 56, 202, 0.25);
}

.panel__action:hover {
  background: #fff;
}

.commission-page__footer {
  margin-top: 1.75rem;
}

.link-muted {
  color: #64748b;
  text-decoration: none;
  font-size: 0.9rem;
}

.link-muted:hover {
  text-decoration: underline;
}
</style>
