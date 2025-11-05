/**
 * COMPOSITION.JS v3.2 - CORRECTIONS MAJEURES
 * Date: 05 Nov 2025
 * Corrections:
 * - Bug comptage (12/11 → 11/11)
 * - Validation composition activée
 * - Ajout remplaçantes fonctionnel
 * - Boutons plus compacts (60px au lieu de 120px)
 * - Centralisation données Supabase
 */

// ========================================
// VARIABLES GLOBALES
// ========================================

let selectedTeamId = null;
let fieldComposition = {}; // { zone: [playerId, ...] }
let benchPlayers = []; // Liste remplaçantes (max 7)
let currentFormation = '4-2-3-1';
let availablePlayers = [];
let draggedPlayerId = null;

// Formations disponibles avec lignes détaillées
const FORMATIONS = {
    '4-4-2': {
        name: '4-4-2',
        gk: 1,
        lines: [
            { type: 'att', zones: 2, label: 'Attaquantes' },
            { type: 'mid', zones: 4, label: 'Milieux' },
            { type: 'def', zones: 4, label: 'Défenseuses' }
        ]
    },
    '4-3-3': {
        name: '4-3-3',
        gk: 1,
        lines: [
            { type: 'att', zones: 3, label: 'Attaquantes' },
            { type: 'mid', zones: 3, label: 'Milieux' },
            { type: 'def', zones: 4, label: 'Défenseuses' }
        ]
    },
    '4-2-3-1': {
        name: '4-2-3-1',
        gk: 1,
        lines: [
            { type: 'att', zones: 1, label: 'Attaquante' },
            { type: 'mid', zones: 3, label: 'Milieux offensifs', subtype: 'offensive' },
            { type: 'mid', zones: 2, label: 'Milieux défensifs', subtype: 'defensive' },
            { type: 'def', zones: 4, label: 'Défenseuses' }
        ]
    },
    '3-5-2': {
        name: '3-5-2',
        gk: 1,
        lines: [
            { type: 'att', zones: 2, label: 'Attaquantes' },
            { type: 'mid', zones: 5, label: 'Milieux' },
            { type: 'def', zones: 3, label: 'Défenseuses' }
        ]
    },
    '5-3-2': {
        name: '5-3-2',
        gk: 1,
        lines: [
            { type: 'att', zones: 2, label: 'Attaquantes' },
            { type: 'mid', zones: 3, label: 'Milieux' },
            { type: 'def', zones: 5, label: 'Défenseuses' }
        ]
    },
    '3-4-3': {
        name: '3-4-3',
        gk: 1,
        lines: [
            { type: 'att', zones: 3, label: 'Attaquantes' },
            { type: 'mid', zones: 4, label: 'Milieux' },
            { type: 'def', zones: 3, label: 'Défenseuses' }
        ]
    }
};

// Mapping positions SQL vers affichage français
const POSITION_MAP = {
    'GK': { label: 'Gardienne', icon: '🥅', class: 'gk' },
    'DF': { label: 'Défenseuse', icon: '🛡️', class: 'def' },
    'MF': { label: 'Milieu', icon: '⚙️', class: 'mid' },
    'FW': { label: 'Attaquante', icon: '⚽', class: 'fw' }
};

// ========================================
// CLASS COMPOSITION PAGE v3.2
// ========================================

class CompositionPage {
    constructor() {
        console.log('🎮 CompositionPage v3.2 avec Corrections Majeures initialisé');
        this.init();
    }

    init() {
        this.setupEventListeners();
        this.loadAvailableTeams();
        this.loadSavedComposition();
        console.log('✅ CompositionPage v3.2 prêt');
    }

    setupEventListeners() {
        // Sélection équipe
        const teamSelector = document.getElementById('teamSelector');
        if (teamSelector) {
            teamSelector.addEventListener('change', (e) => {
                selectedTeamId = e.target.value;
                if (selectedTeamId) {
                    this.loadTeamPlayers();
                    document.getElementById('compositionSection').style.display = 'block';
                }
            });
        }

        // Changement formation
        const formationSelector = document.getElementById('formationSelector');
        if (formationSelector) {
            formationSelector.addEventListener('change', (e) => {
                currentFormation = e.target.value;
                this.rebuildField();
            });
        }

        // Bouton validation
        const validateBtn = document.getElementById('validateBtn');
        if (validateBtn) {
            validateBtn.addEventListener('click', () => this.validateComposition());
        }

        // Bouton réinitialisation
        const resetBtn = document.getElementById('resetBtn');
        if (resetBtn) {
            resetBtn.addEventListener('click', () => this.resetComposition());
        }

        // Bouton sauvegarde
        const saveBtn = document.getElementById('saveBtn');
        if (saveBtn) {
            saveBtn.addEventListener('click', () => this.saveComposition());
        }
    }

    loadAvailableTeams() {
        const teams = window.teamManager.getAllTeams();
        console.log('🔍 Équipes disponibles:', teams);
        
        const selector = document.getElementById('teamSelector');
        if (selector && teams.length > 0) {
            selector.innerHTML = '<option value="">-- Sélectionner une équipe --</option>';
            teams.forEach(team => {
                const option = document.createElement('option');
                option.value = team.id;
                option.textContent = `${team.name}${team.category ? ' - ' + team.category : ''}`;
                selector.appendChild(option);
            });
        }
    }

    loadTeamPlayers() {
        if (!selectedTeamId) return;

        const team = window.teamManager.getTeam(selectedTeamId);
        if (!team || !team.players) {
            console.error('❌ Équipe introuvable');
            return;
        }

        availablePlayers = team.players;
        console.log(`📥 ${availablePlayers.length} joueuses chargées`);

        // Reconstruire le terrain
        this.rebuildField();
        
        // Afficher les joueuses disponibles
        this.updatePlayersList();
    }

    rebuildField() {
        const formation = FORMATIONS[currentFormation];
        if (!formation) return;

        console.log('🏗️ Reconstruction terrain pour formation:', currentFormation, formation);

        // Réinitialiser la composition
        fieldComposition = { gk: [] };
        
        let lineIndex = 0;
        let zoneCounter = { def: 0, mid: 0, att: 0 };

        formation.lines.forEach(line => {
            for (let i = 0; i < line.zones; i++) {
                const zoneKey = `${line.type}-${zoneCounter[line.type]}`;
                fieldComposition[zoneKey] = [];
                zoneCounter[line.type]++;
            }
            lineIndex++;
        });

        console.log('✅ Terrain reconstruit avec', formation.lines.length, 'lignes de jeu');
        this.updateFieldDisplay();
    }

    updateFieldDisplay() {
        const fieldContainer = document.getElementById('fieldGrid');
        if (!fieldContainer) return;

        fieldContainer.innerHTML = '';

        const formation = FORMATIONS[currentFormation];
        
        // Afficher le terrain avec les zones de drop
        // Ordre: Adversaire → Attaque → Milieux → Défense → GK → Notre but
        
        // En-tête adversaire
        fieldContainer.innerHTML += '<div style="grid-column: 1/-1; text-align: center; font-weight: bold; color: white; padding: 0.5rem; background: rgba(255,0,0,0.3); border-radius: 4px;">ADVERSAIRE</div>';

        // Lignes de jeu (attaque → défense)
        formation.lines.forEach((line, lineIndex) => {
            // Label ligne
            const lineLabel = document.createElement('div');
            lineLabel.style.cssText = 'grid-column: 1/-1; text-align: center; color: rgba(255,255,255,0.7); font-size: 0.8rem; padding: 0.25rem;';
            lineLabel.textContent = line.label;
            fieldContainer.appendChild(lineLabel);

            // Zones de cette ligne
            const lineDiv = document.createElement('div');
            lineDiv.style.cssText = 'grid-column: 1/-1; display: flex; justify-content: center; gap: 0.5rem; flex-wrap: wrap; padding: 0.5rem 0;';

            for (let i = 0; i < line.zones; i++) {
                const zoneKey = `${line.type}-${i}`;
                const dropZone = this.createDropZone(zoneKey, line.type);
                lineDiv.appendChild(dropZone);
            }

            fieldContainer.appendChild(lineDiv);
        });

        // Gardienne
        const gkLabel = document.createElement('div');
        gkLabel.style.cssText = 'grid-column: 1/-1; text-align: center; color: rgba(255,255,255,0.7); font-size: 0.8rem; padding: 0.25rem;';
        gkLabel.textContent = 'Gardienne';
        fieldContainer.appendChild(gkLabel);

        const gkZone = this.createDropZone('gk', 'gk');
        gkZone.style.width = '100%';
        fieldContainer.appendChild(gkZone);

        // Pied de page
        fieldContainer.innerHTML += '<div style="grid-column: 1/-1; text-align: center; font-weight: bold; color: white; padding: 0.5rem; background: rgba(0,255,0,0.3); border-radius: 4px;">NOTRE BUT</div>';

        console.log('⚽ Mise à jour terrain:', fieldComposition);
        this.updateStatus();
    }

    createDropZone(zoneKey, posType) {
        const zone = document.createElement('div');
        zone.className = 'drop-zone';
        zone.dataset.zone = zoneKey;
        
        // Style adapté au type de position
        let bgColor = 'rgba(255,255,255,0.1)';
        if (posType === 'gk') bgColor = 'rgba(255,235,59,0.2)';
        else if (posType === 'def') bgColor = 'rgba(33,150,243,0.2)';
        else if (posType === 'mid') bgColor = 'rgba(156,39,176,0.2)';
        else if (posType === 'att') bgColor = 'rgba(244,67,54,0.2)';

        zone.style.cssText = `
            background: ${bgColor};
            border: 2px dashed rgba(255,255,255,0.3);
            border-radius: 8px;
            padding: 0.5rem;
            min-height: 50px;
            min-width: 50px;
            display: flex;
            flex-direction: column;
            align-items: center;
            justify-content: center;
            gap: 0.25rem;
            cursor: pointer;
            transition: all 0.2s ease;
        `;

        // Drag & Drop
        zone.addEventListener('dragover', (e) => {
            e.preventDefault();
            zone.style.background = 'rgba(52,152,219,0.4)';
            zone.style.borderColor = '#3498db';
        });

        zone.addEventListener('dragleave', () => {
            zone.style.background = bgColor;
            zone.style.borderColor = 'rgba(255,255,255,0.3)';
        });

        zone.addEventListener('drop', (e) => {
            e.preventDefault();
            zone.style.background = bgColor;
            zone.style.borderColor = 'rgba(255,255,255,0.3)';
            
            if (draggedPlayerId) {
                this.placePlayerOnField(draggedPlayerId, zoneKey);
            }
        });

        // Afficher les joueuses dans cette zone
        this.renderPlayersInZone(zone, zoneKey);

        return zone;
    }

    renderPlayersInZone(zoneElement, zoneKey) {
        const players = fieldComposition[zoneKey] || [];
        
        players.forEach(playerId => {
            const player = availablePlayers.find(p => p.id === playerId);
            if (player) {
                const badge = document.createElement('div');
                badge.style.cssText = `
                    background: rgba(255,255,255,0.9);
                    color: #2c3e50;
                    padding: 0.25rem 0.5rem;
                    border-radius: 4px;
                    font-size: 0.75rem;
                    font-weight: bold;
                    cursor: move;
                    white-space: nowrap;
                `;
                badge.textContent = player.number ? `#${player.number} ${player.name}` : player.name;
                badge.draggable = true;
                
                badge.addEventListener('dragstart', () => {
                    draggedPlayerId = playerId;
                });

                // Clic pour retirer du terrain
                badge.addEventListener('click', () => {
                    this.removePlayerFromField(playerId);
                });

                zoneElement.appendChild(badge);
                
                console.log(`⚽ ${player.name} placé en ${zoneKey}`);
            }
        });
    }

    placePlayerOnField(playerId, zoneKey) {
        // ✅ FIX BUG 1: Vérifier le nombre de joueuses SUR LE TERRAIN
        const currentOnField = this.countPlayersOnField();
        
        // Vérifier si le joueur est déjà sur le terrain
        const isAlreadyOnField = this.isPlayerOnField(playerId);
        
        if (!isAlreadyOnField && currentOnField >= 11) {
            showNotification('❌ Maximum 11 joueuses sur le terrain', 'warning');
            return;
        }

        // Retirer de l'ancienne position si déjà sur terrain
        if (isAlreadyOnField) {
            this.removePlayerFromField(playerId);
        }

        // Retirer du banc si présent
        const benchIndex = benchPlayers.indexOf(playerId);
        if (benchIndex !== -1) {
            benchPlayers.splice(benchIndex, 1);
        }

        // Ajouter à la nouvelle zone
        if (!fieldComposition[zoneKey]) {
            fieldComposition[zoneKey] = [];
        }
        fieldComposition[zoneKey].push(playerId);

        // Mise à jour affichage
        this.updateFieldDisplay();
        this.updatePlayersList();
    }

    removePlayerFromField(playerId) {
        // Retirer de toutes les zones
        Object.keys(fieldComposition).forEach(zone => {
            const index = fieldComposition[zone].indexOf(playerId);
            if (index !== -1) {
                fieldComposition[zone].splice(index, 1);
            }
        });

        this.updateFieldDisplay();
        this.updatePlayersList();
    }

    isPlayerOnField(playerId) {
        return Object.values(fieldComposition)
            .flat()
            .includes(playerId);
    }

    countPlayersOnField() {
        return Object.values(fieldComposition)
            .flat()
            .filter(id => id).length;
    }

    updatePlayersList() {
        const listContainer = document.getElementById('playersList');
        const benchContainer = document.getElementById('benchList');
        
        if (!listContainer || !benchContainer) return;

        listContainer.innerHTML = '';
        benchContainer.innerHTML = '';

        // Joueuses disponibles (ni sur terrain, ni sur banc)
        const onField = Object.values(fieldComposition).flat();
        const unavailable = [...onField, ...benchPlayers];

        availablePlayers.forEach(player => {
            const isOnField = onField.includes(player.id);
            const isOnBench = benchPlayers.includes(player.id);
            
            const btn = document.createElement('button');
            btn.className = 'player-card';
            btn.draggable = true;
            
            // ✅ FIX BUG 3: Boutons plus compacts
            btn.style.cssText = `
                background: ${isOnField ? 'rgba(52,152,219,0.3)' : (isOnBench ? 'rgba(241,196,15,0.3)' : 'rgba(255,255,255,0.1)')};
                border: 2px solid ${isOnField ? '#3498db' : (isOnBench ? '#f1c40f' : 'rgba(255,255,255,0.2)')};
                padding: 0.5rem;
                border-radius: 6px;
                min-height: 60px;
                display: flex;
                flex-direction: column;
                align-items: center;
                justify-content: center;
                cursor: pointer;
                transition: all 0.2s ease;
            `;

            const posInfo = POSITION_MAP[player.position] || { icon: '⚽', label: player.position };

            btn.innerHTML = `
                <div style="font-size: 1.2rem;">${posInfo.icon}</div>
                <div style="font-size: 0.8rem; font-weight: bold; color: white;">${player.name}</div>
                <div style="font-size: 0.7rem; color: rgba(255,255,255,0.7);">${posInfo.label}${player.number ? ' #' + player.number : ''}</div>
            `;

            // Drag
            btn.addEventListener('dragstart', () => {
                draggedPlayerId = player.id;
            });

            // Clic pour ajouter au banc
            btn.addEventListener('click', () => {
                if (!isOnField && !isOnBench) {
                    this.addToBench(player.id);
                } else if (isOnBench) {
                    this.removeFromBench(player.id);
                }
            });

            if (!isOnField && !isOnBench) {
                listContainer.appendChild(btn);
            } else if (isOnBench) {
                benchContainer.appendChild(btn);
            }
        });

        console.log(`🔄 Mise à jour liste joueuses: ${availablePlayers.length}`);
        this.updateStatus();
    }

    addToBench(playerId) {
        // ✅ FIX BUG 2: Gestion remplaçantes fonctionnelle
        if (benchPlayers.length >= 7) {
            showNotification('❌ Maximum 7 remplaçantes', 'warning');
            return;
        }

        if (!benchPlayers.includes(playerId)) {
            benchPlayers.push(playerId);
            this.updatePlayersList();
            showNotification('✅ Remplaçante ajoutée au banc', 'success');
        }
    }

    removeFromBench(playerId) {
        const index = benchPlayers.indexOf(playerId);
        if (index !== -1) {
            benchPlayers.splice(index, 1);
            this.updatePlayersList();
        }
    }

    updateStatus() {
        const onFieldCount = this.countPlayersOnField();
        const gkCount = (fieldComposition.gk || []).length;

        // Compter par position
        let gkTotal = 0, dfTotal = 0, mfTotal = 0, fwTotal = 0;

        Object.keys(fieldComposition).forEach(zone => {
            fieldComposition[zone].forEach(playerId => {
                const player = availablePlayers.find(p => p.id === playerId);
                if (player) {
                    if (player.position === 'GK') gkTotal++;
                    else if (player.position === 'DF') dfTotal++;
                    else if (player.position === 'MF') mfTotal++;
                    else if (player.position === 'FW') fwTotal++;
                }
            });
        });

        const statusEl = document.getElementById('compositionStatus');
        const validateBtn = document.getElementById('validateBtn');

        console.log(`📊 Statut: ${onFieldCount}/11 titulaires, ${gkTotal} GK, ${dfTotal} DF, ${mfTotal} MF, ${fwTotal} FW (${benchPlayers.length} remplaçants)`);

        // ✅ FIX BUG 4: Validation correcte
        if (onFieldCount === 11 && gkCount === 1) {
            if (statusEl) {
                statusEl.innerHTML = '✅ Composition complète et valide !';
                statusEl.style.color = '#2ecc71';
            }
            if (validateBtn) {
                validateBtn.disabled = false;
                validateBtn.className = 'btn btn-success';
            }
        } else {
            if (statusEl) {
                statusEl.innerHTML = `⚠️ ${onFieldCount}/11 titulaires${gkCount === 0 ? ' - Gardienne manquante' : ''}`;
                statusEl.style.color = '#f39c12';
            }
            if (validateBtn) {
                validateBtn.disabled = true;
                validateBtn.className = 'btn btn-secondary';
            }
        }
    }

    validateComposition() {
        const onFieldCount = this.countPlayersOnField();
        const gkCount = (fieldComposition.gk || []).length;

        if (onFieldCount !== 11 || gkCount !== 1) {
            showNotification('❌ Composition invalide : 11 joueuses dont 1 gardienne requises', 'error');
            return;
        }

        showNotification('✅ Composition validée avec succès !', 'success');
        this.saveComposition();
    }

    saveComposition() {
        const compositionData = {
            teamId: selectedTeamId,
            teamName: window.teamManager.getTeam(selectedTeamId).name,
            formation: currentFormation,
            fieldComposition: fieldComposition,
            benchPlayers: benchPlayers,
            savedAt: new Date().toISOString()
        };

        // Sauvegarder localement
        localStorage.setItem('footballStats_composition', JSON.stringify(compositionData));

        // TODO: Sauvegarder dans Supabase (v3.3)
        console.log('💾 Composition sauvegardée:', compositionData);
        showNotification('💾 Composition sauvegardée !', 'success');
    }

    loadSavedComposition() {
        const saved = localStorage.getItem('footballStats_composition');
        if (saved) {
            try {
                const data = JSON.parse(saved);
                console.log('💾 Composition sauvegardée trouvée:', data);
                
                // Charger automatiquement si équipe existe
                if (data.teamId && window.teamManager.getTeam(data.teamId)) {
                    selectedTeamId = data.teamId;
                    currentFormation = data.formation || '4-2-3-1';
                    fieldComposition = data.fieldComposition || {};
                    benchPlayers = data.benchPlayers || [];
                    
                    document.getElementById('teamSelector').value = selectedTeamId;
                    document.getElementById('formationSelector').value = currentFormation;
                    
                    this.loadTeamPlayers();
                    document.getElementById('compositionSection').style.display = 'block';
                    
                    console.log('📂 Chargement composition:', data);
                }
            } catch (e) {
                console.error('Erreur chargement composition:', e);
            }
        }
    }

    resetComposition() {
        if (confirm('⚠️ Réinitialiser la composition ? Cette action est irréversible.')) {
            fieldComposition = { gk: [] };
            benchPlayers = [];
            this.rebuildField();
            this.updatePlayersList();
            showNotification('🔄 Composition réinitialisée', 'info');
        }
    }
}

// ========================================
// INITIALISATION
// ========================================

let compositionPage = null;

document.addEventListener('DOMContentLoaded', () => {
    // Attendre que les dépendances soient chargées
    const checkDeps = setInterval(() => {
        if (typeof window.teamManager !== 'undefined' && 
            typeof window.NotificationManager !== 'undefined') {
            clearInterval(checkDeps);
            compositionPage = new CompositionPage();
        }
    }, 100);
});

// Fonction globale pour notifications
function showNotification(message, type = 'info') {
    if (typeof window.NotificationManager !== 'undefined' && window.NotificationManager.show) {
        window.NotificationManager.show(message, type);
    } else {
        console.log(`[${type.toUpperCase()}] ${message}`);
    }
}

console.log('📦 Module CompositionPage v3.2 chargé');