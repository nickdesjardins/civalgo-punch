#!/usr/bin/env node

/**
 * Database setup script for Civalgo Punch
 * This script helps run the migrations and seed data against Supabase
 * 
 * Usage:
 *   node scripts/setup-db.js
 */

const fs = require('fs');
const path = require('path');
const { createClient } = require('@supabase/supabase-js');
const { execSync } = require('child_process');
const readline = require('readline');

// Create readline interface for user input
const rl = readline.createInterface({
  input: process.stdin,
  output: process.stdout
});

// Load environment variables
require('dotenv').config({ path: '.env.local' });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

// Validate environment variables
if (!supabaseUrl || !supabaseKey) {
  console.error('Error: NEXT_PUBLIC_SUPABASE_URL and NEXT_PUBLIC_SUPABASE_ANON_KEY must be set in .env.local');
  process.exit(1);
}

// Create Supabase client
const supabase = createClient(supabaseUrl, supabaseKey);

// File paths
const migrationsDir = path.join(__dirname, '..', 'supabase', 'migrations');
const seedDir = path.join(__dirname, '..', 'supabase', 'seed');

// Function to read SQL files in order
function getSqlFiles(directory) {
  try {
    const files = fs.readdirSync(directory)
      .filter(file => file.endsWith('.sql'))
      .sort(); // Sort to ensure correct order
    
    return files.map(file => ({
      name: file,
      content: fs.readFileSync(path.join(directory, file), 'utf8')
    }));
  } catch (error) {
    console.error(`Error reading directory ${directory}:`, error);
    return [];
  }
}

// Function to execute SQL
async function executeSql(sql, description) {
  console.log(`Executing ${description}...`);
  
  try {
    // Note: This approach requires you to have created a pgclient function in your Supabase database
    // If this fails, please follow the manual setup instructions in the README
    const { error } = await supabase.rpc('pgclient', { query: sql });
    
    if (error) {
      console.error(`❌ Error executing ${description}:`, error);
      console.log('');
      console.log('NOTE: This script requires the pgclient RPC function to be set up in your Supabase project.');
      console.log('If you have not set this up, please use the manual setup instructions in the README instead.');
      console.log('');
      return false;
    }
    
    console.log(`✅ ${description} completed successfully`);
    return true;
  } catch (error) {
    console.error(`❌ Error executing ${description}:`, error);
    console.log('');
    console.log('Please use the Supabase web interface to run the SQL scripts manually:');
    console.log('1. Go to https://supabase.com and open your project');
    console.log('2. Navigate to the SQL Editor');
    console.log('3. Create a new query with the contents of the file');
    console.log(`   (${description})`);
    console.log('4. Run the query');
    console.log('');
    return false;
  }
}

// Main function
async function setupDatabase() {
  console.log('🚀 Starting database setup for Civalgo Punch');
  
  // Get migration and seed files
  const migrationFiles = getSqlFiles(migrationsDir);
  const seedFiles = getSqlFiles(seedDir);
  
  if (migrationFiles.length === 0) {
    console.error('No migration files found!');
    process.exit(1);
  }
  
  // Confirm with user
  rl.question(`This will run ${migrationFiles.length} migrations and ${seedFiles.length} seed files against your Supabase database. Continue? (y/n) `, async (answer) => {
    if (answer.toLowerCase() !== 'y') {
      console.log('Operation cancelled.');
      rl.close();
      return;
    }
    
    // Run migrations
    console.log('\n=== Running Migrations ===');
    for (const file of migrationFiles) {
      const success = await executeSql(file.content, `migration ${file.name}`);
      if (!success) {
        rl.question('Migration failed. Continue with next file? (y/n) ', (answer) => {
          if (answer.toLowerCase() !== 'y') {
            console.log('Setup aborted.');
            rl.close();
            process.exit(1);
          }
        });
      }
    }
    
    // Run seed files
    if (seedFiles.length > 0) {
      console.log('\n=== Running Seeds ===');
      for (const file of seedFiles) {
        const success = await executeSql(file.content, `seed file ${file.name}`);
        if (!success && answer.toLowerCase() !== 'y') {
          break;
        }
      }
    }
    
    console.log('\n✨ Database setup completed!');
    rl.close();
  });
}

// Create directory if it doesn't exist
if (!fs.existsSync(path.join(__dirname, '..'))) {
  fs.mkdirSync(path.join(__dirname, '..'), { recursive: true });
}

// Run the setup
setupDatabase().catch(err => {
  console.error('Unhandled error:', err);
  process.exit(1);
}); 