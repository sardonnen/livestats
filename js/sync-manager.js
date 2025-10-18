// ===== GESTIONNAIRE DE SYNCHRONISATION EN TEMPS RÉEL =====
// Synchronise les données entre plusieurs clients via Supabase

class SyncManager {
    constructor() {
        this.currentMatchId = null;
        this.syncInterval = null;
        this.isSyncing = false;
        this.lastSyncTime = null;
        this.syncCallbacks = [];
        this.offline = false;

        // Écouter les changements de connexion
        window.addEventListener('online', () => this.handleOnline());
        window.addEventListener('offline', () => this.handleOffline());

        // Vérifier la connexion initiale
        this.offline = !navigator.onLine;
    }

    /**
     * Démarrer la synchronisation d'un match
     */
    startSync(matchId, intervalMs = 5000) {
        console.log('🔄 Démarrage synchronisation pour le match :', matchId);

        this.currentMatchId = matchId;

        // Arrêter la synchronisation précédente si existante
        if (this.syncInterval) {
            clearInterval(this.syncInterval);
        }

        // Sync immédiate
        this.syncMatchData();

        // Sync régulière
        this.syncInterval = setInterval(() => {
            this.syncMatchData();
        }, intervalMs);
    }

    /**
     * Arrêter la synchronisation
     */
    stopSync() {
        console.log('⏹️ Arrêt synchronisation');

        if (this.syncInterval) {
            clearInterval(this.syncInterval);
            this.syncInterval = null;
        }

        this.currentMatchId = null;
    }

    /**
     * Synchroniser les données du match
     */
    async syncMatchData() {
        if (!this.currentMatchId || this.isSyncing) {
            return;
        }

        if (this.offline) {
            console.warn('⚠️ Mode hors ligne - synchronisation en attente');
            return;
        }

        this.isSyncing = true;

        try {
            // Récupérer les données du match
            const matchData = await dataManager.getMatch(this.currentMatchId);
            const events = await dataManager.getMatchEvents(this.currentMatchId);
            const playerStats = await dataManager.getAllPlayerStats(this.currentMatchId);
            const opponentStats = await dataManager.getOpponentStats(this.currentMatchId);

            if (!matchData) {
                console.error('❌ Match non trouvé');
                return;
            }

            // Préparer les données de synchronisation
            const syncData = {
                match: matchData,
                events: events,
                playerStats: playerStats,
                opponentStats: opponentStats,
                syncTime: new Date().toISOString(),
                timestamp: Date.now()
            };

            // Déclencher les callbacks
            this.callSyncCallbacks(syncData);

            this.lastSyncTime = new Date();
            console.log('✅ Synchronisation réussie');

        } catch (error) {
            console.error('❌ Erreur synchronisation :', error);
        } finally {
            this.isSyncing = false;
        }
    }

    /**
     * S'abonner aux mises à jour de synchronisation
     */
    onSync(callback) {
        if (typeof callback === 'function') {
            this.syncCallbacks.push(callback);
            console.log('✅ Callback de synchronisation ajouté');
        }
    }

    /**
     * Déclencher tous les callbacks
     */
    callSyncCallbacks(syncData) {
        this.syncCallbacks.forEach(callback => {
            try {
                callback(syncData);
            } catch (error) {
                console.error('❌ Erreur dans callback de sync :', error);
            }
        });
    }

    /**
     * Gérer la reconnexion
     */
    handleOnline() {
        console.log('📡 Connexion rétablie');
        this.offline = false;

        // Sync immédiate si en mode sync
        if (this.currentMatchId) {
            this.syncMatchData();
        }

        showNotification('Connexion rétablie', 'success');
    }

    /**
     * Gérer la déconnexion
     */
    handleOffline() {
        console.log('📡 Connexion perdue - mode hors ligne');
        this.offline = true;
        showNotification('Mode hors ligne - les données seront synchronisées à la reconnexion', 'warning');
    }

    /**
     * Générer un ID de partage pour les spectateurs
     */
    generateShareId() {
        return 'match_' + Date.now() + '_' + Math.random().toString(36).substr(2, 9);
    }

    /**
     * Vérifier si hors ligne
     */
    isOffline() {
        return this.offline;
    }

    /**
     * Obtenir le temps depuis la dernière sync
     */
    getLastSyncTime() {
        return this.lastSyncTime;
    }

    /**
     * Obtenir le statut de synchronisation
     */
    getSyncStatus() {
        return {
            isOnline: !this.offline,
            isSyncing: this.isSyncing,
            lastSync: this.lastSyncTime,
            currentMatch: this.currentMatchId,
            isActive: this.syncInterval !== null
        };
    }
}

// Créer l'instance globale
const syncManager = new SyncManager();

console.log('📦 Module SyncManager chargé');