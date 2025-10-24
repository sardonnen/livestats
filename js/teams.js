// ===== TEAMS PAGE MANAGER =====
// Logique UI pour la page de gestion des équipes

class TeamsPageManager {
    constructor() {
        this.selectedTeamId = null;
        this.init();
    }

    init() {
        console.log('🎮 TeamsPageManager initialisé');
        
        // Attendre que le DOM soit chargé
        if (document.readyState === 'loading') {
            document.addEventListener('DOMContentLoaded', () => this.onDOMReady());
        } else {
            this.onDOMReady();
        }
    }

    onDOMReady() {
        this.setupEventListeners();
        this.updateTeamsList();
        this.enableAutoSync();
        console.log('✅ TeamsPage prêt');
    }

    // ===== ÉVÉNEMENTS =====

    setupEventListeners() {
        // Créer équipe
        const createForm = document.getElementById('createTeamForm');
        if (createForm) {
            createForm.addEventListener('submit', (e) => {
                e.preventDefault();
                this.createNewTeam();
            });
        }

        // Ajouter joueuse
        const addPlayerForm = document.getElementById('addPlayerForm');
        if (addPlayerForm) {
            addPlayerForm.addEventListener('submit', (e) => {
                e.preventDefault();
                this.addNewPlayer();
            });
        }

        // Actions équipe
        const editBtn = document.getElementById('editTeamBtn');
        if (editBtn) editBtn.addEventListener('click', () => this.editTeam());

        const deleteBtn = document.getElementById('deleteTeamBtn');
        if (deleteBtn) deleteBtn.addEventListener('click', () => this.deleteTeam());

        const closeBtn = document.getElementById('closeTeamBtn');
        if (closeBtn) closeBtn.addEventListener('click', () => this.closeTeamSelection());

        // Synchronisation en ligne/hors ligne
        window.addEventListener('online', () => this.onOnline());
    }

    enableAutoSync() {
        if (window.teamManager) {
            window.teamManager.enableAutoSync(15000);
            console.log('✅ Auto-sync activée');
        }
    }

    // ===== GESTION ÉQUIPES =====

    createNewTeam() {
        const name = document.getElementById('teamName').value.trim();
        const category = document.getElementById('teamCategory').value.trim();
        const color = document.getElementById('teamColor').value;

        if (!name) {
            this.showNotification('Veuillez entrer un nom d\'équipe', 'warning');
            return;
        }

        const team = window.teamManager.createTeam(name, category, color);
        if (team) {
            this.showNotification(`✅ Équipe "${name}" créée !`, 'success');
            document.getElementById('createTeamForm').reset();
            this.updateTeamsList();
            this.selectTeam(team.id);
        } else {
            this.showNotification('Erreur lors de la création', 'error');
        }
    }

    updateTeamsList() {
        const container = document.getElementById('teamsList');
        if (!container) return;

        const teams = window.teamManager.getAllTeams();

        if (teams.length === 0) {
            container.innerHTML = '<p style="text-align: center; color: #bdc3c7; padding: 2rem; grid-column: 1/-1;">Aucune équipe créée. Commencez par créer une équipe ci-dessus.</p>';
            return;
        }

        container.innerHTML = '';
        teams.forEach(team => {
            const card = this.createTeamCard(team);
            container.appendChild(card);
        });
    }

    createTeamCard(team) {
        const card = document.createElement('div');
        card.className = 'team-card-item';
        card.style.cssText = `
            padding: 1.5rem;
            border: 2px solid ${team.color};
            border-radius: 8px;
            cursor: pointer;
            transition: all 0.3s ease;
            background: white;
        `;
        
        card.onmouseover = () => card.style.boxShadow = `0 4px 12px rgba(0,0,0,0.15)`;
        card.onmouseout = () => card.style.boxShadow = 'none';
        
        card.innerHTML = `
            <div style="display: flex; align-items: center; gap: 1rem; margin-bottom: 0.5rem;">
                <div style="width: 40px; height: 40px; background: ${team.color}; border-radius: 50%;"></div>
                <div>
                    <h3 style="margin: 0; font-size: 1.1rem;">${team.name}</h3>
                    <p style="margin: 0; color: #7f8c8d; font-size: 0.9rem;">${team.category || 'Sans catégorie'}</p>
                </div>
            </div>
            <p style="margin: 0.5rem 0 0 0; color: #95a5a6; font-size: 0.85rem;">👥 ${team.players?.length || 0} joueuses</p>
        `;
        
        card.onclick = () => this.selectTeam(team.id);
        return card;
    }

    selectTeam(teamId) {
        this.selectedTeamId = teamId;
        const team = window.teamManager.getTeam(teamId);
        
        if (!team) return;

        const teamNameEl = document.getElementById('selectedTeamName');
        if (teamNameEl) teamNameEl.textContent = team.name;

        this.updatePlayersList(teamId);

        const section = document.getElementById('selectedTeamSection');
        if (section) {
            section.style.display = 'block';
            section.scrollIntoView({ behavior: 'smooth' });
        }
    }

    closeTeamSelection() {
        this.selectedTeamId = null;
        
        const section = document.getElementById('selectedTeamSection');
        if (section) section.style.display = 'none';

        const form = document.getElementById('addPlayerForm');
        if (form) form.reset();
    }

    editTeam() {
        const team = window.teamManager.getTeam(this.selectedTeamId);
        if (!team) return;

        const newName = prompt('Nouveau nom d\'équipe :', team.name);
        if (newName && newName.trim()) {
            window.teamManager.updateTeam(this.selectedTeamId, { name: newName.trim() });
            this.showNotification('✅ Équipe mise à jour', 'success');
            this.updateTeamsList();
            this.selectTeam(this.selectedTeamId);
        }
    }

    deleteTeam() {
        const team = window.teamManager.getTeam(this.selectedTeamId);
        if (!team) return;

        if (confirm(`⚠️ Êtes-vous sûr de vouloir supprimer l'équipe "${team.name}" et toutes ses joueuses ?`)) {
            window.teamManager.deleteTeam(this.selectedTeamId);
            this.showNotification('✅ Équipe supprimée', 'success');
            this.closeTeamSelection();
            this.updateTeamsList();
        }
    }

    // ===== GESTION JOUEUSES =====

    addNewPlayer() {
        const name = document.getElementById('playerName').value.trim();
        const position = document.getElementById('playerPosition').value;
        const number = document.getElementById('playerNumber').value;

        if (!name || !position) {
            this.showNotification('Veuillez remplir tous les champs obligatoires', 'warning');
            return;
        }

        const player = window.teamManager.addPlayerToTeam(this.selectedTeamId, name, position, number);
        if (player) {
            this.showNotification(`✅ Joueuse "${name}" ajoutée !`, 'success');
            document.getElementById('addPlayerForm').reset();
            this.updatePlayersList(this.selectedTeamId);
            this.updateTeamsList(); // Mettre à jour le compteur
        }
    }

    updatePlayersList(teamId) {
        const container = document.getElementById('playersList');
        if (!container) return;

        const players = window.teamManager.getTeamPlayers(teamId);

        if (players.length === 0) {
            container.innerHTML = '<p style="text-align: center; color: #bdc3c7; padding: 2rem; grid-column: 1/-1;">Aucune joueuse ajoutée.</p>';
            return;
        }

        container.innerHTML = '';
        players.forEach(player => {
            const card = this.createPlayerCard(player, teamId);
            container.appendChild(card);
        });
    }

    createPlayerCard(player, teamId) {
        const card = document.createElement('div');
        card.className = 'player-card';
        card.style.cssText = `
            padding: 1rem;
            background: #f8f9fa;
            border-radius: 8px;
            display: flex;
            justify-content: space-between;
            align-items: center;
        `;
        
        const positions = { 
            gardienne: '🥅', 
            défenseuse: '🛡️', 
            milieu: '🎯', 
            attaquante: '⚔️' 
        };
        
        card.innerHTML = `
            <div>
                <h4 style="margin: 0; font-weight: bold;">${positions[player.position] || '⚽'} ${player.name}</h4>
                <p style="margin: 0.25rem 0 0 0; color: #7f8c8d; font-size: 0.9rem;">${player.position}${player.number ? ' - N°' + player.number : ''}</p>
            </div>
            <button class="btn btn-small btn-danger" data-player-id="${player.id}" data-team-id="${teamId}">🗑️</button>
        `;
        
        // Event listener pour le bouton supprimer
        const deleteBtn = card.querySelector('button');
        if (deleteBtn) {
            deleteBtn.addEventListener('click', () => this.removePlayer(teamId, player.id));
        }
        
        return card;
    }

    removePlayer(teamId, playerId) {
        const player = window.teamManager.getPlayer(teamId, playerId);
        if (!player) return;

        if (confirm(`Êtes-vous sûr de vouloir supprimer "${player.name}" ?`)) {
            window.teamManager.removePlayer(teamId, playerId);
            this.showNotification('✅ Joueuse supprimée', 'success');
            this.updatePlayersList(this.selectedTeamId);
            this.updateTeamsList(); // Mettre à jour le compteur
        }
    }

    // ===== NOTIFICATIONS =====

    showNotification(message, type = 'info') {
        if (typeof window.NotificationManager !== 'undefined' && window.NotificationManager.show) {
            window.NotificationManager.show(message, type);
        } else {
            console.log(`[${type.toUpperCase()}] ${message}`);
            alert(message);
        }
    }

    // ===== SYNCHRONISATION =====

    onOnline() {
        console.log('✅ Connexion internet rétablie');
        if (window.teamManager && window.supabaseSync?.isReady()) {
            window.teamManager.syncWithSupabase().then(() => {
                this.updateTeamsList();
                if (this.selectedTeamId) {
                    this.updatePlayersList(this.selectedTeamId);
                }
            });
        }
    }
}

// ===== INITIALISATION GLOBALE =====

if (typeof window !== 'undefined') {
    window.teamsPageManager = new TeamsPageManager();
    console.log('📦 Module TeamsPageManager chargé');
}