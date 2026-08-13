# VBC/ACO Contract Performance Analytics Platform

A production-quality web application for **Value-Based Care (VBC) and Accountable Care Organization (ACO) Contract Performance Analytics**.

## 🎯 Overview

This platform provides comprehensive analytics for managing and monitoring ACO performance under value-based care contracts. It features role-based access control, allowing both payers (CMS) and ACO organizations to access relevant dashboards and analytics.

### Key Features

- **Role-Based Access Control**: Separate dashboards for Payer and ACO users
- **Financial Analytics**: Benchmark comparison, variance analysis, shared savings calculations
- **Quality Performance**: Quality measure tracking and gap analysis
- **Provider Performance**: Provider-level cost and quality analytics
- **Risk Stratification**: Patient population risk analysis
- **What-If Simulation**: Model performance scenarios
- **Alerts & Recommendations**: Proactive notifications and care opportunities
- **Secure**: Row-Level Security (RLS) enforced at database level via Supabase

## 🛠️ Technology Stack

- **Frontend**: React + TypeScript + Vite
- **Styling**: Tailwind CSS
- **UI Components**: shadcn/ui
- **Icons**: Lucide React
- **Charts**: Recharts
- **Backend**: Supabase (PostgreSQL + Auth + Storage)
- **State Management**: TanStack Query (React Query)
- **Routing**: React Router v6

## 📋 Prerequisites

- Node.js 18+ and npm/yarn
- Supabase account (free tier works)
- Git

## 🚀 Getting Started

### 1. Clone the Repository

```bash
git clone <your-repo-url>
cd vbc-aco-analytics
```

### 2. Install Dependencies

```bash
npm install
```

### 3. Set Up Supabase

1. Create a new project at [supabase.com](https://supabase.com)
2. Go to **Project Settings** → **API** and copy:
   - Project URL
   - Anon/Public Key

### 4. Run Database Migrations

1. In your Supabase dashboard, go to **SQL Editor**
2. Create a new query
3. Copy and paste the contents of `supabase/migrations/001_initial_schema.sql`
4. Run the migration
5. Repeat for `supabase/migrations/002_row_level_security.sql`

### 5. Configure Environment Variables

Create a `.env` file in the project root:

```env
VITE_SUPABASE_URL=your_supabase_project_url
VITE_SUPABASE_ANON_KEY=your_supabase_anon_key
VITE_ENVIRONMENT=demo
```

### 6. Start the Development Server

```bash
npm run dev
```

The application will be available at `http://localhost:5173`

## 🔐 User Roles

### Payer/CMS Admin
- View all ACO contracts
- Monitor portfolio performance
- Manage contracts
- View aggregate analytics
- Access audit logs

### ACO Admin
- View own ACO performance
- Manage providers
- View patient population analytics
- Access care opportunities
- Run what-if simulations

## 📊 Demo Data

The application currently uses synthetic demo data for demonstration purposes. All data shown is fictional and for testing only.

To seed the database with demo data:
1. Create demo organizations (Payer and ACO)
2. Create user accounts and link them to organizations
3. Add contracts, providers, beneficiaries, and claims data
4. Generate quality measures and performance records

## 🗄️ Database Schema

### Core Tables

- `organizations` - Payer and ACO organizations
- `profiles` - User profiles (extends Supabase auth.users)
- `organization_members` - Links users to organizations with roles
- `acos` - ACO entities
- `contracts` - VBC contracts between payers and ACOs
- `providers` - Healthcare providers in ACO networks
- `beneficiaries` - De-identified patient population data
- `claims` - Healthcare claims data
- `quality_measures` - Quality performance metrics
- `provider_performance` - Provider-level performance data
- `contract_performance` - Contract-level performance aggregates
- `alerts` - System alerts and notifications
- `recommendations` - Care opportunity recommendations
- `audit_logs` - System audit trail

### Security

All tables have Row Level Security (RLS) enabled. Access is controlled by:
- User authentication (Supabase Auth)
- Organization membership
- Role-based permissions
- RLS policies prevent cross-ACO data access

## 🧮 Financial Calculations

The platform includes comprehensive financial calculation utilities:

- **Variance Analysis**: Benchmark vs actual expenditure
- **Shared Savings**: Based on contract parameters (sharing rate, minimum savings rate)
- **Shared Losses**: For two-sided risk arrangements
- **Risk Scoring**: Contract and provider risk assessment
- **Performance Scoring**: Multi-factor performance evaluation

See `src/lib/calculations/financial.ts` for detailed implementations.

## 🎨 UI/UX Design Principles

- Clean, professional, modern healthcare enterprise aesthetic
- Data-rich but not cluttered
- Accessible (WCAG compliance targeted)
- Responsive design (desktop/tablet/mobile)
- Consistent visual hierarchy
- Semantic use of color (not relying solely on color for meaning)

## 📁 Project Structure

```
src/
├── components/
│   ├── ui/              # shadcn/ui base components
│   ├── layout/          # Layout components (ProtectedRoute, etc.)
│   └── common/          # Reusable components (KPICard, RiskBadge, etc.)
├── features/            # Feature-based modules (future expansion)
├── pages/
│   ├── auth/            # Authentication pages
│   ├── payer/           # Payer dashboard pages
│   └── aco/             # ACO dashboard pages
├── lib/
│   ├── calculations/    # Financial and analytics calculations
│   ├── supabase.ts      # Supabase client
│   ├── auth.ts          # Authentication utilities
│   └── utils.ts         # General utilities
├── types/
│   └── database.ts      # TypeScript type definitions
├── App.tsx              # Main app component
├── main.tsx             # Entry point
└── index.css            # Global styles
```

## 🔒 Security Considerations

- Never commit `.env` file to version control
- Supabase service role key should NEVER be exposed to frontend
- All sensitive operations use RLS policies
- User passwords handled by Supabase Auth (never stored manually)
- Input validation on all forms
- Proper error handling without exposing sensitive information

## 🚧 Development Roadmap

### Phase 1: Foundation ✅
- Project setup
- Database schema
- Authentication
- RBAC
- Basic dashboards

### Phase 2: Core Analytics (Next)
- Contract management
- Provider analytics
- Quality measure tracking
- Financial reconciliation

### Phase 3: Advanced Features
- What-if simulator
- Risk prediction
- AI insights
- Alerting system

### Phase 4: Reporting & Export
- Report generation
- CSV/PDF export
- Data visualization enhancements

### Phase 5: Polish & Testing
- Unit tests
- Integration tests
- Performance optimization
- Accessibility audit

## 🤝 Contributing

1. Create a feature branch
2. Make your changes
3. Test thoroughly
4. Submit a pull request

## 📝 License

[Add your license here]

## 📧 Support

For questions or issues, please contact [your-email@example.com]

---

**Note**: This is a demonstration platform using synthetic data. It is not intended for production use with real patient data without proper HIPAA compliance, security audits, and regulatory approval.
