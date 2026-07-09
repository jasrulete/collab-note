import { createBrowserClient } from "@supabase/ssr";

// Browser-only singleton — safe to import in 'use client' components
export const supabase = createBrowserClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
);
