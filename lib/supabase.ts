import { createBrowserClient } from "@supabase/ssr";

// Strip BOM (﻿) that PowerShell/Windows tooling may prepend to env vars
function cleanEnv(value: string | undefined): string {
  return (value ?? "").replace(/^﻿/, "").trim();
}

const SUPABASE_URL = cleanEnv(process.env.NEXT_PUBLIC_SUPABASE_URL);
const SUPABASE_KEY = cleanEnv(process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY);

export function createClient() {
  return createBrowserClient(SUPABASE_URL, SUPABASE_KEY);
}

export const supabase = createClient();
