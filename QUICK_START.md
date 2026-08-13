# 🚀 Quick Start Guide - Get Running in 10 Minutes

## ✅ Step 1: Environment Setup (DONE)
- ✅ Dependencies installed
- ✅ `.env` file configured with your Supabase credentials

## 📊 Step 2: Set Up Database (DO THIS NOW)

### Open Supabase SQL Editor
🔗 https://supabase.com/dashboard/project/xzzorozwxydpjxdrxtsi/sql

### Run Migration 1 - Create Tables
1. Click **"+ New query"**
2. Open file: `supabase/migrations/001_initial_schema.sql`
3. Copy ALL the content (Ctrl+A, Ctrl+C)
4. Paste into Supabase SQL Editor
5. Click **"Run"** (or press Ctrl+Enter)
6. ✅ Wait for "Success. No rows returned"

### Run Migration 2 - Enable Security
1. Click **"+ New query"** again
2. Open file: `supabase/migrations/002_row_level_security.sql`
3. Copy ALL the content
4. Paste into Supabase SQL Editor
5. Click **"Run"**
6. ✅ Wait for "Success"

### Run Migration 3 - Load Demo Data
1. Click **"+ New query"** again
2. Open file: `supabase/migrations/003_seed_demo_data.sql`
3. Copy ALL the content
4. Paste into Supabase SQL Editor
5. Click **"Run"**
6. ✅ Wait for "Success"

### Verify Database Setup
1. Click **"Table Editor"** in left sidebar
2. Click on **"organizations"** table
3. You should see **3 rows** (Demo Medicare Payer, Pioneer Health, Community Care)
4. ✅ If you see data, database is ready!

## 👤 Step 3: Create Demo Users

### Create Payer Admin User
1. In Supabase dashboard, click **"Authentication"** in sidebar
2. Click **"Users"** tab
3. Click **"Add user"** → **"Create new user"**
4. Fill in:
   - **Email**: `payer@demo.com`
   - **Password**: `Demo123456!`
   - ✅ **Check**: "Auto Confirm User"
5. Click **"Create user"**
6. **COPY THE USER ID** (looks like: `a1b2c3d4-e5f6-7890-abcd-ef1234567890`)

### Link Payer User to Organization
1. Go back to **SQL Editor**
2. Click **"+ New query"**
3. Copy this SQL and **REPLACE `USER_ID_HERE`** with your copied ID:

```sql
-- Insert profile for payer user
INSERT INTO profiles (id, full_name, email, job_title)
VALUES (
  'USER_ID_HERE',
  'Demo Payer Admin',
  'payer@demo.com',
  'System Administrator'
);

-- Link user to payer organization
INSERT INTO organization_members (organization_id, user_id, role, status)
VALUES (
  '00000000-0000-0000-0000-000000000001',
  'USER_ID_HERE',
  'PAYER_ADMIN',
  'APPROVED'
);
```

4. Click **"Run"**
5. ✅ You should see "Success"

### Create ACO Admin User
1. Go back to **"Authentication"** → **"Users"**
2. Click **"Add user"** → **"Create new user"**
3. Fill in:
   - **Email**: `aco@demo.com`
   - **Password**: `Demo123456!`
   - ✅ **Check**: "Auto Confirm User"
4. Click **"Create user"**
5. **COPY THE USER ID**

### Link ACO User to Organization
1. Go to **SQL Editor**
2. Click **"+ New query"**
3. Copy this SQL and **REPLACE `USER_ID_HERE`** with the ACO user ID:

```sql
-- Insert profile for ACO user
INSERT INTO profiles (id, full_name, email, job_title)
VALUES (
  'USER_ID_HERE',
  'Demo ACO Admin',
  'aco@demo.com',
  'ACO Administrator'
);

-- Link user to Pioneer Health Network
INSERT INTO organization_members (organization_id, user_id, role, status)
VALUES (
  '00000000-0000-0000-0000-000000000002',
  'USER_ID_HERE',
  'ACO_ADMIN',
  'APPROVED'
);
```

4. Click **"Run"**
5. ✅ Success!

## 🧪 Step 4: Test Connection (OPTIONAL)

Open `test-connection.html` in your browser to verify everything is working:
```bash
# Windows
start test-connection.html

# Or just double-click the file
```

You should see "✅ Connection Successful!"

## 🚀 Step 5: Start the Application

```bash
npm run dev
```

The app will start at: **http://localhost:5173**

## 🎯 Step 6: Log In and Explore

### Test as Payer Admin
1. Go to http://localhost:5173
2. Login with:
   - **Email**: `payer@demo.com`
   - **Password**: `Demo123456!`
3. You should see:
   - **Payer Dashboard**
   - 24 ACOs
   - $2.42B total expenditure
   - Portfolio overview

### Test as ACO Admin
1. Click **"Sign Out"**
2. Login with:
   - **Email**: `aco@demo.com`
   - **Password**: `Demo123456!`
3. You should see:
   - **ACO Dashboard** (Pioneer Health Network)
   - Performance score: 88.4%
   - Projected savings: $5.1M
   - Provider performance

## ✅ Success Checklist

- [ ] Ran all 3 database migrations
- [ ] Created payer user account
- [ ] Created ACO user account
- [ ] Linked both users to organizations
- [ ] Started dev server (`npm run dev`)
- [ ] Can log in as payer user
- [ ] Can log in as ACO user
- [ ] Both dashboards display data

## ⚠️ Troubleshooting

### Can't log in?
- Check user was created in Supabase Auth
- Ensure "Auto Confirm User" was checked
- Verify SQL scripts ran successfully (check profiles and organization_members tables)

### Blank dashboard?
- Check browser console (F12) for errors
- Verify all 3 migrations ran
- Check organization_members table has your users

### "Missing Supabase environment variables"?
- Verify `.env` file exists
- Check values are correct (no quotes, no spaces)
- Restart dev server after changing `.env`

## 🎉 You're All Set!

Once logged in, you can:
- View ACO portfolio (as Payer)
- Monitor financial performance
- Track quality measures
- Analyze provider performance
- View care opportunities (as ACO)

## 📚 Next Steps

- Read `SETUP_GUIDE.md` for detailed explanations
- Review `docs/FINANCIAL_CALCULATIONS.md` to understand the math
- Explore the code in `src/` folder
- Add more features!

---

**Need Help?** Check the troubleshooting section or review the full `SETUP_GUIDE.md`
