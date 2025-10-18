// ===== GESTION DE L'ÉQUIPE - team.html =====

class TeamManager {
    constructor() {
        this.players = [];
        this.loadPlayers();
    }

    /**
     * Charger les joueuses depuis localStorage
     */
    loadPlayers() {
        try {
            const saved = localStorage.getItem('players');
            if (saved) {
                this.players = JSON.parse(saved);
                this.updateDisplay();
            }
        } catch (error) {
            console.error('Erreur chargement joueuses :', error);
        }
    }

    /**
     * Sauvegarder les joueuses dans localStorage
     */
    savePlayers() {
        localStorage.setItem('players', JSON.stringify(this.players));
    }

    /**
     * Ajouter une joueuse
     */
    addPlayer() {
        const name = document.getElementById('playerName').value.trim();
        const position = document.getElementById('playerPosition').value;
        const number = document.getElementById('playerNumber').value;

        if (!name || !position) {
            showNotification('Veuillez remplir tous les champs obligatoires', 'warning');
            return;
        }

        // Créer l'objet joueuse avec UUID valide
        const player = {
            id: this.generateUUID(),  // ← UUID valide
            name: name,
            position: position,
            number: number ? parseInt(number) : null
        };

        // Ajouter à la liste
        this.players.push(player);
        this.savePlayers();

        // Vider le formulaire
        document.getElementById('playerName').value = '';
        document.getElementById('playerPosition').value = '';
        document.getElementById('playerNumber').value = '';

        // Mettre à jour l'affichage
        this.updateDisplay();
        showNotification(`${name} ajoutée à l'équipe !`, 'success');
    }

    /**
     * Générer un UUID valide
     */
    generateUUID() {
        return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, function(c) {
            const r = Math.random() * 16 | 0;
            const v = c === 'x' ? r : (r & 0x3 | 0x8);
            return v.toString(16);
        });
    }

    /**
     * Supprimer une joueuse
     */
    removePlayer(playerId) {
        const playerIndex = this.players.findIndex(p => p.id === playerId);
        if (playerIndex !== -1) {
            const playerName = this.players[playerIndex].name;
            this.players.splice(playerIndex, 1);
            this.savePlayers();
            this.updateDisplay();
            showNotification(`${playerName} supprimée`, 'info');
        }
    }

    /**
     * Mettre à jour l'affichage
     */
    updateDisplay() {
        // Mettre à jour les statistiques
        document.getElementById('totalPlayers').textContent = this.players.length;
        
        const positions = {
            gardienne: 0,
            défenseuse: 0,
            milieu: 0,
            attaquante: 0
        };

        this.players.forEach(player => {
            if (positions.hasOwnProperty(player.position)) {
                positions[player.position]++;
            }
        });

        document.getElementById('gardiennesCount').textContent = positions.gardienne;
        document.getElementById('defenseusesCount').textContent = positions['défenseuse'];
        document.getElementById('milieuxCount').textContent = positions.milieu;
        document.getElementById('attaquantesCount').textContent = positions.attaquante;

        // Afficher la liste des joueuses
        this.displayPlayersList();
    }

    /**
     * Afficher la liste des joueuses
     */
    displayPlayersList() {
        const container = document.getElementById('playersList');

        if (this.players.length === 0) {
            container.innerHTML = '<p style="text-align: center; opacity: 0.8;">Aucune joueuse ajoutée.</p>';
            return;
        }

        const positionIcons = {
            gardienne: '🥅',
            défenseuse: '🛡️',
            milieu: '⚙️',
            attaquante: '⚽'
        };

        container.innerHTML = '';

        this.players.forEach(player => {
            const card = document.createElement('div');
            card.className = 'player-btn';
            card.style.cssText = `
                background: rgba(255,255,255,0.1);
                border: 2px solid rgba(255,255,255,0.2);
                padding: 15px;
                border-radius: 8px;
                text-align: center;
                cursor: pointer;
                transition: all 0.3s ease;
                display: flex;
                flex-direction: column;
                justify-content: center;
                align-items: center;
                min-height: 120px;
            `;

            const icon = positionIcons[player.position] || '👤';
            const number = player.number ? `#${player.number}` : '';

            card.innerHTML = `
                <div style="font-size: 2em; margin-bottom: 8px;">${icon}</div>
                <div style="font-weight: 600; margin-bottom: 4px;">${player.name}</div>
                <div style="font-size: 0.85em; opacity: 0.7; margin-bottom: 8px;">${player.position} ${number}</div>
                <button class="btn btn-danger" style="padding: 6px 12px; font-size: 0.85em;" onclick="teamManager.removePlayer('${player.id}')">
                    ✕ Supprimer
                </button>
            `;

            container.appendChild(card);
        });
    }

    /**
     * Réinitialiser l'équipe
     */
    resetTeam() {
        if (confirm('Êtes-vous sûr ? Cela supprimera toutes les joueuses !')) {
            this.players = [];
            this.savePlayers();
            this.updateDisplay();
            showNotification('Équipe réinitialisée', 'info');
        }
    }

    /**
     * Exporter les données
     */
    exportTeam() {
        const data = {
            players: this.players,
            exportDate: new Date().toISOString()
        };

        const json = JSON.stringify(data, null, 2);
        const blob = new Blob([json], { type: 'application/json' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `equipe_${new Date().toISOString().split('T')[0]}.json`;
        a.click();

        showNotification('Équipe exportée', 'success');
    }
}

// ===== INITIALISATION =====
let teamManager = new TeamManager();

console.log('✅ Team Manager chargé');