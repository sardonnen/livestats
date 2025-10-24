-- ===== SCRIPT SQL POUR SUPABASE =====
-- Gestion d'Équipe - Création des Tables
-- À copier-coller dans Supabase SQL Editor

-- ===== 1. TABLE: TEAMS =====
CREATE TABLE IF NOT EXISTS teams (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name VARCHAR(50) NOT NULL UNIQUE,
    category VARCHAR(30),
    color VARCHAR(7) DEFAULT '#2196F3',
    player_count INTEGER DEFAULT 0,
    description TEXT,
    logo_url TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

COMMENT ON TABLE teams IS 'Équipes principales (U18, Seniors, etc.)';
COMMENT ON COLUMN teams.name IS 'Nom unique de l''équipe';
COMMENT ON COLUMN teams.category IS 'Catégorie (U12, U14, U16, U18, Seniors, Masters)';
COMMENT ON COLUMN teams.color IS 'Couleur principale en hexadécimal';
COMMENT ON COLUMN teams.player_count IS 'Nombre total de joueuses';

-- ===== 2. TABLE: PLAYERS =====
CREATE TABLE IF NOT EXISTS players (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    team_id UUID NOT NULL REFERENCES teams(id) ON DELETE CASCADE,
    name VARCHAR(30) NOT NULL,
    number INTEGER NOT NULL CHECK (number >= 1 AND number <= 99),
    position VARCHAR(2) NOT NULL CHECK (position IN ('GK', 'DF', 'MF', 'FW')),
    -- GK = Gardien, DF = Défenseur, MF = Milieu, FW = Attaquant
    date_of_birth DATE,
    height DECIMAL(3, 2),
    -- Stats acumulées
    goals_total INTEGER DEFAULT 0,
    assists_total INTEGER DEFAULT 0,
    play_time_total INTEGER DEFAULT 0, -- en secondes
    yellow_cards_total INTEGER DEFAULT 0,
    red_cards_total INTEGER DEFAULT 0,
    matches_played INTEGER DEFAULT 0,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE UNIQUE INDEX idx_players_team_number ON players(team_id, number);
COMMENT ON TABLE players IS 'Joueuses';
COMMENT ON COLUMN players.position IS 'Position: GK (Gardien), DF (Défenseur), MF (Milieu), FW (Attaquant)';
COMMENT ON COLUMN players.play_time_total IS 'Cumul du temps de jeu en secondes';

-- ===== 3. TABLE: COMPOSITIONS =====
CREATE TABLE IF NOT EXISTS compositions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    team_id UUID NOT NULL REFERENCES teams(id) ON DELETE CASCADE,
    players_ids UUID[] NOT NULL,
    formation VARCHAR(10) DEFAULT '4-2-3-1',
    -- Formations: 4-2-3-1, 4-3-3, 3-5-2, etc.
    bench_ids UUID[] DEFAULT '{}',
    is_active BOOLEAN DEFAULT FALSE,
    name VARCHAR(50),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX idx_compositions_team_id ON compositions(team_id);
CREATE INDEX idx_compositions_active ON compositions(team_id, is_active);
COMMENT ON TABLE compositions IS 'Compositions d''équipe (alignements)';
COMMENT ON COLUMN compositions.players_ids IS 'Array UUID des 11 titulaires';
COMMENT ON COLUMN compositions.bench_ids IS 'Array UUID des remplaçantes';
COMMENT ON COLUMN compositions.formation IS 'Formation tactique (4-2-3-1, 4-3-3, etc.)';

-- ===== 4. TABLE: MATCHES =====
CREATE TABLE IF NOT EXISTS matches (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    team_id UUID NOT NULL REFERENCES teams(id) ON DELETE CASCADE,
    opponent_name VARCHAR(50) NOT NULL,
    opponent_goals INTEGER DEFAULT 0,
    team_goals INTEGER DEFAULT 0,
    venue VARCHAR(100),
    match_date TIMESTAMP WITH TIME ZONE,
    status VARCHAR(20) DEFAULT 'pending',
    -- pending, live, finished, cancelled
    duration_seconds INTEGER,
    composition_id UUID REFERENCES compositions(id) ON DELETE SET NULL,
    notes TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX idx_matches_team_id ON matches(team_id);
CREATE INDEX idx_matches_status ON matches(status);
COMMENT ON TABLE matches IS 'Matchs joués';

-- ===== 5. TABLE: PLAYER_MATCH_STATS =====
CREATE TABLE IF NOT EXISTS player_match_stats (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    match_id UUID NOT NULL REFERENCES matches(id) ON DELETE CASCADE,
    player_id UUID NOT NULL REFERENCES players(id) ON DELETE CASCADE,
    team_id UUID NOT NULL REFERENCES teams(id) ON DELETE CASCADE,
    goals INTEGER DEFAULT 0,
    assists INTEGER DEFAULT 0,
    shots_on_target INTEGER DEFAULT 0,
    shots_off_target INTEGER DEFAULT 0,
    fouls_committed INTEGER DEFAULT 0,
    fouls_suffered INTEGER DEFAULT 0,
    yellow_cards INTEGER DEFAULT 0,
    red_cards INTEGER DEFAULT 0,
    play_time INTEGER DEFAULT 0, -- en secondes
    position_played VARCHAR(2), -- Position réelle en match
    starts BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE UNIQUE INDEX idx_player_match_stats_unique ON player_match_stats(match_id, player_id);
CREATE INDEX idx_player_match_stats_player_id ON player_match_stats(player_id);
CREATE INDEX idx_player_match_stats_match_id ON player_match_stats(match_id);
COMMENT ON TABLE player_match_stats IS 'Statistiques de chaque joueuse par match';

-- ===== 6. TABLE: EVENTS =====
CREATE TABLE IF NOT EXISTS events (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    match_id UUID NOT NULL REFERENCES matches(id) ON DELETE CASCADE,
    player_id UUID REFERENCES players(id) ON DELETE SET NULL,
    team_id UUID NOT NULL REFERENCES teams(id) ON DELETE CASCADE,
    event_type VARCHAR(20) NOT NULL,
    -- goal, assist, shot_on, shot_off, yellow_card, red_card, foul, offside, save
    minute INTEGER,
    second INTEGER,
    description TEXT,
    related_player_id UUID REFERENCES players(id) ON DELETE SET NULL,
    -- Pour les passes décisives, substitutions, etc.
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX idx_events_match_id ON events(match_id);
CREATE INDEX idx_events_player_id ON events(player_id);
CREATE INDEX idx_events_type ON events(event_type);
COMMENT ON TABLE events IS 'Événements en direct d''un match';

-- ===== 7. TABLE: PLAY_TIME_LOG =====
CREATE TABLE IF NOT EXISTS play_time_log (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    match_id UUID NOT NULL REFERENCES matches(id) ON DELETE CASCADE,
    player_id UUID NOT NULL REFERENCES players(id) ON DELETE CASCADE,
    team_id UUID NOT NULL REFERENCES teams(id) ON DELETE CASCADE,
    entry_minute INTEGER,
    entry_second INTEGER,
    exit_minute INTEGER,
    exit_second INTEGER,
    play_duration INTEGER DEFAULT 0, -- en secondes
    event_type VARCHAR(20),
    -- start, substitution_in, substitution_out, red_card_out
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX idx_play_time_log_match_id ON play_time_log(match_id);
CREATE INDEX idx_play_time_log_player_id ON play_time_log(player_id);
COMMENT ON TABLE play_time_log IS 'Historique entrées/sorties de joueuses';

-- ===== TRIGGERS =====

-- Fonction: Mettre à jour le timestamp
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger: teams
DROP TRIGGER IF EXISTS trigger_teams_updated_at ON teams;
CREATE TRIGGER trigger_teams_updated_at
    BEFORE UPDATE ON teams
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

-- Trigger: players
DROP TRIGGER IF EXISTS trigger_players_updated_at ON players;
CREATE TRIGGER trigger_players_updated_at
    BEFORE UPDATE ON players
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

-- Trigger: compositions
DROP TRIGGER IF EXISTS trigger_compositions_updated_at ON compositions;
CREATE TRIGGER trigger_compositions_updated_at
    BEFORE UPDATE ON compositions
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

-- Trigger: matches
DROP TRIGGER IF EXISTS trigger_matches_updated_at ON matches;
CREATE TRIGGER trigger_matches_updated_at
    BEFORE UPDATE ON matches
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

-- ===== ROW LEVEL SECURITY (RLS) =====

-- Activer RLS
ALTER TABLE teams ENABLE ROW LEVEL SECURITY;
ALTER TABLE players ENABLE ROW LEVEL SECURITY;
ALTER TABLE compositions ENABLE ROW LEVEL SECURITY;
ALTER TABLE matches ENABLE ROW LEVEL SECURITY;
ALTER TABLE player_match_stats ENABLE ROW LEVEL SECURITY;
ALTER TABLE events ENABLE ROW LEVEL SECURITY;
ALTER TABLE play_time_log ENABLE ROW LEVEL SECURITY;

-- Politique PUBLIC (développement) - À remplacer par auth en production
CREATE POLICY "Allow public access" ON teams FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Allow public access" ON players FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Allow public access" ON compositions FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Allow public access" ON matches FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Allow public access" ON player_match_stats FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Allow public access" ON events FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Allow public access" ON play_time_log FOR ALL USING (true) WITH CHECK (true);

-- ===== VUES UTILES =====

-- Vue: Statistiques complètes des joueuses
CREATE OR REPLACE VIEW vw_player_stats AS
SELECT
    p.id,
    p.team_id,
    p.name,
    p.number,
    p.position,
    p.goals_total,
    p.assists_total,
    p.play_time_total,
    p.yellow_cards_total,
    p.red_cards_total,
    p.matches_played,
    ROUND((p.play_time_total::numeric / 60)::numeric, 2) as play_time_minutes,
    CASE
        WHEN p.matches_played > 0 THEN ROUND((p.goals_total::numeric / p.matches_played)::numeric, 2)
        ELSE 0
    END as goals_per_match,
    t.name as team_name
FROM players p
LEFT JOIN teams t ON p.team_id = t.id
ORDER BY p.goals_total DESC;

COMMENT ON VIEW vw_player_stats IS 'Vue complète des statistiques des joueuses';

-- ===== DONNÉES EXEMPLES (OPTIONNEL) =====

-- Créer une équipe exemple
INSERT INTO teams (name, category, color, description)
VALUES ('U18 Féminines', 'U18', '#FF6B6B', 'Équipe U18 de football féminin')
ON CONFLICT DO NOTHING;

-- ===== FIN DU SCRIPT =====
-- Vérifier que tout a été créé
SELECT
    tablename
FROM pg_tables
WHERE schemaname = 'public'
ORDER BY tablename;