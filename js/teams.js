// ===== TEAMS BACKEND =====
// Gestion des équipes et synchronisation Supabase
// Ce fichier gère UNIQUEMENT les données, pas l'UI

class TeamsBackend {
    constructor() {
        this.teams = this.loadLocalTeams();
        this.syncInProgress = false;
        this.syncQueue = [];
        console.log('📦 TeamsBackend initialisé');
    }

    // ===== DONNÉES LOCALES =====

    /**
     * Charger les équipes depuis localStorage
     */
    loadLocalTeams() {
        try {
            const data = localStorage.getItem('footballStats_teams');
            return data ? JSON.parse(data) : {};
        } catch (error) {
            console.error('❌ Erreur chargement local:', error);
            return {};
        }
    }

    /**
     * Sauvegarder les équipes en localStorage
     */
    saveLocalTeams() {
        try {
            localStorage.setItem('footballStats_teams', JSON.stringify(this.teams));
            localStorage.setItem('footballStats_teamsLastUpdate', new Date().toISOString());
        } catch (error) {
            console.error('❌ Erreur sauvegarde local:', error);
        }
    }

    // ===== OPÉRATIONS ÉQUIPES =====

    /**
     * Créer une nouvelle équipe
     */
    createTeam(name, category = '', color = '#3498db') {
        if (!name || !name.trim()) {
            throw new Error('Nom d\'équipe requis');
        }

        const teamId = 'team_' + Date.now() + '_' + Math.random().toString(36).substr(2, 9);
        
        const team = {
            id: teamId,
            name: name.trim(),
            category: category.trim(),
            color: color,
            players: [],
            created_at: new Date().toISOString(),
            updated_at: new Date().toISOString()
        };

        this.teams[teamId] = team;
        this.saveLocalTeams();
        this.queueForSync('createTeam', team);

        console.log('✅ Équipe créée localement:', name);
        return team;
    }

    /**
     * Récupérer une équipe
     */
    getTeam(teamId) {
        return this.teams[teamId] || null;
    }

    /**
     * Lister toutes les équipes
     */
    getAllTeams() {
        return Object.values(this.teams).sort((a, b) => 
            new Date(b.created_at) - new Date(a.created_at)
        );
    }

    /**
     * Mettre à jour une équipe
     */
    updateTeam(teamId, updates) {
        const team = this.teams[teamId];
        if (!team) {
            throw new Error('Équipe non trouvée');
        }

        Object.assign(team, updates);
        team.updated_at = new Date().toISOString();
        this.saveLocalTeams();
        this.queueForSync('updateTeam', team);

        console.log('✅ Équipe mise à jour:', team.name);
        return team;
    }

    /**
     * Supprimer une équipe
     */
    deleteTeam(teamId) {
        const team = this.teams[teamId];
        if (!team) {
            throw new Error('Équipe non trouvée');
        }

        delete this.teams[teamId];
        this.saveLocalTeams();
        this.queueForSync('deleteTeam', { id: teamId, name: team.name });

        console.log('✅ Équipe supprimée:', team.name);
        return true;
    }

    // ===== OPÉRATIONS JOUEUSES =====

    /**
     * Ajouter une joueuse à une équipe
     */
    addPlayerToTeam(teamId, name, position, number = null) {
        const team = this.teams[teamId];
        if (!team) {
            throw new Error('Équipe non trouvée');
        }

        if (!name || !position) {
            throw new Error('Nom et position requis');
        }

        const playerId = 'player_' + Date.now() + '_' + Math.random().toString(36).substr(2, 9);
        
        const player = {
            id: playerId,
            name: name.trim(),
            position: position,
            number: number ? parseInt(number) : null,
            created_at: new Date().toISOString()
        };

        if (!team.players) {
            team.players = [];
        }

        team.players.push(player);
        team.updated_at = new Date().toISOString();
        this.saveLocalTeams();
        this.queueForSync('addPlayer', { teamId, player });

        console.log('✅ Joueuse ajoutée:', name);
        return player;
    }

    /**
     * Récupérer les joueuses d'une équipe
     */
    getTeamPlayers(teamId) {
        const team = this.teams[teamId];
        return team?.players || [];
    }

    /**
     * Récupérer une joueuse
     */
    getPlayer(teamId, playerId) {
        const team = this.teams[teamId];
        if (!team) return null;
        return team.players?.find(p => p.id === playerId) || null;
    }

    /**
     * Supprimer une joueuse
     */
    removePlayer(teamId, playerId) {
        const team = this.teams[teamId];
        if (!team) {
            throw new Error('Équipe non trouvée');
        }

        const player = team.players?.find(p => p.id === playerId);
        if (!player) {
            throw new Error('Joueuse non trouvée');
        }

        team.players = team.players.filter(p => p.id !== playerId);
        team.updated_at = new Date().toISOString();
        this.saveLocalTeams();
        this.queueForSync('removePlayer', { teamId, playerId });

        console.log('✅ Joueuse supprimée');
        return true;
    }

    // ===== SYNCHRONISATION SUPABASE =====

    /**
     * Synchroniser avec Supabase
     */
    async syncWithSupabase() {
        if (!window.supabaseManager?.isReady()) {
            console.log('⚠️ Supabase non prêt pour la sync');
            return false;
        }

        if (this.syncInProgress) {
            console.log('⏳ Sync déjà en cours...');
            return false;
        }

        this.syncInProgress = true;
        try {
            console.log('🔄 Synchronisation Supabase...');

            // Uploader toutes les équipes
            for (const team of this.getAllTeams()) {
                await this.syncTeamToSupabase(team);
            }

            console.log('✅ Synchronisation terminée');
            this.syncQueue = [];
            return true;
        } catch (error) {
            console.error('❌ Erreur sync Supabase:', error);
            return false;
        } finally {
            this.syncInProgress = false;
        }
    }

    /**
     * Synchroniser une équipe à Supabase
     */
    async syncTeamToSupabase(team) {
        try {
            const { data: existing } = await window.supabaseSync.client
                .from('teams')
                .select('id')
                .eq('id', team.id)
                .single();

            if (existing) {
                // Mettre à jour
                await window.supabaseSync.client
                    .from('teams')
                    .update({
                        name: team.name,
                        category: team.category,
                        color: team.color,
                        updated_at: team.updated_at
                    })
                    .eq('id', team.id);
            } else {
                // Créer
                await window.supabaseSync.client
                    .from('teams')
                    .insert({
                        id: team.id,
                        name: team.name,
                        category: team.category,
                        color: team.color,
                        created_at: team.created_at,
                        updated_at: team.updated_at
                    });
            }

            // Synchroniser les joueuses
            for (const player of team.players || []) {
                await this.syncPlayerToSupabase(team.id, player);
            }

            return true;
        } catch (error) {
            console.error('❌ Erreur sync équipe:', error);
            return false;
        }
    }

    /**
     * Synchroniser une joueuse à Supabase
     */
    async syncPlayerToSupabase(teamId, player) {
        try {
            const { data: existing } = await window.supabaseSync.client
                .from('players')
                .select('id')
                .eq('id', player.id)
                .single()
                .catch(() => ({ data: null }));

            if (existing) {
                // Mettre à jour
                await window.supabaseSync.client
                    .from('players')
                    .update({
                        name: player.name,
                        position: player.position,
                        number: player.number
                    })
                    .eq('id', player.id);
            } else {
                // Créer
                await window.supabaseSync.client
                    .from('players')
                    .insert({
                        id: player.id,
                        team_id: teamId,
                        name: player.name,
                        position: player.position,
                        number: player.number,
                        created_at: player.created_at
                    });
            }

            return true;
        } catch (error) {
            console.error('❌ Erreur sync joueuse:', error);
            return false;
        }
    }

    /**
     * Charger les équipes depuis Supabase
     */
    async downloadFromSupabase() {
        if (!window.supabaseManager?.isReady()) {
            console.log('⚠️ Supabase non prêt pour téléchargement');
            return [];
        }

        try {
            console.log('📥 Téléchargement depuis Supabase...');

            const { data: supabaseTeams, error } = await window.supabaseSync.client
                .from('teams')
                .select('*')
                .order('created_at', { ascending: false });

            if (error) throw error;

            // Fusionner avec les données locales
            const teams = supabaseTeams || [];
            for (const team of teams) {
                if (!this.teams[team.id]) {
                    this.teams[team.id] = team;
                }
            }

            this.saveLocalTeams();
            console.log(`✅ ${teams.length} équipe(s) téléchargée(s) depuis Supabase`);
            return this.getAllTeams();
        } catch (error) {
            console.error('❌ Erreur téléchargement Supabase:', error);
            return this.getAllTeams();
        }
    }

    /**
     * File d'attente pour la synchronisation
     */
    queueForSync(action, data) {
        this.syncQueue.push({
            action,
            data,
            timestamp: Date.now()
        });
    }

    /**
     * Activer la synchronisation automatique
     */
    enableAutoSync(interval = 15000) {
        setInterval(async () => {
            if (this.syncQueue.length > 0) {
                await this.syncWithSupabase();
            }
        }, interval);

        console.log('✅ Auto-sync activée (' + interval + 'ms)');
    }
}

// ===== INITIALISATION GLOBALE =====

if (typeof window !== 'undefined') {
    window.teamsBackend = new TeamsBackend();
    console.log('📦 Module TeamsBackend chargé');
}