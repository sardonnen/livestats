-- ===== SCRIPT SQL SUPABASE - Football Stats Manager =====
-- A executer dans SQL Editor de Supabase
-- Version 1.2.0 - Compatible UUID

-- ===== SUPPRESSION DES TABLES EXISTANTES (OPTIONNEL) =====
-- Decommentez si vous voulez repartir de zero
-- DROP TABLE IF EXISTS match_events CASCADE;
-- DROP TABLE IF EXISTS compositions CASCADE;
-- DROP TABLE IF EXISTS players CASCADE;
-- DROP TABLE IF EXISTS matches CASCADE;
-- DROP TABLE IF EXISTS teams CASCADE;

-- ===== CRÃATION DES TABLES =====

-- Table teams (equipes)
CREATE TABLE IF NOT EXISTS teams (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name TEXT NOT NULL,
    category TEXT,
    color TEXT DEFAULT '#3498db',
    logo_url TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Table players (joueuses)
CREATE TABLE IF NOT EXISTS players (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    team_id UUID NOT NULL REFERENCES teams(id) ON DELETE CASCADE,
    name TEXT NOT NULL,
    position TEXT NOT NULL CHECK (position IN ('GK', 'DF', 'MF', 'FW')),
    number TEXT,  -- TEXT car peut etre vide ou "0", "1-99"
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Table matches (matchs)
CREATE TABLE IF NOT EXISTS matches (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    team_id UUID NOT NULL REFERENCES teams(id) ON DELETE CASCADE,
    opponent TEXT NOT NULL,
    date TIMESTAMP WITH TIME ZONE NOT NULL,
    location TEXT,
    status TEXT DEFAULT 'scheduled' CHECK (status IN ('scheduled', 'live', 'finished', 'cancelled')),
    score_team INTEGER DEFAULT 0,
    score_opponent INTEGER DEFAULT 0,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Table compositions (compositions de match)
CREATE TABLE IF NOT EXISTS compositions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    match_id UUID NOT NULL REFERENCES matches(id) ON DELETE CASCADE,
    player_id UUID NOT NULL REFERENCES players(id) ON DELETE CASCADE,
    is_starter BOOLEAN DEFAULT false,
    is_substitute BOOLEAN DEFAULT false,
    minutes_played INTEGER DEFAULT 0,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Table match_events (evenements/statistiques de match)
CREATE TABLE IF NOT EXISTS match_events (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    match_id UUID NOT NULL REFERENCES matches(id) ON DELETE CASCADE,
    player_id UUID REFERENCES players(id) ON DELETE SET NULL,
    team_id UUID NOT NULL REFERENCES teams(id) ON DELETE CASCADE,
    event_type TEXT NOT NULL CHECK (event_type IN (
        'goal', 'yellow_card', 'red_card', 'white_card', 
        'substitution_in', 'substitution_out',
        'shot_on_target', 'shot_off_target',
        'foul', 'offside', 'goalkeeper_save',
        'penalty', 'corner', 'freekick'
    )),
    minute INTEGER NOT NULL,
    additional_data JSONB,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- ===== INDEX POUR PERFORMANCE =====

-- Index sur team_id pour recherches rapides
CREATE INDEX IF NOT EXISTS idx_players_team ON players(team_id);
CREATE INDEX IF NOT EXISTS idx_matches_team ON matches(team_id);
CREATE INDEX IF NOT EXISTS idx_match_events_match ON match_events(match_id);
CREATE INDEX IF NOT EXISTS idx_match_events_player ON match_events(player_id);
CREATE INDEX IF NOT EXISTS idx_compositions_match ON compositions(match_id);

-- Index sur les dates pour tri chronologique
CREATE INDEX IF NOT EXISTS idx_matches_date ON matches(date DESC);
CREATE INDEX IF NOT EXISTS idx_match_events_minute ON match_events(minute);

-- ===== REAL-TIME SUBSCRIPTIONS =====

-- Activer les publications real-time pour sync automatique
ALTER PUBLICATION supabase_realtime ADD TABLE teams;
ALTER PUBLICATION supabase_realtime ADD TABLE players;
ALTER PUBLICATION supabase_realtime ADD TABLE matches;
ALTER PUBLICATION supabase_realtime ADD TABLE match_events;
ALTER PUBLICATION supabase_realtime ADD TABLE compositions;

-- ===== ROW LEVEL SECURITY (RLS) =====

-- Activer RLS sur toutes les tables
ALTER TABLE teams ENABLE ROW LEVEL SECURITY;
ALTER TABLE players ENABLE ROW LEVEL SECURITY;
ALTER TABLE matches ENABLE ROW LEVEL SECURITY;
ALTER TABLE match_events ENABLE ROW LEVEL SECURITY;
ALTER TABLE compositions ENABLE ROW LEVEL SECURITY;

-- ===== POLITIQUES D'ACCÃS =====

-- OPTION 1: Accès public total (pour prototypage/test)
-- Decommentez ces lignes pour permettre lecture/ecriture sans authentification

CREATE POLICY "Allow all operations on teams" ON teams FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Allow all operations on players" ON players FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Allow all operations on matches" ON matches FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Allow all operations on match_events" ON match_events FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Allow all operations on compositions" ON compositions FOR ALL USING (true) WITH CHECK (true);

-- OPTION 2: Accès authentifie uniquement (pour production)
-- Commentez l'OPTION 1 et decommentez ces lignes pour restreindre aux utilisateurs authentifies

/*
CREATE POLICY "Authenticated users can read teams" ON teams FOR SELECT USING (auth.role() = 'authenticated');
CREATE POLICY "Authenticated users can insert teams" ON teams FOR INSERT WITH CHECK (auth.role() = 'authenticated');
CREATE POLICY "Authenticated users can update teams" ON teams FOR UPDATE USING (auth.role() = 'authenticated');
CREATE POLICY "Authenticated users can delete teams" ON teams FOR DELETE USING (auth.role() = 'authenticated');

CREATE POLICY "Authenticated users can read players" ON players FOR SELECT USING (auth.role() = 'authenticated');
CREATE POLICY "Authenticated users can insert players" ON players FOR INSERT WITH CHECK (auth.role() = 'authenticated');
CREATE POLICY "Authenticated users can update players" ON players FOR UPDATE USING (auth.role() = 'authenticated');
CREATE POLICY "Authenticated users can delete players" ON players FOR DELETE USING (auth.role() = 'authenticated');

CREATE POLICY "Authenticated users can read matches" ON matches FOR SELECT USING (auth.role() = 'authenticated');
CREATE POLICY "Authenticated users can insert matches" ON matches FOR INSERT WITH CHECK (auth.role() = 'authenticated');
CREATE POLICY "Authenticated users can update matches" ON matches FOR UPDATE USING (auth.role() = 'authenticated');
CREATE POLICY "Authenticated users can delete matches" ON matches FOR DELETE USING (auth.role() = 'authenticated');

CREATE POLICY "Authenticated users can read match_events" ON match_events FOR SELECT USING (auth.role() = 'authenticated');
CREATE POLICY "Authenticated users can insert match_events" ON match_events FOR INSERT WITH CHECK (auth.role() = 'authenticated');
CREATE POLICY "Authenticated users can update match_events" ON match_events FOR UPDATE USING (auth.role() = 'authenticated');
CREATE POLICY "Authenticated users can delete match_events" ON match_events FOR DELETE USING (auth.role() = 'authenticated');

CREATE POLICY "Authenticated users can read compositions" ON compositions FOR SELECT USING (auth.role() = 'authenticated');
CREATE POLICY "Authenticated users can insert compositions" ON compositions FOR INSERT WITH CHECK (auth.role() = 'authenticated');
CREATE POLICY "Authenticated users can update compositions" ON compositions FOR UPDATE USING (auth.role() = 'authenticated');
CREATE POLICY "Authenticated users can delete compositions" ON compositions FOR DELETE USING (auth.role() = 'authenticated');
*/

-- ===== FONCTIONS UTILITAIRES =====

-- Fonction pour mettre a jour automatiquement updated_at
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Triggers pour updated_at automatique
DROP TRIGGER IF EXISTS update_teams_updated_at ON teams;
CREATE TRIGGER update_teams_updated_at
    BEFORE UPDATE ON teams
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS update_players_updated_at ON players;
CREATE TRIGGER update_players_updated_at
    BEFORE UPDATE ON players
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS update_matches_updated_at ON matches;
CREATE TRIGGER update_matches_updated_at
    BEFORE UPDATE ON matches
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

-- ===== DONNÃES DE TEST (OPTIONNEL) =====

-- Uncomment pour creer des donnees de test

/*
-- Equipe de test
INSERT INTO teams (name, category, color) VALUES 
    ('U17 Filles', 'Minimes', '#3498db'),
    ('U15 Garcons', 'Benjamins', '#e74c3c');

-- Joueuses de test (remplacer team_id par un vrai UUID de teams)
-- INSERT INTO players (team_id, name, position, number) VALUES
--     ('VOTRE-UUID-EQUIPE-ICI', 'Sophie Martin', 'FW', '10'),
--     ('VOTRE-UUID-EQUIPE-ICI', 'Marie Dubois', 'MF', '8'),
--     ('VOTRE-UUID-EQUIPE-ICI', 'Julie Bernard', 'DF', '4'),
--     ('VOTRE-UUID-EQUIPE-ICI', 'Claire Petit', 'GK', '1');
*/

-- ===== VÃRIFICATION =====

-- Afficher le schema
SELECT 
    table_name,
    column_name,
    data_type,
    is_nullable
FROM information_schema.columns
WHERE table_schema = 'public'
    AND table_name IN ('teams', 'players', 'matches', 'match_events', 'compositions')
ORDER BY table_name, ordinal_position;

-- Compter les enregistrements
SELECT 
    'teams' as table_name, COUNT(*) as count FROM teams
UNION ALL
SELECT 'players', COUNT(*) FROM players
UNION ALL
SELECT 'matches', COUNT(*) FROM matches
UNION ALL
SELECT 'match_events', COUNT(*) FROM match_events
UNION ALL
SELECT 'compositions', COUNT(*) FROM compositions;

-- ===== NOTES IMPORTANTES =====

/*
STRUCTURE FINALE:

teams
  ├── id: UUID (PRIMARY KEY)
  ├── name: TEXT
  ├── category: TEXT
  ├── color: TEXT
  ├── logo_url: TEXT
  ├── created_at: TIMESTAMP
  └── updated_at: TIMESTAMP

players
  ├── id: UUID (PRIMARY KEY)
  ├── team_id: UUID (FOREIGN KEY → teams.id)
  ├── name: TEXT
  ├── position: TEXT ('GK', 'DF', 'MF', 'FW')
  ├── number: TEXT  ← IMPORTANT: TEXT, pas INTEGER
  ├── created_at: TIMESTAMP
  └── updated_at: TIMESTAMP

matches
  ├── id: UUID (PRIMARY KEY)
  ├── team_id: UUID (FOREIGN KEY → teams.id)
  ├── opponent: TEXT
  ├── date: TIMESTAMP
  ├── location: TEXT
  ├── status: TEXT ('scheduled', 'live', 'finished', 'cancelled')
  ├── score_team: INTEGER
  ├── score_opponent: INTEGER
  ├── created_at: TIMESTAMP
  └── updated_at: TIMESTAMP

match_events
  ├── id: UUID (PRIMARY KEY)
  ├── match_id: UUID (FOREIGN KEY → matches.id)
  ├── player_id: UUID (FOREIGN KEY → players.id)
  ├── team_id: UUID (FOREIGN KEY → teams.id)
  ├── event_type: TEXT
  ├── minute: INTEGER
  ├── additional_data: JSONB
  └── created_at: TIMESTAMP

compositions
  ├── id: UUID (PRIMARY KEY)
  ├── match_id: UUID (FOREIGN KEY → matches.id)
  ├── player_id: UUID (FOREIGN KEY → players.id)
  ├── is_starter: BOOLEAN
  ├── is_substitute: BOOLEAN
  ├── minutes_played: INTEGER
  └── created_at: TIMESTAMP

SÃCURITÃ:
- RLS activé sur toutes les tables
- OPTION 1 (actuellement active): Accès public total
- OPTION 2 (commentée): Authentification requise

REAL-TIME:
- Toutes les tables activées pour subscriptions
- Synchronisation automatique client ↔ serveur

PERFORMANCE:
- Index sur toutes les foreign keys
- Index sur les dates pour tri
- Triggers pour updated_at automatique
*/

-- ===== FIN DU SCRIPT =====

SELECT '✅ Script SQL execute avec succes!' as status;