# Portfolio Dashboard

Full-stack portfolio management app. NestJS backend, Next.js frontend, PostgreSQL database.

## Setup

### Prerequisites

- Node.js v20.0.0+
- npm v9.0.0+
- Podman or Docker

### Environment Setup

Copy the env file:

cp .env.example .env

Generate a JWT secret:

node -e "console.log(require('crypto').randomBytes(64).toString('hex'))"

Update `.env` with any value similar to the example below:

NODE_ENV=development

POSTGRES_USER=postgres

POSTGRES_PASSWORD=123

POSTGRES_DB=portfolio

DB_HOST=localhost

DB_PORT=5434

DATABASE_URL=postgresql://postgres:123@localhost:5434/portfolio?schema=public

BACKEND_PORT=3001

FRONTEND_PORT=3000

FRONTEND_URL=http://localhost:3000

NEXT_PUBLIC_API_URL=http://localhost:3001/api

JWT_SECRET=secret

JWT_EXPIRATION=15m

### Start Database

npm run docker:db:up

### Setup Database

Generate Prisma client:

npm run db:generate

Run migrations:

npm run db:migrate:deploy

Seed the database with data:

npm run db:seed

### Start Development

npm run dev

Frontend: http://localhost:3000

Backend: http://localhost:3001/api

## Common Commands

npm run dev # start everything

npm run dev:backend # backend only

npm run dev:frontend # frontend only

npm run db:studio # open Prisma Studio

npm run docker:db:down # stop database

## Credentials available from seed

username: demo

password demo

Make sure to run npm run db:seed in order to seed database with dummy data
