// ===== TEAMS PAGE LOGIC - teams.js =====
// Frontend pour pages/teams.html
// Zéro JavaScript dans le HTML, tout dans ce fichier

class TeamsPageManager {
    constructor() {
        this.selectedTeamId = null;
        this.selectedPlayers = new Set();
        
        console.log('🎮 TeamsPageManager initialisé');
    }

    // ===== MAPPING POSITIONS =====
    // Conversion codes SQL vers affichage français
    getPositionDisplay(positionCode) {
        const positions = {
            'GK': { label: 'Gardienne', icon: '🥅', class: 'goalkeeper' },
            'DF': { label: 'Défenseuse', icon: '🛡️', class: 'defender' },
            'MF': { label: 'Milieu', icon: '🎯', class: 'midfielder' },
            'FW': { label: 'Attaquante', icon: '⚔️', class: 'attacker' }
        };
        return positions[positionCode] || { label: positionCode, icon: '⚽', class: 'state-normal' };
    }

    // ===== INITIALISATION =====
    init() {
        this.setupEventListeners();
        this.updateTeamsList();
        
        // Auto-sync avec Supabase
        if (window.teamManager) {
            window.teamManager.enableAutoSync(15000);
        }
        
        console.log('✅ TeamsPage prêt');
    }

    // ===== SETUP ÉVÉNEMENTS =====
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
        const deleteBtn = document.getElementById('deleteTeamBtn');
        const closeBtn = document.getElementById('closeTeamBtn');

        if (editBtn) editBtn.addEventListener('click', () => this.editTeam());
        if (deleteBtn) deleteBtn.addEventListener('click', () => this.deleteTeam());
        if (closeBtn) closeBtn.addEventListener('click', () => this.closeTeamSelection());
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
        const teams = window.teamManager.getAllTeams();

        if (teams.length === 0) {
            container.innerHTML = '<p style="text-align: center; color: #bdc3c7; padding: 2rem; grid-column: 1/-1;">Aucune équipe créée. Commencez par créer une équipe ci-dessus.</p>';
            return;
        }

        container.innerHTML = '';
        teams.forEach(team => {
            const card = document.createElement('div');
            card.className = 'team-card-item';
            card.style.borderColor = team.color;
            
            card.innerHTML = `
                <div class="team-icon" style="background: ${team.color};">
                    👥
                </div>
                <div class="team-info">
                    <h3>${team.name}</h3>
                    <p>${team.category || 'Sans catégorie'}</p>
                    <p style="font-size: 0.85em; margin-top: 4px;">👥 ${team.players?.length || 0} joueuses</p>
                </div>
            `;
            
            card.onclick = () => this.selectTeam(team.id);
            container.appendChild(card);
        });
    }

    selectTeam(teamId) {
        this.selectedTeamId = teamId;
        this.selectedPlayers.clear();
        
        const team = window.teamManager.getTeam(teamId);
        if (!team) return;

        document.getElementById('selectedTeamName').textContent = team.name;
        this.updatePlayersList(teamId);
        document.getElementById('selectedTeamSection').style.display = 'block';
        document.getElementById('selectedTeamSection').scrollIntoView({ behavior: 'smooth' });
    }

    closeTeamSelection() {
        this.selectedTeamId = null;
        this.selectedPlayers.clear();
        document.getElementById('selectedTeamSection').style.display = 'none';
        document.getElementById('addPlayerForm').reset();
    }

    editTeam() {
        const team = window.teamManager.getTeam(this.selectedTeamId);
        const newName = prompt('Nouveau nom d\'équipe :', team.name);
        if (newName) {
            window.teamManager.updateTeam(this.selectedTeamId, { name: newName });
            this.showNotification('✅ Équipe mise à jour', 'success');
            this.updateTeamsList();
            this.selectTeam(this.selectedTeamId);
        }
    }

    deleteTeam() {
        const team = window.teamManager.getTeam(this.selectedTeamId);
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
        const position = document.getElementById('playerPosition').value; // GK, DF, MF, FW
        const number = document.getElementById('playerNumber').value;

        if (!name || !position) {
            this.showNotification('Veuillez remplir tous les champs obligatoires', 'warning');
            return;
        }

        // Vérifier que la position est valide
        const validPositions = ['GK', 'DF', 'MF', 'FW'];
        if (!validPositions.includes(position)) {
            this.showNotification('Position invalide. Utilisez GK, DF, MF ou FW', 'error');
            return;
        }

        const player = window.teamManager.addPlayerToTeam(this.selectedTeamId, name, position, number);
        if (player) {
            this.showNotification(`✅ Joueuse "${name}" ajoutée !`, 'success');
            document.getElementById('addPlayerForm').reset();
            this.updatePlayersList(this.selectedTeamId);
            this.updateTeamsList(); // Mettre à jour le compteur d'équipes
        }
    }

    updatePlayersList(teamId) {
        const container = document.getElementById('playersList');
        const players = window.teamManager.getTeamPlayers(teamId);

        // Mettre à jour le compteur
        const playerCount = document.getElementById('playerCount');
        if (playerCount) {
            playerCount.textContent = players.length;
        }

        if (players.length === 0) {
            container.innerHTML = '<p style="text-align: center; color: #bdc3c7; grid-column: 1/-1;">Aucune joueuse ajoutée.</p>';
            return;
        }

        container.innerHTML = '';
        players.forEach(player => {
            const card = document.createElement('div');
            
            // Récupérer les infos de position (label, icon, class)
            const posInfo = this.getPositionDisplay(player.position);
            
            const isSelected = this.selectedPlayers.has(player.id);
            let cardClass = `player-card ${posInfo.class}`;
            if (isSelected) {
                cardClass += ' state-selected';
            }

            card.className = cardClass;
            
            card.innerHTML = `
                <div class="player-position-icon">${posInfo.icon}</div>
                <div class="player-name">${player.name}</div>
                <div class="player-position">${posInfo.label}</div>
                ${player.number ? `<div class="player-number">#${player.number}</div>` : ''}
                <button class="player-btn-delete" data-player-id="${player.id}" data-team-id="${teamId}">🗑️</button>
            `;

            // Click pour sélectionner/désélectionner
            card.onclick = (e) => {
                if (!e.target.closest('.player-btn-delete')) {
                    this.togglePlayerSelection(player.id, card);
                }
            };

            // Click bouton supprimer
            const deleteBtn = card.querySelector('.player-btn-delete');
            deleteBtn.addEventListener('click', (e) => {
                e.stopPropagation();
                this.removePlayer(teamId, player.id);
            });

            container.appendChild(card);
        });
    }

    togglePlayerSelection(playerId, cardElement) {
        if (this.selectedPlayers.has(playerId)) {
            this.selectedPlayers.delete(playerId);
            cardElement.classList.remove('state-selected');
        } else {
            this.selectedPlayers.add(playerId);
            cardElement.classList.add('state-selected');
        }
    }

    removePlayer(teamId, playerId) {
        const player = window.teamManager.getPlayer(teamId, playerId);
        if (!player) {
            this.showNotification('❌ Joueuse introuvable', 'error');
            return;
        }
        
        if (confirm(`⚠️ Supprimer ${player.name} ?`)) {
            window.teamManager.removePlayer(teamId, playerId);
            this.showNotification('✅ Joueuse supprimée', 'success');
            this.updatePlayersList(this.selectedTeamId);
            this.updateTeamsList(); // Mettre à jour le compteur d'équipes
        }
    }

    // ===== NOTIFICATIONS =====
    showNotification(message, type = 'info') {
        if (window.notificationManager) {
            window.notificationManager.show(message, type);
        } else {
            console.log(`[${type.toUpperCase()}] ${message}`);
        }
    }
}

// ===== INITIALISATION GLOBALE =====
console.log('📦 Module TeamsPageManager chargé');

let teamsPage = null;

document.addEventListener('DOMContentLoaded', function() {
    teamsPage = new TeamsPageManager();
    teamsPage.init();
});

// ===== SYNC SUPABASE =====
window.addEventListener('online', () => {
    console.log('✅ Connexion internet rétablie');
    if (window.teamManager && window.supabaseSync?.isReady()) {
        window.teamManager.syncWithSupabase().then(() => {
            if (teamsPage) {
                teamsPage.updateTeamsList();
            }
        });
    }
});