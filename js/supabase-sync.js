// ===== SUPABASE SYNC MODULE =====
// Synchronisation bidirectionnelle localStorage â†” Supabase

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
                console.log('âœ… Client Supabase initialisÃ©');
                return true;
            } else {
                console.warn('âš ï¸ Supabase JS SDK non chargÃ©');
                return false;
            }
        } catch (error) {
            console.error('âŒ Erreur init Supabase:', error);
            this.ready = false;
            return false;
        }
    }

    isReady() {
        return this.ready && this.client !== null;
    }

    /**
     * Convertir position française → code court Supabase
     */
    convertPositionToCode(position) {
        const positionMap = {
            'gardienne': 'GK',
            'défenseuse': 'DF',
            'milieu': 'MF',
            'attaquante': 'FW'
        };
        return positionMap[position?.toLowerCase()] || position;
    }

    /**
     * Convertir code court Supabase → position française
     */
    convertCodeToPosition(code) {
        const codeMap = {
            'GK': 'gardienne',
            'DF': 'défenseuse',
            'MF': 'milieu',
            'FW': 'attaquante'
        };
        return codeMap[code?.toUpperCase()] || code;
    }

    // ===== Ã‰QUIPES =====

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
            console.log('âœ… Ã‰quipe crÃ©Ã©e:', team.name);
            return data[0];
        } catch (error) {
            console.error('âŒ Erreur crÃ©ation Ã©quipe:', error);
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
            console.log('âœ… Ã‰quipes tÃ©lÃ©chargÃ©es:', data.length);
            return data;
        } catch (error) {
            console.error('âŒ Erreur tÃ©lÃ©chargement Ã©quipes:', error);
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
            // Convertir la position en français pour le retour
            if (data && data[0]) {
                data[0].position = this.convertCodeToPosition(data[0].position);
            }
            return data[0];
        } catch (error) {
            console.error('âŒ Erreur mise Ã  jour Ã©quipe:', error);
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
            console.log('âœ… Ã‰quipe supprimÃ©e');
            return true;
        } catch (error) {
            console.error('âŒ Erreur suppression Ã©quipe:', error);
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
                    position: this.convertPositionToCode(player.position),
                    number: player.number ? String(player.number) : null
                }])
                .select();
            if (error) throw error;
            // Convertir la position en français pour le retour
            if (data && data[0]) {
                data[0].position = this.convertCodeToPosition(data[0].position);
            }
            return data[0];
        } catch (error) {
            console.error('âŒ Erreur ajout joueuse:', error);
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
                    position: this.convertPositionToCode(player.position),
                    number: player.number ? String(player.number) : null,
                    updated_at: new Date().toISOString()
                })
                .eq('id', player.id)
                .select();
            if (error) throw error;
            // Convertir la position en français pour le retour
            if (data && data[0]) {
                data[0].position = this.convertCodeToPosition(data[0].position);
            }
            return data[0];
        } catch (error) {
            console.error('âŒ Erreur mise Ã  jour joueuse:', error);
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
            console.error('âŒ Erreur suppression joueuse:', error);
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
            console.log('âœ… Match crÃ©Ã©:', match.opponent_name);
            return data[0];
        } catch (error) {
            console.error('âŒ Erreur crÃ©ation match:', error);
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
            // Convertir la position en français pour le retour
            if (data && data[0]) {
                data[0].position = this.convertCodeToPosition(data[0].position);
            }
            return data[0];
        } catch (error) {
            console.error('âŒ Erreur mise Ã  jour match:', error);
            return null;
        }
    }

    // ===== Ã‰VÃ‰NEMENTS =====

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
            // Convertir la position en français pour le retour
            if (data && data[0]) {
                data[0].position = this.convertCodeToPosition(data[0].position);
            }
            return data[0];
        } catch (error) {
            console.error('âŒ Erreur enregistrement Ã©vÃ©nement:', error);
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
            console.log('âœ… Composition sauvegardÃ©e');
            return data;
        } catch (error) {
            console.error('âŒ Erreur sauvegarde composition:', error);
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
            // Convertir la position en français pour le retour
            if (data && data[0]) {
                data[0].position = this.convertCodeToPosition(data[0].position);
            }
            return data[0];
        } catch (error) {
            console.error('âŒ Erreur mise Ã  jour stats:', error);
            return null;
        }
    }

    // ===== SYNC GÃ‰NÃ‰RALE =====

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
    
    // Ã€ initialiser aprÃ¨s avoir dÃ©fini SUPABASE_URL et SUPABASE_KEY
    window.initSupabaseSync = function(url, key) {
        window.supabaseSync = new SupabaseSync(url, key);
        return window.supabaseSync;
    };
    
    console.log('📦 Module SupabaseSync chargÃ©');
}