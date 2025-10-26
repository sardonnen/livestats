// ===== TEAM MANAGER MODULE =====
// Gestion complète des équipes et joueuses avec sync local/Supabase

/**
 * Structure des données locales :
 * teams: {
 *   [teamId]: {
 *     id, name, category, color, logo_url,
 *     players: [{ id, name, position, number, supabase_id }],
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

        const team = this.localData[teamId];
        delete this.localData[teamId];
        this.saveLocalTeams();
        this.queueForSync('deleteTeam', { id: teamId, supabase_id: team.supabase_id, name: team.name });

        console.log('✅ Équipe supprimée:', team.name);
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
            number: number && number.toString().trim() !== '' ? parseInt(number) : 0,
            created_at: new Date().toISOString(),
            synced: false,
            supabase_id: null // Sera rempli après sync avec Supabase
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
        
        // CORRECTION : Utiliser supabase_id pour la suppression
        this.queueForSync('removePlayer', { 
            id: player.id, 
            supabase_id: player.supabase_id, // Utiliser l'UUID Supabase
            removed: true 
        });

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

        Object.assign(player, updates, { updated_at: new Date().toISOString() });
        team.updated_at = new Date().toISOString();
        this.saveLocalTeams();
        this.queueForSync('updatePlayer', player);

        console.log('✅ Joueuse mise à jour:', player.name);
        return player;
    }

    // ===== SYNCHRONISATION =====

    /**
     * Ajouter une opération dans la queue de sync
     */
    queueForSync(operation, data) {
        this.syncQueue.push({ operation, data, timestamp: Date.now() });
        console.log('📌 Opération en queue:', operation);
    }

    /**
     * Synchroniser avec Supabase (mode auto)
     */
    async syncWithSupabase() {
        if (!window.supabaseSync || !window.supabaseSync.isReady()) {
            console.log('⏭️ Sync désactivée (Supabase non initialisé)');
            return false;
        }

        if (this.syncQueue.length === 0) {
            // Pas d'opérations locales, télécharger quand même
            const remoteTeams = await window.supabaseSync.downloadTeams();
            if (remoteTeams && Array.isArray(remoteTeams)) {
                this.mergeRemoteTeams(remoteTeams);
                this.saveLocalTeams();
            }
            return true;
        }

        if (this.syncInProgress) {
            console.log('⏳ Synchronisation déjà en cours');
            return false;
        }

        this.syncInProgress = true;
        let syncedCount = 0;
        let errorCount = 0;

        try {
            // Trier par priorité (créations d'équipe en premier)
            this.syncQueue.sort((a, b) => {
                const priority = { createTeam: 0, addPlayer: 1, updatePlayer: 2, updateTeam: 3, removePlayer: 4, deleteTeam: 5 };
                return (priority[a.operation] || 99) - (priority[b.operation] || 99);
            });
            console.log('🔄 Queue de sync triée:', this.syncQueue.length, 'opérations');

            // 1. Uploader les changements locaux
            for (const operation of this.syncQueue) {
                try {
                    const result = await window.supabaseSync.executeSync(operation);
                    if (result.success) {
                        syncedCount++;
                        
                        // CORRECTION : Stocker le supabase_id retourné
                        if (operation.operation === 'addPlayer' && result.supabaseId && result.localId) {
                            // Trouver le joueur local et stocker son supabase_id
                            for (const team of Object.values(this.localData)) {
                                const player = team.players.find(p => p.id === result.localId);
                                if (player) {
                                    player.supabase_id = result.supabaseId;
                                    player.synced = true;
                                    console.log('✅ UUID Supabase stocké:', result.localId, '→', result.supabaseId);
                                    break;
                                }
                            }
                        } else if (operation.operation === 'createTeam' && result.supabaseId) {
                            // Stocker l'UUID Supabase de l'équipe
                            if (this.localData[operation.data.id]) {
                                this.localData[operation.data.id].supabase_id = result.supabaseId;
                                this.localData[operation.data.id].synced = true;
                            }
                        } else {
                            // Marquer comme synced pour les autres opérations
                            if (operation.data.id) {
                                const parts = operation.data.id.split('_');
                                if (parts[0] === 'team') {
                                    if (this.localData[operation.data.id]) {
                                        this.localData[operation.data.id].synced = true;
                                    }
                                } else if (parts[0] === 'player') {
                                    for (const team of Object.values(this.localData)) {
                                        const player = team.players.find(p => p.id === operation.data.id);
                                        if (player) {
                                            player.synced = true;
                                            break;
                                        }
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
            // Chercher l'équipe locale par supabase_id ou par ID local
            let localTeam = Object.values(this.localData).find(t => t.supabase_id === remoteTeam.id);
            
            if (!localTeam) {
                // Pas trouvée, créer une nouvelle entrée locale avec l'ID distant
                const localId = remoteTeam.id; // Utiliser l'UUID Supabase comme ID local aussi
                localTeam = this.localData[localId] = {
                    ...remoteTeam,
                    id: localId,
                    supabase_id: remoteTeam.id,
                    synced: true
                };
            } else {
                // Fusionner si la version distante est plus récente
                if (new Date(remoteTeam.updated_at) > new Date(localTeam.updated_at)) {
                    Object.assign(localTeam, remoteTeam, {
                        id: localTeam.id, // Garder l'ID local
                        supabase_id: remoteTeam.id,
                        synced: true
                    });
                }
            }

            // Fusionner les joueuses
            if (remoteTeam.players && Array.isArray(remoteTeam.players)) {
                for (const remotePlayer of remoteTeam.players) {
                    // Chercher la joueuse locale par supabase_id
                    let localPlayer = localTeam.players.find(p => p.supabase_id === remotePlayer.id);
                    
                    if (!localPlayer) {
                        // Joueuse pas trouvée localement, l'ajouter
                        const localPlayerId = 'player_' + Date.now() + '_' + Math.random().toString(36).substr(2, 9);
                        localPlayer = {
                            ...remotePlayer,
                            id: localPlayerId,
                            supabase_id: remotePlayer.id,
                            team_id: localTeam.id,
                            synced: true
                        };
                        localTeam.players.push(localPlayer);
                    } else {
                        // Fusionner si plus récent
                        Object.assign(localPlayer, remotePlayer, {
                            id: localPlayer.id, // Garder l'ID local
                            supabase_id: remotePlayer.id,
                            team_id: localTeam.id,
                            synced: true
                        });
                    }
                }
            }
        }
    }

    /**
     * Activer la sync automatique
     */
    enableAutoSync(intervalMs = 10000) {
        if (this.autoSyncInterval) {
            clearInterval(this.autoSyncInterval);
        }

        this.autoSyncInterval = setInterval(() => {
            this.syncWithSupabase();
        }, intervalMs);

        console.log('✅ Auto-sync activée');
    }

    /**
     * Désactiver la sync automatique
     */
    disableAutoSync() {
        if (this.autoSyncInterval) {
            clearInterval(this.autoSyncInterval);
            this.autoSyncInterval = null;
            console.log('⏸️ Auto-sync désactivée');
        }
    }

    /**
     * Force une synchronisation immédiate
     */
    async forceSyncNow() {
        console.log('🔄 Synchronisation forcée...');
        return await this.syncWithSupabase();
    }
}

// ===== INITIALISATION GLOBALE =====

if (typeof window !== 'undefined') {
    window.teamManager = new TeamManager();
    console.log('📦 Module TeamManager chargé');
}