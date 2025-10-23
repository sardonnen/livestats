// ===== GESTION D'ÉQUIPE - Interface Frontend =====
// Gère l'UI de gestion des équipes, joueuses et compositions

// ===== HELPER FUNCTIONS =====

/**
 * Afficher une notification
 */
function showNotification(message, type = 'info') {
    const notification = document.getElementById('notification');
    if (!notification) return;

    notification.textContent = message;
    notification.className = `notification show ${type}`;
    
    setTimeout(() => {
        notification.classList.remove('show');
    }, 3000);
}

/**
 * Fermer un modal
 */
function closeModal(modalId) {
    const modal = document.getElementById(modalId);
    if (modal) modal.style.display = 'none';
}

/**
 * Ouvrir un modal
 */
function openModal(modalId) {
    const modal = document.getElementById(modalId);
    if (modal) modal.style.display = 'flex';
}

class TeamsManager {
    constructor() {
        this.currentTeamId = null;
        this.currentTeam = null;
        this.players = [];
        this.composition = [];
        this.currentTab = 'players';
        this.currentFilter = 'all';
        this.editingPlayerId = null;
        this.selectedForComposition = [];
        this.playerStats = {};
    }

    /**
     * Initialiser le gestionnaire d'équipe
     */
    async init() {
        console.log('🏟️ Initialisation TeamsManager');

        // Attendre que Supabase soit prêt
        let attempts = 0;
        while (!window.supabaseManager?.isReady() && attempts < 20) {
            await new Promise(resolve => setTimeout(resolve, 100));
            attempts++;
        }

        if (!window.supabaseManager?.isReady()) {
            console.log('⚠️ Supabase non prêt, utilisation mode local');
        }

        // Charger les équipes disponibles
        await this.loadTeams();
        // TODO: Stats chargées depuis le match lui-même, pas besoin ici
        // await this.loadPlayerStats();

        console.log('✅ TeamsManager initialisé');
    }

    /**
     * Charger les équipes (locales + Supabase)
     */
    async loadTeams() {
        try {
            let teams = [];

            // 1. Charger les équipes locales depuis TeamManager
            if (window.teamManager) {
                const localTeams = window.teamManager.getAllTeams();
                teams = localTeams.map(t => ({
                    id: t.id,
                    name: t.name,
                    category: t.category,
                    color: t.color,
                    player_count: (t.players || []).length,
                    created_at: t.created_at,
                    local: true
                }));
                console.log('✅ Équipes locales chargées:', teams.length);
            }

            // 2. Charger aussi depuis Supabase si disponible
            if (window.supabaseManager && window.supabaseManager.isReady()) {
                try {
                    const { data: supabaseTeams, error } = await window.supabaseSync.client
                        .from('teams')
                        .select('*')
                        .order('created_at', { ascending: false });

                    if (!error && supabaseTeams) {
                        // Fusionner : local + Supabase (sans doublon)
                        supabaseTeams.forEach(st => {
                            if (!teams.find(t => t.id === st.id)) {
                                teams.push({
                                    ...st,
                                    player_count: st.player_count || 0,
                                    remote: true
                                });
                            }
                        });
                        console.log('✅ Équipes Supabase fusionnées:', supabaseTeams.length);
                    }
                } catch (e) {
                    console.log('ℹ️ Supabase non accessible, utilisation données locales');
                }
            }

            // 3. Remplir le select
            const select = document.getElementById('teamSelect');
            if (select) {
                select.innerHTML = '<option value="">-- Sélectionner une équipe --</option>';
                
                if (teams && teams.length > 0) {
                    teams.forEach(team => {
                        const option = document.createElement('option');
                        option.value = team.id;
                        option.textContent = `${team.name} (${team.category || 'Sans catégorie'})`;
                        option.dataset.teamId = team.id;
                        select.appendChild(option);
                    });
                }
            }

            // 4. Afficher la liste
            this.updateTeamsList(teams || []);
            
            console.log(`✅ ${teams.length} équipe(s) chargée(s)`);
        } catch (error) {
            console.error('❌ Erreur chargement équipes :', error);
            showNotification('Erreur chargement équipes', 'error');
        }
    }

    /**
     * Mettre à jour l'affichage de la liste des équipes
     */
    updateTeamsList(teams) {
        const container = document.getElementById('teamsList');
        
        if (teams.length === 0) {
            container.innerHTML = '<p class="empty-state">Aucune équipe créée</p>';
            return;
        }

        container.innerHTML = teams.map(team => `
            <div class="team-item ${this.currentTeamId === team.id ? 'active' : ''}" 
                 onclick="teamsManager.selectTeamFromList('${team.id}')">
                <div class="team-item-color" style="background-color: ${team.color || '#2196F3'}"></div>
                <div class="team-item-info">
                    <div class="team-item-name">${team.name}</div>
                    <div class="team-item-category">${team.category || 'Personnalisée'}</div>
                </div>
                <div class="team-item-count">${team.player_count || 0} 👥</div>
            </div>
        `).join('');
    }

    /**
     * Sélectionner une équipe via la liste
     */
    async selectTeamFromList(teamId) {
        document.getElementById('teamSelect').value = teamId;
        await this.selectTeam();
    }

    /**
     * Charger une équipe sélectionnée
     */
    async selectTeam() {
        const teamId = document.getElementById('teamSelect').value;
        
        if (!teamId) {
            this.currentTeamId = null;
            this.currentTeam = null;
            this.players = [];
            this.renderPlayers();
            document.getElementById('renameTeamBtn').disabled = true;
            document.getElementById('deleteTeamBtn').disabled = true;
            document.getElementById('downloadTeamBtn').disabled = true;
            return;
        }

        try {
            // Charger l'équipe
            const { data: team, error: teamError } = await window.supabaseSync.client
                .from('teams')
                .select('*')
                .eq('id', teamId)
                .single();

            if (teamError) throw teamError;

            this.currentTeamId = teamId;
            this.currentTeam = team;

            // Charger les joueuses
            const { data: players, error: playersError } = await window.supabaseSync.client
                .from('players')
                .select('*')
                .eq('team_id', teamId)
                .order('number', { ascending: true });

            if (playersError) throw playersError;

            this.players = players || [];

            // Charger la composition si elle existe
            const { data: comp, error: compError } = await window.supabaseSync.client
                .from('compositions')
                .select('*')
                .eq('team_id', teamId)
                .eq('is_active', true)
                .maybeSingle();

            if (!compError && comp) {
                this.composition = comp.players_ids || [];
                this.selectedForComposition = [...this.composition];
            } else {
                this.composition = [];
                this.selectedForComposition = [];
            }

            // Mettre à jour l'UI
            this.renderPlayers();
            this.updateTeamsList(await this.getAllTeams());
            
            // Activer les boutons
            document.getElementById('renameTeamBtn').disabled = false;
            document.getElementById('deleteTeamBtn').disabled = false;
            document.getElementById('downloadTeamBtn').disabled = false;

            showNotification(`✅ Équipe "${team.name}" chargée`, 'success');

        } catch (error) {
            console.error('❌ Erreur chargement équipe :', error);
            showNotification('Erreur chargement équipe', 'error');
        }
    }

    /**
     * Afficher le formulaire de création d'équipe
     */
    showCreateTeamForm() {
        document.getElementById('createTeamModal').style.display = 'flex';
    }

    /**
     * Créer une nouvelle équipe
     */
    async createTeam() {
        const name = document.getElementById('newTeamName').value.trim();
        const category = document.getElementById('newTeamCategory').value;
        const color = document.getElementById('teamColor').value;

        if (!name) {
            showNotification('Veuillez entrer un nom d\'équipe', 'warning');
            return;
        }

        try {
            const newTeam = {
                name,
                category: category || null,
                color,
                player_count: 0
            };

            const { data: team, error } = await window.supabaseSync.client
                .from('teams')
                .insert([newTeam])
                .select()
                .single();

            if (error) throw error;

            showNotification(`✅ Équipe "${name}" créée`, 'success');
            this.closeModal('createTeamModal');

            // Réinitialiser le formulaire
            document.getElementById('newTeamName').value = '';
            document.getElementById('newTeamCategory').value = '';
            document.getElementById('teamColor').value = '#2196F3';

            // Recharger les équipes et la sélectionner
            await this.loadTeams();
            document.getElementById('teamSelect').value = team.id;
            await this.selectTeam();

        } catch (error) {
            console.error('❌ Erreur création équipe :', error);
            showNotification('Erreur création équipe', 'error');
        }
    }

    /**
     * Renommer une équipe
     */
    async renameTeam() {
        if (!this.currentTeamId) return;

        const newName = prompt('Nouveau nom de l\'équipe :', this.currentTeam.name);
        if (!newName) return;

        try {
            const { error } = await window.supabaseSync.client
                .from('teams')
                .update({ name: newName })
                .eq('id', this.currentTeamId);

            if (error) throw error;

            this.currentTeam.name = newName;
            showNotification('✅ Équipe renommée', 'success');
            await this.loadTeams();
            await this.selectTeam();

        } catch (error) {
            console.error('❌ Erreur renommage :', error);
            showNotification('Erreur renommage', 'error');
        }
    }

    /**
     * Supprimer une équipe
     */
    async deleteTeam() {
        if (!this.currentTeamId) return;

        if (!confirm(`⚠️ Êtes-vous certain de vouloir supprimer l'équipe "${this.currentTeam.name}" et toutes ses joueuses ?`)) {
            return;
        }

        try {
            // Supprimer les joueuses
            await window.supabaseSync.client
                .from('players')
                .delete()
                .eq('team_id', this.currentTeamId);

            // Supprimer les compositions
            await window.supabaseSync.client
                .from('compositions')
                .delete()
                .eq('team_id', this.currentTeamId);

            // Supprimer l'équipe
            const { error } = await window.supabaseSync.client
                .from('teams')
                .delete()
                .eq('id', this.currentTeamId);

            if (error) throw error;

            showNotification('✅ Équipe supprimée', 'success');
            
            this.currentTeamId = null;
            this.currentTeam = null;
            this.players = [];
            
            document.getElementById('teamSelect').value = '';
            await this.loadTeams();
            this.renderPlayers();

        } catch (error) {
            console.error('❌ Erreur suppression :', error);
            showNotification('Erreur suppression équipe', 'error');
        }
    }

    /**
     * Télécharger une sauvegarde de l'équipe
     */
    async downloadTeamBackup() {
        if (!this.currentTeamId) return;

        try {
            const backup = {
                team: this.currentTeam,
                players: this.players,
                composition: this.composition,
                exportDate: new Date().toISOString()
            };

            const json = JSON.stringify(backup, null, 2);
            const blob = new Blob([json], { type: 'application/json' });
            const url = URL.createObjectURL(blob);
            const a = document.createElement('a');
            a.href = url;
            a.download = `equipe_${this.currentTeam.name}_${Date.now()}.json`;
            document.body.appendChild(a);
            a.click();
            document.body.removeChild(a);
            URL.revokeObjectURL(url);

            showNotification('💾 Sauvegarde téléchargée', 'success');

        } catch (error) {
            console.error('❌ Erreur téléchargement :', error);
            showNotification('Erreur téléchargement', 'error');
        }
    }

    /**
     * Ajouter une joueuse
     */
    async addPlayer() {
        if (!this.currentTeamId) {
            showNotification('Sélectionnez d\'abord une équipe', 'warning');
            return;
        }

        const name = document.getElementById('playerName').value.trim();
        const number = parseInt(document.getElementById('playerNumber').value);
        const position = document.getElementById('playerPosition').value;

        if (!name || !number || !position) {
            showNotification('Veuillez remplir tous les champs', 'warning');
            return;
        }

        try {
            const newPlayer = {
                team_id: this.currentTeamId,
                name,
                number,
                position
            };

            const { data: player, error } = await window.supabaseSync.client
                .from('players')
                .insert([newPlayer])
                .select()
                .single();

            if (error) throw error;

            // Mettre à jour le compteur d'équipe
            const newCount = this.players.length + 1;
            await window.supabaseSync.client
                .from('teams')
                .update({ player_count: newCount })
                .eq('id', this.currentTeamId);

            this.players.push(player);
            this.renderPlayers();

            // Réinitialiser le formulaire
            document.getElementById('playerName').value = '';
            document.getElementById('playerNumber').value = '';
            document.getElementById('playerPosition').value = '';

            showNotification(`✅ Joueuse "${name}" ajoutée`, 'success');

        } catch (error) {
            console.error('❌ Erreur ajout joueuse :', error);
            showNotification('Erreur ajout joueuse', 'error');
        }
    }

    /**
     * Filtrer les joueuses par position
     */
    filterByPosition(position) {
        this.currentFilter = position;
        
        // Mettre à jour les boutons de filtre
        document.querySelectorAll('.filter-btn').forEach(btn => {
            btn.classList.remove('active');
        });
        event.target.classList.add('active');

        this.renderPlayers();
    }

    /**
     * Afficher les joueuses filtrées
     */
    renderPlayers() {
        const container = document.getElementById('playersList');

        if (this.players.length === 0) {
            container.innerHTML = '<p class="empty-state">Aucune joueuse. Commencez par ajouter des joueuses.</p>';
            return;
        }

        let filtered = this.players;
        if (this.currentFilter !== 'all') {
            filtered = this.players.filter(p => p.position === this.currentFilter);
        }

        if (filtered.length === 0) {
            container.innerHTML = `<p class="empty-state">Aucune joueuse pour cette position</p>`;
            return;
        }

        container.innerHTML = filtered.map(player => {
            const positionLabel = {
                'GK': '🥅 Gardien',
                'DF': '🛡️ Défenseur',
                'MF': '⚡ Milieu',
                'FW': '⚔️ Attaquant'
            }[player.position] || player.position;

            const inComposition = this.selectedForComposition.includes(player.id);

            return `
                <div class="player-card ${inComposition ? 'in-composition' : ''}">
                    <div class="player-number">${player.number}</div>
                    <div class="player-info">
                        <div class="player-name">${player.name}</div>
                        <div class="player-position">${positionLabel}</div>
                    </div>
                    <div class="player-actions">
                        <button class="btn btn-xs btn-primary" onclick="teamsManager.editPlayer('${player.id}')">
                            ✏️
                        </button>
                        <button class="btn btn-xs ${inComposition ? 'btn-success' : 'btn-secondary'}" 
                                onclick="teamsManager.toggleComposition('${player.id}')">
                            ${inComposition ? '✓' : '+'}
                        </button>
                    </div>
                </div>
            `;
        }).join('');
    }

    /**
     * Ouvrir le formulaire d'édition de joueuse
     */
    editPlayer(playerId) {
        const player = this.players.find(p => p.id === playerId);
        if (!player) return;

        this.editingPlayerId = playerId;
        document.getElementById('editPlayerName').value = player.name;
        document.getElementById('editPlayerNumber').value = player.number;
        document.getElementById('editPlayerPosition').value = player.position;

        document.getElementById('editPlayerModal').style.display = 'flex';
    }

    /**
     * Sauvegarder les modifications de joueuse
     */
    async saveEditPlayer() {
        if (!this.editingPlayerId) return;

        const name = document.getElementById('editPlayerName').value.trim();
        const number = parseInt(document.getElementById('editPlayerNumber').value);
        const position = document.getElementById('editPlayerPosition').value;

        if (!name || !number || !position) {
            showNotification('Veuillez remplir tous les champs', 'warning');
            return;
        }

        try {
            const { error } = await window.supabaseSync.client
                .from('players')
                .update({ name, number, position })
                .eq('id', this.editingPlayerId);

            if (error) throw error;

            // Mettre à jour localement
            const playerIndex = this.players.findIndex(p => p.id === this.editingPlayerId);
            if (playerIndex >= 0) {
                this.players[playerIndex] = {
                    ...this.players[playerIndex],
                    name, number, position
                };
            }

            this.renderPlayers();
            this.closeModal('editPlayerModal');
            showNotification('✅ Joueuse modifiée', 'success');

        } catch (error) {
            console.error('❌ Erreur modification :', error);
            showNotification('Erreur modification', 'error');
        }
    }

    /**
     * Supprimer une joueuse
     */
    async deletePlayer() {
        if (!this.editingPlayerId) return;

        const player = this.players.find(p => p.id === this.editingPlayerId);
        if (!player) return;

        if (!confirm(`⚠️ Êtes-vous certain de vouloir supprimer "${player.name}" ?`)) {
            return;
        }

        try {
            const { error } = await window.supabaseSync.client
                .from('players')
                .delete()
                .eq('id', this.editingPlayerId);

            if (error) throw error;

            // Mettre à jour localement
            this.players = this.players.filter(p => p.id !== this.editingPlayerId);
            this.selectedForComposition = this.selectedForComposition.filter(id => id !== this.editingPlayerId);

            // Mettre à jour le compteur
            const newCount = this.players.length;
            await window.supabaseSync.client
                .from('teams')
                .update({ player_count: newCount })
                .eq('id', this.currentTeamId);

            this.renderPlayers();
            this.closeModal('editPlayerModal');
            showNotification('✅ Joueuse supprimée', 'success');

        } catch (error) {
            console.error('❌ Erreur suppression :', error);
            showNotification('Erreur suppression', 'error');
        }
    }

    /**
     * Basculer une joueuse dans la composition
     */
    toggleComposition(playerId) {
        const index = this.selectedForComposition.indexOf(playerId);
        
        if (index >= 0) {
            // Retirer
            this.selectedForComposition.splice(index, 1);
        } else {
            // Ajouter
            if (this.selectedForComposition.length >= 11) {
                showNotification('Maximum 11 titulaires', 'warning');
                return;
            }
            this.selectedForComposition.push(playerId);
        }

        this.renderPlayers();
        this.renderComposition();
        this.drawField();
    }

    /**
     * Sauvegarder la composition
     */
    async saveComposition() {
        if (!this.currentTeamId) return;

        if (this.selectedForComposition.length !== 11) {
            showNotification(`Sélectionnez exactement 11 joueuses (${this.selectedForComposition.length}/11)`, 'warning');
            return;
        }

        try {
            // Désactiver la composition active actuelle
            await window.supabaseSync.client
                .from('compositions')
                .update({ is_active: false })
                .eq('team_id', this.currentTeamId)
                .eq('is_active', true);

            // Créer la nouvelle composition
            const composition = {
                team_id: this.currentTeamId,
                players_ids: this.selectedForComposition,
                formation: '4-2-3-1',
                is_active: true
            };

            const { error } = await window.supabaseSync.client
                .from('compositions')
                .insert([composition]);

            if (error) throw error;

            this.composition = [...this.selectedForComposition];
            showNotification('✅ Composition sauvegardée', 'success');
            this.drawField();

        } catch (error) {
            console.error('❌ Erreur sauvegarde composition :', error);
            showNotification('Erreur sauvegarde composition', 'error');
        }
    }

    /**
     * Réinitialiser la composition
     */
    clearComposition() {
        this.selectedForComposition = [];
        this.renderPlayers();
        this.renderComposition();
        this.drawField();
    }

    /**
     * Afficher la composition sélectionnée
     */
    renderComposition() {
        const container = document.getElementById('selectedPlayers');

        if (this.selectedForComposition.length === 0) {
            container.innerHTML = '<p class="empty-state">Aucune joueuse sélectionnée</p>';
            return;
        }

        container.innerHTML = this.selectedForComposition.map(playerId => {
            const player = this.players.find(p => p.id === playerId);
            if (!player) return '';

            return `
                <div class="composition-player">
                    <span>${player.number} - ${player.name}</span>
                    <button class="btn btn-xs btn-danger" onclick="teamsManager.toggleComposition('${playerId}')">
                        ✕
                    </button>
                </div>
            `;
        }).join('');
    }

    /**
     * Dessiner le terrain avec les joueuses
     */
    drawField() {
        const canvas = document.getElementById('fieldCanvas');
        if (!canvas) return;

        const ctx = canvas.getContext('2d');
        const width = canvas.width;
        const height = canvas.height;

        // Fond vert
        ctx.fillStyle = '#2d5016';
        ctx.fillRect(0, 0, width, height);

        // Lignes du terrain
        ctx.strokeStyle = '#ffffff';
        ctx.lineWidth = 2;

        // Ligne médiane
        ctx.beginPath();
        ctx.moveTo(width / 2, 0);
        ctx.lineTo(width / 2, height);
        ctx.stroke();

        // Cercle central
        ctx.beginPath();
        ctx.arc(width / 2, height / 2, 30, 0, Math.PI * 2);
        ctx.stroke();

        // Surfaces
        ctx.strokeRect(10, height / 2 - 50, 60, 100);
        ctx.strokeRect(width - 70, height / 2 - 50, 60, 100);

        // Placer les joueuses (formation 4-2-3-1)
        const positions = this.getPlayerPositions();
        
        positions.forEach((pos, index) => {
            const player = this.players.find(p => p.id === this.selectedForComposition[index]);
            if (!player) return;

            // Couleur par position
            const positionColor = {
                'GK': '#FFD700', // Or
                'DF': '#FF6B6B', // Rouge
                'MF': '#4ECDC4', // Turquoise
                'FW': '#FFB6B6'  // Rose
            }[player.position] || '#999';

            // Dessiner le cercle de la joueuse
            ctx.fillStyle = positionColor;
            ctx.beginPath();
            ctx.arc(pos.x, pos.y, 15, 0, Math.PI * 2);
            ctx.fill();

            // Numéro
            ctx.fillStyle = '#000';
            ctx.font = 'bold 10px Arial';
            ctx.textAlign = 'center';
            ctx.textBaseline = 'middle';
            ctx.fillText(player.number, pos.x, pos.y);
        });
    }

    /**
     * Obtenir les positions des joueuses sur le terrain (4-2-3-1)
     */
    getPlayerPositions() {
        const width = 300;
        const height = 400;

        return [
            // Gardien (1)
            { x: width / 2, y: 30 },
            
            // Défenseurs (4)
            { x: width / 4, y: 80 },
            { x: width * 3 / 4, y: 80 },
            { x: width / 4, y: 130 },
            { x: width * 3 / 4, y: 130 },
            
            // Milieux défensifs (2)
            { x: width * 1 / 3, y: 200 },
            { x: width * 2 / 3, y: 200 },
            
            // Milieux offensifs (3)
            { x: width / 4, y: 270 },
            { x: width / 2, y: 270 },
            { x: width * 3 / 4, y: 270 },
            
            // Attaquante (1)
            { x: width / 2, y: 350 }
        ];
    }

    /**
     * Charger les stats des joueuses
     */
    async loadPlayerStats() {
        try {
            const { data: stats, error } = await window.supabaseSync.client
                .from('player_match_stats')
                .select('*');

            if (error) throw error;

            // Grouper par joueuse
            const statsByPlayer = {};
            (stats || []).forEach(stat => {
                if (!statsByPlayer[stat.player_id]) {
                    statsByPlayer[stat.player_id] = {
                        goals: 0,
                        assists: 0,
                        yellowCards: 0,
                        redCards: 0,
                        playtime: 0,
                        matches: 0
                    };
                }
                statsByPlayer[stat.player_id].goals += stat.goals || 0;
                statsByPlayer[stat.player_id].assists += stat.assists || 0;
                statsByPlayer[stat.player_id].yellowCards += stat.yellow_cards || 0;
                statsByPlayer[stat.player_id].redCards += stat.red_cards || 0;
                statsByPlayer[stat.player_id].playtime += stat.play_time || 0;
                statsByPlayer[stat.player_id].matches += 1;
            });

            this.playerStats = statsByPlayer;

        } catch (error) {
            console.error('❌ Erreur chargement stats :', error);
        }
    }

    /**
     * Afficher les stats des joueuses
     */
    renderStats() {
        const container = document.getElementById('statsList');

        if (!this.currentTeamId || this.players.length === 0) {
            container.innerHTML = '<p class="empty-state">Aucune statistique disponible</p>';
            return;
        }

        const statsArray = this.players.map(player => ({
            ...player,
            stats: this.playerStats[player.id] || {
                goals: 0,
                assists: 0,
                yellowCards: 0,
                redCards: 0,
                playtime: 0,
                matches: 0
            }
        }));

        container.innerHTML = statsArray.map(player => {
            const playtimeMinutes = Math.floor(player.stats.playtime / 60);
            return `
                <div class="stats-row">
                    <div class="stats-player-info">
                        <span class="stats-number">${player.number}</span>
                        <span class="stats-name">${player.name}</span>
                    </div>
                    <div class="stats-values">
                        <span class="stat-badge">⚽ ${player.stats.goals}</span>
                        <span class="stat-badge">🎯 ${player.stats.assists}</span>
                        <span class="stat-badge">⏱️ ${playtimeMinutes}m</span>
                        <span class="stat-badge">🟨 ${player.stats.yellowCards}</span>
                        <span class="stat-badge">🟥 ${player.stats.redCards}</span>
                    </div>
                </div>
            `;
        }).join('');
    }

    /**
     * Trier les stats
     */
    sortStats(sortBy) {
        const statsArray = this.players.map(player => ({
            ...player,
            stats: this.playerStats[player.id] || {
                goals: 0,
                assists: 0,
                yellowCards: 0,
                redCards: 0,
                playtime: 0,
                matches: 0
            }
        }));

        switch (sortBy) {
            case 'goals':
                statsArray.sort((a, b) => b.stats.goals - a.stats.goals);
                break;
            case 'assists':
                statsArray.sort((a, b) => b.stats.assists - a.stats.assists);
                break;
            case 'playtime':
                statsArray.sort((a, b) => b.stats.playtime - a.stats.playtime);
                break;
            case 'yellowCards':
                statsArray.sort((a, b) => b.stats.yellowCards - a.stats.yellowCards);
                break;
            default:
                statsArray.sort((a, b) => a.name.localeCompare(b.name));
        }

        // Réafficher
        this.renderStats();
    }

    /**
     * Changer d'onglet
     */
    switchTab(tabName) {
        this.currentTab = tabName;

        // Mettre à jour les boutons
        document.querySelectorAll('.tab-btn').forEach(btn => {
            btn.classList.remove('active');
        });
        event.target.classList.add('active');

        // Mettre à jour le contenu
        document.querySelectorAll('.tab-content').forEach(content => {
            content.classList.remove('active');
        });
        document.getElementById(`tab-${tabName}`).classList.add('active');

        // Charger les données appropriées
        if (tabName === 'stats') {
            this.renderStats();
        } else if (tabName === 'composition') {
            this.drawField();
        }
    }

    /**
     * Filtrer les joueurs par position (alias pour filterByPosition)
     */
    filterPlayers(position) {
        this.filterByPosition(position);
    }

    /**
     * Synchroniser avec Supabase
     */
    syncWithSupabase() {
        if (!window.supabaseManager?.isReady()) {
            showNotification('❌ Supabase non prêt', 'error');
            return;
        }

        console.log('🔄 Synchronisation avec Supabase...');
        showNotification('🔄 Synchronisation...', 'info');
        
        // Uploader les données
        if (window.supabaseManager.uploadAllData) {
            window.supabaseManager.uploadAllData();
            showNotification('✅ Synchronisé !', 'success');
        } else {
            showNotification('⚠️ Sync non disponible', 'warning');
        }
    }

    /**
     * Créer une nouvelle équipe (appelée par le HTML)
     */
    createNewTeam() {
        const nameInput = document.getElementById('newTeamName');
        const categorySelect = document.getElementById('newTeamCategory');
        
        const name = nameInput?.value?.trim();
        const category = categorySelect?.value?.trim() || '';
        
        if (!name) {
            showNotification('Veuillez entrer un nom d\'équipe', 'warning');
            return;
        }
        
        try {
            // Créer l'équipe dans TeamManager (données locales)
            const team = window.teamManager.createTeam(name, category);
            
            // Fermer le modal
            this.closeModal('createTeamModal');
            
            // Nettoyer les champs
            nameInput.value = '';
            categorySelect.value = '';
            
            // Rafraîchir la liste
            this.loadTeams();
            
            // Notification
            showNotification(`✅ Équipe "${name}" créée !`, 'success');
            
            // Sync Supabase
            if (window.supabaseManager && window.supabaseManager.isReady()) {
                window.supabaseManager.uploadAllData?.();
            }
            
            console.log('✅ Équipe créée via UI:', team);
            
        } catch (error) {
            console.error('❌ Erreur création équipe:', error);
            showNotification(`❌ Erreur: ${error.message}`, 'error');
        }
    }

    /**
     * Fermer un modal
     */
    closeModal(modalId) {
        document.getElementById(modalId).style.display = 'none';
    }

    /**
     * Obtenir toutes les équipes
     */
    async getAllTeams() {
        try {
            const { data: teams } = await window.supabaseSync.client
                .from('teams')
                .select('*')
                .order('created_at', { ascending: false });
            return teams || [];
        } catch (error) {
            console.error('Erreur récupération équipes :', error);
            return [];
        }
    }
}

// Initialiser au chargement
let teamsManager = new TeamsManager();
document.addEventListener('DOMContentLoaded', () => teamsManager.init());

// Fermer les modals en cliquant en dehors
window.onclick = function(event) {
    if (event.target.classList.contains('modal')) {
        event.target.style.display = 'none';
    }
};