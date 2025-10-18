# livestats

# 🚀 Guide Complet - Supabase Setup pour Football Stats

## PARTIE 1 : Configuration Supabase (5 min)

### Étape 1 : Créer un compte Supabase
1. Allez sur https://supabase.com
2. Cliquez sur "Sign Up"
3. Connectez-vous avec GitHub (recommandé)
4. Créez un nouveau projet : `football-stats`

### Étape 2 : Récupérer vos clés d'accès
1. Dans le dashboard Supabase, cliquez sur ⚙️ "Project Settings"
2. Allez dans "API"
3. Notez ces 2 informations (très important !) :
   - **SUPABASE_URL** : `https://xxxxx.supabase.co`
   - **SUPABASE_ANON_KEY** : `eyJhbG...` (longue clé)
4. Gardez ces clés de côté ✅

### Étape 3 : Créer les tables dans Supabase

Dans le dashboard Supabase, allez dans "SQL Editor" et exécutez ce script complet :

```sql
-- ===== TABLES POUR FOOTBALL STATS =====

-- 1️⃣ TABLE DES ÉQUIPES
CREATE TABLE IF NOT EXISTS teams (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name VARCHAR(255) NOT NULL,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

-- 2️⃣ TABLE DES JOUEUSES
CREATE TABLE IF NOT EXISTS players (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  team_id UUID REFERENCES teams(id) ON DELETE CASCADE,
  name VARCHAR(255) NOT NULL,
  number INTEGER,
  position VARCHAR(50),
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

-- 3️⃣ TABLE DES MATCHS
CREATE TABLE IF NOT EXISTS matches (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  team_id UUID REFERENCES teams(id) ON DELETE CASCADE,
  team_name VARCHAR(255) NOT NULL,
  opponent_name VARCHAR(255) NOT NULL,
  team_score INTEGER DEFAULT 0,
  opponent_score INTEGER DEFAULT 0,
  duration INTEGER DEFAULT 90,
  venue VARCHAR(255),
  match_date TIMESTAMP DEFAULT NOW(),
  status VARCHAR(50) DEFAULT 'pending', -- pending, ongoing, finished
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

-- 4️⃣ TABLE DES ÉVÉNEMENTS (actions pendant le match)
CREATE TABLE IF NOT EXISTS match_events (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  match_id UUID REFERENCES matches(id) ON DELETE CASCADE,
  player_id UUID REFERENCES players(id) ON DELETE SET NULL,
  event_type VARCHAR(50) NOT NULL, -- goal, shot_on_target, shot_off_target, card, foul, assist, substitution_out, substitution_in
  event_time INTEGER NOT NULL, -- temps en secondes
  is_team BOOLEAN NOT NULL, -- vrai si action de notre équipe
  card_type VARCHAR(20), -- yellow, red, white (null si pas carton)
  created_at TIMESTAMP DEFAULT NOW()
);

-- 5️⃣ TABLE DES STATISTIQUES JOUEUR
CREATE TABLE IF NOT EXISTS player_match_stats (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  match_id UUID REFERENCES matches(id) ON DELETE CASCADE,
  player_id UUID REFERENCES players(id) ON DELETE CASCADE,
  goals INTEGER DEFAULT 0,
  assists INTEGER DEFAULT 0,
  shots_on_target INTEGER DEFAULT 0,
  shots_off_target INTEGER DEFAULT 0,
  fouls INTEGER DEFAULT 0,
  yellow_cards INTEGER DEFAULT 0,
  red_cards INTEGER DEFAULT 0,
  white_cards INTEGER DEFAULT 0,
  play_time_minutes INTEGER DEFAULT 0, -- temps de jeu en minutes
  position_played VARCHAR(50),
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

-- 6️⃣ TABLE DES TEMPS DE JEU (entrees/sorties joueuses)
CREATE TABLE IF NOT EXISTS player_play_times (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  match_id UUID REFERENCES matches(id) ON DELETE CASCADE,
  player_id UUID REFERENCES players(id) ON DELETE CASCADE,
  event_type VARCHAR(20) NOT NULL, -- entry, exit
  event_time INTEGER NOT NULL, -- temps en secondes
  created_at TIMESTAMP DEFAULT NOW()
);

-- 7️⃣ TABLE DES STATISTIQUES ÉQUIPE ADVERSE
CREATE TABLE IF NOT EXISTS opponent_stats (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  match_id UUID REFERENCES matches(id) ON DELETE CASCADE,
  goals INTEGER DEFAULT 0,
  shots_on_target INTEGER DEFAULT 0,
  shots_off_target INTEGER DEFAULT 0,
  fouls INTEGER DEFAULT 0,
  yellow_cards INTEGER DEFAULT 0,
  red_cards INTEGER DEFAULT 0,
  white_cards INTEGER DEFAULT 0,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

-- ===== INDEXES POUR PERFORMANCE =====
CREATE INDEX idx_players_team_id ON players(team_id);
CREATE INDEX idx_matches_team_id ON matches(team_id);
CREATE INDEX idx_match_events_match_id ON match_events(match_id);
CREATE INDEX idx_match_events_player_id ON match_events(player_id);
CREATE INDEX idx_player_stats_match_id ON player_match_stats(match_id);
CREATE INDEX idx_player_stats_player_id ON player_match_stats(player_id);
CREATE INDEX idx_play_times_match_id ON player_play_times(match_id);
CREATE INDEX idx_opponent_stats_match_id ON opponent_stats(match_id);

-- ===== ROW LEVEL SECURITY (RLS) =====
ALTER TABLE teams ENABLE ROW LEVEL SECURITY;
ALTER TABLE players ENABLE ROW LEVEL SECURITY;
ALTER TABLE matches ENABLE ROW LEVEL SECURITY;
ALTER TABLE match_events ENABLE ROW LEVEL SECURITY;
ALTER TABLE player_match_stats ENABLE ROW LEVEL SECURITY;
ALTER TABLE player_play_times ENABLE ROW LEVEL SECURITY;
ALTER TABLE opponent_stats ENABLE ROW LEVEL SECURITY;

-- Politique d'accès - Tous les utilisateurs peuvent lire et écrire (à adapter selon vos besoins)
CREATE POLICY "Enable all operations for authenticated users" ON teams
  FOR ALL USING (TRUE) WITH CHECK (TRUE);

CREATE POLICY "Enable all operations for authenticated users" ON players
  FOR ALL USING (TRUE) WITH CHECK (TRUE);

CREATE POLICY "Enable all operations for authenticated users" ON matches
  FOR ALL USING (TRUE) WITH CHECK (TRUE);

CREATE POLICY "Enable all operations for authenticated users" ON match_events
  FOR ALL USING (TRUE) WITH CHECK (TRUE);

CREATE POLICY "Enable all operations for authenticated users" ON player_match_stats
  FOR ALL USING (TRUE) WITH CHECK (TRUE);

CREATE POLICY "Enable all operations for authenticated users" ON player_play_times
  FOR ALL USING (TRUE) WITH CHECK (TRUE);

CREATE POLICY "Enable all operations for authenticated users" ON opponent_stats
  FOR ALL USING (TRUE) WITH CHECK (TRUE);
```

⏱️ **Cliquez sur "Run" et attendez le message de succès ✅**

---

## PARTIE 2 : Configuration dans votre Application

### Étape 1 : Créer le fichier `js/supabase-config.js`

```javascript
// Configuration Supabase
const SUPABASE_URL = 'https://VOTRE_URL.supabase.co';
const SUPABASE_ANON_KEY = 'VOTRE_ANON_KEY';

// Importer la librairie Supabase
const { createClient } = supabase;

// Créer le client Supabase
const supabaseClient = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

console.log('✅ Client Supabase initialisé');
```

**⚠️ IMPORTANT :**
- Remplacez `VOTRE_URL` par votre `SUPABASE_URL`
- Remplacez `VOTRE_ANON_KEY` par votre `SUPABASE_ANON_KEY`

### Étape 2 : Ajouter la librairie Supabase à votre `index.html`

Avant la fermeture `</body>`, ajoutez :

```html
<!-- Supabase -->
<script src="https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2"></script>
<script src="js/supabase-config.js"></script>
```

---

## PARTIE 3 : Vérifier que tout fonctionne

### Test 1 : Vérifier la connexion
1. Ouvrez votre application dans le navigateur
2. Ouvrez la console (F12)
3. Vous devez voir : `✅ Client Supabase initialisé`

### Test 2 : Vérifier les tables
1. Dans le dashboard Supabase, allez dans "Table Editor"
2. Vous devez voir toutes les tables créées (teams, players, matches, etc.)

### Test 3 : Insérer des données test
Dans la console du navigateur, exécutez :

```javascript
// Test insertion
const { data, error } = await supabaseClient
  .from('teams')
  .insert({ name: 'Mon Équipe' })
  .select();

console.log('Données insérées :', data);
console.log('Erreur :', error);
```

✅ **Vous devez voir vos données insérées dans la console !**

---

## ⚠️ Points Importants

1. **Clés d'accès** : Les clés sont visibles dans le code. C'est normal pour `ANON_KEY`. Ne jamais partager votre `MASTER_KEY`.

2. **Politiques RLS** : Actuellement très permissives. En production, à sécuriser.

3. **Données** : Supabase offre **500 MB gratuit** avec authentification gratuite.

4. **Quotas gratuits** :
   - Stockage : 500 MB
   - Requests : 2 millions/mois
   - Suffisant pour vos besoins !

---

## ✅ Checklist Complète

- [ ] Compte Supabase créé
- [ ] Clés récupérées (URL + ANON_KEY)
- [ ] Script SQL exécuté avec succès
- [ ] Fichier `js/supabase-config.js` créé
- [ ] Librairie Supabase ajoutée à `index.html`
- [ ] Test de connexion OK (message dans console)
- [ ] Tables visibles dans Supabase Dashboard
- [ ] Test d'insertion réussi

**Une fois tout OK, on crée les modules de gestion des données ! 🚀**