import { createClient } from "@supabase/supabase-js";

const SUPABASE_URL = "https://kuxrgsdhzrmbhfkjjgix.supabase.co";
const SUPABASE_PUBLISHABLE_KEY = "sb_publishable_ZlfyUmMQJT27Vhl3CGQbZA_8BTLpMbI";

export const supabase = createClient(SUPABASE_URL, SUPABASE_PUBLISHABLE_KEY);
