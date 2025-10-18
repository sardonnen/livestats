// ===== SUPABASE SYNC MODULE =====
// Synchronisation bidirectionnelle localStorage ↔ Supabase

class SupabaseSync {
    constructor(supabaseUrl, supabaseKey) {
        this.url = supabaseUrl;
        this.key = supabaseKey;
        this.ready = false;
        this.client = null;
        this.connectionStatus = 'disconnected';
        
        this.initClient();
    }

    /**
     * Initialiser le client Supabase
     */
    initClient() {
        try {
            if (window.supabase) {
                this.client = window.supabase.createClient(this.url, this.key);
                this.ready = true;
                this.connectionStatus = 'connected';
                console.log('✅ Client Supabase initialisé');
                return true;
            } else {
                console.warn('⚠️ Supabase JS SDK non chargé');
                return false;
            }
        } catch (error) {
            console.error('❌ Erreur init Supabase:', error);
            this.ready = false;
            return false;
        }
    }

    isReady() {
        return this.ready && this.client !== null;
    }

    // ===== ÉQUIPES =====

    async createTeamRemote(team) {
        if (!this.isReady()) return null;
        try {
            const { data, error } = await this.client
                .from('teams')
                .insert([{
                    name: team.name,
                    category: team.category,
                    color: team.color,
                    logo_url: team.logo_url
                }])
                .select();
            if (error) throw error;
            console.log('✅ Équipe créée:', team.name);
            return data[0];
        } catch (error) {
            console.error('❌ Erreur création équipe:', error);
            return null;
        }
    }

    async downloadTeams() {
        if (!this.isReady()) return [];
        try {
            const { data, error } = await this.client
                .from('teams')
                .select('*, players(*)');
            if (error) throw error;
            console.log('✅ Équipes téléchargées:', data.length);
            return data;
        } catch (error) {
            console.error('❌ Erreur téléchargement équipes:', error);
            return [];
        }
    }

    async updateTeamRemote(team) {
        if (!this.isReady()) return null;
        try {
            const { data, error } = await this.client
                .from('teams')
                .update({
                    name: team.name,
                    category: team.category,
                    color: team.color,
                    updated_at: new Date().toISOString()
                })
                .eq('id', team.id)
                .select();
            if (error) throw error;
            return data[0];
        } catch (error) {
            console.error('❌ Erreur mise à jour équipe:', error);
            return null;
        }
    }

    async deleteTeamRemote(teamId) {
        if (!this.isReady()) return false;
        try {
            const { error } = await this.client
                .from('teams')
                .delete()
                .eq('id', teamId);
            if (error) throw error;
            console.log('✅ Équipe supprimée');
            return true;
        } catch (error) {
            console.error('❌ Erreur suppression équipe:', error);
            return false;
        }
    }

    // ===== JOUEUSES =====

    async addPlayerRemote(player) {
        if (!this.isReady()) return null;
        try {
            const { data, error } = await this.client
                .from('players')
                .insert([{
                    team_id: player.team_id,
                    name: player.name,
                    position: player.position,
                    number: player.number
                }])
                .select();
            if (error) throw error;
            return data[0];
        } catch (error) {
            console.error('❌ Erreur ajout joueuse:', error);
            return null;
        }
    }

    async updatePlayerRemote(player) {
        if (!this.isReady()) return null;
        try {
            const { data, error } = await this.client
                .from('players')
                .update({
                    name: player.name,
                    position: player.position,
                    number: player.number,
                    updated_at: new Date().toISOString()
                })
                .eq('id', player.id)
                .select();
            if (error) throw error;
            return data[0];
        } catch (error) {
            console.error('❌ Erreur mise à jour joueuse:', error);
            return null;
        }
    }

    async removePlayerRemote(playerId) {
        if (!this.isReady()) return false;
        try {
            const { error } = await this.client
                .from('players')
                .delete()
                .eq('id', playerId);
            if (error) throw error;
            return true;
        } catch (error) {
            console.error('❌ Erreur suppression joueuse:', error);
            return false;
        }
    }

    // ===== MATCHS =====

    async createMatchRemote(match) {
        if (!this.isReady()) return null;
        try {
            const { data, error } = await this.client
                .from('matches')
                .insert([{
                    team_id: match.team_id,
                    opponent_name: match.opponent_name,
                    venue: match.venue,
                    match_date: match.match_date || new Date().toISOString(),
                    status: 'in_progress'
                }])
                .select();
            if (error) throw error;
            console.log('✅ Match créé:', match.opponent_name);
            return data[0];
        } catch (error) {
            console.error('❌ Erreur création match:', error);
            return null;
        }
    }

    async updateMatchRemote(match) {
        if (!this.isReady()) return null;
        try {
            const { data, error } = await this.client
                .from('matches')
                .update({
                    score_team: match.score_team,
                    score_opponent: match.score_opponent,
                    half: match.half,
                    match_time: match.match_time,
                    status: match.status,
                    updated_at: new Date().toISOString()
                })
                .eq('id', match.id)
                .select();
            if (error) throw error;
            return data[0];
        } catch (error) {
            console.error('❌ Erreur mise à jour match:', error);
            return null;
        }
    }

    // ===== ÉVÉNEMENTS =====

    async recordEventRemote(event) {
        if (!this.isReady()) return null;
        try {
            const { data, error } = await this.client
                .from('match_events')
                .insert([{
                    match_id: event.match_id,
                    team_id: event.team_id,
                    player_id: event.player_id,
                    event_type: event.event_type,
                    event_details: event.event_details,
                    match_minute: event.match_minute,
                    half: event.half,
                    is_team_event: event.is_team_event
                }])
                .select();
            if (error) throw error;
            return data[0];
        } catch (error) {
            console.error('❌ Erreur enregistrement événement:', error);
            return null;
        }
    }

    // ===== COMPOSITIONS =====

    async saveCompositionRemote(composition) {
        if (!this.isReady()) return null;
        try {
            const { data, error } = await this.client
                .from('match_compositions')
                .insert(composition)
                .select();
            if (error) throw error;
            console.log('✅ Composition sauvegardée');
            return data;
        } catch (error) {
            console.error('❌ Erreur sauvegarde composition:', error);
            return null;
        }
    }

    // ===== STATS JOUEUR =====

    async updatePlayerStatsRemote(stats) {
        if (!this.isReady()) return null;
        try {
            const { data, error } = await this.client
                .from('player_match_stats')
                .upsert([{
                    match_id: stats.match_id,
                    team_id: stats.team_id,
                    player_id: stats.player_id,
                    goals: stats.goals || 0,
                    shots_on_target: stats.shots_on_target || 0,
                    shots_off_target: stats.shots_off_target || 0,
                    saves: stats.saves || 0,
                    cards_yellow: stats.cards_yellow || 0,
                    cards_red: stats.cards_red || 0,
                    fouls_committed: stats.fouls_committed || 0,
                    fouls_received: stats.fouls_received || 0,
                    free_kicks: stats.free_kicks || 0,
                    updated_at: new Date().toISOString()
                }])
                .select();
            if (error) throw error;
            return data[0];
        } catch (error) {
            console.error('❌ Erreur mise à jour stats:', error);
            return null;
        }
    }

    // ===== SYNC GÉNÉRALE =====

    async executeSync(operation) {
        const { operation: op, data } = operation;
        
        switch(op) {
            case 'createTeam':
                return { success: !!(await this.createTeamRemote(data)) };
            case 'updateTeam':
                return { success: !!(await this.updateTeamRemote(data)) };
            case 'deleteTeam':
                return { success: await this.deleteTeamRemote(data.id) };
            case 'addPlayer':
                return { success: !!(await this.addPlayerRemote(data)) };
            case 'updatePlayer':
                return { success: !!(await this.updatePlayerRemote(data)) };
            case 'removePlayer':
                return { success: await this.removePlayerRemote(data.id) };
            case 'createMatch':
                return { success: !!(await this.createMatchRemote(data)) };
            case 'recordEvent':
                return { success: !!(await this.recordEventRemote(data)) };
            default:
                return { success: false };
        }
    }
}

// ===== INITIALISATION GLOBALE =====

if (typeof window !== 'undefined') {
    window.supabaseSync = null;
    
    // À initialiser après avoir défini SUPABASE_URL et SUPABASE_KEY
    window.initSupabaseSync = function(url, key) {
        window.supabaseSync = new SupabaseSync(url, key);
        return window.supabaseSync;
    };
    
    console.log('📦 Module SupabaseSync chargé');
}