# Supabase Database Setup

This directory contains the migration and seed files needed to set up the database for the Civalgo Punch application.

## Project Structure

- `migrations/`: Contains SQL scripts to create the database schema
  - `00_setup_pgclient.sql`: Creates an RPC function for executing SQL (for the setup script)
  - `01_create_tables.sql`: Creates the database tables and security policies
- `seed/`: Contains SQL scripts to populate the database with initial test data
  - `01_seed_data.sql`: Adds test sites, workers, and check-in/out events

## Running Migrations and Seeds

You have three options to run these scripts:

### Option 1: Using the npm Script (Recommended)

1. Make sure your `.env.local` file is set up with your Supabase credentials
2. Run the setup script:
   ```
   npm run setup:db
   ```

Note: This requires the pgclient RPC function to be set up first. If you're setting up for the first time, you'll need to run the `00_setup_pgclient.sql` file manually using the Supabase web interface before running the setup script.

### Option 2: Using the Supabase Web Interface

1. Log in to your Supabase project dashboard
2. Go to the SQL Editor tab
3. Create a new query
4. First, run the contents of `migrations/00_setup_pgclient.sql` to set up the RPC function
5. Then run the contents of `migrations/01_create_tables.sql`  
6. Finally, run the contents of `seed/01_seed_data.sql`

### Option 3: Using the Supabase CLI

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

## A Note About the pgclient Function

The `00_setup_pgclient.sql` file creates an RPC function that allows executing arbitrary SQL from the client side. This is used by the setup-db.js script to run migrations and seeds without requiring the Supabase CLI.

**Security Warning**: This grants significant power to the anonymous role. For a production environment, you should:

1. Either remove this function entirely after setup
2. Or restrict it to admin users only
3. Or modify it to only allow certain types of queries

## Database Schema

### Sites Table
- `id`: UUID (primary key)
- `name`: String (site name)
- `created_at`: Timestamp (when the site was created)

### Workers Table
- `id`: UUID (primary key)
- `name`: String (worker's name)
- `site_id`: UUID (foreign key to sites table)
- `created_at`: Timestamp (when the worker was created)

### Check-In Events Table
- `id`: UUID (primary key)
- `worker_id`: UUID (foreign key to workers table)
- `site_id`: UUID (foreign key to sites table)
- `timestamp`: Timestamp (when the event occurred)
- `event_type`: String ('check_in' or 'check_out')

## Test Data

The seed file creates:

1. **Three construction sites**:
   - Main Construction Site
   - Downtown Project
   - Highway Expansion

2. **Ten workers** distributed across these sites

3. **Check-in/out events** including:
   - Current-day check-ins
   - Previous-day complete check-in/out cycles
   - Historical data from 2 days ago 