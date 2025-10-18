// ===== TEAM MANAGER MODULE =====
// Gestion complète des équipes et joueuses avec sync local/Supabase

/**
 * Structure des données locales :
 * teams: {
 *   [teamId]: {
 *     id, name, category, color, logo_url,
 *     players: [{ id, name, position, number }],
 *     lastSync: timestamp
 *   }
 * }
 */

class TeamManager {
    constructor() {
        this.localData = this.loadLocalTeams();
        this.syncInProgress = false;
        this.syncQueue = [];
        this.lastSyncTime = localStorage.getItem('teamManager_lastSync') || null;
        
        console.log('📦 TeamManager initialisé');
    }

    // ===== GESTION LOCALE =====

    /**
     * Charger les équipes depuis localStorage
     */
    loadLocalTeams() {
        const data = localStorage.getItem('footballStats_teams');
        return data ? JSON.parse(data) : {};
    }

    /**
     * Sauvegarder les équipes en localStorage
     */
    saveLocalTeams() {
        localStorage.setItem('footballStats_teams', JSON.stringify(this.localData));
        localStorage.setItem('teamManager_lastSync', new Date().toISOString());
        this.lastSyncTime = new Date().toISOString();
    }

    /**
     * Créer une nouvelle équipe
     */
    createTeam(name, category = '', color = '#3498db') {
        const teamId = 'team_' + Date.now() + '_' + Math.random().toString(36).substr(2, 9);
        
        const team = {
            id: teamId,
            name: name.trim(),
            category: category.trim(),
            color: color,
            logo_url: null,
            players: [],
            created_at: new Date().toISOString(),
            updated_at: new Date().toISOString(),
            synced: false
        };

        this.localData[teamId] = team;
        this.saveLocalTeams();
        this.queueForSync('createTeam', team);

        console.log('✅ Équipe créée localement:', name);
        return team;
    }

    /**
     * Récupérer une équipe
     */
    getTeam(teamId) {
        return this.localData[teamId] || null;
    }

    /**
     * Lister toutes les équipes
     */
    getAllTeams() {
        return Object.values(this.localData).sort((a, b) => 
            new Date(b.created_at) - new Date(a.created_at)
        );
    }

    /**
     * Supprimer une équipe
     */
    deleteTeam(teamId) {
        if (!this.localData[teamId]) {
            console.warn('⚠️ Équipe non trouvée:', teamId);
            return false;
        }

        const teamName = this.localData[teamId].name;
        delete this.localData[teamId];
        this.saveLocalTeams();
        this.queueForSync('deleteTeam', { id: teamId, name: teamName });

        console.log('✅ Équipe supprimée:', teamName);
        return true;
    }

    /**
     * Mettre à jour une équipe
     */
    updateTeam(teamId, updates) {
        if (!this.localData[teamId]) {
            console.warn('⚠️ Équipe non trouvée:', teamId);
            return null;
        }

        this.localData[teamId] = {
            ...this.localData[teamId],
            ...updates,
            updated_at: new Date().toISOString()
        };

        this.saveLocalTeams();
        this.queueForSync('updateTeam', this.localData[teamId]);

        console.log('✅ Équipe mise à jour:', updates);
        return this.localData[teamId];
    }

    // ===== GESTION DES JOUEUSES =====

    /**
     * Ajouter une joueuse à une équipe
     */
    addPlayerToTeam(teamId, name, position, number = null) {
        const team = this.getTeam(teamId);
        if (!team) {
            console.warn('⚠️ Équipe non trouvée:', teamId);
            return null;
        }

        const playerId = 'player_' + Date.now() + '_' + Math.random().toString(36).substr(2, 9);
        const player = {
            id: playerId,
            team_id: teamId,
            name: name.trim(),
            position: position.trim(),
            number: number ? parseInt(number) : null,
            created_at: new Date().toISOString(),
            synced: false
        };

        team.players.push(player);
        team.updated_at = new Date().toISOString();
        this.saveLocalTeams();
        this.queueForSync('addPlayer', player);

        console.log('✅ Joueuse ajoutée:', name, 'à', team.name);
        return player;
    }

    /**
     * Récupérer une joueuse
     */
    getPlayer(teamId, playerId) {
        const team = this.getTeam(teamId);
        if (!team) return null;
        return team.players.find(p => p.id === playerId) || null;
    }

    /**
     * Lister les joueuses d'une équipe
     */
    getTeamPlayers(teamId) {
        const team = this.getTeam(teamId);
        return team ? team.players : [];
    }

    /**
     * Supprimer une joueuse
     */
    removePlayer(teamId, playerId) {
        const team = this.getTeam(teamId);
        if (!team) return false;

        const playerIndex = team.players.findIndex(p => p.id === playerId);
        if (playerIndex === -1) return false;

        const player = team.players[playerIndex];
        team.players.splice(playerIndex, 1);
        team.updated_at = new Date().toISOString();
        this.saveLocalTeams();
        this.queueForSync('removePlayer', { ...player, removed: true });

        console.log('✅ Joueuse supprimée:', player.name);
        return true;
    }

    /**
     * Mettre à jour une joueuse
     */
    updatePlayer(teamId, playerId, updates) {
        const team = this.getTeam(teamId);
        if (!team) return null;

        const player = team.players.find(p => p.id === playerId);
        if (!player) return null;

        Object.assign(player, updates, {
            updated_at: new Date().toISOString()
        });

        team.updated_at = new Date().toISOString();
        this.saveLocalTeams();
        this.queueForSync('updatePlayer', player);

        console.log('✅ Joueuse mise à jour:', player.name);
        return player;
    }

    // ===== SYNCHRONISATION SUPABASE =====

    /**
     * Ajouter à la queue de synchronisation
     */
    queueForSync(operation, data) {
        this.syncQueue.push({
            operation,
            data,
            timestamp: new Date().toISOString(),
            retries: 0
        });
    }

    /**
     * Synchroniser avec Supabase (bidirectionnel)
     */
    async syncWithSupabase() {
        if (!window.supabaseSync || !window.supabaseSync.isReady()) {
            console.warn('⚠️ Supabase non prêt pour la sync');
            return false;
        }

        if (this.syncInProgress) {
            console.log('⏳ Synchronisation déjà en cours');
            return false;
        }

        this.syncInProgress = true;
        let syncedCount = 0;
        let errorCount = 0;

        try {
            // 1. Uploader les changements locaux
            for (const operation of this.syncQueue) {
                try {
                    const result = await window.supabaseSync.executeSync(operation);
                    if (result.success) {
                        syncedCount++;
                        // Marquer comme synced
                        if (operation.data.id) {
                            const parts = operation.data.id.split('_');
                            if (parts[0] === 'team') {
                                if (this.localData[operation.data.id]) {
                                    this.localData[operation.data.id].synced = true;
                                }
                            } else if (parts[0] === 'player') {
                                // Trouver et marquer le joueur
                                for (const team of Object.values(this.localData)) {
                                    const player = team.players.find(p => p.id === operation.data.id);
                                    if (player) {
                                        player.synced = true;
                                        break;
                                    }
                                }
                            }
                        }
                    } else {
                        errorCount++;
                    }
                } catch (error) {
                    console.error('❌ Erreur sync opération:', error);
                    errorCount++;
                }
            }

            // 2. Télécharger les données de Supabase
            const remoteTeams = await window.supabaseSync.downloadTeams();
            if (remoteTeams && Array.isArray(remoteTeams)) {
                this.mergeRemoteTeams(remoteTeams);
            }

            this.syncQueue = [];
            this.saveLocalTeams();

            console.log(`✅ Sync complète: ${syncedCount} uploads, ${remoteTeams?.length || 0} téléchargements`);
            return true;

        } catch (error) {
            console.error('❌ Erreur synchronisation:', error);
            return false;
        } finally {
            this.syncInProgress = false;
        }
    }

    /**
     * Fusionner les données téléchargées de Supabase
     */
    mergeRemoteTeams(remoteTeams) {
        for (const remoteTeam of remoteTeams) {
            const localTeam = this.localData[remoteTeam.id];
            
            if (!localTeam || new Date(remoteTeam.updated_at) > new Date(localTeam.updated_at)) {
                // Utiliser la version distante si plus récente
                this.localData[remoteTeam.id] = {
                    ...remoteTeam,
                    synced: true
                };
            }
        }
    }

    /**
     * Synchronisation automatique (all les 30 secondes si changements)
     */
    enableAutoSync(intervalMs = 30000) {
        setInterval(() => {
            if (this.syncQueue.length > 0 && navigator.onLine) {
                this.syncWithSupabase();
            }
        }, intervalMs);

        console.log('✅ Auto-sync activée');
    }

    // ===== UTILITAIRES =====

    /**
     * Export des équipes
     */
    export() {
        return {
            teams: this.localData,
            exportedAt: new Date().toISOString(),
            version: '1.0'
        };
    }

    /**
     * Import des équipes
     */
    import(data) {
        if (!data.teams) {
            console.error('❌ Format d\'import invalide');
            return false;
        }

        this.localData = data.teams;
        this.saveLocalTeams();
        
        // Queue tout pour sync
        for (const team of Object.values(this.localData)) {
            this.queueForSync('createTeam', team);
            for (const player of team.players || []) {
                this.queueForSync('addPlayer', player);
            }
        }

        console.log('✅ Équipes importées:', Object.keys(this.localData).length);
        return true;
    }

    /**
     * Vider toutes les données
     */
    clear() {
        if (confirm('⚠️ Êtes-vous sûr de vouloir supprimer toutes les équipes et joueuses ?')) {
            this.localData = {};
            this.syncQueue = [];
            this.saveLocalTeams();
            console.log('✅ Données effacées');
            return true;
        }
        return false;
    }
}

// ===== INITIALISATION GLOBALE =====

if (typeof window !== 'undefined') {
    window.teamManager = new TeamManager();
    console.log('📦 Module TeamManager chargé');
}