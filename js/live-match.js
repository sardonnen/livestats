// ===== INTERFACE LIVE - live-match.html =====
// Gère toute la logique de l'interface admin en direct

class LiveMatchInterface {
    constructor() {
        this.state = {
            matchId: null,
            teamId: null,
            teamName: '',
            opponentName: '',
            teamScore: 0,
            opponentScore: 0,
            time: 0,
            half: 1,
            isPlaying: false,
            timerInterval: null,
            players: [],
            events: [],
            
            // État modal
            modalAction: null,
            selectedTeam: null,
            selectedPlayer: null,
            selectedCardType: null,
            selectedShotType: null
        };
    }

    /**
     * Initialiser l'interface
     */
    async init() {
        console.log('🎬 Initialisation interface live');

        // Attendre que Supabase soit prêt
        let attempts = 0;
        while (!isSupabaseReady() && attempts < 20) {
            await new Promise(resolve => setTimeout(resolve, 100));
            attempts++;
        }

        if (!isSupabaseReady()) {
            showNotification('Erreur de connexion à la base de données', 'error');
            return;
        }

        await this.loadMatchData();
    }

    /**
     * Charger les données du match
     */
    async loadMatchData() {
        try {
            // Récupérer depuis le localStorage
            const savedMatch = localStorage.getItem('currentMatch');
            
            if (!savedMatch) {
                showNotification('Aucun match en cours', 'error');
                setTimeout(() => {
                    window.location.href = '../index.html';
                }, 2000);
                return;
            }

            const matchData = JSON.parse(savedMatch);
            this.state.matchId = matchData.id;
            this.state.teamId = matchData.teamId;
            this.state.teamName = matchData.teamName || 'Mon Équipe';
            this.state.opponentName = matchData.opponentName || 'Équipe Adverse';
            this.state.players = matchData.players || [];

            // Vérifier si le match existe dans Supabase
            let dbMatch = await dataManager.getMatch(this.state.matchId);
            
            if (!dbMatch) {
                // Créer le match dans Supabase s'il n'existe pas
                console.log('📝 Création du match dans Supabase...');
                dbMatch = await dataManager.createMatch(
                    this.state.teamId,
                    this.state.teamName,
                    this.state.opponentName,
                    matchData.venue || '',
                    90
                );

                if (!dbMatch) {
                    showNotification('Erreur création du match en base', 'error');
                    return;
                }

                this.state.matchId = dbMatch.id;
                localStorage.setItem('currentMatch', JSON.stringify({
                    ...matchData,
                    id: dbMatch.id
                }));
            }

            // Mettre à jour les scores depuis la base
            if (dbMatch) {
                this.state.teamScore = dbMatch.team_score;
                this.state.opponentScore = dbMatch.opponent_score;
                this.state.half = dbMatch.half || 1;
            }

            this.updateUI();
            
            // Démarrer la synchronisation
            syncManager.startSync(this.state.matchId, 3000);
            syncManager.onSync((syncData) => this.handleSync(syncData));

            this.updateSyncStatus();
            showNotification('Match chargé', 'success');

        } catch (error) {
            console.error('❌ Erreur chargement match :', error);
            showNotification('Erreur chargement du match', 'error');
        }
    }

    /**
     * Mettre à jour l'interface
     */
    updateUI() {
        document.getElementById('teamName1').textContent = this.state.teamName;
        document.getElementById('teamName2').textContent = this.state.opponentName;
        document.getElementById('score1').textContent = this.state.teamScore;
        document.getElementById('score2').textContent = this.state.opponentScore;
        document.getElementById('matchHalf').textContent = 
            this.state.half === 1 ? '1ère Mi-temps' : '2ème Mi-temps';
        this.updateTimer();
    }

    /**
     * Gérer les mises à jour de sync
     */
    handleSync(syncData) {
        if (syncData.match) {
            this.state.teamScore = syncData.match.team_score;
            this.state.opponentScore = syncData.match.opponent_score;
        }

        if (syncData.events && syncData.events.length > 0) {
            this.updateEventsList(syncData.events);
        }

        this.updateUI();
    }

    // ===== CHRONOMÈTRE =====

    toggleTimer() {
        if (this.state.isPlaying) {
            this.pauseTimer();
        } else {
            this.startTimer();
        }
    }

    startTimer() {
        if (this.state.isPlaying) return;

        this.state.isPlaying = true;
        document.getElementById('playBtn').textContent = '⏸️ Pause';
        document.getElementById('playBtn').style.background = '#f39c12';

        this.state.timerInterval = setInterval(() => {
            this.state.time++;
            this.updateTimer();
        }, 1000);
    }

    pauseTimer() {
        this.state.isPlaying = false;
        document.getElementById('playBtn').textContent = '▶️ Démarrer';
        document.getElementById('playBtn').style.background = '#27ae60';
        clearInterval(this.state.timerInterval);
    }

    resetTimer() {
        this.pauseTimer();
        this.state.time = 0;
        this.updateTimer();
    }

    toggleHalf() {
        this.state.half = this.state.half === 1 ? 2 : 1;
        this.state.time = 0;
        this.updateTimer();
    }

    updateTimer() {
        const minutes = Math.floor(this.state.time / 60);
        const seconds = this.state.time % 60;
        const display = `${String(minutes).padStart(2, '0')}:${String(seconds).padStart(2, '0')}`;
        document.getElementById('matchTime').textContent = display;
    }

    // ===== ACTIONS =====

    openActionModal(actionType) {
        this.state.modalAction = actionType;
        this.state.selectedTeam = null;
        this.state.selectedPlayer = null;
        this.state.selectedCardType = null;
        this.state.selectedShotType = null;

        const modal = document.getElementById('actionModal');
        const title = document.getElementById('modalTitle');

        const actionNames = {
            goal: '⚽ But',
            shot: '🎯 Tir',
            card: '🟨 Carton',
            foul: '⚠️ Faute',
            assist: '🎪 Passe Décisive',
            substitution: '🔄 Changement'
        };

        title.textContent = actionNames[actionType] || 'Action';

        // Afficher/masquer les sections
        document.getElementById('teamChoice').style.display = 
            ['shot', 'foul'].includes(actionType) ? 'block' : 'none';
        
        document.getElementById('playerChoice').style.display = 'block';
        document.getElementById('cardTypeChoice').style.display = 
            actionType === 'card' ? 'block' : 'none';
        document.getElementById('shotTypeChoice').style.display = 
            actionType === 'shot' ? 'block' : 'none';

        // Remplir la liste des joueurs
        this.populatePlayerList();

        modal.classList.add('active');
    }

    closeModal() {
        document.getElementById('actionModal').classList.remove('active');
    }

    selectTeam(isTeam) {
        this.state.selectedTeam = isTeam;
        this.populatePlayerList();
    }

    selectCardType(cardType) {
        this.state.selectedCardType = cardType;
    }

    selectShotType(shotType) {
        this.state.selectedShotType = shotType;
    }

    populatePlayerList() {
        const playerList = document.getElementById('playerList');
        playerList.innerHTML = '';

        const players = this.state.players;
        players.forEach(player => {
            const button = document.createElement('button');
            button.className = 'player-option';
            button.textContent = `${player.name} (#${player.number || '?'})`;
            button.onclick = () => this.selectPlayer(player.id, button);
            playerList.appendChild(button);
        });
    }

    selectPlayer(playerId, buttonElement) {
        // Désélectionner l'ancien
        document.querySelectorAll('.player-option').forEach(btn => {
            btn.classList.remove('selected');
        });

        // Sélectionner le nouveau
        buttonElement.classList.add('selected');
        this.state.selectedPlayer = playerId;
    }

    async confirmAction() {
        try {
            const actionType = this.state.modalAction;
            const playerId = this.state.selectedPlayer;
            const eventTime = this.state.time;

            if (!playerId && actionType !== 'foul') {
                showNotification('Veuillez sélectionner un joueur', 'warning');
                return;
            }

            // Mapper les types d'événements
            const eventTypeMap = {
                goal: 'goal',
                shot: this.state.selectedShotType === 'on_target' ? 'shot_on_target' : 'shot_off_target',
                card: 'card',
                foul: 'foul',
                assist: 'assist',
                substitution: 'substitution'
            };

            const eventType = eventTypeMap[actionType];

            // Mettre à jour le score si but
            if (actionType === 'goal') {
                this.state.teamScore++;
                await dataManager.updateMatch(
                    this.state.matchId,
                    this.state.teamScore,
                    this.state.opponentScore,
                    this.state.time,
                    this.state.half
                );
            }

            // Enregistrer l'événement
            await dataManager.recordEvent(
                this.state.matchId,
                playerId,
                eventType,
                eventTime,
                true,
                actionType === 'card' ? this.state.selectedCardType : null
            );

            // Mettre à jour les stats du joueur
            if (playerId) {
                const statUpdates = {};
                if (actionType === 'goal') statUpdates.goals = 1;
                if (actionType === 'assist') statUpdates.assists = 1;
                if (actionType === 'shot' && this.state.selectedShotType === 'on_target') 
                    statUpdates.shots_on_target = 1;
                if (actionType === 'shot' && this.state.selectedShotType === 'off_target') 
                    statUpdates.shots_off_target = 1;

                await dataManager.updatePlayerStats(this.state.matchId, playerId, statUpdates);
            }

            this.updateUI();
            this.closeModal();
            showNotification(`${eventType} enregistré`, 'success');

        } catch (error) {
            console.error('❌ Erreur enregistrement action :', error);
            showNotification('Erreur enregistrement', 'error');
        }
    }

    /**
     * Mettre à jour la liste des événements
     */
    updateEventsList(events) {
        const eventsList = document.getElementById('eventsList');
        eventsList.innerHTML = '';

        const lastEvents = events.slice(-10).reverse();

        lastEvents.forEach(event => {
            const time = Math.floor(event.event_time / 60);
            const item = document.createElement('div');
            item.className = 'event-item';

            const iconMap = {
                goal: '⚽',
                shot_on_target: '🎯',
                shot_off_target: '📍',
                card: '🟨',
                foul: '⚠️',
                assist: '🎪'
            };

            item.innerHTML = `
                <span>${iconMap[event.event_type] || '📌'} ${event.event_type}</span>
                <span class="event-time">${time}'</span>
            `;

            eventsList.appendChild(item);
        });
    }

    /**
     * Mettre à jour le statut de sync
     */
    updateSyncStatus() {
        const syncStatus = document.getElementById('syncStatus');
        const status = syncManager.getSyncStatus();

        if (!status.isOnline) {
            syncStatus.textContent = '📡';
            syncStatus.classList.remove('online', 'syncing');
            syncStatus.classList.add('offline');
            syncStatus.title = 'Mode hors ligne';
        } else if (status.isSyncing) {
            syncStatus.textContent = '🔄';
            syncStatus.classList.remove('online', 'offline');
            syncStatus.classList.add('syncing');
            syncStatus.title = 'Synchronisation...';
        } else {
            syncStatus.textContent = '✓';
            syncStatus.classList.remove('offline', 'syncing');
            syncStatus.classList.add('online');
            syncStatus.title = 'Synchronisé';
        }

        setTimeout(() => this.updateSyncStatus(), 1000);
    }

    /**
     * Terminer le match
     */
    async finishMatch() {
        try {
            await dataManager.finishMatch(this.state.matchId);
            syncManager.stopSync();
            showNotification('Match terminé et sauvegardé', 'success');
            setTimeout(() => {
                window.location.href = '../pages/stats.html?matchId=' + this.state.matchId;
            }, 1500);
        } catch (error) {
            console.error('Erreur', error);
        }
    }
}

// ===== INITIALISATION =====
let liveMatch = new LiveMatchInterface();

document.addEventListener('DOMContentLoaded', async function() {
    console.log('🎬 Live Match chargé');
    await liveMatch.init();
});

// ===== FONCTIONS GLOBALES (pour les onclick du HTML) =====

function toggleTimer() {
    liveMatch.toggleTimer();
}

function resetTimer() {
    liveMatch.resetTimer();
}

function toggleHalf() {
    liveMatch.toggleHalf();
}

function openActionModal(actionType) {
    liveMatch.openActionModal(actionType);
}

function closeModal() {
    liveMatch.closeModal();
}

function selectTeam(isTeam) {
    liveMatch.selectTeam(isTeam);
}

function selectCardType(cardType) {
    liveMatch.selectCardType(cardType);
}

function selectShotType(shotType) {
    liveMatch.selectShotType(shotType);
}

function selectPlayer(playerId, buttonElement) {
    liveMatch.selectPlayer(playerId, buttonElement);
}

function confirmAction() {
    liveMatch.confirmAction();
}

function finishMatch() {
    liveMatch.finishMatch();
}

// Raccourcis clavier
document.addEventListener('keydown', (e) => {
    if (e.key === ' ') {
        e.preventDefault();
        toggleTimer();
    }
    if (e.key === 'Escape') {
        closeModal();
    }
});

console.log('✅ Live Match JS chargé');