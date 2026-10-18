begin;
alter table public.athlete_members
 add column if not exists sport text check(sport in ('golf','baseball','tennis','soccer','sprint','basketball','lacrosse','volleyball','karate','naginata','other')),
 add column if not exists sport_other text check(length(sport_other)<=100),
 add column if not exists sport_role text check(sport_role in ('batter','pitcher','both')),
 add column if not exists throwing_hand text check(throwing_hand in ('R','L')),
 add column if not exists batting_hand text check(batting_hand in ('R','L'));
commit;
