alter table session_presence
  add column if not exists heading float;  -- compass degrees 0=North, 90=East, null=unknown
