// ===== DATA MANAGER MODULE =====
// Gestion des données de match avec Supabase
// CORRECTION: Utilise les vrais player_id depuis Supabase

class DataManager {
    constructor() {
        this.matchId = null;
        this.teamId = null;
        this.players = [];
        this.events = [];
        this.stats = {};
        
        console.log('📦 DataManager initialisé');
    }

    // ===== INITIALISATION MATCH =====

    /**
     * Initialiser un nouveau match
     */
    async initializeMatch(matchId, teamId) {
        this.matchId = matchId;
        this.teamId = teamId;
        this.events = [];
        this.stats = {};

        // Charger les joueuses de l'équipe depuis Supabase
        await this.loadTeamPlayers();

        console.log('✅ Match initialisé:', matchId);
        return true;
    }

    /**
     * Charger les joueuses de l'équipe depuis Supabase
     */
    async loadTeamPlayers() {
        if (!window.supabaseSync || !window.supabaseSync.isReady()) {
            console.warn('⚠️ Supabase non disponible');
            return false;
        }

        try {
            const { data: players, error } = await window.supabaseSync.client
                .from('players')
                .select('*')
                .eq('team_id', this.teamId);

            if (error) {
                console.error('❌ Erreur chargement joueuses:', error);
                return false;
            }

            this.players = players || [];
            console.log('✅ Joueuses chargées:', this.players.length);

            // Initialiser les stats pour chaque joueuse
            this.players.forEach(player => {
                this.stats[player.id] = {
                    goals: 0,
                    shots_on_target: 0,
                    shots_off_target: 0,
                    saves: 0,
                    cards_yellow: 0,
                    cards_red: 0,
                    fouls_committed: 0,
                    fouls_received: 0,
                    free_kicks: 0
                };
            });

            return true;
        } catch (error) {
            console.error('❌ Exception chargement joueuses:', error);
            return false;
        }
    }

    // ===== GESTION ÉVÉNEMENTS =====

    /**
     * Enregistrer un événement de match
     */
    async recordEvent(eventType, playerId, details = {}) {
        // Vérifier que le joueur existe et appartient à l'équipe
        const player = this.players.find(p => p.id === playerId);
        
        if (!player) {
            console.error('❌ Joueur non trouvé:', playerId);
            return null;
        }

        const event = {
            id: 'evt_' + Date.now() + '_' + Math.random().toString(36).substr(2, 9),
            match_id: this.matchId,
            team_id: this.teamId,
            player_id: player.id, // Utiliser l'UUID Supabase
            event_type: eventType,
            event_details: details,
            match_minute: details.minute || 0,
            half: details.half || 1,
            is_team_event: true,
            created_at: new Date().toISOString()
        };

        this.events.push(event);

        // Enregistrer sur Supabase
        if (window.supabaseSync && window.supabaseSync.isReady()) {
            await window.supabaseSync.recordEventRemote(event);
        }

        console.log('✅ Événement enregistré:', eventType, player.name);
        return event;
    }

    /**
     * Enregistrer un but
     */
    async recordGoal(playerId, details = {}) {
        const player = this.players.find(p => p.id === playerId);
        if (!player) {
            console.error('❌ Joueur non trouvé pour but');
            return null;
        }

        // Mettre à jour les stats
        this.stats[playerId].goals = (this.stats[playerId].goals || 0) + 1;

        // Enregistrer l'événement
        const event = await this.recordEvent('goal', playerId, {
            ...details,
            goalType: details.goalType || 'normal'
        });

        // Mettre à jour les stats joueur sur Supabase
        await this.updatePlayerStats(playerId);

        return event;
    }

    /**
     * Enregistrer un tir
     */
    async recordShot(playerId, onTarget = true, details = {}) {
        const player = this.players.find(p => p.id === playerId);
        if (!player) {
            console.error('❌ Joueur non trouvé pour tir');
            return null;
        }

        if (onTarget) {
            this.stats[playerId].shots_on_target = (this.stats[playerId].shots_on_target || 0) + 1;
        } else {
            this.stats[playerId].shots_off_target = (this.stats[playerId].shots_off_target || 0) + 1;
        }

        const event = await this.recordEvent('shot', playerId, {
            ...details,
            onTarget: onTarget
        });

        await this.updatePlayerStats(playerId);
        return event;
    }

    /**
     * Enregistrer un carton
     */
    async recordCard(playerId, cardColor = 'yellow', details = {}) {
        const player = this.players.find(p => p.id === playerId);
        if (!player) {
            console.error('❌ Joueur non trouvé pour carton');
            return null;
        }

        if (cardColor === 'yellow') {
            this.stats[playerId].cards_yellow = (this.stats[playerId].cards_yellow || 0) + 1;
        } else if (cardColor === 'red') {
            this.stats[playerId].cards_red = (this.stats[playerId].cards_red || 0) + 1;
        }

        const event = await this.recordEvent('card', playerId, {
            ...details,
            cardColor: cardColor
        });

        await this.updatePlayerStats(playerId);
        return event;
    }

    /**
     * Enregistrer une faute
     */
    async recordFoul(playerId, committed = true, details = {}) {
        const player = this.players.find(p => p.id === playerId);
        if (!player) {
            console.error('❌ Joueur non trouvé pour faute');
            return null;
        }

        if (committed) {
            this.stats[playerId].fouls_committed = (this.stats[playerId].fouls_committed || 0) + 1;
        } else {
            this.stats[playerId].fouls_received = (this.stats[playerId].fouls_received || 0) + 1;
        }

        const event = await this.recordEvent('foul', playerId, {
            ...details,
            committed: committed
        });

        await this.updatePlayerStats(playerId);
        return event;
    }

    /**
     * Enregistrer un arrêt (gardienne)
     */
    async recordSave(playerId, saveType = 'normal', details = {}) {
        const player = this.players.find(p => p.id === playerId);
        if (!player) {
            console.error('❌ Joueur non trouvé pour arrêt');
            return null;
        }

        this.stats[playerId].saves = (this.stats[playerId].saves || 0) + 1;

        const event = await this.recordEvent('save', playerId, {
            ...details,
            saveType: saveType
        });

        await this.updatePlayerStats(playerId);
        return event;
    }

    /**
     * Enregistrer un coup franc
     */
    async recordFreeKick(playerId, details = {}) {
        const player = this.players.find(p => p.id === playerId);
        if (!player) {
            console.error('❌ Joueur non trouvé pour coup franc');
            return null;
        }

        this.stats[playerId].free_kicks = (this.stats[playerId].free_kicks || 0) + 1;

        const event = await this.recordEvent('freekick', playerId, details);
        await this.updatePlayerStats(playerId);
        return event;
    }

    /**
     * Enregistrer une substitution
     */
    async recordSubstitution(outPlayerId, inPlayerId, details = {}) {
        const outPlayer = this.players.find(p => p.id === outPlayerId);
        const inPlayer = this.players.find(p => p.id === inPlayerId);

        if (!outPlayer || !inPlayer) {
            console.error('❌ Joueurs non trouvés pour substitution');
            return null;
        }

        const event = {
            id: 'evt_' + Date.now(),
            match_id: this.matchId,
            team_id: this.teamId,
            player_id: outPlayerId,
            event_type: 'substitution',
            event_details: {
                out_player_id: outPlayerId,
                in_player_id: inPlayerId,
                ...details
            },
            match_minute: details.minute || 0,
            half: details.half || 1,
            is_team_event: true,
            created_at: new Date().toISOString()
        };

        this.events.push(event);

        if (window.supabaseSync && window.supabaseSync.isReady()) {
            await window.supabaseSync.recordEventRemote(event);
        }

        console.log('✅ Substitution:', outPlayer.name, '→', inPlayer.name);
        return event;
    }

    // ===== GESTION STATS =====

    /**
     * Mettre à jour les stats joueur sur Supabase
     */
    async updatePlayerStats(playerId) {
        if (!window.supabaseSync || !window.supabaseSync.isReady()) {
            return false;
        }

        if (!this.stats[playerId]) {
            console.warn('⚠️ Stats non trouvées pour:', playerId);
            return false;
        }

        try {
            const result = await window.supabaseSync.updatePlayerStatsRemote({
                match_id: this.matchId,
                team_id: this.teamId,
                player_id: playerId,
                ...this.stats[playerId]
            });

            if (result) {
                console.log('✅ Stats joueur mises à jour');
                return true;
            }
            return false;
        } catch (error) {
            console.error('❌ Erreur mise à jour stats:', error);
            return false;
        }
    }

    /**
     * Récupérer les stats d'un joueur
     */
    getPlayerStats(playerId) {
        return this.stats[playerId] || null;
    }

    /**
     * Récupérer les stats globales
     */
    getGlobalStats() {
        const globalStats = {
            goals: 0,
            shots_on_target: 0,
            shots_off_target: 0,
            saves: 0,
            cards_yellow: 0,
            cards_red: 0,
            fouls_committed: 0,
            fouls_received: 0,
            free_kicks: 0
        };

        Object.values(this.stats).forEach(playerStats => {
            Object.keys(globalStats).forEach(key => {
                globalStats[key] += playerStats[key] || 0;
            });
        });

        return globalStats;
    }

    // ===== UTILITAIRES =====

    /**
     * Trouver une joueuse par ID
     */
    getPlayer(playerId) {
        return this.players.find(p => p.id === playerId) || null;
    }

    /**
     * Récupérer toutes les joueuses
     */
    getPlayers() {
        return this.players;
    }

    /**
     * Récupérer tous les événements
     */
    getEvents() {
        return this.events;
    }

    /**
     * Exporter les données
     */
    export() {
        return {
            matchId: this.matchId,
            teamId: this.teamId,
            players: this.players,
            events: this.events,
            stats: this.stats,
            exportedAt: new Date().toISOString()
        };
    }

    /**
     * Nettoyer les données du match
     */
    clear() {
        this.matchId = null;
        this.teamId = null;
        this.players = [];
        this.events = [];
        this.stats = {};
        console.log('✅ DataManager nettoyé');
    }
}

// ===== INITIALISATION GLOBALE =====

if (typeof window !== 'undefined') {
    window.dataManager = new DataManager();
    console.log('📦 Module DataManager chargé');
}