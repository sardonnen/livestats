// ===== DATA MANAGER V2 - USE CASE 3: MULTI-USER =====
// Stratégie Database-First: Supabase = Source Unique de Vérité
// localStorage = Cache de Secours UNIQUEMENT en mode hors ligne

class DataManagerV2 {
    constructor() {
        this.matchId = null;
        this.teamId = null;
        this.isOnline = navigator.onLine;
        this.cacheTimeout = 5000; // 5 secondes timeout pour requêtes DB
        
        // Écouter les changements de connexion
        window.addEventListener('online', () => this.handleOnline());
        window.addEventListener('offline', () => this.handleOffline());
        
        console.log('📦 DataManagerV2 initialisé (USE CASE 3: Multi-User)');
    }

    // ===== GESTION CONNEXION =====

    handleOnline() {
        console.log('🔌 Connexion rétablie');
        this.isOnline = true;
        
        // Déclencher la synchronisation de la queue offline
        if (window.offlineQueue) {
            window.offlineQueue.processQueue();
        }
    }

    handleOffline() {
        console.log('📴 Mode hors ligne activé');
        this.isOnline = false;
    }

    // ===== STRATÉGIE DE LECTURE (DATABASE-FIRST) =====

    /**
     * Récupérer des données avec stratégie Database-First
     * RÈGLE: TOUJOURS essayer Supabase en premier
     */
    async getData(query, cacheKey = null) {
        // ÉTAPE 1: Essayer Supabase (si en ligne)
        if (this.isOnline && window.supabaseSync && window.supabaseSync.isReady()) {
            try {
                console.log('📡 Lecture depuis Supabase (Database-First)');
                const data = await this.executeWithTimeout(query, this.cacheTimeout);
                
                // Mettre à jour le cache local avec les données fraîches
                if (cacheKey && data) {
                    this.updateCache(cacheKey, data);
                }
                
                return data;
            } catch (error) {
                console.warn('⚠️ Erreur Supabase, fallback cache:', error.message);
                // FALLBACK: Utiliser le cache si erreur Supabase
            }
        }

        // ÉTAPE 2: Fallback cache local (si hors ligne ou erreur Supabase)
        if (cacheKey) {
            console.log('💾 Lecture depuis cache local (Fallback)');
            return this.getCache(cacheKey);
        }

        return null;
    }

    /**
     * Exécuter une requête avec timeout
     */
    async executeWithTimeout(promise, timeoutMs) {
        return Promise.race([
            promise,
            new Promise((_, reject) => 
                setTimeout(() => reject(new Error('Timeout DB')), timeoutMs)
            )
        ]);
    }

    // ===== STRATÉGIE D'ÉCRITURE (DATABASE-FIRST) =====

    /**
     * Sauvegarder des données avec stratégie Database-First
     * RÈGLE: Écrire d'abord Supabase, puis mettre à jour cache
     */
    async saveData(operation, data, cacheKey = null) {
        // ÉTAPE 1: Si en ligne, écrire d'abord dans Supabase
        if (this.isOnline && window.supabaseSync && window.supabaseSync.isReady()) {
            try {
                console.log('📡 Écriture vers Supabase (Database-First)');
                const result = await operation();
                
                // Mettre à jour le cache après succès
                if (cacheKey && result) {
                    this.updateCache(cacheKey, result);
                }
                
                return result;
            } catch (error) {
                console.error('❌ Erreur écriture Supabase:', error);
                // Ne pas écrire dans le cache si erreur
                return null;
            }
        }

        // ÉTAPE 2: Si hors ligne, ajouter à la queue
        if (!this.isOnline && window.offlineQueue) {
            console.log('📴 Mode hors ligne: Ajout à la queue');
            window.offlineQueue.addOperation({
                type: 'write',
                operation: operation.toString(),
                data: data,
                cacheKey: cacheKey,
                timestamp: Date.now()
            });
            
            // Optionnel: Mettre à jour le cache local temporairement
            if (cacheKey) {
                this.updateCache(cacheKey, data, true); // true = temporary
            }
            
            return data; // Retourner les données locales
        }

        return null;
    }

    // ===== OPÉRATIONS MATCH =====

    /**
     * Initialiser un match (Database-First)
     */
    async initializeMatch(matchId, teamId) {
        this.matchId = matchId;
        this.teamId = teamId;

        console.log('🎯 Initialisation match:', matchId);

        // Charger les données depuis Supabase (prioritaire)
        const match = await this.getMatch(matchId);
        const players = await this.loadTeamPlayers(teamId);
        const events = await this.getMatchEvents(matchId);
        const stats = await this.getPlayerStats(matchId);

        return {
            match,
            players,
            events,
            stats
        };
    }

    /**
     * Récupérer un match (Database-First)
     */
    async getMatch(matchId) {
        const query = window.supabaseSync.client
            .from('matches')
            .select('*')
            .eq('id', matchId)
            .single();

        return await this.getData(query, `match_${matchId}`);
    }

    /**
     * Mettre à jour un match (Database-First)
     */
    async updateMatch(matchId, updates) {
        const operation = async () => {
            const { data, error } = await window.supabaseSync.client
                .from('matches')
                .update({
                    ...updates,
                    updated_at: new Date().toISOString()
                })
                .eq('id', matchId)
                .select()
                .single();

            if (error) throw error;
            return data;
        };

        return await this.saveData(operation, updates, `match_${matchId}`);
    }

    // ===== OPÉRATIONS JOUEUSES =====

    /**
     * Charger les joueuses d'une équipe (Database-First)
     */
    async loadTeamPlayers(teamId) {
        const query = window.supabaseSync.client
            .from('players')
            .select('*')
            .eq('team_id', teamId)
            .order('number', { ascending: true });

        return await this.getData(query, `players_${teamId}`);
    }

    /**
     * Récupérer une joueuse par ID (Database-First)
     */
    async getPlayer(playerId) {
        const query = window.supabaseSync.client
            .from('players')
            .select('*')
            .eq('id', playerId)
            .single();

        return await this.getData(query, `player_${playerId}`);
    }

    // ===== OPÉRATIONS ÉVÉNEMENTS =====

    /**
     * Enregistrer un événement (Database-First)
     */
    async recordEvent(eventType, playerId, details = {}) {
        const eventData = {
            match_id: this.matchId,
            team_id: this.teamId,
            player_id: playerId,
            event_type: eventType,
            event_details: details,
            match_minute: details.minute || 0,
            half: details.half || 1,
            is_team_event: true,
            created_at: new Date().toISOString()
        };

        const operation = async () => {
            const { data, error } = await window.supabaseSync.client
                .from('match_events')
                .insert([eventData])
                .select()
                .single();

            if (error) throw error;
            return data;
        };

        const result = await this.saveData(operation, eventData, `events_${this.matchId}`);
        
        // Mettre à jour les stats joueur si événement de stat
        if (['goal', 'shot', 'card', 'save', 'foul'].includes(eventType)) {
            await this.incrementPlayerStat(playerId, eventType, details);
        }

        return result;
    }

    /**
     * Récupérer les événements d'un match (Database-First)
     */
    async getMatchEvents(matchId) {
        const query = window.supabaseSync.client
            .from('match_events')
            .select('*, players(name, number)')
            .eq('match_id', matchId)
            .order('created_at', { ascending: false });

        return await this.getData(query, `events_${matchId}`);
    }

    /**
     * Supprimer un événement (avec gestion hors ligne)
     */
    async deleteEvent(eventId) {
        const operation = async () => {
            const { error } = await window.supabaseSync.client
                .from('match_events')
                .delete()
                .eq('id', eventId);

            if (error) throw error;
            return { success: true };
        };

        return await this.saveData(operation, { eventId }, null);
    }

    // ===== OPÉRATIONS STATS =====

    /**
     * Incrémenter une stat joueur (Database-First)
     */
    async incrementPlayerStat(playerId, statType, details = {}) {
        // Mapping des types d'événements vers les colonnes de stats
        const statMapping = {
            'goal': 'goals',
            'shot': details.onTarget ? 'shots_on_target' : 'shots_off_target',
            'card': details.cardColor === 'yellow' ? 'cards_yellow' : 'cards_red',
            'save': 'saves',
            'foul': details.committed ? 'fouls_committed' : 'fouls_received'
        };

        const statColumn = statMapping[statType];
        if (!statColumn) return null;

        // Récupérer les stats actuelles
        const currentStats = await this.getPlayerMatchStats(this.matchId, playerId);
        
        const newValue = (currentStats?.[statColumn] || 0) + 1;
        const updates = {
            [statColumn]: newValue
        };

        return await this.updatePlayerStats(this.matchId, playerId, updates);
    }

    /**
     * Récupérer les stats d'un joueur pour un match (Database-First)
     */
    async getPlayerMatchStats(matchId, playerId) {
        const query = window.supabaseSync.client
            .from('player_match_stats')
            .select('*')
            .eq('match_id', matchId)
            .eq('player_id', playerId)
            .single();

        try {
            return await this.getData(query, `stats_${matchId}_${playerId}`);
        } catch (error) {
            // Si aucune stat n'existe, retourner un objet vide
            return {
                goals: 0,
                shots_on_target: 0,
                shots_off_target: 0,
                saves: 0,
                cards_yellow: 0,
                cards_red: 0,
                fouls_committed: 0,
                fouls_received: 0
            };
        }
    }

    /**
     * Mettre à jour les stats d'un joueur (Database-First)
     */
    async updatePlayerStats(matchId, playerId, updates) {
        const operation = async () => {
            const { data, error } = await window.supabaseSync.client
                .from('player_match_stats')
                .upsert({
                    match_id: matchId,
                    player_id: playerId,
                    team_id: this.teamId,
                    ...updates,
                    updated_at: new Date().toISOString()
                }, {
                    onConflict: 'match_id,player_id'
                })
                .select()
                .single();

            if (error) throw error;
            return data;
        };

        return await this.saveData(operation, updates, `stats_${matchId}_${playerId}`);
    }

    /**
     * Récupérer toutes les stats d'un match (Database-First)
     */
    async getPlayerStats(matchId) {
        const query = window.supabaseSync.client
            .from('player_match_stats')
            .select('*, players(name, number)')
            .eq('match_id', matchId);

        return await this.getData(query, `all_stats_${matchId}`);
    }

    // ===== GESTION CACHE LOCAL (FALLBACK UNIQUEMENT) =====

    /**
     * Mettre à jour le cache local
     */
    updateCache(key, data, temporary = false) {
        try {
            const cacheEntry = {
                data: data,
                timestamp: Date.now(),
                temporary: temporary // Si temporary=true, supprimer après sync
            };
            localStorage.setItem(`cache_${key}`, JSON.stringify(cacheEntry));
            console.log(`💾 Cache mis à jour: ${key}${temporary ? ' (temporaire)' : ''}`);
        } catch (error) {
            console.error('❌ Erreur mise à jour cache:', error);
        }
    }

    /**
     * Récupérer depuis le cache local
     */
    getCache(key) {
        try {
            const cached = localStorage.getItem(`cache_${key}`);
            if (!cached) return null;

            const cacheEntry = JSON.parse(cached);
            
            // Vérifier si le cache n'est pas trop vieux (max 5 minutes)
            const maxAge = 5 * 60 * 1000; // 5 minutes
            if (Date.now() - cacheEntry.timestamp > maxAge) {
                console.warn(`⚠️ Cache expiré: ${key}`);
                this.clearCache(key);
                return null;
            }

            console.log(`💾 Cache lu: ${key}`);
            return cacheEntry.data;
        } catch (error) {
            console.error('❌ Erreur lecture cache:', error);
            return null;
        }
    }

    /**
     * Supprimer un élément du cache
     */
    clearCache(key) {
        localStorage.removeItem(`cache_${key}`);
    }

    /**
     * Supprimer tout le cache temporaire
     */
    clearTemporaryCache() {
        const keys = Object.keys(localStorage);
        keys.forEach(key => {
            if (key.startsWith('cache_')) {
                try {
                    const cached = JSON.parse(localStorage.getItem(key));
                    if (cached.temporary) {
                        localStorage.removeItem(key);
                        console.log(`🗑️ Cache temporaire supprimé: ${key}`);
                    }
                } catch (error) {
                    // Ignorer les erreurs de parsing
                }
            }
        });
    }

    // ===== MÉTHODES RACCOURCIS POUR ÉVÉNEMENTS COURANTS =====

    async recordGoal(playerId, details = {}) {
        return await this.recordEvent('goal', playerId, {
            ...details,
            goalType: details.goalType || 'normal'
        });
    }

    async recordShot(playerId, onTarget = true, details = {}) {
        return await this.recordEvent('shot', playerId, {
            ...details,
            onTarget: onTarget
        });
    }

    async recordCard(playerId, cardColor = 'yellow', details = {}) {
        return await this.recordEvent('card', playerId, {
            ...details,
            cardColor: cardColor,
            suspensionMinutes: cardColor === 'yellow' ? 10 : null
        });
    }

    async recordSave(playerId, details = {}) {
        return await this.recordEvent('save', playerId, {
            ...details,
            saveType: details.saveType || 'normal'
        });
    }

    async recordFoul(playerId, committed = true, details = {}) {
        return await this.recordEvent('foul', playerId, {
            ...details,
            committed: committed
        });
    }

    async recordSubstitution(outPlayerId, inPlayerId, details = {}) {
        return await this.recordEvent('substitution', outPlayerId, {
            ...details,
            out_player_id: outPlayerId,
            in_player_id: inPlayerId
        });
    }

    // ===== UTILITAIRES =====

    /**
     * Vérifier le statut de connexion
     */
    getConnectionStatus() {
        return {
            isOnline: this.isOnline,
            supabaseReady: window.supabaseSync?.isReady() || false,
            cacheSize: this.getCacheSize(),
            queueSize: window.offlineQueue?.getQueueSize() || 0
        };
    }

    /**
     * Obtenir la taille du cache
     */
    getCacheSize() {
        let count = 0;
        const keys = Object.keys(localStorage);
        keys.forEach(key => {
            if (key.startsWith('cache_')) count++;
        });
        return count;
    }

    /**
     * Nettoyer les données du match
     */
    clear() {
        this.matchId = null;
        this.teamId = null;
        console.log('✅ DataManagerV2 nettoyé');
    }

    /**
     * Forcer une synchronisation complète
     */
    async forceSync() {
        console.log('🔄 Synchronisation forcée...');
        
        if (!this.matchId) {
            console.warn('⚠️ Aucun match actif');
            return false;
        }

        try {
            // Recharger toutes les données depuis Supabase
            await this.initializeMatch(this.matchId, this.teamId);
            
            // Supprimer le cache temporaire
            this.clearTemporaryCache();
            
            console.log('✅ Synchronisation complète terminée');
            return true;
        } catch (error) {
            console.error('❌ Erreur synchronisation:', error);
            return false;
        }
    }
}

// ===== INITIALISATION GLOBALE =====

if (typeof window !== 'undefined') {
    window.dataManagerV2 = new DataManagerV2();
    console.log('📦 Module DataManagerV2 chargé (USE CASE 3)');
}