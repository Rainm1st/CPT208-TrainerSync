-- ══════════════════════════════════════════════════════════
-- 003_presence_location.sql — Add gym position to presence
-- Run in: Supabase Dashboard → SQL Editor
-- ══════════════════════════════════════════════════════════

alter table session_presence
  add column if not exists gym_x float,
  add column if not exists gym_y float;
