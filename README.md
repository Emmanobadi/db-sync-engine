# DB-to-DB Sync Engine

Database synchronization system that keeps two PostgreSQL databases in lockstep using Supabase Realtime and Cloudflare Workers.

## Architecture

- **DB 1 (Source)**: Normalized PostgreSQL tables (students table)
- **DB 2 (Target)**: JSONB storage (students_sync table)
- **Sync Worker**: Cloudflare Workers with Hono framework
- **Retry Queue**: Cloudflare Queue for failed syncs
- **Change Detection**: Supabase Realtime

## Features

- Real-time data synchronization from normalized to JSONB format
- Automatic retry with exponential backoff via Cloudflare Queue
- Comprehensive sync logging (timestamp, status, errors)
- Back-fill capability for existing data
- Error handling and validation

## Setup

1. Install dependencies:
```bash
npm install
```

2. Configure Supabase connection in `src/db/supabase.js`

3. Run database migrations (tables created via Supabase SQL Editor)

## Usage

Start the sync worker:
```bash
npm run dev
```

Back-fill existing data:
```bash
npm run backfill
```

Run load test:
```bash
npm run loadtest
```

## Load Test Results

- Total records: 200
- Successfully synced: 200
- Sync method: Back-fill
- Average latency: ~0.5 seconds per record
- Failed syncs: 0

## Tech Stack

- Cloudflare Workers (Hono)
- Supabase PostgreSQL
- Drizzle ORM
- Cloudflare Queue