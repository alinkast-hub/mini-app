# Mini App — Todo + Pomodoro

A modern mobile app built with **Expo (React Native)** and a **NestJS** backend in a pnpm monorepo.

## Features

- 🍅 **Pomodoro Timer** — work / short-break / long-break modes with local notifications
- ✅ **Task Manager** — CRUD with priority, tags, due date, reorder
- 📊 **Stats** — daily/weekly focus minutes & streaks
- ⚙️ **Settings** — configurable durations, auto-start, sound
- 🔐 **Google Sign-In** + JWT stored securely
- 🗄️ **Local-first** with expo-sqlite, backend sync stub

## Project structure

```
mini-app/
├── apps/
│   └── mobile/          # Expo managed app
├── services/
│   └── api/             # NestJS API
├── docker-compose.yml   # PostgreSQL
├── pnpm-workspace.yaml
└── package.json
```

## Prerequisites

- Node 20+
- pnpm 9+
- Docker + Docker Compose

## Setup & run

### 1. Install dependencies

```bash
pnpm i
```

### 2. Start PostgreSQL

```bash
docker compose up -d
```

### 3. Configure environment

```bash
cp services/api/.env.example services/api/.env
cp apps/mobile/.env.example apps/mobile/.env
# Edit both .env files with your values
```

### 4. Run database migrations

```bash
pnpm --filter api prisma:migrate
```

### 5. Start the API

```bash
pnpm --filter api dev
```

### 6. Start the mobile app

```bash
pnpm --filter mobile start
```

Scan the QR code with **Expo Go** on your device, or press `i`/`a` for simulator.

## Environment variables

| Variable | Package | Description |
|---|---|---|
| `DATABASE_URL` | api | Postgres connection string |
| `JWT_SECRET` | api | Secret for signing JWTs |
| `GOOGLE_CLIENT_ID` | api | Google OAuth client ID (server) |
| `PORT` | api | HTTP port (default 3000) |
| `EXPO_PUBLIC_API_URL` | mobile | API base URL |
| `EXPO_PUBLIC_GOOGLE_CLIENT_ID` | mobile | Google OAuth client ID (mobile) |

## Available scripts

| Script | Description |
|---|---|
| `pnpm --filter api dev` | Start API in watch mode |
| `pnpm --filter api build` | Build API for production |
| `pnpm --filter api prisma:migrate` | Run Prisma migrations |
| `pnpm --filter api prisma:studio` | Open Prisma Studio |
| `pnpm --filter mobile start` | Start Expo dev server |
| `pnpm --filter mobile android` | Run on Android |
| `pnpm --filter mobile ios` | Run on iOS |
| `pnpm lint` | Lint all packages |

