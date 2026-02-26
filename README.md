# DB-to-DB Sync Engine

Automatically syncs data between two PostgreSQL databases. When you add, edit, or delete a student in Database 1, it instantly appears in Database 2 as JSON.

## What It Does

- Watches Database 1 for changes (using Supabase Realtime)
- Transforms normalized data → JSON format
- Writes to Database 2 automatically
- Retries if sync fails
- Logs every operation

## TypeScript & Production Deployment

Fully migrated to TypeScript and deployed to Cloudflare:
- All `.js` files converted to `.ts`
- Strict type checking enabled
- Webhook trigger via Supabase Edge Function
- Deployed to Cloudflare Workers with Queue
- Hourly cron trigger for missed records

**Live Worker:** https://db-sync-worker.emmanaliob.workers.dev

## Tech Stack

- **Supabase PostgreSQL** - Both databases
- **Supabase Realtime** - Detects changes automatically
- **Cloudflare Workers** - Runs the sync code
- **Cloudflare Queue** - Retries failed syncs
- **Drizzle ORM** - Database queries

## How It Works

1. You insert/update/delete a student in Database 1
2. Supabase Realtime detects the change
3. Worker transforms the data to JSON
4. Worker writes to Database 2
5. If it fails → retry automatically

## Example

**Database 1 (students table):**
```
id | fname  | lname | email
1  | Emman  | Obadi | emman@test.com
```

**Database 2 (students_sync table):**
```
id | data (JSON)
1  | {"fname":"Emman","lname":"Obadi","email":"emman@test.com"}


### Trigger Method

**Production Setup (Webhook):**
1. Database change detected by PostgreSQL trigger
2. Trigger calls Supabase Edge Function
3. Edge Function POSTs to Cloudflare Worker
4. Worker syncs to Database 2

**Backup Method (Realtime Listener):**
- Run `npm run listen` on your machine
- Detects changes via Supabase Realtime
- Useful for development
## Setup

### 1. Install
```bash
git clone https://github.com/Emmanobadi/db-sync-engine.git
cd db-sync-engine
npm install
```

### 2. Configure Supabase

Edit `src/db/supabase.js`:
```javascript
const supabaseUrl = 'YOUR_SUPABASE_URL'
const supabaseKey = 'YOUR_SUPABASE_ANON_KEY'
```

### 3. Create Tables in Supabase

Go to Supabase SQL Editor and run:
```sql
-- Database 1 (source)
CREATE TABLE students (
  id SERIAL PRIMARY KEY,
  fname TEXT NOT NULL,
  lname TEXT NOT NULL,
  email TEXT NOT NULL UNIQUE
);

-- Database 2 (target)
CREATE TABLE students_sync (
  id INTEGER PRIMARY KEY,
  data JSONB NOT NULL
);

-- Logs
CREATE TABLE sync_logs (
  id SERIAL PRIMARY KEY,
  record_id INTEGER NOT NULL,
  operation TEXT NOT NULL,
  status TEXT NOT NULL,
  error TEXT,
  timestamp TIMESTAMP DEFAULT NOW()
);
```

### 4. Enable Realtime

In Supabase:
1. Go to **Database** → **Tables** → **students**
2. Click **"Enable Realtime"** button

### 5. Create Webhook Trigger (Production)

**Enable pg_net extension:**
```sql
CREATE EXTENSION IF NOT EXISTS pg_net;
```

**Create trigger function:**
```sql
CREATE OR REPLACE FUNCTION notify_sync_function()
RETURNS TRIGGER AS $$
DECLARE
  payload jsonb;
BEGIN
  IF TG_OP = 'DELETE' THEN
    payload := jsonb_build_object('type', TG_OP, 'old_record', row_to_json(OLD));
  ELSE
    payload := jsonb_build_object('type', TG_OP, 'record', row_to_json(NEW));
  END IF;

  PERFORM net.http_post(
    url := 'https://YOUR_PROJECT.supabase.co/functions/v1/rapid-api',
    headers := jsonb_build_object(
      'Content-Type', 'application/json',
      'Authorization', 'Bearer YOUR_SUPABASE_ANON_KEY'
    ),
    body := payload
  );
  
  RETURN COALESCE(NEW, OLD);
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER students_sync_trigger
  AFTER INSERT OR UPDATE OR DELETE ON students
  FOR EACH ROW
  EXECUTE FUNCTION notify_sync_function();
```

Replace `YOUR_PROJECT` and `YOUR_SUPABASE_ANON_KEY` with your values.

## Running

### Development (Local)
```bash
npm run dev         # Start Worker locally
npm run listen      # Start realtime listener (backup method)
```

### Production (Deployed)

**Deploy to Cloudflare:**
```bash
npx wrangler queues create sync-retry-queue  # Create queue
npx wrangler deploy                           # Deploy Worker
```

Worker URL: https://db-sync-worker.emmanaliob.workers.dev

**Set up webhook:** Follow trigger setup in README above

## Test Results

- ✅ 213 records synced successfully
- ✅ INSERT operations working automatically
- ✅ UPDATE operations working
- ✅ DELETE operations working
- ✅ Failed syncs retry automatically

## Project Structure
```
db-sync-engine/
├── src/
│   ├── db/
│   │   ├── schema.ts           # Table definitions
│   │   └── supabase.ts         # Supabase config
│   ├── index.js                # Sync worker
│   ├── realtime-listener.ts    # Watches for changes
│   ├── backfill.ts             # Sync existing data
│   └── load-test.ts            # Test with 200 records
├── wrangler.toml               # Cloudflare config
└── package.json
```

## Technologies Explained

**Supabase Realtime:** Watches your database and sends instant notifications when data changes (like WebSocket but for databases)

**JSONB:** PostgreSQL's way of storing JSON data efficiently - you can query inside the JSON

**Cloudflare Workers:** Your code runs globally in 300+ locations (fast everywhere)

**Cloudflare Queue:** If sync fails, it automatically retries (1 second, 2 seconds, 4 seconds)

## Author

Emman Obadi - [GitHub](https://github.com/Emmanobadi)