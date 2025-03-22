-- Create worker_states table to track current check-in status
CREATE TABLE IF NOT EXISTS worker_states (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  worker_id UUID REFERENCES workers(id) NOT NULL UNIQUE,
  site_id UUID REFERENCES sites(id),
  is_checked_in BOOLEAN NOT NULL DEFAULT false,
  last_check_in TIMESTAMP WITH TIME ZONE,
  last_check_out TIMESTAMP WITH TIME ZONE,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW() NOT NULL
);

-- Create index for faster worker lookup
CREATE INDEX IF NOT EXISTS worker_states_worker_id_idx ON worker_states(worker_id);
CREATE INDEX IF NOT EXISTS worker_states_site_id_idx ON worker_states(site_id);
CREATE INDEX IF NOT EXISTS worker_states_is_checked_in_idx ON worker_states(is_checked_in);

-- Enable Row Level Security on the worker_states table
ALTER TABLE worker_states ENABLE ROW LEVEL SECURITY;

-- Create policy to allow public read access to worker_states
CREATE POLICY "Allow public read access to worker_states"
  ON worker_states FOR SELECT
  USING (true);

-- Create policy to allow public update access to worker_states
CREATE POLICY "Allow public update to worker_states"
  ON worker_states FOR UPDATE
  USING (true);

-- Create policy to allow public insert access to worker_states
CREATE POLICY "Allow public insert to worker_states"
  ON worker_states FOR INSERT
  WITH CHECK (true);

-- Trigger function to update worker_states when check_in_events change
CREATE OR REPLACE FUNCTION update_worker_state()
RETURNS TRIGGER AS $$
BEGIN
  -- Check if this is a check-in event
  IF NEW.event_type = 'check_in' THEN
    -- Insert or update the worker state
    INSERT INTO worker_states (worker_id, site_id, is_checked_in, last_check_in, updated_at)
    VALUES (NEW.worker_id, NEW.site_id, true, NEW.timestamp, NOW())
    ON CONFLICT (worker_id) 
    DO UPDATE SET 
      is_checked_in = true,
      site_id = NEW.site_id,
      last_check_in = NEW.timestamp,
      updated_at = NOW();
  
  -- Check if this is a check-out event
  ELSIF NEW.event_type = 'check_out' THEN
    -- Update the worker state
    UPDATE worker_states 
    SET is_checked_in = false,
        last_check_out = NEW.timestamp,
        updated_at = NOW()
    WHERE worker_id = NEW.worker_id;
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create trigger on check_in_events
CREATE TRIGGER update_worker_state_trigger
AFTER INSERT ON check_in_events
FOR EACH ROW
EXECUTE FUNCTION update_worker_state();

-- Add function to initialize worker_states from existing check_in_events
CREATE OR REPLACE FUNCTION initialize_worker_states()
RETURNS VOID AS $$
DECLARE
  worker_record RECORD;
  last_check_in TIMESTAMP WITH TIME ZONE;
  last_check_out TIMESTAMP WITH TIME ZONE;
  current_site UUID;
  is_in BOOLEAN;
BEGIN
  -- Loop through all workers
  FOR worker_record IN SELECT id FROM workers LOOP
    -- Get the latest check-in
    SELECT timestamp, site_id INTO last_check_in, current_site
    FROM check_in_events
    WHERE worker_id = worker_record.id AND event_type = 'check_in'
    ORDER BY timestamp DESC
    LIMIT 1;
    
    -- Get the latest check-out
    SELECT timestamp INTO last_check_out
    FROM check_in_events
    WHERE worker_id = worker_record.id AND event_type = 'check_out'
    ORDER BY timestamp DESC
    LIMIT 1;
    
    -- Determine if the worker is checked in
    is_in := last_check_in IS NOT NULL AND (last_check_out IS NULL OR last_check_in > last_check_out);
    
    -- Insert or update the worker state using EXCLUDED to reference the values being inserted
    INSERT INTO worker_states (worker_id, site_id, is_checked_in, last_check_in, last_check_out, updated_at)
    VALUES (
      worker_record.id, 
      CASE WHEN is_in THEN current_site ELSE NULL END,
      is_in,
      last_check_in,
      last_check_out,
      NOW()
    )
    ON CONFLICT (worker_id) 
    DO UPDATE SET 
      site_id = EXCLUDED.site_id,
      is_checked_in = EXCLUDED.is_checked_in,
      last_check_in = EXCLUDED.last_check_in,
      last_check_out = EXCLUDED.last_check_out,
      updated_at = EXCLUDED.updated_at;
  END LOOP;
END;
$$ LANGUAGE plpgsql;

-- Run the initialization for existing data
SELECT initialize_worker_states(); 