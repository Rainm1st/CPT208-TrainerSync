alter table session_presence
  add column if not exists raw_lat double precision,
  add column if not exists raw_lng double precision;
