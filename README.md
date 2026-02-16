# DB-to-DB Sync Engine

Automatically syncs data between two PostgreSQL databases. When you add, edit, or delete a student in Database 1, it instantly appears in Database 2 as JSON.

## What It Does

- Watches Database 1 for changes (using Supabase Realtime)
- Transforms normalized data → JSON format
- Writes to Database 2 automatically
- Retries if sync fails
- Logs every operation

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
```

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

## Running

**Start the Worker:**
```bash
npm run dev
```

**Start the Listener (in another terminal):**
```bash
npm run listen
```

Now insert a student in Database 1 and watch it appear in Database 2!

## Commands
```bash
npm run dev         # Start sync worker
npm run listen      # Start realtime listener
npm run backfill    # Sync all existing records
npm run loadtest    # Test with 200 records
```

## Test Results

- ✅ 201 records synced successfully
- ✅ INSERT operations working automatically
- ✅ UPDATE operations working
- ✅ DELETE operations working
- ✅ Failed syncs retry automatically

## Project Structure
```
db-sync-engine/
├── src/
│   ├── db/
│   │   ├── schema.js           # Table definitions
│   │   └── supabase.js         # Supabase config
│   ├── index.js                # Sync worker
│   ├── realtime-listener.js    # Watches for changes
│   ├── backfill.js             # Sync existing data
│   └── load-test.js            # Test with 200 records
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