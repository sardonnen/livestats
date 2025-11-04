// ===== COMPOSITION PAGE v3.1 - GESTION FORMATIONS MULTI-LIGNES =====

// 🏗️ STRUCTURE DES FORMATIONS AVEC LIGNES DÉTAILLÉES
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

// Variables globales
let currentFormation = '4-4-2';
let fieldComposition = {};
let availablePlayers = [];
let selectedTeamId = null;

// ===== INITIALISATION =====
document.addEventListener('DOMContentLoaded', function() {
    console.log('🎮 CompositionPage v3.1 avec Formations Multi-Lignes initialisé');
    
    // Charger les équipes disponibles
    if (window.teamManager) {
        updateTeamSelector();
    }
    
    // Charger une composition sauvegardée si elle existe
    loadSavedComposition();
    
    // Initialiser les event listeners
    setupEventListeners();
    
    // Construire le terrain initial
    rebuildFieldLayout();
    
    console.log('✅ CompositionPage v3.1 prêt');
});

// ===== CHARGEMENT ÉQUIPE =====
function updateTeamSelector() {
    const selector = document.getElementById('teamSelector');
    const teams = window.teamManager.getAllTeams();
    
    console.log('🔍 Équipes disponibles:', teams);
    
    selector.innerHTML = '<option value="">-- Sélectionner une équipe --</option>';
    teams.forEach(team => {
        const option = document.createElement('option');
        option.value = team.id;
        option.textContent = `${team.name}${team.category ? ' - ' + team.category : ''}`;
        selector.appendChild(option);
    });
}

// ===== RECONSTRUCTION TERRAIN AVEC MULTI-LIGNES =====
function rebuildFieldLayout() {
    const formation = FORMATIONS[currentFormation];
    console.log(`🏗️ Reconstruction terrain pour formation: ${currentFormation}`, formation);
    
    // Récupérer le conteneur du terrain
    const fieldContainer = document.getElementById('footballField');
    if (!fieldContainer) {
        console.error('❌ Conteneur #footballField introuvable');
        return;
    }
    
    // Vider le terrain
    fieldContainer.innerHTML = '';
    
    // 1. Label "ADVERSAIRE"
    const adversaireLabel = document.createElement('div');
    adversaireLabel.className = 'field-label';
    adversaireLabel.textContent = 'ADVERSAIRE';
    fieldContainer.appendChild(adversaireLabel);
    
    // 2. Créer les lignes de jeu (de haut en bas: attaque -> milieu -> défense)
    let zoneCounter = {
        att: 0,
        mid: 0,
        def: 0
    };
    
    formation.lines.forEach((line, lineIndex) => {
        // Créer la ligne
        const lineDiv = document.createElement('div');
        lineDiv.className = `field-line field-line-${line.type}`;
        lineDiv.dataset.lineType = line.type;
        lineDiv.dataset.lineIndex = lineIndex;
        
        // Ajouter un label si nécessaire (pour distinguer milieux offensifs/défensifs)
        if (line.label && line.subtype) {
            const labelDiv = document.createElement('div');
            labelDiv.className = 'line-label';
            labelDiv.textContent = line.label;
            labelDiv.style.cssText = 'font-size: 0.7rem; color: rgba(255,255,255,0.6); text-align: center; margin-bottom: 4px;';
            lineDiv.appendChild(labelDiv);
        }
        
        // Créer les zones pour cette ligne
        const zonesContainer = document.createElement('div');
        zonesContainer.className = 'zones-container';
        zonesContainer.style.cssText = 'display: flex; justify-content: space-around; align-items: center; width: 100%; gap: 8px;';
        
        for (let i = 0; i < line.zones; i++) {
            const zone = document.createElement('div');
            zone.className = 'drop-zone';
            
            // ID unique basé sur le type et le compteur global
            const zoneId = `${line.type}-${zoneCounter[line.type]}`;
            zone.dataset.zone = zoneId;
            zone.dataset.lineType = line.type;
            zone.dataset.subtype = line.subtype || '';
            
            zoneCounter[line.type]++;
            
            // Style de la zone
            zone.style.cssText = `
                min-width: 60px;
                min-height: 60px;
                background: rgba(255,255,255,0.1);
                border: 2px dashed rgba(255,255,255,0.3);
                border-radius: 8px;
                display: flex;
                justify-content: center;
                align-items: center;
                cursor: pointer;
                transition: all 0.3s ease;
                font-size: 0.75rem;
                color: rgba(255,255,255,0.5);
            `;
            
            // Afficher l'ID de la zone pour debug
            zone.textContent = zoneId;
            
            zonesContainer.appendChild(zone);
        }
        
        lineDiv.appendChild(zonesContainer);
        fieldContainer.appendChild(lineDiv);
    });
    
    // 3. Ligne GARDIEN
    const gkLine = document.createElement('div');
    gkLine.className = 'field-line field-line-gk';
    gkLine.innerHTML = `
        <div class="zones-container" style="display: flex; justify-content: center;">
            <div class="drop-zone" data-zone="gk" data-line-type="gk" style="
                min-width: 80px;
                min-height: 60px;
                background: rgba(255,215,0,0.2);
                border: 2px dashed rgba(255,215,0,0.5);
                border-radius: 8px;
                display: flex;
                justify-content: center;
                align-items: center;
                font-size: 0.75rem;
                color: rgba(255,215,0,0.8);
            ">gk</div>
        </div>
    `;
    fieldContainer.appendChild(gkLine);
    
    // 4. Label "NOTRE BUT"
    const butLabel = document.createElement('div');
    butLabel.className = 'field-label';
    butLabel.textContent = 'NOTRE BUT';
    fieldContainer.appendChild(butLabel);
    
    // Réinitialiser les event listeners drag&drop
    setupDragAndDrop();
    
    // Restaurer les joueurs placés
    restoreFieldPlayers();
    
    console.log(`✅ Terrain reconstruit avec ${formation.lines.length} lignes de jeu`);
}

// ===== SETUP EVENT LISTENERS =====
function setupEventListeners() {
    // Sélection équipe
    document.getElementById('teamSelector').addEventListener('change', function(e) {
        selectedTeamId = e.target.value;
        
        if (selectedTeamId) {
            const team = window.teamManager.getTeam(selectedTeamId);
            document.getElementById('selectedTeamDisplay').textContent = team.name;
            document.getElementById('compositionSection').style.display = 'block';
            
            // Charger les joueuses
            loadTeamPlayers();
            updatePlayersList();
            updateCompositionStatus();
        } else {
            document.getElementById('compositionSection').style.display = 'none';
        }
    });
    
    // Sélection formation
    document.getElementById('formationSelector').addEventListener('change', function(e) {
        currentFormation = e.target.value;
        console.log(`🔄 Formation changée: ${currentFormation}`);
        rebuildFieldLayout();
    });
    
    // Boutons
    document.getElementById('validateBtn').addEventListener('click', saveComposition);
    document.getElementById('clearBtn').addEventListener('click', clearComposition);
}

// ===== DRAG & DROP =====
function setupDragAndDrop() {
    // Rendre les cartes joueuses draggables
    document.querySelectorAll('.player-card').forEach(card => {
        card.draggable = true;
        
        card.addEventListener('dragstart', function(e) {
            e.dataTransfer.setData('playerId', this.dataset.playerId);
            this.style.opacity = '0.5';
        });
        
        card.addEventListener('dragend', function() {
            this.style.opacity = '1';
        });
    });
    
    // Setup drop zones
    document.querySelectorAll('.drop-zone').forEach(zone => {
        zone.addEventListener('dragover', function(e) {
            e.preventDefault();
            this.style.background = 'rgba(52,152,219,0.3)';
            this.style.borderColor = '#3498db';
        });
        
        zone.addEventListener('dragleave', function() {
            this.style.background = '';
            this.style.borderColor = '';
        });
        
        zone.addEventListener('drop', function(e) {
            e.preventDefault();
            this.style.background = '';
            this.style.borderColor = '';
            
            const playerId = e.dataTransfer.getData('playerId');
            const zoneId = this.dataset.zone;
            
            placePlayerInZone(playerId, zoneId);
        });
        
        // Click pour retirer un joueur
        zone.addEventListener('click', function() {
            const zoneId = this.dataset.zone;
            if (fieldComposition[zoneId]) {
                removePlayerFromZone(zoneId);
            }
        });
    });
}

// ===== PLACEMENT JOUEUR =====
function placePlayerInZone(playerId, zoneId) {
    const player = availablePlayers.find(p => p.id === playerId);
    if (!player) return;
    
    // Vérifier si le joueur est déjà placé ailleurs
    for (let zone in fieldComposition) {
        if (fieldComposition[zone] && fieldComposition[zone].id === playerId) {
            delete fieldComposition[zone];
            break;
        }
    }
    
    // Placer le joueur
    fieldComposition[zoneId] = player;
    
    console.log(`⚽ ${player.name} placé en ${zoneId}`);
    
    updateFieldDisplay();
    updatePlayersList();
    updateCompositionStatus();
}

// ===== RETRAIT JOUEUR =====
function removePlayerFromZone(zoneId) {
    const player = fieldComposition[zoneId];
    if (player) {
        console.log(`🔄 ${player.name} retiré de ${zoneId}`);
        delete fieldComposition[zoneId];
        
        updateFieldDisplay();
        updatePlayersList();
        updateCompositionStatus();
    }
}

// ===== MISE À JOUR AFFICHAGE TERRAIN =====
function updateFieldDisplay() {
    console.log('⚽ Mise à jour terrain:', fieldComposition);
    
    // Réinitialiser toutes les zones
    document.querySelectorAll('.drop-zone').forEach(zone => {
        const zoneId = zone.dataset.zone;
        zone.innerHTML = '';
        zone.style.background = '';
        
        // Si un joueur est dans cette zone
        if (fieldComposition[zoneId]) {
            const player = fieldComposition[zoneId];
            
            zone.style.background = 'rgba(52,152,219,0.3)';
            zone.style.borderColor = '#3498db';
            zone.style.borderStyle = 'solid';
            
            zone.innerHTML = `
                <div style="text-align: center; color: white;">
                    <div style="font-size: 1.2rem; font-weight: bold;">${player.number || '?'}</div>
                    <div style="font-size: 0.7rem;">${player.name}</div>
                </div>
            `;
        } else {
            // Zone vide
            zone.textContent = zoneId;
            zone.style.borderStyle = 'dashed';
        }
    });
}

// ===== RESTAURER JOUEURS APRÈS REBUILD =====
function restoreFieldPlayers() {
    updateFieldDisplay();
}

// ===== CHARGER JOUEUSES ÉQUIPE =====
function loadTeamPlayers() {
    const team = window.teamManager.getTeam(selectedTeamId);
    availablePlayers = team.players || [];
    console.log(`📥 ${availablePlayers.length} joueuses chargées`);
}

// ===== MISE À JOUR LISTE JOUEUSES =====
function updatePlayersList() {
    const container = document.getElementById('playersList');
    container.innerHTML = '';
    
    const positionIcons = {
        'GK': '🥅',
        'DF': '🛡️',
        'MF': '🎯',
        'FW': '⚔️'
    };
    
    availablePlayers.forEach(player => {
        // Vérifier si le joueur est déjà sur le terrain
        const isOnField = Object.values(fieldComposition).some(p => p && p.id === player.id);
        
        const card = document.createElement('div');
        card.className = 'player-card';
        card.dataset.playerId = player.id;
        card.draggable = !isOnField;
        
        if (isOnField) {
            card.style.opacity = '0.5';
            card.style.cursor = 'not-allowed';
        }
        
        card.innerHTML = `
            <div style="font-size: 1.5rem;">${positionIcons[player.position] || '⚽'}</div>
            <div style="font-weight: bold; margin-top: 0.5rem;">${player.name}</div>
            <div style="font-size: 0.85rem; color: #95a5a6;">N°${player.number || '?'}</div>
            ${isOnField ? '<div style="font-size: 0.75rem; color: #e74c3c; margin-top: 0.25rem;">Sur le terrain</div>' : ''}
        `;
        
        container.appendChild(card);
    });
    
    // Réinitialiser drag & drop
    setupDragAndDrop();
    
    console.log('🔄 Mise à jour liste joueuses:', availablePlayers.length);
}

// ===== STATUT COMPOSITION =====
function updateCompositionStatus() {
    const placedCount = Object.keys(fieldComposition).length;
    const formation = FORMATIONS[currentFormation];
    
    // Compter par position
    let gkCount = 0, dfCount = 0, mfCount = 0, fwCount = 0;
    
    Object.values(fieldComposition).forEach(player => {
        if (player) {
            if (player.position === 'GK') gkCount++;
            if (player.position === 'DF') dfCount++;
            if (player.position === 'MF') mfCount++;
            if (player.position === 'FW') fwCount++;
        }
    });
    
    const statusEl = document.getElementById('statusText');
    const validateBtn = document.getElementById('validateBtn');
    
    const totalNeeded = 11;
    
    statusEl.innerHTML = `📊 Statut: ${placedCount}/11 titulaires, ${gkCount} GK, ${dfCount} DF, ${mfCount} MF, ${fwCount} FW`;
    
    if (placedCount === totalNeeded && gkCount === 1) {
        statusEl.style.color = '#2ecc71';
        validateBtn.disabled = false;
        validateBtn.className = 'btn btn-success';
    } else {
        statusEl.style.color = '#f39c12';
        validateBtn.disabled = true;
        validateBtn.className = 'btn btn-secondary';
    }
    
    console.log(`📊 Statut: ${placedCount}/${totalNeeded} titulaires, ${gkCount} GK, ${dfCount} DF, ${mfCount} MF, ${fwCount} FW`);
}

// ===== SAUVEGARDE COMPOSITION =====
function saveComposition() {
    const placedCount = Object.keys(fieldComposition).length;
    if (placedCount !== 11) {
        showNotification('Vous devez placer 11 joueuses sur le terrain', 'warning');
        return;
    }
    
    const compositionData = {
        teamId: selectedTeamId,
        teamName: window.teamManager.getTeam(selectedTeamId).name,
        formation: currentFormation,
        fieldComposition: fieldComposition,
        savedAt: new Date().toISOString()
    };
    
    localStorage.setItem('footballStats_composition', JSON.stringify(compositionData));
    
    showNotification('✅ Composition sauvegardée !', 'success');
    console.log('💾 Composition sauvegardée:', compositionData);
}

// ===== CHARGEMENT COMPOSITION SAUVEGARDÉE =====
function loadSavedComposition() {
    const saved = localStorage.getItem('footballStats_composition');
    if (!saved) return;
    
    try {
        const data = JSON.parse(saved);
        console.log('💾 Composition sauvegardée trouvée:', data);
        
        // Charger l'équipe
        if (data.teamId && window.teamManager) {
            document.getElementById('teamSelector').value = data.teamId;
            selectedTeamId = data.teamId;
            
            const team = window.teamManager.getTeam(selectedTeamId);
            if (team) {
                document.getElementById('selectedTeamDisplay').textContent = team.name;
                document.getElementById('compositionSection').style.display = 'block';
                
                loadTeamPlayers();
            }
        }
        
        // Charger la formation
        if (data.formation) {
            currentFormation = data.formation;
            document.getElementById('formationSelector').value = currentFormation;
            rebuildFieldLayout();
        }
        
        // Charger les positions
        if (data.fieldComposition) {
            fieldComposition = data.fieldComposition;
            updateFieldDisplay();
            updatePlayersList();
            updateCompositionStatus();
        }
        
        console.log('📂 Chargement composition:', data);
    } catch (error) {
        console.error('❌ Erreur chargement composition:', error);
    }
}

// ===== RESET COMPOSITION =====
function clearComposition() {
    if (!confirm('Êtes-vous sûr de vouloir réinitialiser la composition ?')) return;
    
    fieldComposition = {};
    updateFieldDisplay();
    updatePlayersList();
    updateCompositionStatus();
    
    showNotification('🔄 Composition réinitialisée', 'info');
}

// ===== NOTIFICATION =====
function showNotification(message, type = 'info') {
    if (typeof window.NotificationManager !== 'undefined' && window.NotificationManager.show) {
        window.NotificationManager.show(message, type);
    } else {
        console.log(`[${type.toUpperCase()}] ${message}`);
        alert(message);
    }
}

console.log('📦 Module CompositionPage v3.1 chargé');