/**
 * COMPOSITION.JS - Logique métier composition d'équipe
 * Version: 3.0 - Schéma tactique dynamique
 * Architecture: BACKEND JavaScript pur
 * Gère: Drag & drop, Formations DYNAMIQUES, Sauvegarde/Chargement
 */

// ========================================
// VARIABLES GLOBALES
// ========================================

let selectedTeamId = null;
let fieldComposition = {}; // { zone: [playerId, ...] }
let currentFormation = '4-4-2';
let draggedElement = null;

// Formations disponibles (Défenseurs-Milieux-Attaquants)
const FORMATIONS = {
    '4-4-2': { df: 4, mf: 4, fw: 2 },
    '4-3-3': { df: 4, mf: 3, fw: 3 },
    '4-2-3-1': { df: 4, mf: 5, fw: 1 },
    '3-5-2': { df: 3, mf: 5, fw: 2 },
    '3-4-3': { df: 3, mf: 4, fw: 3 },
    '5-3-2': { df: 5, mf: 3, fw: 2 }
};

// Mapping des positions SQL vers affichage français
const POSITION_MAP = {
    'GK': { label: 'Gardienne', icon: '🥅', class: 'gk' },
    'DF': { label: 'Défenseuse', icon: '🛡️', class: 'df' },
    'MF': { label: 'Milieu', icon: '🎯', class: 'mf' },
    'FW': { label: 'Attaquante', icon: '⚔️', class: 'fw' }
};

// ========================================
// FONCTIONS UTILITAIRES
// ========================================

function getPositionDisplay(positionCode) {
    return POSITION_MAP[positionCode] || { label: positionCode, icon: '⚽', class: 'state-normal' };
}

function showNotification(message, type = 'info') {
    if (typeof window.NotificationManager !== 'undefined' && window.NotificationManager.show) {
        window.NotificationManager.show(message, type);
    } else {
        console.log(`[${type.toUpperCase()}] ${message}`);
        alert(message);
    }
}

// ========================================
// INITIALISATION
// ========================================

document.addEventListener('DOMContentLoaded', function() {
    console.log('🎮 CompositionPage v3.0 avec Schéma Dynamique initialisé');
    
    updateTeamSelector();
    setupEventListeners();
    setupFormationButtons();
    rebuildFieldLayout(); // Construire le terrain selon la formation par défaut
    setupDragAndDrop();
    checkForSavedComposition();
});

// ========================================
// RECONSTRUCTION TERRAIN DYNAMIQUE
// ========================================

function rebuildFieldLayout() {
    const formation = FORMATIONS[currentFormation];
    console.log('🏗️ Reconstruction terrain pour formation:', currentFormation, formation);
    
    // Récupérer les lignes du terrain par ID
    const attLine = document.getElementById('attLine');
    const midLine = document.getElementById('midLine');
    const defLine = document.getElementById('defLine');
    
    // Reconstruire ligne ATTAQUE
    attLine.innerHTML = '';
    for (let i = 0; i < formation.fw; i++) {
        const zone = document.createElement('div');
        zone.className = 'drop-zone';
        zone.dataset.zone = `att-${i}`;
        attLine.appendChild(zone);
    }
    
    // Reconstruire ligne MILIEU
    midLine.innerHTML = '';
    for (let i = 0; i < formation.mf; i++) {
        const zone = document.createElement('div');
        zone.className = 'drop-zone';
        zone.dataset.zone = `mid-${i}`;
        midLine.appendChild(zone);
    }
    
    // Reconstruire ligne DÉFENSE
    defLine.innerHTML = '';
    for (let i = 0; i < formation.df; i++) {
        const zone = document.createElement('div');
        zone.className = 'drop-zone';
        zone.dataset.zone = `def-${i}`;
        defLine.appendChild(zone);
    }
    
    // Réinitialiser les event listeners drag&drop
    setupDragAndDrop();
    
    console.log(`✅ Terrain reconstruit: ${formation.fw} ATT, ${formation.mf} MID, ${formation.df} DEF`);
}

// ========================================
// SAUVEGARDE / CHARGEMENT
// ========================================

function checkForSavedComposition() {
    const saved = localStorage.getItem('footballStats_composition');
    if (saved) {
        const data = JSON.parse(saved);
        console.log('💾 Composition sauvegardée trouvée:', data);
        document.getElementById('savedCompositionBanner').style.display = 'flex';
    }
}

function loadSavedComposition() {
    const saved = localStorage.getItem('footballStats_composition');
    if (!saved) return;

    const data = JSON.parse(saved);
    console.log('📂 Chargement composition:', data);

    // Sélectionner l'équipe
    selectedTeamId = data.teamId;
    document.getElementById('teamSelector').value = selectedTeamId;
    document.getElementById('selectedTeamDisplay').textContent = data.teamName;
    document.getElementById('compositionSection').style.display = 'block';

    // Charger la formation
    if (data.formation) {
        currentFormation = data.formation;
        document.querySelectorAll('.formation-btn').forEach(btn => {
            btn.classList.toggle('active', btn.dataset.formation === currentFormation);
        });
        // Reconstruire le terrain selon la formation sauvegardée
        rebuildFieldLayout();
    }

    // Charger les positions sur le terrain
    if (data.fieldComposition) {
        fieldComposition = data.fieldComposition;
    }

    // Masquer la bannière
    document.getElementById('savedCompositionBanner').style.display = 'none';

    // Rafraîchir l'affichage
    updatePlayersList();
    updateFieldDisplay();
    
    showNotification('✅ Composition chargée !', 'success');
}

// ========================================
// SETUP EVENT LISTENERS
// ========================================

function setupEventListeners() {
    // Sélection équipe
    document.getElementById('teamSelector').addEventListener('change', function(e) {
        selectedTeamId = e.target.value;
        fieldComposition = {};
        
        if (selectedTeamId) {
            const team = window.teamManager.getTeam(selectedTeamId);
            console.log('✅ Équipe sélectionnée:', team);
            
            document.getElementById('selectedTeamDisplay').textContent = team.name;
            document.getElementById('compositionSection').style.display = 'block';
            updatePlayersList();
            updateFieldDisplay();
        } else {
            document.getElementById('compositionSection').style.display = 'none';
        }
    });

    // Bouton charger composition
    document.getElementById('loadCompositionBtn').addEventListener('click', loadSavedComposition);

    // Bouton valider
    document.getElementById('validateBtn').addEventListener('click', validateComposition);

    // Bouton réinitialiser
    document.getElementById('clearBtn').addEventListener('click', clearSelection);

    // Bouton fermer
    document.getElementById('closeBtn').addEventListener('click', function() {
        document.getElementById('compositionSection').style.display = 'none';
    });
}

function setupFormationButtons() {
    document.querySelectorAll('.formation-btn').forEach(btn => {
        btn.addEventListener('click', function() {
            // Confirmation si changement avec terrain déjà rempli
            const playersOnField = getPlayersOnField();
            if (playersOnField.length > 0) {
                if (!confirm('⚠️ Changer de formation va vider le terrain. Continuer ?')) {
                    return;
                }
                // Vider le terrain sauf le banc
                const bench = fieldComposition['bench'] || [];
                fieldComposition = { bench: bench };
            }

            // Changer la formation
            document.querySelectorAll('.formation-btn').forEach(b => b.classList.remove('active'));
            this.classList.add('active');
            currentFormation = this.dataset.formation;
            console.log('📐 Formation changée:', currentFormation);
            
            // NOUVEAU: Reconstruire le terrain selon la formation
            rebuildFieldLayout();
            
            updateFieldDisplay();
            updateCompositionStatus();
        });
    });
}

function setupDragAndDrop() {
    // Event listeners sur toutes les drop zones
    document.querySelectorAll('.drop-zone').forEach(zone => {
        zone.addEventListener('dragover', handleDragOver);
        zone.addEventListener('drop', handleDrop);
        zone.addEventListener('dragleave', handleDragLeave);
    });
}

// ========================================
// DRAG & DROP HANDLERS
// ========================================

function handleDragOver(e) {
    e.preventDefault();
    e.currentTarget.classList.add('drag-over');
}

function handleDragLeave(e) {
    e.currentTarget.classList.remove('drag-over');
}

function handleDrop(e) {
    e.preventDefault();
    e.currentTarget.classList.remove('drag-over');
    
    const targetZone = e.currentTarget.dataset.zone;
    const playerId = draggedElement.dataset.playerId;
    
    console.log(`🎯 Drop: Joueuse ${playerId} dans zone ${targetZone}`);
    
    // Retirer la joueuse de son ancienne position
    removePlayerFromAllZones(playerId);
    
    // Ajouter à la nouvelle zone
    if (!fieldComposition[targetZone]) {
        fieldComposition[targetZone] = [];
    }
    fieldComposition[targetZone].push(playerId);
    
    updateFieldDisplay();
    updateCompositionStatus();
}

function removePlayerFromAllZones(playerId) {
    Object.keys(fieldComposition).forEach(zone => {
        fieldComposition[zone] = fieldComposition[zone].filter(id => id !== playerId);
        if (fieldComposition[zone].length === 0) {
            delete fieldComposition[zone];
        }
    });
}

// ========================================
// AFFICHAGE
// ========================================

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

function updatePlayersList() {
    if (!selectedTeamId) return;

    const team = window.teamManager.getTeam(selectedTeamId);
    const playersContainer = document.getElementById('playersList');
    
    playersContainer.innerHTML = '';

    console.log('🔄 Mise à jour liste joueuses:', team.players);

    // Joueuses déjà sur le terrain (incluant le banc)
    const playersOnField = Object.values(fieldComposition).flat();

    team.players.forEach(player => {
        const isOnField = playersOnField.includes(player.id);
        
        if (isOnField) return; // Ne pas afficher les joueuses déjà sur le terrain

        const posDisplay = getPositionDisplay(player.position);

        const btn = document.createElement('button');
        btn.className = 'player-btn';
        btn.dataset.playerId = player.id;
        btn.draggable = true;
        btn.style.cssText = `
            padding: 0.6rem;
            border: 2px solid #ecf0f1;
            border-radius: 6px;
            background: #f8f9fa;
            color: #2c3e50;
            cursor: grab;
            font-weight: bold;
            transition: all 0.2s ease;
        `;
        btn.onmouseover = () => btn.style.transform = 'scale(1.05)';
        btn.onmouseout = () => btn.style.transform = 'scale(1)';

        btn.innerHTML = `
            <div style="font-size: 1rem; margin-bottom: 0.25rem;">${posDisplay.icon}</div>
            <div style="font-size: 0.8rem; font-weight: bold;">${player.name}</div>
            <div style="font-size: 0.7rem; opacity: 0.9;">${posDisplay.label}${player.number ? ' N°' + player.number : ''}</div>
        `;

        // Drag events
        btn.addEventListener('dragstart', function(e) {
            draggedElement = this;
            this.classList.add('dragging');
            e.dataTransfer.effectAllowed = 'move';
        });

        btn.addEventListener('dragend', function() {
            this.classList.remove('dragging');
            draggedElement = null;
        });

        playersContainer.appendChild(btn);
    });

    // Mettre à jour le compteur
    document.getElementById('availableCount').textContent = playersContainer.children.length;
}

function updateFieldDisplay() {
    if (!selectedTeamId) return;
    
    const team = window.teamManager.getTeam(selectedTeamId);
    
    console.log('⚽ Mise à jour terrain:', fieldComposition);

    // Vider toutes les zones
    document.querySelectorAll('.drop-zone').forEach(zone => {
        zone.innerHTML = '';
    });

    // Remplir chaque zone
    Object.keys(fieldComposition).forEach(zoneId => {
        const zone = document.querySelector(`[data-zone="${zoneId}"]`);
        if (!zone) return;

        fieldComposition[zoneId].forEach(playerId => {
            const player = team.players.find(p => p.id === playerId);
            if (!player) return;

            const posDisplay = getPositionDisplay(player.position);
            
            const badge = document.createElement('div');
            badge.className = `player-badge ${posDisplay.class}`;
            badge.draggable = true;
            badge.dataset.playerId = playerId;
            badge.innerHTML = `
                ${player.number ? `${player.name} (${player.number})` : player.name}
                <button class="remove-player-btn" data-player-id="${playerId}">✖</button>
            `;

            // Drag events sur les badges
            badge.addEventListener('dragstart', function(e) {
                draggedElement = this;
                this.classList.add('dragging');
                e.dataTransfer.effectAllowed = 'move';
            });

            badge.addEventListener('dragend', function() {
                this.classList.remove('dragging');
                draggedElement = null;
            });

            // Bouton retirer
            const removeBtn = badge.querySelector('.remove-player-btn');
            removeBtn.addEventListener('click', function(e) {
                e.stopPropagation();
                const pid = this.dataset.playerId;
                removePlayerFromField(pid);
            });

            zone.appendChild(badge);
        });
    });

    // Mettre à jour la liste des joueuses disponibles
    updatePlayersList();
    updateCompositionStatus();
}

function removePlayerFromField(playerId) {
    console.log('❌ Retrait joueuse du terrain:', playerId);
    removePlayerFromAllZones(playerId);
    updateFieldDisplay();
}

// ========================================
// VALIDATION & STATUT
// ========================================

function getPlayersOnField() {
    // CORRECTION BUG: Exclure le banc du comptage des titulaires
    const allZones = Object.keys(fieldComposition);
    const fieldZones = allZones.filter(zone => zone !== 'bench');
    
    const playersOnField = [];
    fieldZones.forEach(zone => {
        playersOnField.push(...fieldComposition[zone]);
    });
    
    return playersOnField;
}

function updateCompositionStatus() {
    if (!selectedTeamId) return;

    const team = window.teamManager.getTeam(selectedTeamId);
    
    // CORRECTION BUG: Compter uniquement les titulaires (sans le banc)
    const playersOnField = getPlayersOnField();
    
    // Compter par position
    const gkCount = playersOnField.filter(id => {
        const player = team.players.find(p => p.id === id);
        return player?.position === 'GK';
    }).length;

    const dfCount = playersOnField.filter(id => {
        const player = team.players.find(p => p.id === id);
        return player?.position === 'DF';
    }).length;

    const mfCount = playersOnField.filter(id => {
        const player = team.players.find(p => p.id === id);
        return player?.position === 'MF';
    }).length;

    const fwCount = playersOnField.filter(id => {
        const player = team.players.find(p => p.id === id);
        return player?.position === 'FW';
    }).length;

    // Compter les remplaçants
    const benchCount = fieldComposition['bench']?.length || 0;
    document.getElementById('benchCount').textContent = benchCount;

    console.log(`📊 Statut: ${playersOnField.length}/11 titulaires, ${gkCount} GK, ${dfCount} DF, ${mfCount} MF, ${fwCount} FW (${benchCount} remplaçants)`);

    const statusEl = document.getElementById('statusText');
    const validateBtn = document.getElementById('validateBtn');

    // Vérifier si la formation correspond
    const formation = FORMATIONS[currentFormation];
    const formationMatch = dfCount === formation.df && mfCount === formation.mf && fwCount === formation.fw;

    if (playersOnField.length === 11 && gkCount === 1) {
        if (formationMatch) {
            statusEl.innerHTML = `✅ Composition complète ${currentFormation} (11/11 - 1 GK, ${dfCount} DF, ${mfCount} MF, ${fwCount} FW)`;
            statusEl.style.color = '#2ecc71';
            console.log('✅ COMPOSITION VALIDE !');
        } else {
            statusEl.innerHTML = `⚠️ 11 joueuses mais pas ${currentFormation} (${dfCount} DF, ${mfCount} MF, ${fwCount} FW attendu: ${formation.df}/${formation.mf}/${formation.fw})`;
            statusEl.style.color = '#f39c12';
        }
        validateBtn.disabled = false;
        validateBtn.className = 'btn btn-success';
    } else {
        statusEl.innerHTML = `⚠️ Composition incomplète (${playersOnField.length}/11${gkCount > 0 ? ` - ${gkCount} GK` : ''})`;
        statusEl.style.color = '#f39c12';
        validateBtn.disabled = true;
        validateBtn.className = 'btn btn-secondary';
    }
}

function validateComposition() {
    const playersOnField = getPlayersOnField();
    
    if (playersOnField.length !== 11) {
        showNotification('La composition doit avoir 11 joueuses sur le terrain', 'warning');
        return;
    }

    // Sauvegarder la composition avec positions exactes
    const compositionData = {
        teamId: selectedTeamId,
        teamName: window.teamManager.getTeam(selectedTeamId).name,
        formation: currentFormation,
        fieldComposition: fieldComposition, // Positions exactes incluant le banc
        savedAt: new Date().toISOString()
    };

    localStorage.setItem('footballStats_composition', JSON.stringify(compositionData));
    console.log('💾 Composition sauvegardée avec positions:', compositionData);
    
    showNotification(`✅ Composition ${currentFormation} sauvegardée avec positions !`, 'success');
}

function clearSelection() {
    if (confirm('Êtes-vous sûr de vouloir réinitialiser la composition ?')) {
        fieldComposition = {};
        updateFieldDisplay();
        console.log('🔄 Composition réinitialisée');
        showNotification('🔄 Composition réinitialisée', 'info');
    }
}