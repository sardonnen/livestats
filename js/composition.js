// ===== GESTION DE LA COMPOSITION - composition.html =====
// Frontend pour la page composition.html
// Utilise team-manager.js pour charger les équipes

class CompositionManager {
    constructor() {
        this.selectedTeamId = null;
        this.selectedPlayers = [];
        this.init();
    }

    /**
     * Initialisation
     */
    init() {
        console.log('📋 Initialisation Composition Manager');
        
        // Attendre que team-manager soit chargé
        if (typeof window.teamManager === 'undefined') {
            console.error('❌ team-manager.js non chargé !');
            setTimeout(() => this.init(), 100);
            return;
        }

        this.setupEventListeners();
        this.loadTeamSelector();
        this.loadSavedComposition();
    }

    /**
     * Configurer les événements
     */
    setupEventListeners() {
        // Sélection d'équipe
        document.getElementById('teamSelector').addEventListener('change', (e) => {
            this.onTeamSelect(e.target.value);
        });

        // Boutons
        document.getElementById('validateBtn').addEventListener('click', () => {
            this.validateComposition();
        });

        document.getElementById('clearBtn').addEventListener('click', () => {
            this.clearSelection();
        });

        document.getElementById('closeBtn').addEventListener('click', () => {
            document.getElementById('compositionSection').style.display = 'none';
        });
    }

    /**
     * Charger la liste des équipes dans le sélecteur
     */
    loadTeamSelector() {
        const selector = document.getElementById('teamSelector');
        const teams = window.teamManager.getAllTeams();
        
        // Réinitialiser
        selector.innerHTML = '<option value="">-- Sélectionner une équipe --</option>';

        if (teams.length === 0) {
            console.warn('⚠️ Aucune équipe trouvée');
            return;
        }

        // Ajouter toutes les équipes
        teams.forEach(team => {
            const option = document.createElement('option');
            option.value = team.id;
            option.textContent = `${team.name}${team.category ? ' - ' + team.category : ''}`;
            selector.appendChild(option);
        });

        console.log(`✅ ${teams.length} équipe(s) chargée(s)`);
    }

    /**
     * Charger une composition sauvegardée
     */
    loadSavedComposition() {
        try {
            const saved = localStorage.getItem('footballStats_composition');
            if (saved) {
                const data = JSON.parse(saved);
                if (data.teamId && data.players) {
                    this.selectedTeamId = data.teamId;
                    this.selectedPlayers = data.players;
                    
                    // Pré-sélectionner l'équipe
                    document.getElementById('teamSelector').value = data.teamId;
                    this.onTeamSelect(data.teamId);
                }
            }
        } catch (error) {
            console.error('Erreur chargement composition sauvegardée:', error);
        }
    }

    /**
     * Événement : sélection d'une équipe
     */
    onTeamSelect(teamId) {
        if (!teamId) {
            document.getElementById('compositionSection').style.display = 'none';
            return;
        }

        this.selectedTeamId = teamId;
        this.selectedPlayers = [];

        const team = window.teamManager.getTeam(teamId);
        if (!team) {
            console.error('❌ Équipe non trouvée:', teamId);
            return;
        }

        // Afficher la section composition
        document.getElementById('selectedTeamDisplay').textContent = team.name;
        document.getElementById('compositionSection').style.display = 'block';

        // Mettre à jour l'affichage
        this.updatePlayersList();
        this.updateFieldDisplay();
        this.updateCompositionStatus();
    }

    /**
     * Afficher la liste des joueuses
     */
    updatePlayersList() {
        if (!this.selectedTeamId) return;

        const team = window.teamManager.getTeam(this.selectedTeamId);
        const playersContainer = document.getElementById('playersList');
        const benchContainer = document.getElementById('benchList');
        
        playersContainer.innerHTML = '';
        benchContainer.innerHTML = '';

        if (!team.players || team.players.length === 0) {
            playersContainer.innerHTML = '<p style="grid-column: 1/-1; text-align: center; color: #bdc3c7;">Aucune joueuse dans cette équipe. Ajoutez-en dans la page Équipes.</p>';
            return;
        }

        const positions = { 
            gardienne: '🥅', 
            défenseuse: '🛡️', 
            milieu: '🎯', 
            attaquante: '⚔️' 
        };

        team.players.forEach(player => {
            const isSelected = this.selectedPlayers.includes(player.id);
            const isBench = isSelected && this.selectedPlayers.indexOf(player.id) >= 11;

            const btn = document.createElement('button');
            btn.className = 'player-btn';
            btn.style.cssText = `
                padding: 0.75rem;
                border: 2px solid #ecf0f1;
                border-radius: 6px;
                background: ${isSelected ? '#3498db' : '#f8f9fa'};
                color: ${isSelected ? 'white' : '#2c3e50'};
                cursor: pointer;
                font-weight: bold;
                transition: all 0.2s ease;
            `;
            btn.onmouseover = () => btn.style.transform = 'scale(1.05)';
            btn.onmouseout = () => btn.style.transform = 'scale(1)';

            btn.innerHTML = `
                <div style="font-size: 1rem; margin-bottom: 0.25rem;">${positions[player.position] || '⚽'}</div>
                <div style="font-size: 0.85rem; font-weight: bold;">${player.name}</div>
                <div style="font-size: 0.75rem; opacity: 0.9;">${player.position}${player.number ? ' N°' + player.number : ''}</div>
            `;

            btn.onclick = () => this.togglePlayer(player.id);

            if (isSelected && !isBench) {
                playersContainer.appendChild(btn);
            } else if (isBench) {
                benchContainer.appendChild(btn);
            } else {
                playersContainer.appendChild(btn);
            }
        });
    }

    /**
     * Sélectionner/Désélectionner une joueuse
     */
    togglePlayer(playerId) {
        const index = this.selectedPlayers.indexOf(playerId);
        
        if (index === -1) {
            // Ajouter le joueur
            if (this.selectedPlayers.length < 18) { // 11 titulaires + 7 remplaçants max
                this.selectedPlayers.push(playerId);
            } else {
                this.showNotification('Maximum 18 joueuses (11 titulaires + 7 remplaçants)', 'warning');
                return;
            }
        } else {
            // Retirer le joueur
            this.selectedPlayers.splice(index, 1);
        }

        this.updatePlayersList();
        this.updateFieldDisplay();
        this.updateCompositionStatus();
    }

    /**
     * Mettre à jour l'affichage du terrain
     */
    updateFieldDisplay() {
        const team = window.teamManager.getTeam(this.selectedTeamId);
        if (!team) return;
        
        // Filtrer les 11 titulaires
        const starters = this.selectedPlayers.slice(0, 11);
        
        const gk = starters.filter(id => {
            const player = team.players.find(p => p.id === id);
            return player?.position === 'gardienne';
        });
        
        const def = starters.filter(id => {
            const player = team.players.find(p => p.id === id);
            return player?.position === 'défenseuse';
        });
        
        const mid = starters.filter(id => {
            const player = team.players.find(p => p.id === id);
            return player?.position === 'milieu';
        });
        
        const att = starters.filter(id => {
            const player = team.players.find(p => p.id === id);
            return player?.position === 'attaquante';
        });

        // Mettre à jour les conteneurs
        this.updateFieldSection('fieldGK', gk, team);
        this.updateFieldSection('fieldDef', def, team);
        this.updateFieldSection('fieldMid', mid, team);
        this.updateFieldSection('fieldAtt', att, team);
    }

    /**
     * Mettre à jour une section du terrain
     */
    updateFieldSection(containerId, playerIds, team) {
        const container = document.getElementById(containerId);
        container.innerHTML = '';

        playerIds.forEach(id => {
            const player = team.players.find(p => p.id === id);
            if (!player) return;

            const badge = document.createElement('div');
            badge.style.cssText = `
                background: rgba(255,255,255,0.3);
                color: white;
                padding: 0.5rem 0.75rem;
                border-radius: 4px;
                font-size: 0.85rem;
                font-weight: bold;
            `;
            badge.textContent = player.number ? `${player.name} (${player.number})` : player.name;
            container.appendChild(badge);
        });
    }

    /**
     * Mettre à jour le statut de la composition
     */
    updateCompositionStatus() {
        const starters = this.selectedPlayers.slice(0, 11);
        const team = window.teamManager.getTeam(this.selectedTeamId);

        const gkCount = starters.filter(id => {
            const player = team.players.find(p => p.id === id);
            return player?.position === 'gardienne';
        }).length;

        const statusEl = document.getElementById('statusText');
        const validateBtn = document.getElementById('validateBtn');

        if (starters.length === 11 && gkCount === 1) {
            statusEl.innerHTML = `✅ Composition complète (${starters.length}/11 - 1 GK)`;
            statusEl.style.color = '#2ecc71';
            validateBtn.disabled = false;
            validateBtn.className = 'btn btn-success';
        } else {
            statusEl.innerHTML = `⚠️ Composition incomplète (${starters.length}/11${gkCount > 0 ? ` - ${gkCount} GK` : ''})`;
            statusEl.style.color = '#f39c12';
            validateBtn.disabled = true;
            validateBtn.className = 'btn btn-secondary';
        }
    }

    /**
     * Valider la composition
     */
    validateComposition() {
        const starters = this.selectedPlayers.slice(0, 11);
        if (starters.length !== 11) {
            this.showNotification('La composition doit avoir 11 joueuses', 'warning');
            return;
        }

        // Sauvegarder la composition
        const compositionData = {
            teamId: this.selectedTeamId,
            teamName: window.teamManager.getTeam(this.selectedTeamId).name,
            players: starters,
            bench: this.selectedPlayers.slice(11),
            createdAt: new Date().toISOString()
        };

        localStorage.setItem('footballStats_composition', JSON.stringify(compositionData));
        this.showNotification('✅ Composition sauvegardée !', 'success');
    }

    /**
     * Réinitialiser la sélection
     */
    clearSelection() {
        if (confirm('Êtes-vous sûr de vouloir réinitialiser la composition ?')) {
            this.selectedPlayers = [];
            this.updatePlayersList();
            this.updateFieldDisplay();
            this.updateCompositionStatus();
            this.showNotification('🔄 Composition réinitialisée', 'info');
        }
    }

    /**
     * Afficher une notification
     */
    showNotification(message, type = 'info') {
        if (typeof window.NotificationManager !== 'undefined' && window.NotificationManager.show) {
            window.NotificationManager.show(message, type);
        } else {
            console.log(`[${type.toUpperCase()}] ${message}`);
            alert(message);
        }
    }
}

// ===== INITIALISATION =====
let compositionManager;

document.addEventListener('DOMContentLoaded', function() {
    compositionManager = new CompositionManager();
    console.log('✅ Composition Manager chargé et initialisé');
});