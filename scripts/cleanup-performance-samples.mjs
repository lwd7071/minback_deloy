import { createClient } from "@supabase/supabase-js";

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SECRET_KEY,
  { auth: { persistSession: false, autoRefreshToken: false } },
);
const cutoff = new Date(Date.now() - 14 * 24 * 60 * 60_000).toISOString();
const { error } = await supabase
  .from("performance_samples")
  .delete()
  .lt("created_at", cutoff);
if (error) throw error;
console.log(`Deleted performance samples older than ${cutoff}`);
