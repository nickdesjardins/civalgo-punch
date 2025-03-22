-- Seed data for sites
INSERT INTO sites (id, name)
VALUES
  ('5f7e1b2a-8f9d-4c6e-a7b5-9f3e2d1c8b4a', 'Main Construction Site'),
  ('6a8b4c2d-9e7f-5a3d-8c1e-2b6f9d7a5e3c', 'Downtown Project'),
  ('7c9e5d3f-2a1b-6c8d-9e7f-4a2b6c8d9e7f', 'Highway Expansion')
ON CONFLICT (id) DO NOTHING;

-- Seed data for workers
INSERT INTO workers (id, name, site_id)
VALUES
  ('a1b2c3d4-e5f6-4a5b-9c8d-7e6f5d4c3b2a', 'John Smith', '5f7e1b2a-8f9d-4c6e-a7b5-9f3e2d1c8b4a'),
  ('b2c3d4e5-f6a7-5b6c-8d9e-7f8a9b0c1d2e', 'Emily Johnson', '5f7e1b2a-8f9d-4c6e-a7b5-9f3e2d1c8b4a'),
  ('c3d4e5f6-a7b8-6c7d-9e0f-8a9b0c1d2e3f', 'Michael Williams', '5f7e1b2a-8f9d-4c6e-a7b5-9f3e2d1c8b4a'),
  ('d4e5f6a7-b8c9-7d8e-0f1a-9b0c1d2e3f4a', 'Jessica Brown', '5f7e1b2a-8f9d-4c6e-a7b5-9f3e2d1c8b4a'),
  ('e5f6a7b8-c9d0-8e9f-1a2b-0c1d2e3f4a5b', 'Robert Jones', '6a8b4c2d-9e7f-5a3d-8c1e-2b6f9d7a5e3c'),
  ('f6a7b8c9-d0e1-9f0a-2b3c-1d2e3f4a5b6c', 'Sarah Davis', '6a8b4c2d-9e7f-5a3d-8c1e-2b6f9d7a5e3c'),
  ('a7b8c9d0-e1f2-0a1b-3c4d-2e3f4a5b6c7d', 'David Miller', '6a8b4c2d-9e7f-5a3d-8c1e-2b6f9d7a5e3c'),
  ('b8c9d0e1-f2a3-1b2c-4d5e-3f4a5b6c7d8e', 'Jennifer Wilson', '7c9e5d3f-2a1b-6c8d-9e7f-4a2b6c8d9e7f'),
  ('c9d0e1f2-a3b4-2c3d-5e6f-4a5b6c7d8e9f', 'Richard Moore', '7c9e5d3f-2a1b-6c8d-9e7f-4a2b6c8d9e7f'),
  ('d0e1f2a3-b4c5-3d4e-6f7a-5b6c7d8e9f0a', 'Lisa Taylor', '7c9e5d3f-2a1b-6c8d-9e7f-4a2b6c8d9e7f')
ON CONFLICT (id) DO NOTHING;

-- Seed some check-in events for today
-- Calculate timestamps relative to current time
DO $$
DECLARE
  current_date TIMESTAMP WITH TIME ZONE := NOW();
  morning_time TIMESTAMP WITH TIME ZONE;
  checkout_time TIMESTAMP WITH TIME ZONE;
BEGIN
  -- Set morning time to 7:00 AM today
  morning_time := DATE_TRUNC('day', current_date) + INTERVAL '7 hours';
  
  -- Only seed data if it's after 7 AM (to avoid timing issues)
  IF current_date > morning_time THEN
    -- John Smith checked in in the morning and hasn't checked out
    INSERT INTO check_in_events (worker_id, site_id, timestamp, event_type)
    VALUES ('a1b2c3d4-e5f6-4a5b-9c8d-7e6f5d4c3b2a', '5f7e1b2a-8f9d-4c6e-a7b5-9f3e2d1c8b4a', morning_time, 'check_in');

    -- Emily Johnson checked in and then out
    INSERT INTO check_in_events (worker_id, site_id, timestamp, event_type)
    VALUES 
      ('b2c3d4e5-f6a7-5b6c-8d9e-7f8a9b0c1d2e', '5f7e1b2a-8f9d-4c6e-a7b5-9f3e2d1c8b4a', morning_time + INTERVAL '15 minutes', 'check_in'),
      ('b2c3d4e5-f6a7-5b6c-8d9e-7f8a9b0c1d2e', '5f7e1b2a-8f9d-4c6e-a7b5-9f3e2d1c8b4a', morning_time + INTERVAL '4 hours', 'check_out');

    -- Michael Williams checked in a bit later and is still on site
    INSERT INTO check_in_events (worker_id, site_id, timestamp, event_type)
    VALUES ('c3d4e5f6-a7b8-6c7d-9e0f-8a9b0c1d2e3f', '5f7e1b2a-8f9d-4c6e-a7b5-9f3e2d1c8b4a', morning_time + INTERVAL '30 minutes', 'check_in');

    -- Robert Jones at Downtown Project
    INSERT INTO check_in_events (worker_id, site_id, timestamp, event_type)
    VALUES ('e5f6a7b8-c9d0-8e9f-1a2b-0c1d2e3f4a5b', '6a8b4c2d-9e7f-5a3d-8c1e-2b6f9d7a5e3c', morning_time + INTERVAL '5 minutes', 'check_in');

    -- Jennifer Wilson at Highway Expansion
    INSERT INTO check_in_events (worker_id, site_id, timestamp, event_type)
    VALUES ('b8c9d0e1-f2a3-1b2c-4d5e-3f4a5b6c7d8e', '7c9e5d3f-2a1b-6c8d-9e7f-4a2b6c8d9e7f', morning_time + INTERVAL '10 minutes', 'check_in');
  END IF;

  -- Add some historical data from yesterday
  INSERT INTO check_in_events (worker_id, site_id, timestamp, event_type)
  VALUES 
    -- John Smith yesterday
    ('a1b2c3d4-e5f6-4a5b-9c8d-7e6f5d4c3b2a', '5f7e1b2a-8f9d-4c6e-a7b5-9f3e2d1c8b4a', current_date - INTERVAL '1 day' + INTERVAL '7 hours', 'check_in'),
    ('a1b2c3d4-e5f6-4a5b-9c8d-7e6f5d4c3b2a', '5f7e1b2a-8f9d-4c6e-a7b5-9f3e2d1c8b4a', current_date - INTERVAL '1 day' + INTERVAL '16 hours', 'check_out'),
    
    -- Emily Johnson yesterday
    ('b2c3d4e5-f6a7-5b6c-8d9e-7f8a9b0c1d2e', '5f7e1b2a-8f9d-4c6e-a7b5-9f3e2d1c8b4a', current_date - INTERVAL '1 day' + INTERVAL '7 hours 30 minutes', 'check_in'),
    ('b2c3d4e5-f6a7-5b6c-8d9e-7f8a9b0c1d2e', '5f7e1b2a-8f9d-4c6e-a7b5-9f3e2d1c8b4a', current_date - INTERVAL '1 day' + INTERVAL '15 hours 45 minutes', 'check_out'),
    
    -- Data from 2 days ago
    ('c3d4e5f6-a7b8-6c7d-9e0f-8a9b0c1d2e3f', '5f7e1b2a-8f9d-4c6e-a7b5-9f3e2d1c8b4a', current_date - INTERVAL '2 days' + INTERVAL '8 hours', 'check_in'),
    ('c3d4e5f6-a7b8-6c7d-9e0f-8a9b0c1d2e3f', '5f7e1b2a-8f9d-4c6e-a7b5-9f3e2d1c8b4a', current_date - INTERVAL '2 days' + INTERVAL '16 hours 30 minutes', 'check_out'),
    ('d4e5f6a7-b8c9-7d8e-0f1a-9b0c1d2e3f4a', '5f7e1b2a-8f9d-4c6e-a7b5-9f3e2d1c8b4a', current_date - INTERVAL '2 days' + INTERVAL '7 hours 15 minutes', 'check_in'),
    ('d4e5f6a7-b8c9-7d8e-0f1a-9b0c1d2e3f4a', '5f7e1b2a-8f9d-4c6e-a7b5-9f3e2d1c8b4a', current_date - INTERVAL '2 days' + INTERVAL '17 hours', 'check_out');
END $$; 