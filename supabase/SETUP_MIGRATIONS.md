# Database Setup - Run These in Order

## ⚠️ IMPORTANT: Run these SQL scripts in your Supabase SQL Editor

Go to: https://supabase.com/dashboard/project/xzzorozwxydpjxdrxtsi/sql

---

## Migration 1: Create Schema (Run First)

1. Click "SQL Editor" in Supabase sidebar
2. Click "+ New query"
3. Copy ALL content from: `supabase/migrations/001_initial_schema.sql`
4. Paste into SQL Editor
5. Click "Run" button (or Ctrl/Cmd + Enter)
6. Wait for "Success. No rows returned" message

---

## Migration 2: Enable Security (Run Second)

1. Click "+ New query" again
2. Copy ALL content from: `supabase/migrations/002_row_level_security.sql`
3. Paste into SQL Editor
4. Click "Run"
5. Wait for success message

---

## Migration 3: Load Demo Data (Run Third)

1. Click "+ New query" again
2. Copy ALL content from: `supabase/migrations/003_seed_demo_data.sql`
3. Paste into SQL Editor
4. Click "Run"
5. Wait for success message

---

## Verify Setup

After running all three migrations, verify:

1. Go to "Table Editor" in sidebar
2. You should see these tables:
   - organizations (should have 3 rows)
   - acos (should have 2 rows)
   - contracts (should have 2 rows)
   - providers (should have 3 rows)
   - quality_measures
   - alerts
   - etc.

---

## Next: Create User Accounts

After database is set up, you need to create demo users (see next section in main guide).
