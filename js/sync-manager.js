// ===== SYNC MANAGER V2 - USE CASE 3: MULTI-USER =====
// Synchronisation temps réel avec Supabase Realtime Subscriptions
// PRINCIPE: Écouter les changements de la DB et mettre à jour l'UI automatiquement

class SyncManagerV2 {
    constructor() {
        this.currentMatchId = null;
        this.subscriptions = new Map(); // Map des subscriptions actives
        this.updateCallbacks = new Map(); // Map des callbacks par table
        this.lastSync = null;
        this.isOnline = navigator.onLine;
        
        // Écouter les changements de connexion
        window.addEventListener('online', () => this.handleOnline());
        window.addEventListener('offline', () => this.handleOffline());
        
        console.log('📦 SyncManagerV2 initialisé (USE CASE 3: Realtime)');
    }

    // ===== GESTION CONNEXION =====

    handleOnline() {
        console.log('🔌 Connexion rétablie - réactivation Realtime');
        this.isOnline = true;
        
        // Réabonner aux channels Realtime si un match est actif
        if (this.currentMatchId) {
            this.startSync(this.currentMatchId);
        }
    }

    handleOffline() {
        console.log('📴 Mode hors ligne - arrêt Realtime');
        this.isOnline = false;
        
        // Arrêter toutes les subscriptions
        this.stopAllSubscriptions();
    }

    // ===== GESTION SUBSCRIPTIONS REALTIME =====

    /**
     * Démarrer la synchronisation temps réel pour un match
     */
    async startSync(matchId) {
        if (!window.supabaseSync || !window.supabaseSync.isReady()) {
            console.warn('⚠️ Supabase non disponible - impossible de démarrer Realtime');
            return false;
        }

        if (!this.isOnline) {
            console.warn('⚠️ Mode hors ligne - Realtime non disponible');
            return false;
        }

        console.log('🔄 Démarrage synchronisation temps réel pour le match:', matchId);
        this.currentMatchId = matchId;

        // Arrêter les subscriptions précédentes
        this.stopAllSubscriptions();

        // S'abonner aux différentes tables
        await this.subscribeToMatchEvents(matchId);
        await this.subscribeToPlayerStats(matchId);
        await this.subscribeToMatchUpdates(matchId);

        this.lastSync = new Date();
        console.log('✅ Synchronisation temps réel active');

        return true;
    }

    /**
     * Arrêter la synchronisation temps réel
     */
    stopSync() {
        console.log('⏹️ Arrêt synchronisation temps réel');
        
        this.stopAllSubscriptions();
        this.currentMatchId = null;
    }

    /**
     * Arrêter toutes les subscriptions actives
     */
    stopAllSubscriptions() {
        this.subscriptions.forEach((subscription, channelName) => {
            console.log(`🔌 Désinscription du channel: ${channelName}`);
            window.supabaseSync.client.removeChannel(subscription);
        });
        
        this.subscriptions.clear();
        console.log('✅ Toutes les subscriptions arrêtées');
    }

    // ===== SUBSCRIPTIONS PAR TABLE =====

    /**
     * S'abonner aux événements du match
     */
    async subscribeToMatchEvents(matchId) {
        const channelName = `match_events:${matchId}`;
        
        const channel = window.supabaseSync.client
            .channel(channelName)
            .on(
                'postgres_changes',
                {
                    event: '*', // INSERT, UPDATE, DELETE
                    schema: 'public',
                    table: 'match_events',
                    filter: `match_id=eq.${matchId}`
                },
                (payload) => this.handleEventChange(payload)
            )
            .subscribe((status) => {
                if (status === 'SUBSCRIBED') {
                    console.log(`✅ Abonné à: ${channelName}`);
                } else if (status === 'CLOSED') {
                    console.log(`🔌 Déconnecté de: ${channelName}`);
                } else if (status === 'CHANNEL_ERROR') {
                    console.error(`❌ Erreur channel: ${channelName}`);
                }
            });

        this.subscriptions.set(channelName, channel);
    }

    /**
     * S'abonner aux stats des joueurs
     */
    async subscribeToPlayerStats(matchId) {
        const channelName = `player_stats:${matchId}`;
        
        const channel = window.supabaseSync.client
            .channel(channelName)
            .on(
                'postgres_changes',
                {
                    event: '*',
                    schema: 'public',
                    table: 'player_match_stats',
                    filter: `match_id=eq.${matchId}`
                },
                (payload) => this.handleStatsChange(payload)
            )
            .subscribe((status) => {
                if (status === 'SUBSCRIBED') {
                    console.log(`✅ Abonné à: ${channelName}`);
                }
            });

        this.subscriptions.set(channelName, channel);
    }

    /**
     * S'abonner aux mises à jour du match
     */
    async subscribeToMatchUpdates(matchId) {
        const channelName = `match_updates:${matchId}`;
        
        const channel = window.supabaseSync.client
            .channel(channelName)
            .on(
                'postgres_changes',
                {
                    event: 'UPDATE',
                    schema: 'public',
                    table: 'matches',
                    filter: `id=eq.${matchId}`
                },
                (payload) => this.handleMatchChange(payload)
            )
            .subscribe((status) => {
                if (status === 'SUBSCRIBED') {
                    console.log(`✅ Abonné à: ${channelName}`);
                }
            });

        this.subscriptions.set(channelName, channel);
    }

    // ===== GESTION DES CHANGEMENTS =====

    /**
     * Gérer les changements d'événements
     */
    handleEventChange(payload) {
        console.log('🔔 Changement d\'événement reçu:', payload.eventType);
        
        const { eventType, new: newRecord, old: oldRecord } = payload;
        
        // Déclencher les callbacks enregistrés
        this.triggerCallbacks('match_events', {
            type: eventType,
            new: newRecord,
            old: oldRecord,
            timestamp: Date.now()
        });

        // Notification visuelle si changement d'un autre utilisateur
        this.showChangeNotification('Nouvel événement ajouté', eventType);
    }

    /**
     * Gérer les changements de stats
     */
    handleStatsChange(payload) {
        console.log('🔔 Changement de stats reçu:', payload.eventType);
        
        const { eventType, new: newRecord, old: oldRecord } = payload;
        
        this.triggerCallbacks('player_match_stats', {
            type: eventType,
            new: newRecord,
            old: oldRecord,
            timestamp: Date.now()
        });

        this.showChangeNotification('Stats mises à jour', eventType);
    }

    /**
     * Gérer les changements du match
     */
    handleMatchChange(payload) {
        console.log('🔔 Changement de match reçu:', payload.eventType);
        
        const { eventType, new: newRecord, old: oldRecord } = payload;
        
        this.triggerCallbacks('matches', {
            type: eventType,
            new: newRecord,
            old: oldRecord,
            timestamp: Date.now()
        });

        // Notification importante pour changement de score/statut
        if (newRecord.score_team !== oldRecord.score_team || 
            newRecord.score_opponent !== oldRecord.score_opponent) {
            this.showChangeNotification(
                `Score mis à jour: ${newRecord.score_team}-${newRecord.score_opponent}`,
                'UPDATE'
            );
        }
    }

    // ===== GESTION DES CALLBACKS =====

    /**
     * Enregistrer un callback pour une table spécifique
     */
    onUpdate(tableName, callback) {
        if (typeof callback !== 'function') {
            console.error('❌ Le callback doit être une fonction');
            return;
        }

        if (!this.updateCallbacks.has(tableName)) {
            this.updateCallbacks.set(tableName, []);
        }

        this.updateCallbacks.get(tableName).push(callback);
        console.log(`✅ Callback enregistré pour: ${tableName}`);
    }

    /**
     * Désinscrire un callback
     */
    offUpdate(tableName, callback) {
        if (!this.updateCallbacks.has(tableName)) {
            return;
        }

        const callbacks = this.updateCallbacks.get(tableName);
        const index = callbacks.indexOf(callback);
        
        if (index !== -1) {
            callbacks.splice(index, 1);
            console.log(`✅ Callback désinscrit de: ${tableName}`);
        }
    }

    /**
     * Déclencher tous les callbacks pour une table
     */
    triggerCallbacks(tableName, data) {
        if (!this.updateCallbacks.has(tableName)) {
            return;
        }

        const callbacks = this.updateCallbacks.get(tableName);
        
        callbacks.forEach(callback => {
            try {
                callback(data);
            } catch (error) {
                console.error(`❌ Erreur dans callback pour ${tableName}:`, error);
            }
        });
    }

    // ===== NOTIFICATIONS =====

    /**
     * Afficher une notification de changement
     */
    showChangeNotification(message, type) {
        // Ne pas notifier les changements que l'utilisateur vient de faire
        // (ils sont déjà visibles dans l'UI)
        const timeSinceLastAction = Date.now() - (this.lastUserAction || 0);
        
        if (timeSinceLastAction > 2000) { // 2 secondes
            if (window.showNotification) {
                window.showNotification(message, 'info');
            } else {
                console.log(`🔔 ${message}`);
            }
        }
    }

    /**
     * Marquer une action utilisateur (pour éviter les notifications redondantes)
     */
    markUserAction() {
        this.lastUserAction = Date.now();
    }

    // ===== SYNCHRONISATION MANUELLE =====

    /**
     * Forcer une synchronisation complète
     */
    async forceSync() {
        if (!this.currentMatchId) {
            console.warn('⚠️ Aucun match actif');
            return false;
        }

        console.log('🔄 Synchronisation manuelle forcée...');

        try {
            // Recharger toutes les données depuis Supabase
            if (window.dataManagerV2) {
                await window.dataManagerV2.forceSync();
            }

            this.lastSync = new Date();
            console.log('✅ Synchronisation manuelle terminée');
            
            return true;
        } catch (error) {
            console.error('❌ Erreur synchronisation manuelle:', error);
            return false;
        }
    }

    /**
     * Réconciliation des données (après une longue déconnexion)
     */
    async reconcileData() {
        if (!this.currentMatchId || !this.isOnline) {
            console.warn('⚠️ Impossible de réconcilier (hors ligne ou aucun match)');
            return false;
        }

        console.log('🔄 Réconciliation des données...');

        try {
            // 1. Traiter la queue offline
            if (window.offlineQueue) {
                await window.offlineQueue.processQueue();
            }

            // 2. Recharger les données depuis Supabase
            if (window.dataManagerV2) {
                await window.dataManagerV2.forceSync();
            }

            // 3. Supprimer le cache temporaire
            if (window.dataManagerV2) {
                window.dataManagerV2.clearTemporaryCache();
            }

            console.log('✅ Réconciliation terminée');
            
            if (window.showNotification) {
                window.showNotification('Données synchronisées', 'success');
            }
            
            return true;
        } catch (error) {
            console.error('❌ Erreur réconciliation:', error);
            return false;
        }
    }

    // ===== UTILITAIRES =====

    /**
     * Vérifier si la synchronisation est active
     */
    isActive() {
        return this.subscriptions.size > 0 && this.isOnline;
    }

    /**
     * Obtenir le statut de synchronisation
     */
    getStatus() {
        return {
            isActive: this.isActive(),
            isOnline: this.isOnline,
            currentMatch: this.currentMatchId,
            activeSubscriptions: this.subscriptions.size,
            lastSync: this.lastSync,
            registeredCallbacks: Array.from(this.updateCallbacks.keys())
        };
    }

    /**
     * Obtenir des statistiques détaillées
     */
    getDetailedStats() {
        const subscriptionsList = [];
        this.subscriptions.forEach((channel, name) => {
            subscriptionsList.push({
                name: name,
                state: channel.state
            });
        });

        const callbacksList = [];
        this.updateCallbacks.forEach((callbacks, table) => {
            callbacksList.push({
                table: table,
                count: callbacks.length
            });
        });

        return {
            status: this.getStatus(),
            subscriptions: subscriptionsList,
            callbacks: callbacksList,
            offlineQueue: window.offlineQueue?.getStatus() || null
        };
    }

    /**
     * Test de connectivité Supabase
     */
    async testConnection() {
        if (!window.supabaseSync || !window.supabaseSync.isReady()) {
            return {
                success: false,
                message: 'Supabase non initialisé'
            };
        }

        try {
            const { data, error } = await window.supabaseSync.client
                .from('matches')
                .select('count')
                .limit(1);

            if (error) throw error;

            return {
                success: true,
                message: 'Connexion Supabase OK'
            };
        } catch (error) {
            return {
                success: false,
                message: `Erreur: ${error.message}`
            };
        }
    }

    /**
     * Diagnostic complet
     */
    async runDiagnostics() {
        console.log('🔍 Lancement du diagnostic...');

        const diagnostics = {
            timestamp: new Date().toISOString(),
            connectionStatus: {
                isOnline: this.isOnline,
                navigatorOnline: navigator.onLine
            },
            supabase: {
                isReady: window.supabaseSync?.isReady() || false,
                connectionTest: await this.testConnection()
            },
            sync: this.getStatus(),
            offlineQueue: window.offlineQueue?.getStatistics() || null,
            cache: window.dataManagerV2?.getConnectionStatus() || null
        };

        console.log('📊 Résultats du diagnostic:', diagnostics);
        return diagnostics;
    }
}

// ===== INITIALISATION GLOBALE =====

if (typeof window !== 'undefined') {
    window.syncManagerV2 = new SyncManagerV2();
    console.log('📦 Module SyncManagerV2 chargé (USE CASE 3: Realtime)');
}