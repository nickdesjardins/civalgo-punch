-- Create the sites table
CREATE TABLE IF NOT EXISTS sites (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW() NOT NULL
);

-- Create the workers table
CREATE TABLE IF NOT EXISTS workers (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  site_id UUID REFERENCES sites(id) NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW() NOT NULL
);

-- Create the check_in_events table
CREATE TABLE IF NOT EXISTS check_in_events (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  worker_id UUID REFERENCES workers(id) NOT NULL,
  site_id UUID REFERENCES sites(id) NOT NULL,
  timestamp TIMESTAMP WITH TIME ZONE DEFAULT NOW() NOT NULL,
  event_type TEXT CHECK (event_type IN ('check_in', 'check_out')) NOT NULL
);

-- Create indexes for better query performance
CREATE INDEX IF NOT EXISTS check_in_events_worker_id_idx ON check_in_events(worker_id);
CREATE INDEX IF NOT EXISTS check_in_events_site_id_idx ON check_in_events(site_id);
CREATE INDEX IF NOT EXISTS check_in_events_event_type_idx ON check_in_events(event_type);
CREATE INDEX IF NOT EXISTS check_in_events_timestamp_idx ON check_in_events(timestamp);
CREATE INDEX IF NOT EXISTS workers_site_id_idx ON workers(site_id);

-- Enable Row Level Security (RLS) on all tables
ALTER TABLE sites ENABLE ROW LEVEL SECURITY;
ALTER TABLE workers ENABLE ROW LEVEL SECURITY;
ALTER TABLE check_in_events ENABLE ROW LEVEL SECURITY;

-- Create policies to allow access to the data
-- In a real app, you would restrict these policies further
CREATE POLICY "Allow public read access to sites"
  ON sites FOR SELECT
  USING (true);

CREATE POLICY "Allow public read access to workers"
  ON workers FOR SELECT
  USING (true);

CREATE POLICY "Allow public read access to check_in_events"
  ON check_in_events FOR SELECT
  USING (true);

CREATE POLICY "Allow public insert to check_in_events"
  ON check_in_events FOR INSERT
  WITH CHECK (true); 