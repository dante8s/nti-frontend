<template>
    <section class="home-page">
        <div class="hero-block" :style="heroStyle">
            <div class="hero-overlay"></div>
            <div class="hero-inner">
                <span class="eyebrow">Ласкаво просимо у Нітру</span>
                <h1>NTI — інноваційний проєкт у серці Словаччини</h1>
                <p>
                    Відчуйте атмосферу Нітри: середньовічні вулички, сучасні креативні простори
                    та програми, які допомагають молодим командам рости.
                </p>
                <div class="hero-actions">
                    <router-link to="/programs/a" class="btn btn-primary">Програма A</router-link>
                    <router-link to="/programs/b" class="btn btn-secondary">Програма B</router-link>
                </div>
            </div>
            <div class="hero-wave" aria-hidden="true"></div>
        </div>

        <div class="content-wrap">
            <div class="info-block">
                <div class="info-card">
                    <h2>Що таке NTI?</h2>
                    <p>
                        NTI — це простір для розвитку навчальних ідей, стартапів та партнерств.
                        У Нітрі цінують культуру, освіту та сучасні технології, і тут кожна
                        програма створена для того, щоб учасники змогли реалізувати свої сильні сторони.
                    </p>
                </div>
                <div class="info-card">
                    <h2>Програми A та B</h2>
                    <p>
                        Програма A орієнтована на глибоке навчання з підтримкою менторів.
                        Програма B допомагає швидко підготуватися до конкурсу та отримати перші практичні результати.
                    </p>
                </div>
                <div class="info-card">
                    <h2>Подайте заявку</h2>
                    <p>
                        Перегляньте опис програм, оберіть свій виклик і подайте заявку.
                        Щоб завершити заявку, потрібно зареєструватися та увійти в систему.
                    </p>
                </div>
            </div>
        </div>
    </section>
</template>

<script setup>
const heroStyle = {
    backgroundImage: `linear-gradient(180deg, rgba(15, 23, 42, 0.55), rgba(15, 23, 42, 0.25)), url(${new URL('../img/nitra1.jpg', import.meta.url).href})`,
}
</script>

<style scoped>
.home-page {
    width: 100%;
    background: #eef2ff;
    overflow-x: hidden;
}

.hero-block {
    position: relative;
    width: 100%;
    min-height: 640px;
    padding: 5.5rem 2rem 3.5rem;
    overflow: hidden;
    display: flex;
    align-items: center;
    justify-content: center;
    background-size: cover;
    background-position: center;
    background-attachment: scroll;
}

.hero-block::before,
.hero-block::after {
    content: '';
    position: absolute;
    border-radius: 999px;
    filter: blur(50px);
    opacity: 0.55;
}

.hero-block::before {
    width: 160px;
    height: 160px;
    background: rgba(79, 70, 229, 0.24);
    top: 16%;
    left: 6%;
}

.hero-block::after {
    width: 200px;
    height: 200px;
    background: rgba(56, 189, 248, 0.18);
    bottom: 14%;
    right: 8%;
}

.hero-overlay {
    position: absolute;
    inset: 0;
    background: radial-gradient(circle at top, rgba(255, 255, 255, 0.12), transparent 35%),
        linear-gradient(180deg, rgba(15, 23, 42, 0.75), rgba(15, 23, 42, 0.25));
}

.hero-inner {
    position: relative;
    z-index: 1;
    max-width: 900px;
    text-align: center;
    color: white;
    padding: 2rem 1.5rem;
    animation: fadeInUp 0.9s ease both;
}

@keyframes fadeInUp {
    from {
        opacity: 0;
        transform: translateY(20px);
    }

    to {
        opacity: 1;
        transform: translateY(0);
    }
}

.eyebrow {
    display: inline-block;
    margin-bottom: 1rem;
    font-size: 0.95rem;
    font-weight: 700;
    color: rgba(255, 255, 255, 0.85);
    text-transform: uppercase;
    letter-spacing: 0.14em;
}

.hero-inner h1 {
    margin: 0;
    font-size: clamp(3rem, 5vw, 5rem);
    line-height: 1.02;
    letter-spacing: -0.03em;
    text-shadow: 0 25px 80px rgba(0, 0, 0, 0.2);
}

.hero-inner p {
    margin: 1.5rem auto 2.5rem;
    max-width: 720px;
    color: rgba(255, 255, 255, 0.9);
    font-size: 1.05rem;
    line-height: 1.8;
}

.hero-actions {
    display: inline-flex;
    flex-wrap: wrap;
    justify-content: center;
    gap: 1rem;
}

.btn {
    display: inline-flex;
    align-items: center;
    justify-content: center;
    min-width: 170px;
    padding: 1rem 1.6rem;
    border-radius: 999px;
    font-weight: 700;
    transition: transform 0.2s ease, box-shadow 0.2s ease, background 0.2s ease;
    text-decoration: none;
}

.btn:hover {
    transform: translateY(-2px);
    box-shadow: 0 18px 30px rgba(67, 56, 202, 0.24);
}

.btn-primary {
    box-shadow: 0 18px 40px rgba(79, 70, 229, 0.28);
}

.btn-secondary {
    box-shadow: inset 0 0 0 1px rgba(255, 255, 255, 0.15);
}

.btn-primary {
    background: #4f46e5;
    color: white;
}

.btn-secondary {
    background: rgba(255, 255, 255, 0.18);
    color: white;
    border: 1px solid rgba(255, 255, 255, 0.28);
}

.hero-wave {
    position: absolute;
    bottom: 0;
    left: 0;
    width: 100%;
    height: 110px;
    background: linear-gradient(180deg, transparent 0%, #eef2ff 95%);
    clip-path: polygon(0 40%, 14% 30%, 35% 45%, 55% 28%, 76% 40%, 100% 30%, 100% 100%, 0% 100%);
    z-index: 0;
}

.content-wrap {
    max-width: 1200px;
    margin: 0 auto;
    padding: 0 2rem 4rem;
    position: relative;
    z-index: 2;
    background: transparent;
}

.info-block {
    display: grid;
    grid-template-columns: repeat(auto-fit, minmax(280px, 1fr));
    gap: 1.5rem;
    margin-top: -3.2rem;
}

.info-card {
    padding: 2rem;
    border-radius: 28px;
    background: rgba(255, 255, 255, 0.88);
    border: 1px solid rgba(79, 70, 229, 0.08);
    box-shadow: 0 22px 40px rgba(15, 23, 42, 0.08);
    backdrop-filter: blur(12px);
}

.info-card h2 {
    margin-top: 0;
    font-size: 1.35rem;
}

.info-card p {
    margin: 1rem 0 0;
    color: #4b5563;
    line-height: 1.8;
}

@media (max-width: 900px) {
    .hero-block {
        min-height: 560px;
        padding: 4rem 1.5rem 3rem;
    }

    .hero-inner h1 {
        font-size: clamp(2.5rem, 8vw, 3.5rem);
    }

    .hero-inner p {
        font-size: 1rem;
    }
}

@media (max-width: 640px) {
    .hero-block {
        padding: 3rem 1rem 2.5rem;
    }

    .content-wrap {
        padding: 0 1rem 3rem;
    }

    .hero-actions {
        flex-direction: column;
        gap: 0.85rem;
    }
}
</style>
