// ===== TEAM MANAGER MODULE =====
// Gestion complÃ¨te des Ã©quipes et joueuses avec sync local/Supabase

/**
 * Structure des donnÃ©es locales :
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
        
        console.log('ðŸ“¦ TeamManager initialisÃ©');
    }

    // ===== GESTION LOCALE =====

    /**
     * Charger les Ã©quipes depuis localStorage
     */
    loadLocalTeams() {
        const data = localStorage.getItem('footballStats_teams');
        return data ? JSON.parse(data) : {};
    }

    /**
     * Sauvegarder les Ã©quipes en localStorage
     */
    saveLocalTeams() {
        localStorage.setItem('footballStats_teams', JSON.stringify(this.localData));
        localStorage.setItem('teamManager_lastSync', new Date().toISOString());
        this.lastSyncTime = new Date().toISOString();
    }

    /**
     * CrÃ©er une nouvelle Ã©quipe
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

        console.log('âœ… Ã‰quipe crÃ©Ã©e localement:', name);
        return team;
    }

    /**
     * RÃ©cupÃ©rer une Ã©quipe
     */
    getTeam(teamId) {
        return this.localData[teamId] || null;
    }

    /**
     * Lister toutes les Ã©quipes
     */
    getAllTeams() {
        return Object.values(this.localData).sort((a, b) => 
            new Date(b.created_at) - new Date(a.created_at)
        );
    }

    /**
     * Supprimer une Ã©quipe
     */
    deleteTeam(teamId) {
        if (!this.localData[teamId]) {
            console.warn('âš ï¸ Ã‰quipe non trouvÃ©e:', teamId);
            return false;
        }

        const teamName = this.localData[teamId].name;
        delete this.localData[teamId];
        this.saveLocalTeams();
        this.queueForSync('deleteTeam', { id: teamId, name: teamName });

        console.log('âœ… Ã‰quipe supprimÃ©e:', teamName);
        return true;
    }

    /**
     * Mettre Ã  jour une Ã©quipe
     */
    updateTeam(teamId, updates) {
        if (!this.localData[teamId]) {
            console.warn('âš ï¸ Ã‰quipe non trouvÃ©e:', teamId);
            return null;
        }

        this.localData[teamId] = {
            ...this.localData[teamId],
            ...updates,
            updated_at: new Date().toISOString()
        };

        this.saveLocalTeams();
        this.queueForSync('updateTeam', this.localData[teamId]);

        console.log('âœ… Ã‰quipe mise Ã  jour:', updates);
        return this.localData[teamId];
    }

    // ===== GESTION DES JOUEUSES =====

    /**
     * Ajouter une joueuse Ã  une Ã©quipe
     */
    addPlayerToTeam(teamId, name, position, number = null) {
        const team = this.getTeam(teamId);
        if (!team) {
            console.warn('âš ï¸ Ã‰quipe non trouvÃ©e:', teamId);
            return null;
        }

        const playerId = 'player_' + Date.now() + '_' + Math.random().toString(36).substr(2, 9);
        const player = {
            id: playerId,
            team_id: teamId,
            name: name.trim(),
            position: position.trim(),
            number: number && number.toString().trim() !== '' ? parseInt(number) : 0,
            created_at: new Date().toISOString(),
            synced: false
        };

        team.players.push(player);
        team.updated_at = new Date().toISOString();
        this.saveLocalTeams();
        this.queueForSync('addPlayer', player);

        console.log('âœ… Joueuse ajoutÃ©e:', name, 'Ã ', team.name);
        return player;
    }

    /**
     * RÃ©cupÃ©rer une joueuse
     */
    getPlayer(teamId, playerId) {
        const team = this.getTeam(teamId);
        if (!team) return null;
        return team.players.find(p => p.id === playerId) || null;
    }

    /**
     * Lister les joueuses d'une Ã©quipe
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

        console.log('âœ… Joueuse supprimÃ©e:', player.name);
        return true;
    }

    /**
     * Mettre Ã  jour une joueuse
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

        console.log('âœ… Joueuse mise Ã  jour:', player.name);
        return player;
    }

    // ===== SYNCHRONISATION SUPABASE =====

    /**
     * Ajouter Ã  la queue de synchronisation
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
            // 🔧 CORRECTION: Trier la queue de sync par priorité d'opération
            // Ordre: createTeam → updateTeam → addPlayer → updatePlayer → removePlayer → deleteTeam
            const operationPriority = {
                'createTeam': 1,
                'updateTeam': 2,
                'addPlayer': 3,
                'updatePlayer': 4,
                'removePlayer': 5,
                'deleteTeam': 6
            };

            const sortedQueue = [...this.syncQueue].sort((a, b) => {
                const priorityA = operationPriority[a.operation] || 999;
                const priorityB = operationPriority[b.operation] || 999;
                return priorityA - priorityB;
            });

            console.log(`🔄 Queue de sync triée: ${sortedQueue.length} opérations`);

            // 1. Uploader les changements locaux (dans l'ordre trié)
            for (const operation of sortedQueue) {
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
     * Fusionner les donnÃ©es tÃ©lÃ©chargÃ©es de Supabase
     */
    mergeRemoteTeams(remoteTeams) {
        for (const remoteTeam of remoteTeams) {
            const localTeam = this.localData[remoteTeam.id];
            
            if (!localTeam || new Date(remoteTeam.updated_at) > new Date(localTeam.updated_at)) {
                // Utiliser la version distante si plus rÃ©cente
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

        console.log('âœ… Auto-sync activÃ©e');
    }

    // ===== UTILITAIRES =====

    /**
     * Export des Ã©quipes
     */
    export() {
        return {
            teams: this.localData,
            exportedAt: new Date().toISOString(),
            version: '1.0'
        };
    }

    /**
     * Import des Ã©quipes
     */
    import(data) {
        if (!data.teams) {
            console.error('âŒ Format d\'import invalide');
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

        console.log('âœ… Ã‰quipes importÃ©es:', Object.keys(this.localData).length);
        return true;
    }

    /**
     * Vider toutes les donnÃ©es
     */
    clear() {
        if (confirm('âš ï¸ ÃŠtes-vous sÃ»r de vouloir supprimer toutes les Ã©quipes et joueuses ?')) {
            this.localData = {};
            this.syncQueue = [];
            this.saveLocalTeams();
            console.log('âœ… DonnÃ©es effacÃ©es');
            return true;
        }
        return false;
    }
}

// ===== INITIALISATION GLOBALE =====

if (typeof window !== 'undefined') {
    window.teamManager = new TeamManager();
    console.log('ðŸ“¦ Module TeamManager chargÃ©');
}