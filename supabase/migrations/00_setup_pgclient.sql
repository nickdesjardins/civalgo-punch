-- Create an RPC function that allows executing arbitrary SQL from the client
-- This is used by the setup-db.js script to run migrations and seeds
-- WARNING: This grants a lot of power to the anon role, consider restricting this in production

-- Create the pgclient function
CREATE OR REPLACE FUNCTION pgclient(query text)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  result JSONB;
BEGIN
  EXECUTE query;
  result := json_build_object('success', true)::JSONB;
  RETURN result;
EXCEPTION WHEN OTHERS THEN
  RETURN json_build_object(
    'success', false,
    'error', SQLERRM,
    'detail', SQLSTATE
  )::JSONB;
END;
$$;

-- Grant execute permission to anon role (for setup-db.js script)
GRANT EXECUTE ON FUNCTION pgclient TO anon;

COMMENT ON FUNCTION pgclient IS 'Execute arbitrary SQL queries. WARNING: This grants significant power to the anon role. For development and setup use only.'; 