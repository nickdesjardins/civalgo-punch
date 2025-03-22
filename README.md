# Civalgo Punch - Worker Check-In System

A real-time check-in/out system for construction site workers. This project provides a digital solution for construction sites to track worker attendance, replacing physical punch-in machines with a web-based application.

## Key Features

- **Worker Check-In/Out**: Workers can check in when they arrive at a site and check out when they leave
- **Live Dashboard**: Supervisors can view a real-time list of workers currently on site
- **Historical Records**: All check-in/out events are recorded and can be filtered by worker, date range, or both
- **Real-time Updates**: Dashboard updates instantly when workers check in or out

## How to Run the Project

### Prerequisites

- Node.js 18.x or higher
- A Supabase account (for the database)

### Setup

1. Clone the repository:
   ```
   git clone https://github.com/your-username/civalgo-punch.git
   cd civalgo-punch
   ```

2. Install dependencies:
   ```
   npm install
   ```

3. Set up your Supabase database:
   - Create a new Supabase project
   - Set up the database schema and seed data using one of the following methods:
   
   #### Option 1: Using the Setup Script (Recommended)
   
   1. First, run the pgclient setup file manually:
      - Go to your Supabase project dashboard
      - Open the SQL Editor
      - Create a new query
      - Copy the contents of `supabase/migrations/00_setup_pgclient.sql`
      - Execute the query
   
   2. Run the database setup script:
      ```
      npm run setup:db
      ```
      This will:
      - Create all required tables and indexes
      - Set up row-level security policies
      - Populate the database with test data
   
   > **Security Note**: The pgclient function grants significant power to the anonymous role. For a production environment, you should either remove it after setup or restrict it to admin users only.
   
   #### Option 2: Using the Supabase Web Interface
   
   1. Log in to your Supabase project dashboard
   2. Go to the SQL Editor tab
   3. Create a new query
   4. Copy the contents of the migration file `supabase/migrations/01_create_tables.sql`
   5. Execute the query
   6. Repeat steps 3-5 for the seed file `supabase/seed/01_seed_data.sql`
   
   #### Option 3: Using the Supabase CLI
   
   1. Install the Supabase CLI: https://supabase.com/docs/guides/cli
   2. Login to your Supabase account:
      ```
      supabase login
      ```
   3. Link your project:
      ```
      supabase link --project-ref <your-project-id>
      ```
   4. Run the migrations and seed scripts:
      ```
      supabase db push
      ```

4. Create a `.env.local` file with your Supabase credentials:
   ```
   NEXT_PUBLIC_SUPABASE_URL=your-supabase-project-url
   NEXT_PUBLIC_SUPABASE_ANON_KEY=your-supabase-anon-key
   ```

5. Run the development server:
   ```
   npm run dev
   ```

6. Open [http://localhost:3000](http://localhost:3000) in your browser

## Database Schema

### Workers Table
- `id`: UUID (primary key)
- `name`: String (worker's name)
- `site_id`: UUID (foreign key to sites table)
- `created_at`: Timestamp (when the worker was created)

### Sites Table
- `id`: UUID (primary key)
- `name`: String (site name)
- `created_at`: Timestamp (when the site was created)

### Check-In Events Table
- `id`: UUID (primary key)
- `worker_id`: UUID (foreign key to workers table)
- `site_id`: UUID (foreign key to sites table)
- `timestamp`: Timestamp (when the event occurred)
- `event_type`: String ('check_in' or 'check_out')

## Test Data

The seed file creates:

1. **Three construction sites**:
   - Main Construction Site (ID: 1)
   - Downtown Project (ID: 2)
   - Highway Expansion (ID: 3)

2. **Ten workers** distributed across these sites

3. **Check-in/out events** including:
   - Current-day check-ins
   - Previous-day complete check-in/out cycles
   - Historical data from 2 days ago

## Code and Design Decisions

### Architecture
- **Next.js App Router**: Used for routing and page structure
- **Supabase**: For database and real-time functionality
- **React Server Components**: For improved performance
- **Client Components**: Only where interactivity is needed

### UI/UX
- **Shadcn UI + Tailwind CSS**: For a clean, responsive UI without reinventing the wheel
- **Mobile-first Design**: Works well on all device sizes
- **Simple Navigation**: Clear pathways for both workers and supervisors

### State Management
- **React Hook Form**: For form handling with validation
- **Zod**: For type validation
- **Supabase Realtime**: For updating the dashboard in real-time

### Real-time Updates
- Using Supabase's real-time subscriptions to push updates to the dashboard when check-in/out events occur
- No polling required, providing immediate visibility of worker status

### Authentication
- Simplified approach without complex user management
- Different views for workers vs. supervisors accessed via direct navigation

## Features Left Out and Why

1. **Complex Authentication**: Given the 4-hour constraint, a full authentication system would have been excessive. In a production environment, proper role-based authentication would be essential.

2. **Offline Support**: As specified in the requirements, offline support was intentionally excluded to focus on core functionality.

3. **Multi-Site Management**: The current implementation assumes a worker is at a single site. Managing workers across multiple sites would add complexity.

4. **Analytics and Reporting**: More advanced reporting features like total hours worked, overtime tracking, etc., would be valuable but beyond the MVP scope.

## Future Enhancements

1. **Proper Authentication**: Implement a comprehensive authentication system with role-based access control.

2. **Worker Profiles**: Add detailed worker profiles with contact information, skills, and certifications.

3. **Geolocation Verification**: Add the ability to verify that workers are actually at the site when checking in.

4. **Advanced Analytics**: Provide more insights on worker attendance patterns, site productivity, etc.

5. **Shift Management**: Define shifts and automatically track lateness, absence, and overtime.

6. **Mobile App**: Create a dedicated mobile application for improved worker experience.
