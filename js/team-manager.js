// ===== TEAM MANAGER MODULE =====
// Gestion complete des equipes et joueuses avec sync local/Supabase

/**
 * Structure des donnees locales :
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
        
        console.log('[TeamManager] Initialise');
    }

    /**
     * Generer un UUID v4 valide (compatible Supabase)
     */
    generateUUID() {
        // Utiliser crypto.randomUUID() si disponible (navigateurs modernes)
        if (typeof crypto !== 'undefined' && crypto.randomUUID) {
            return crypto.randomUUID();
        }
        
        // Fallback: generer UUID v4 manuellement
        return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, function(c) {
            const r = Math.random() * 16 | 0;
            const v = c === 'x' ? r : (r & 0x3 | 0x8);
            return v.toString(16);
        });
    }

    // ===== GESTION LOCALE =====

    /**
     * Charger les equipes depuis localStorage
     */
    loadLocalTeams() {
        const data = localStorage.getItem('footballStats_teams');
        return data ? JSON.parse(data) : {};
    }

    /**
     * Sauvegarder les equipes en localStorage
     */
    saveLocalTeams() {
        localStorage.setItem('footballStats_teams', JSON.stringify(this.localData));
        localStorage.setItem('teamManager_lastSync', new Date().toISOString());
        this.lastSyncTime = new Date().toISOString();
    }

    /**
     * Creer une nouvelle equipe
     */
    createTeam(name, category = '', color = '#3498db') {
        const teamId = this.generateUUID();
        
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

        console.log('[OK] Equipe creee localement:', name);
        return team;
    }

    /**
     * Recuperer une equipe
     */
    getTeam(teamId) {
        return this.localData[teamId] || null;
    }

    /**
     * Lister toutes les equipes
     */
    getAllTeams() {
        return Object.values(this.localData).sort((a, b) => 
            new Date(b.created_at) - new Date(a.created_at)
        );
    }

    /**
     * Supprimer une equipe
     */
    deleteTeam(teamId) {
        if (!this.localData[teamId]) {
            console.warn('[WARNING] Equipe non trouvee:', teamId);
            return false;
        }

        delete this.localData[teamId];
        this.saveLocalTeams();
        this.queueForSync('deleteTeam', { id: teamId });
        
        console.log('[OK] Equipe supprimee:', teamId);
        return true;
    }

    /**
     * Modifier une equipe
     */
    updateTeam(teamId, updates) {
        const team = this.localData[teamId];
        if (!team) {
            console.warn('[WARNING] Equipe non trouvee:', teamId);
            return null;
        }

        Object.assign(team, updates);
        team.updated_at = new Date().toISOString();
        team.synced = false;
        
        this.saveLocalTeams();
        this.queueForSync('updateTeam', team);

        console.log('[OK] Equipe mise a jour:', team.name);
        return team;
    }

    // ===== GESTION JOUEUSES =====

    /**
     * Ajouter une joueuse a une equipe
     */
    addPlayerToTeam(teamId, name, position, number = 0) {
        const team = this.getTeam(teamId);
        if (!team) {
            console.warn('[WARNING] Equipe non trouvee:', teamId);
            return null;
        }

        const playerId = this.generateUUID();
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

        console.log('[OK] Joueuse ajoutee:', name, 'a', team.name);
        return player;
    }

    /**
     * Recuperer une joueuse
     */
    getPlayer(teamId, playerId) {
        const team = this.getTeam(teamId);
        if (!team) return null;
        return team.players.find(p => p.id === playerId) || null;
    }

    /**
     * Lister les joueuses d'une equipe
     */
    getTeamPlayers(teamId) {
        const team = this.getTeam(teamId);
        return team ? team.players : [];
    }

    /**
     * Supprimer une joueuse
     */
    deletePlayer(teamId, playerId) {
        const team = this.getTeam(teamId);
        if (!team) {
            console.warn('[WARNING] Equipe non trouvee:', teamId);
            return false;
        }

        const index = team.players.findIndex(p => p.id === playerId);
        if (index === -1) {
            console.warn('[WARNING] Joueuse non trouvee:', playerId);
            return false;
        }

        team.players.splice(index, 1);
        team.updated_at = new Date().toISOString();
        this.saveLocalTeams();
        this.queueForSync('deletePlayer', { id: playerId, team_id: teamId });

        console.log('[OK] Joueuse supprimee:', playerId);
        return true;
    }

    /**
     * Modifier une joueuse
     */
    updatePlayer(teamId, playerId, updates) {
        const team = this.getTeam(teamId);
        if (!team) {
            console.warn('[WARNING] Equipe non trouvee:', teamId);
            return null;
        }

        const player = team.players.find(p => p.id === playerId);
        if (!player) {
            console.warn('[WARNING] Joueuse non trouvee:', playerId);
            return null;
        }

        Object.assign(player, updates);
        player.synced = false;
        team.updated_at = new Date().toISOString();
        
        this.saveLocalTeams();
        this.queueForSync('updatePlayer', player);

        console.log('[OK] Joueuse mise a jour:', player.name);
        return player;
    }

    // ===== SYNCHRONISATION SUPABASE =====

    /**
     * Ajouter une action a la queue de sync
     */
    queueForSync(action, data) {
        this.syncQueue.push({ action, data, timestamp: Date.now() });
    }

    /**
     * Synchroniser avec Supabase
     */
    async syncWithSupabase() {
        if (this.syncInProgress) {
            console.log('[INFO] Sync deja en cours, skip');
            return;
        }

        if (!window.supabaseSync) {
            console.warn('[WARNING] Module SupabaseSync non disponible');
            return;
        }

        this.syncInProgress = true;

        try {
            // 1. Upload local -> Supabase
            let uploadCount = 0;
            const unsyncedTeams = Object.values(this.localData).filter(t => !t.synced);
            
            for (const team of unsyncedTeams) {
                await window.supabaseSync.addTeamRemote(team);
                team.synced = true;
                
                for (const player of team.players.filter(p => !p.synced)) {
                    await window.supabaseSync.addPlayerRemote(player);
                    player.synced = true;
                    uploadCount++;
                }
                uploadCount++;
            }

            // 2. Download Supabase -> local
            const remoteTeams = await window.supabaseSync.getTeamsRemote();
            let downloadCount = 0;

            for (const remoteTeam of remoteTeams) {
                if (!this.localData[remoteTeam.id]) {
                    this.localData[remoteTeam.id] = {
                        ...remoteTeam,
                        players: [],
                        synced: true
                    };
                    downloadCount++;
                }

                const remotePlayers = await window.supabaseSync.getPlayersRemote(remoteTeam.id);
                const localTeam = this.localData[remoteTeam.id];

                for (const remotePlayer of remotePlayers) {
                    if (!localTeam.players.find(p => p.id === remotePlayer.id)) {
                        localTeam.players.push({ ...remotePlayer, synced: true });
                        downloadCount++;
                    }
                }
            }

            if (uploadCount > 0 || downloadCount > 0) {
                this.saveLocalTeams();
            }

            console.log('[OK] Sync complete:', uploadCount, 'uploads,', downloadCount, 'telechargements');

        } catch (error) {
            console.error('[ERROR] Erreur sync Supabase:', error);
        } finally {
            this.syncInProgress = false;
        }
    }

    /**
     * Activer la synchronisation automatique
     */
    enableAutoSync(intervalSeconds = 30) {
        if (this.autoSyncInterval) {
            clearInterval(this.autoSyncInterval);
        }

        this.autoSyncInterval = setInterval(() => {
            this.syncWithSupabase();
        }, intervalSeconds * 1000);

        console.log('[OK] Auto-sync activee');
        
        // Sync immediate au demarrage
        this.syncWithSupabase();
    }

    /**
     * Desactiver la synchronisation automatique
     */
    disableAutoSync() {
        if (this.autoSyncInterval) {
            clearInterval(this.autoSyncInterval);
            this.autoSyncInterval = null;
            console.log('[OK] Auto-sync desactivee');
        }
    }

    /**
     * Forcer une synchronisation complete
     */
    async forceSync() {
        console.log('[INFO] Synchronisation forcee...');
        await this.syncWithSupabase();
    }

    /**
     * Reinitialiser toutes les donnees locales
     */
    resetLocalData() {
        if (confirm('ATTENTION: Cette action va supprimer toutes vos donnees locales. Continuer ?')) {
            localStorage.removeItem('footballStats_teams');
            localStorage.removeItem('teamManager_lastSync');
            this.localData = {};
            this.lastSyncTime = null;
            console.log('[OK] Donnees locales reinitialisees');
            return true;
        }
        return false;
    }

    /**
     * Obtenir des statistiques
     */
    getStats() {
        const teams = this.getAllTeams();
        return {
            totalTeams: teams.length,
            totalPlayers: teams.reduce((sum, t) => sum + t.players.length, 0),
            syncedTeams: teams.filter(t => t.synced).length,
            lastSync: this.lastSyncTime
        };
    }
}

// Exporter l'instance globale
if (typeof window !== 'undefined') {
    window.teamManager = new TeamManager();
    console.log('[TeamManager] Module charge');
}