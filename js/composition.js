// ===== GESTION DE LA COMPOSITION - composition.html =====

class CompositionManager {
    constructor() {
        this.players = [];
        this.selectedPlayers = [];
        this.loadData();
    }

    /**
     * Charger les données
     */
    loadData() {
        try {
            const saved = localStorage.getItem('players');
            if (saved) {
                this.players = JSON.parse(saved);
            }

            const savedComposition = localStorage.getItem('composition');
            if (savedComposition) {
                this.selectedPlayers = JSON.parse(savedComposition);
            }

            this.updateDisplay();
        } catch (error) {
            console.error('Erreur chargement :', error);
        }
    }

    /**
     * Sélectionner/Désélectionner une joueuse
     */
    togglePlayer(playerId) {
        const index = this.selectedPlayers.findIndex(id => id === playerId);

        if (index !== -1) {
            // Déselectionner
            this.selectedPlayers.splice(index, 1);
        } else {
            // Limiter à 11
            if (this.selectedPlayers.length < 11) {
                this.selectedPlayers.push(playerId);
            } else {
                showNotification('Maximum 11 joueuses sur le terrain', 'warning');
                return;
            }
        }

        this.updateDisplay();
    }

    /**
     * Mettre à jour l'affichage
     */
    updateDisplay() {
        // Mettre à jour les stats
        const selected = this.selectedPlayers.length;
        document.getElementById('selectedCount').textContent = selected;

        // Compter par position
        let goalkeepers = 0, defenders = 0, midfields = 0, forwards = 0;

        this.selectedPlayers.forEach(playerId => {
            const player = this.players.find(p => p.id === playerId);
            if (player) {
                if (player.position === 'gardienne') goalkeepers++;
                if (player.position === 'défenseuse') defenders++;
                if (player.position === 'milieu') midfields++;
                if (player.position === 'attaquante') forwards++;
            }
        });

        document.getElementById('goalkeepersSelected').textContent = goalkeepers;
        document.getElementById('defendersSelected').textContent = defenders;
        document.getElementById('midfieldSelected').textContent = midfields;
        document.getElementById('forwardsSelected').textContent = forwards;

        // Mettre à jour le statut
        const statusEl = document.getElementById('compositionStatus');
        const saveBtn = document.getElementById('saveBtn');

        if (selected === 0) {
            statusEl.innerHTML = '⏳ Sélectionnez 11 joueuses';
            statusEl.style.color = '#95a5a6';
            saveBtn.disabled = true;
        } else if (selected < 11) {
            statusEl.innerHTML = `⏳ ${11 - selected} joueuse(s) manquante(s)`;
            statusEl.style.color = '#f39c12';
            saveBtn.disabled = true;
        } else if (selected === 11) {
            statusEl.innerHTML = '✅ Composition complète !';
            statusEl.style.color = '#27ae60';
            saveBtn.disabled = false;
        }

        // Afficher les grilles
        this.displayPlayerGrid();
        this.displaySummary();
    }

    /**
     * Afficher la grille de sélection
     */
    displayPlayerGrid() {
        const container = document.getElementById('playerSelectionGrid');

        if (this.players.length === 0) {
            container.innerHTML = '<p style="text-align: center; opacity: 0.8; grid-column: 1/-1;">Aucune joueuse disponible. Allez dans "Équipe" d\'abord !</p>';
            return;
        }

        container.innerHTML = '';

        const positionIcons = {
            gardienne: '🥅',
            défenseuse: '🛡️',
            milieu: '⚙️',
            attaquante: '⚽'
        };

        this.players.forEach(player => {
            const isSelected = this.selectedPlayers.includes(player.id);
            const button = document.createElement('button');
            button.className = 'player-btn';
            
            let bgColor = 'rgba(255,255,255,0.1)';
            let borderColor = 'rgba(255,255,255,0.2)';

            if (isSelected) {
                bgColor = 'rgba(52,152,219,0.4)';
                borderColor = '#3498db';
            }

            button.style.cssText = `
                background: ${bgColor};
                border: 2px solid ${borderColor};
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
                color: white;
            `;

            const icon = positionIcons[player.position] || '👤';
            const number = player.number ? `#${player.number}` : '';

            button.innerHTML = `
                <div style="font-size: 2em; margin-bottom: 8px;">${icon}</div>
                <div style="font-weight: 600; margin-bottom: 4px;">${player.name}</div>
                <div style="font-size: 0.85em; opacity: 0.7;">${player.position} ${number}</div>
            `;

            button.onclick = () => this.togglePlayer(player.id);
            container.appendChild(button);
        });
    }

    /**
     * Afficher le résumé terrain/banc
     */
    displaySummary() {
        const fieldContainer = document.getElementById('fieldPlayers');
        const benchContainer = document.getElementById('benchPlayers');

        fieldContainer.innerHTML = '';
        benchContainer.innerHTML = '';

        const positionIcons = {
            gardienne: '🥅',
            défenseuse: '🛡️',
            milieu: '⚙️',
            attaquante: '⚽'
        };

        // Terrain
        if (this.selectedPlayers.length === 0) {
            fieldContainer.innerHTML = '<p style="opacity: 0.7; text-align: center;">Aucune joueuse sélectionnée</p>';
        } else {
            this.selectedPlayers.forEach(playerId => {
                const player = this.players.find(p => p.id === playerId);
                if (player) {
                    const icon = positionIcons[player.position] || '👤';
                    const number = player.number ? `#${player.number}` : '';
                    const div = document.createElement('div');
                    div.style.cssText = 'padding: 8px; background: rgba(255,255,255,0.1); border-radius: 6px; margin: 6px 0;';
                    div.innerHTML = `${icon} ${player.name} ${number}`;
                    fieldContainer.appendChild(div);
                }
            });
        }

        // Banc
        const benchPlayers = this.players.filter(p => !this.selectedPlayers.includes(p.id));
        if (benchPlayers.length === 0) {
            benchContainer.innerHTML = '<p style="opacity: 0.7; text-align: center;">Aucune joueuse sur le banc</p>';
        } else {
            benchPlayers.forEach(player => {
                const icon = positionIcons[player.position] || '👤';
                const number = player.number ? `#${player.number}` : '';
                const div = document.createElement('div');
                div.style.cssText = 'padding: 8px; background: rgba(255,255,255,0.1); border-radius: 6px; margin: 6px 0;';
                div.innerHTML = `${icon} ${player.name} ${number}`;
                benchContainer.appendChild(div);
            });
        }
    }

    /**
     * Sauvegarder la composition
     */
    saveComposition() {
        if (this.selectedPlayers.length !== 11) {
            showNotification('Vous devez sélectionner exactement 11 joueuses', 'warning');
            return;
        }

        // Sauvegarder les joueuses sélectionnées avec leurs infos complètes
        const compositionData = this.selectedPlayers.map(id => 
            this.players.find(p => p.id === id)
        );

        localStorage.setItem('composition', JSON.stringify(this.selectedPlayers));
        localStorage.setItem('compositionFull', JSON.stringify(compositionData));

        showNotification('Composition validée ! Vous pouvez maintenant démarrer un match.', 'success');
    }

    /**
     * Réinitialiser la composition
     */
    resetComposition() {
        if (confirm('Réinitialiser la sélection ?')) {
            this.selectedPlayers = [];
            this.updateDisplay();
            showNotification('Composition réinitialisée', 'info');
        }
    }
}

// ===== INITIALISATION =====
let compositionManager = new CompositionManager();

console.log('✅ Composition Manager chargé');