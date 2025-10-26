// ===== SUPABASE SYNC MODULE =====
// Gestion de la synchronisation bidirectionnelle avec Supabase

class SupabaseSync {
    constructor(supabaseUrl, supabaseKey) {
        this.client = null;
        this.isInitialized = false;

        if (typeof window.supabase === 'undefined') {
            console.error('❌ Supabase SDK non chargé');
            return;
        }

        try {
            this.client = window.supabase.createClient(supabaseUrl, supabaseKey);
            this.isInitialized = true;
            console.log('✅ Client Supabase initialisé');
        } catch (error) {
            console.error('❌ Erreur initialisation Supabase:', error);
        }
    }

    isReady() {
        return this.isInitialized && this.client !== null;
    }

    // ===== CONVERSION POSITIONS =====

    convertPositionToCode(position) {
        const mapping = {
            'Gardien': 'GK',
            'Défenseur': 'DF',
            'Milieu': 'MF',
            'Attaquant': 'FW'
        };
        return mapping[position] || position;
    }

    convertCodeToPosition(code) {
        const mapping = {
            'GK': 'Gardien',
            'DF': 'Défenseur',
            'MF': 'Milieu',
            'FW': 'Attaquant'
        };
        return mapping[code] || code;
    }

    // ===== ÉQUIPES =====

    async createTeamRemote(team) {
        if (!this.isReady()) return null;
        try {
            // CORRECTION V3 : Colonnes minimales uniquement (sans description/logo_url)
            const { data, error } = await this.client
                .from('teams')
                .insert([{
                    name: team.name,
                    category: team.category || '',
                    color: team.color || '#3498db'
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

    async updateTeamRemote(team) {
        if (!this.isReady()) return null;
        try {
            // Utiliser supabase_id si disponible, sinon id
            const teamId = team.supabase_id || team.id;
            
            // CORRECTION V3 : Colonnes minimales uniquement
            const { data, error } = await this.client
                .from('teams')
                .update({
                    name: team.name,
                    category: team.category || '',
                    color: team.color || '#3498db',
                    updated_at: new Date().toISOString()
                })
                .eq('id', teamId)
                .select();
            if (error) throw error;
            return data[0];
        } catch (error) {
            console.error('❌ Erreur mise à jour équipe:', error);
            return null;
        }
    }

    async downloadTeams() {
        if (!this.isReady()) return [];
        try {
            const { data, error } = await this.client
                .from('teams')
                .select('*, players(*)')
                .order('created_at', { ascending: false });
            
            if (error) throw error;

            // Convertir les positions en français
            if (data) {
                data.forEach(team => {
                    if (team.players) {
                        team.players.forEach(player => {
                            player.position = this.convertCodeToPosition(player.position);
                        });
                    }
                });
            }

            console.log('✅ Équipes téléchargées:', data?.length || 0);
            return data || [];
        } catch (error) {
            console.error('❌ Erreur téléchargement équipes:', error);
            return [];
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
            // CORRECTION V2 : Utiliser team_supabase_id au lieu de team_id local
            const teamId = player.team_supabase_id || player.team_id;
            
            // Vérifier que teamId est un UUID valide
            if (!teamId || typeof teamId !== 'string' || teamId.startsWith('team_')) {
                console.error('❌ team_id invalide (pas un UUID):', teamId);
                return null;
            }

            const { data, error } = await this.client
                .from('players')
                .insert([{
                    team_id: teamId,  // Utiliser l'UUID Supabase
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
                    opponent_goals: match.opponent_goals || 0,
                    team_goals: match.team_goals || 0,
                    venue: match.venue || null,
                    match_date: match.match_date || new Date().toISOString(),
                    status: match.status || 'pending'
                }])
                .select();
            if (error) throw error;
            return data[0];
        } catch (error) {
            console.error('❌ Erreur création match:', error);
            return null;
        }
    }

    async recordEventRemote(event) {
        if (!this.isReady()) return null;
        try {
            const { data, error } = await this.client
                .from('events')
                .insert([{
                    match_id: event.match_id,
                    player_id: event.player_id,
                    team_id: event.team_id,
                    event_type: event.event_type,
                    minute: event.minute || null,
                    second: event.second || null,
                    description: event.description || null
                }])
                .select();
            if (error) throw error;
            return data[0];
        } catch (error) {
            console.error('❌ Erreur enregistrement événement:', error);
            return null;
        }
    }

    async updateMatchStatsRemote(stats) {
        if (!this.isReady()) return null;
        try {
            const { data, error } = await this.client
                .from('player_match_stats')
                .insert([{
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
            console.error('❌ Erreur mise à jour stats:', error);
            return null;
        }
    }

    // ===== SYNC GÉNÉRALE =====

    async executeSync(operation) {
        const { operation: op, data } = operation;
        
        switch(op) {
            case 'createTeam':
                const teamResult = await this.createTeamRemote(data);
                return { success: !!teamResult, supabaseId: teamResult?.id, localId: data.id };
            case 'updateTeam':
                return { success: !!(await this.updateTeamRemote(data)) };
            case 'deleteTeam':
                return { success: await this.deleteTeamRemote(data.supabase_id || data.id) };
            case 'addPlayer':
                const playerResult = await this.addPlayerRemote(data);
                return { success: !!playerResult, supabaseId: playerResult?.id, localId: data.id };
            case 'updatePlayer':
                // Utiliser supabase_id pour les mises à jour si disponible
                if (data.supabase_id) {
                    const playerData = { ...data, id: data.supabase_id };
                    return { success: !!(await this.updatePlayerRemote(playerData)) };
                }
                return { success: false };
            case 'removePlayer':
                // Utiliser supabase_id si disponible, sinon ignorer silencieusement
                if (data.supabase_id) {
                    return { success: await this.removePlayerRemote(data.supabase_id) };
                } else {
                    console.warn('⚠️ Pas de supabase_id pour la suppression, ignorer:', data.id);
                    return { success: true }; // Considérer comme réussi localement
                }
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