# NTI Frontend

Vue 3 · Vite · Pinia · Vue Router · i18n (uk / sk / en)

---

## Quick start (Docker)

> Run from the **backend** repo — `docker-compose.yml` there starts both services.
> See [nti-backend/README.md](../nti-backend/README.md).

---

## Local development

### Prerequisites
- Node.js 20+
- npm 10+
- Backend running on `http://localhost:8080`

### Steps

```bash
npm install
npm run dev
```

The app is available at **http://localhost:5173**.  
API calls (`/api/*`) are proxied to `http://localhost:8080` via Vite.

### Other commands

```bash
npm run build   # production build → dist/
npm run lint    # ESLint
```

---

## Environment variables

No `.env` file is required for the standard setup.  
See `.env.example` for details.

---

## Tech stack

- **Vue 3** + Composition API (`<script setup>`)
- **Vite** — build tool & dev server
- **Pinia** — state management
- **Vue Router 4** — routing with role-based guards
- **vue-i18n** — Ukrainian / Slovak / English
- **Axios** — HTTP client (base: `/api`)

## Project structure

```
src/
├── api/          # Axios calls per domain (auth, applications, gdpr…)
├── components/   # Shared components (NotificationBell, LanguageSwitcher…)
├── i18n/         # Translations (uk.js, sk.js, en.js)
├── layouts/      # AppShell (sidebar + header)
├── router/       # Routes with meta guards
├── stores/       # Pinia stores (auth, organization…)
└── views/        # Pages grouped by role (admin/, student/, commission/…)
```
