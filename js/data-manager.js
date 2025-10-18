// ===== GESTIONNAIRE DE DONNÉES SUPABASE =====
// Gère toutes les opérations avec la base de données

class DataManager {
    constructor() {
        this.currentMatch = null;
        this.currentTeamId = null;
        this.isReady = false;
        this.init();
    }

    async init() {
        // Attendre que Supabase soit prêt
        let attempts = 0;
        while (!isSupabaseReady() && attempts < 10) {
            await new Promise(resolve => setTimeout(resolve, 100));
            attempts++;
        }

        if (!isSupabaseReady()) {
            console.error('❌ Supabase non disponible');
            return;
        }

        this.isReady = true;
        console.log('✅ DataManager initialisé');
    }

    // ===== MATCHS =====

    /**
     * Créer un nouveau match
     */
    async createMatch(teamId, teamName, opponentName, venue = '', duration = 90) {
        if (!this.isReady) {
            showNotification('Base de données non prête', 'error');
            return null;
        }

        try {
            const { data, error } = await supabaseClient
                .from('matches')
                .insert({
                    team_id: teamId,
                    team_name: teamName,
                    opponent_name: opponentName,
                    venue: venue,
                    duration: duration,
                    status: 'ongoing',
                    match_date: new Date().toISOString()
                })
                .select();

            if (error) throw error;

            this.currentMatch = data[0];
            console.log('✅ Match créé :', this.currentMatch);
            return this.currentMatch;

        } catch (error) {
            console.error('❌ Erreur création match :', error);
            showNotification('Erreur création du match', 'error');
            return null;
        }
    }

    /**
     * Mettre à jour le score et le temps d'un match
     */
    async updateMatch(matchId, teamScore, opponentScore, currentTime, half) {
        if (!this.isReady) return false;

        try {
            const { error } = await supabaseClient
                .from('matches')
                .update({
                    team_score: teamScore,
                    opponent_score: opponentScore,
                    updated_at: new Date().toISOString()
                })
                .eq('id', matchId);

            if (error) throw error;

            console.log('✅ Match mis à jour');
            return true;

        } catch (error) {
            console.error('❌ Erreur mise à jour match :', error);
            return false;
        }
    }

    /**
     * Terminer un match
     */
    async finishMatch(matchId) {
        if (!this.isReady) return false;

        try {
            const { error } = await supabaseClient
                .from('matches')
                .update({ status: 'finished' })
                .eq('id', matchId);

            if (error) throw error;

            console.log('✅ Match terminé');
            return true;

        } catch (error) {
            console.error('❌ Erreur fermeture match :', error);
            return false;
        }
    }

    /**
     * Récupérer les détails d'un match
     */
    async getMatch(matchId) {
        if (!this.isReady) return null;

        try {
            const { data, error } = await supabaseClient
                .from('matches')
                .select('*')
                .eq('id', matchId)
                .single();

            if (error) throw error;

            return data;

        } catch (error) {
            console.error('❌ Erreur récupération match :', error);
            return null;
        }
    }

    // ===== ÉVÉNEMENTS =====

    /**
     * Enregistrer un événement du match
     * @param {string} matchId - ID du match
     * @param {string} playerId - ID du joueur (null si action équipe)
     * @param {string} eventType - Type d'événement (goal, shot_on_target, shot_off_target, card, foul, assist, etc.)
     * @param {number} eventTime - Temps en secondes
     * @param {boolean} isTeam - true si action de notre équipe
     * @param {string} cardType - Type de carton (yellow, red, white) - null si pas carton
     */
    async recordEvent(matchId, playerId, eventType, eventTime, isTeam, cardType = null) {
        if (!this.isReady) return null;

        try {
            const { data, error } = await supabaseClient
                .from('match_events')
                .insert({
                    match_id: matchId,
                    player_id: playerId,
                    event_type: eventType,
                    event_time: eventTime,
                    is_team: isTeam,
                    card_type: cardType
                })
                .select();

            if (error) throw error;

            console.log('✅ Événement enregistré :', data[0]);
            return data[0];

        } catch (error) {
            console.error('❌ Erreur enregistrement événement :', error);
            return null;
        }
    }

    /**
     * Récupérer tous les événements d'un match
     */
    async getMatchEvents(matchId) {
        if (!this.isReady) return [];

        try {
            const { data, error } = await supabaseClient
                .from('match_events')
                .select('*')
                .eq('match_id', matchId)
                .order('event_time', { ascending: true });

            if (error) throw error;

            return data;

        } catch (error) {
            console.error('❌ Erreur récupération événements :', error);
            return [];
        }
    }

    // ===== STATISTIQUES JOUEUR =====

    /**
     * Mettre à jour les stats d'un joueur pour un match
     */
    async updatePlayerStats(matchId, playerId, statUpdates) {
        if (!this.isReady) return false;

        try {
            // Récupérer les stats actuelles
            let { data: existingStats, error: fetchError } = await supabaseClient
                .from('player_match_stats')
                .select('*')
                .eq('match_id', matchId)
                .eq('player_id', playerId)
                .single();

            if (fetchError && fetchError.code !== 'PGRST116') {
                throw fetchError;
            }

            if (existingStats) {
                // Mettre à jour les stats existantes
                const { error: updateError } = await supabaseClient
                    .from('player_match_stats')
                    .update({
                        ...existingStats,
                        ...statUpdates,
                        updated_at: new Date().toISOString()
                    })
                    .eq('match_id', matchId)
                    .eq('player_id', playerId);

                if (updateError) throw updateError;

            } else {
                // Créer les stats si n'existent pas
                const { error: insertError } = await supabaseClient
                    .from('player_match_stats')
                    .insert({
                        match_id: matchId,
                        player_id: playerId,
                        ...statUpdates
                    });

                if (insertError) throw insertError;
            }

            console.log('✅ Stats joueur mises à jour');
            return true;

        } catch (error) {
            console.error('❌ Erreur mise à jour stats :', error);
            return false;
        }
    }

    /**
     * Récupérer les stats d'un joueur pour un match
     */
    async getPlayerStats(matchId, playerId) {
        if (!this.isReady) return null;

        try {
            const { data, error } = await supabaseClient
                .from('player_match_stats')
                .select('*')
                .eq('match_id', matchId)
                .eq('player_id', playerId)
                .single();

            if (error && error.code !== 'PGRST116') throw error;

            return data || null;

        } catch (error) {
            console.error('❌ Erreur récupération stats joueur :', error);
            return null;
        }
    }

    /**
     * Obtenir toutes les stats des joueurs pour un match
     */
    async getAllPlayerStats(matchId) {
        if (!this.isReady) return [];

        try {
            const { data, error } = await supabaseClient
                .from('player_match_stats')
                .select('*, players(*)')
                .eq('match_id', matchId);

            if (error) throw error;

            return data;

        } catch (error) {
            console.error('❌ Erreur récupération stats :', error);
            return [];
        }
    }

    // ===== TEMPS DE JEU =====

    /**
     * Enregistrer une entrée/sortie de joueur
     */
    async recordPlayTime(matchId, playerId, eventType, eventTime) {
        if (!this.isReady) return null;

        try {
            const { data, error } = await supabaseClient
                .from('player_play_times')
                .insert({
                    match_id: matchId,
                    player_id: playerId,
                    event_type: eventType, // 'entry' ou 'exit'
                    event_time: eventTime
                })
                .select();

            if (error) throw error;

            console.log('✅ Temps de jeu enregistré');
            return data[0];

        } catch (error) {
            console.error('❌ Erreur enregistrement temps jeu :', error);
            return null;
        }
    }

    /**
     * Calculer le temps de jeu d'un joueur
     */
    async calculatePlayTime(matchId, playerId) {
        if (!this.isReady) return 0;

        try {
            const { data, error } = await supabaseClient
                .from('player_play_times')
                .select('*')
                .eq('match_id', matchId)
                .eq('player_id', playerId)
                .order('event_time', { ascending: true });

            if (error) throw error;

            let totalTime = 0;
            let entryTime = null;

            data.forEach(event => {
                if (event.event_type === 'entry') {
                    entryTime = event.event_time;
                } else if (event.event_type === 'exit' && entryTime !== null) {
                    totalTime += (event.event_time - entryTime);
                    entryTime = null;
                }
            });

            // Si encore sur le terrain à la fin du match
            if (entryTime !== null) {
                totalTime += (90 * 60 - entryTime); // 90 minutes en secondes
            }

            return Math.floor(totalTime / 60); // Retourner en minutes

        } catch (error) {
            console.error('❌ Erreur calcul temps jeu :', error);
            return 0;
        }
    }

    // ===== STATISTIQUES ADVERSAIRE =====

    /**
     * Mettre à jour les stats de l'équipe adverse
     */
    async updateOpponentStats(matchId, statUpdates) {
        if (!this.isReady) return false;

        try {
            let { data: existingStats, error: fetchError } = await supabaseClient
                .from('opponent_stats')
                .select('*')
                .eq('match_id', matchId)
                .single();

            if (fetchError && fetchError.code !== 'PGRST116') {
                throw fetchError;
            }

            if (existingStats) {
                const { error: updateError } = await supabaseClient
                    .from('opponent_stats')
                    .update({
                        ...existingStats,
                        ...statUpdates,
                        updated_at: new Date().toISOString()
                    })
                    .eq('match_id', matchId);

                if (updateError) throw updateError;

            } else {
                const { error: insertError } = await supabaseClient
                    .from('opponent_stats')
                    .insert({
                        match_id: matchId,
                        ...statUpdates
                    });

                if (insertError) throw insertError;
            }

            console.log('✅ Stats adversaire mises à jour');
            return true;

        } catch (error) {
            console.error('❌ Erreur mise à jour stats adversaire :', error);
            return false;
        }
    }

    /**
     * Récupérer les stats de l'équipe adverse
     */
    async getOpponentStats(matchId) {
        if (!this.isReady) return null;

        try {
            const { data, error } = await supabaseClient
                .from('opponent_stats')
                .select('*')
                .eq('match_id', matchId)
                .maybeSingle();

            if (error) {
                // Si la table n'existe pas ou autre erreur, retourner null gracieusement
                console.warn('⚠️ Stats adversaire non disponibles :', error.message);
                return null;
            }

            return data || null;

        } catch (error) {
            console.warn('⚠️ Erreur récupération stats adversaire (non-bloquant) :', error);
            return null;
        }
    }

    // ===== ÉQUIPES =====

    /**
     * Créer ou récupérer l'équipe
     */
    async ensureTeam(teamName) {
        if (!this.isReady) return null;

        try {
            // Chercher si l'équipe existe
            let { data: existingTeam, error: searchError } = await supabaseClient
                .from('teams')
                .select('*')
                .eq('name', teamName)
                .single();

            if (searchError && searchError.code !== 'PGRST116') {
                throw searchError;
            }

            if (existingTeam) {
                this.currentTeamId = existingTeam.id;
                return existingTeam;
            }

            // Créer l'équipe
            const { data: newTeam, error: createError } = await supabaseClient
                .from('teams')
                .insert({ name: teamName })
                .select()
                .single();

            if (createError) throw createError;

            this.currentTeamId = newTeam.id;
            return newTeam;

        } catch (error) {
            console.error('❌ Erreur gestion équipe :', error);
            return null;
        }
    }

    // ===== HISTORIQUE =====

    /**
     * Récupérer l'historique des matchs
     */
    async getMatchHistory(teamId, limit = 20) {
        if (!this.isReady) return [];

        try {
            const { data, error } = await supabaseClient
                .from('matches')
                .select('*')
                .eq('team_id', teamId)
                .order('match_date', { ascending: false })
                .limit(limit);

            if (error) throw error;

            return data;

        } catch (error) {
            console.error('❌ Erreur récupération historique :', error);
            return [];
        }
    }

    /**
     * Récupérer toutes les stats d'un joueur sur plusieurs matchs
     */
    async getPlayerCareerStats(playerId) {
        if (!this.isReady) return [];

        try {
            const { data, error } = await supabaseClient
                .from('player_match_stats')
                .select('*, matches(*)')
                .eq('player_id', playerId)
                .order('matches.match_date', { ascending: false });

            if (error) throw error;

            return data;

        } catch (error) {
            console.error('❌ Erreur récupération stats carrière :', error);
            return [];
        }
    }
}

// Créer l'instance globale
const dataManager = new DataManager();

console.log('📦 Module DataManager chargé');