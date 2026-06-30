import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.SUPABASE_URL;
const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

// Storage is optional — only initialise the client if both are configured,
// so the rest of the app keeps working even if uploads aren't set up yet.
export const supabase =
  supabaseUrl && serviceRoleKey ? createClient(supabaseUrl, serviceRoleKey) : null;

export const STORAGE_BUCKET = process.env.SUPABASE_STORAGE_BUCKET || 'outreach-photos';
