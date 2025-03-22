import { createClient } from '@supabase/supabase-js';

// Create a single Supabase client for interacting with your database
export const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL || '',
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || ''
);

// Database types for our application
export interface Worker {
  id: string;
  name: string;
  site_id: string;
}

export interface CheckInEvent {
  id: string;
  worker_id: string;
  site_id: string;
  timestamp: string;
  event_type: 'check_in' | 'check_out';
}

export interface Site {
  id: string;
  name: string;
  emergency?: boolean;
}

export interface WorkerState {
  id: string;
  worker_id: string;
  site_id: string | null;
  is_checked_in: boolean;
  last_check_in: string | null;
  last_check_out: string | null;
  updated_at: string;
}

// Function to get workers currently checked in
export async function getCheckedInWorkers(siteId: string) {
  // Use the optimized worker_states table instead of scanning all check-in events
  const { data: workerStates, error: statesError } = await supabase
    .from('worker_states')
    .select(`
      id,
      worker_id,
      last_check_in,
      workers:worker_id (
        id,
        name
      )
    `)
    .eq('site_id', siteId)
    .eq('is_checked_in', true);

  if (statesError) {
    console.error('Error fetching checked-in workers:', statesError);
    return [];
  }

  return workerStates || [];
}

// Function to get all check-in/out events for a site with filtering options
export async function getCheckEvents({ 
  siteId, 
  workerId, 
  startDate, 
  endDate 
}: { 
  siteId: string; 
  workerId?: string; 
  startDate?: string; 
  endDate?: string; 
}) {
  let query = supabase
    .from('check_in_events')
    .select(`
      id,
      worker_id,
      site_id,
      timestamp,
      event_type,
      workers:worker_id (
        id,
        name
      )
    `)
    .eq('site_id', siteId)
    .order('timestamp', { ascending: false });

  if (workerId) {
    query = query.eq('worker_id', workerId);
  }

  if (startDate) {
    query = query.gte('timestamp', startDate);
  }

  if (endDate) {
    query = query.lte('timestamp', endDate);
  }

  const { data, error } = await query;

  if (error) {
    console.error('Error fetching check events:', error);
    return [];
  }

  return data || [];
}

// Function to check in a worker
export async function checkInWorker({ 
  workerId, 
  siteId 
}: { 
  workerId: string; 
  siteId: string; 
}) {
  if (!workerId || !siteId) {
    throw new Error("Worker ID and Site ID are required");
  }

  try {
    // First verify the worker exists
    const { data: workerExists, error: workerError } = await supabase
      .from('workers')
      .select('id')
      .eq('id', workerId)
      .single();
    
    if (workerError || !workerExists) {
      console.error('Worker verification error:', workerError);
      throw new Error(`Worker with ID ${workerId} not found`);
    }

    // Then verify the site exists  
    const { data: siteExists, error: siteError } = await supabase
      .from('sites')
      .select('id')
      .eq('id', siteId)
      .single();
    
    if (siteError || !siteExists) {
      console.error('Site verification error:', siteError);
      throw new Error(`Site with ID ${siteId} not found`);
    }

    // Check if worker is already checked in
    const { data: workerState, error: stateError } = await supabase
      .from('worker_states')
      .select('is_checked_in')
      .eq('worker_id', workerId)
      .single();

    if (!stateError && workerState && workerState.is_checked_in) {
      throw new Error(`Worker is already checked in`);
    }

    // Now insert the check-in event
    const { data, error } = await supabase
      .from('check_in_events')
      .insert([
        {
          worker_id: workerId,
          site_id: siteId,
          event_type: 'check_in',
          timestamp: new Date().toISOString(),
        },
      ])
      .select();

    if (error) {
      console.error('Error checking in worker:', error);
      throw new Error(error.message || 'Failed to check in worker');
    }

    return data[0];
  } catch (error) {
    console.error('Check-in operation failed:', error);
    throw error;
  }
}

// Function to check out a worker
export async function checkOutWorker({ 
  workerId, 
  siteId 
}: { 
  workerId: string; 
  siteId: string; 
}) {
  if (!workerId || !siteId) {
    throw new Error("Worker ID and Site ID are required");
  }

  try {
    // First verify the worker exists
    const { data: workerExists, error: workerError } = await supabase
      .from('workers')
      .select('id')
      .eq('id', workerId)
      .single();
    
    if (workerError || !workerExists) {
      console.error('Worker verification error:', workerError);
      throw new Error(`Worker with ID ${workerId} not found`);
    }

    // Check if worker is actually checked in
    const { data: workerState, error: stateError } = await supabase
      .from('worker_states')
      .select('is_checked_in')
      .eq('worker_id', workerId)
      .single();

    if (!stateError && workerState && !workerState.is_checked_in) {
      throw new Error(`Worker is not checked in`);
    }

    // Now insert the check-out event
    const { data, error } = await supabase
      .from('check_in_events')
      .insert([
        {
          worker_id: workerId,
          site_id: siteId,
          event_type: 'check_out',
          timestamp: new Date().toISOString(),
        },
      ])
      .select();

    if (error) {
      console.error('Error checking out worker:', error);
      throw new Error(error.message || 'Failed to check out worker');
    }

    return data[0];
  } catch (error) {
    console.error('Check-out operation failed:', error);
    throw error;
  }
}

// Function to get all sites
export async function getSites() {
  const { data, error } = await supabase
    .from('sites')
    .select('*')
    .order('name');

  if (error) {
    console.error('Error fetching sites:', error);
    return [];
  }

  return data || [];
}

// Function to get all workers
export async function getWorkers() {
  const { data, error } = await supabase
    .from('workers')
    .select('*')
    .order('name');

  if (error) {
    console.error('Error fetching workers:', error);
    return [];
  }

  return data || [];
}

// Function to check if a worker is currently checked in
export async function isWorkerCheckedIn(workerId: string): Promise<boolean> {
  try {
    // Use the optimized worker_states table to get current status
    const { data, error } = await supabase
      .from('worker_states')
      .select('is_checked_in')
      .eq('worker_id', workerId)
      .single();

    if (error) {
      console.error('Error checking worker status:', error);
      return false;
    }

    return data?.is_checked_in || false;
  } catch (error) {
    console.error('Error determining worker check-in status:', error);
    return false;
  }
}

// Function to get a worker's current state
export async function getWorkerState(workerId: string): Promise<WorkerState | null> {
  try {
    const { data, error } = await supabase
      .from('worker_states')
      .select(`
        id,
        worker_id,
        site_id,
        is_checked_in,
        last_check_in,
        last_check_out,
        updated_at
      `)
      .eq('worker_id', workerId)
      .single();

    if (error) {
      console.error('Error fetching worker state:', error);
      return null;
    }

    return data as WorkerState;
  } catch (error) {
    console.error('Error fetching worker state:', error);
    return null;
  }
}

// Function to get all workers with their current status
export async function getWorkersWithStatus() {
  try {
    const { data, error } = await supabase
      .from('worker_states')
      .select(`
        id,
        worker_id,
        site_id,
        is_checked_in,
        last_check_in,
        last_check_out,
        workers:worker_id (
          id,
          name
        ),
        sites:site_id (
          id,
          name
        )
      `)
      .order('updated_at', { ascending: false });

    if (error) {
      console.error('Error fetching workers with status:', error);
      return [];
    }

    return data || [];
  } catch (error) {
    console.error('Error fetching workers with status:', error);
    return [];
  }
}

// Function to update site emergency status
export async function updateSiteEmergencyStatus(siteId: string, emergencyStatus: boolean) {
  try {
    // First verify that the site exists
    const { data: siteExists, error: siteError } = await supabase
      .from('sites')
      .select('id, name, emergency')
      .eq('id', siteId)
      .single();
    
    if (siteError || !siteExists) {
      throw new Error(`Site with ID ${siteId} not found`);
    }
    
    // Skip update if state is already what we want
    if (siteExists.emergency === emergencyStatus) {
      return siteExists;
    }
    
    // Call the RPC function to update the site
    const { error: rpcError } = await supabase
      .rpc('update_site_emergency', {
        site_id: siteId,
        emergency_status: emergencyStatus
      });

    if (rpcError) {
      throw new Error(`Failed to update emergency status: ${rpcError.message}`);
    }

    // Verify the update
    const { data: verifyData, error: verifyError } = await supabase
      .from('sites')
      .select('id, name, emergency')
      .eq('id', siteId)
      .single();
      
    if (verifyError) {
      throw new Error('Failed to verify update');
    }
    
    if (verifyData.emergency !== emergencyStatus) {
      throw new Error('Update did not take effect in the database');
    }
    
    return verifyData;
  } catch (error) {
    throw error;
  }
}

// Function to get site emergency status
export async function getSiteEmergencyStatus(siteId: string): Promise<boolean> {
  try {
    const { data } = await supabase
      .from('sites')
      .select('emergency')
      .eq('id', siteId)
      .single();

    return data?.emergency || false;
  } catch {
    return false;
  }
} 