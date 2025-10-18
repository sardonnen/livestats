// ===== INTERFACE SPECTATEUR - spectator.html =====
// Gère l'affichage live pour les spectateurs

class SpectatorInterface {
    constructor() {
        this.state = {
            matchId: null,
            autoRefresh: true,
            lastSync: null,
            isOffline: false
        };
    }

    /**
     * Initialiser l'interface spectateur
     */
    async init() {
        console.log('🎬 Initialisation spectateur');

        // Récupérer l'ID du match depuis l'URL
        const params = new URLSearchParams(window.location.search);
        this.state.matchId = params.get('match');

        if (!this.state.matchId) {
            showNotification('ID de match manquant', 'error');
            setTimeout(() => window.location.href = '../index.html', 2000);
            return;
        }

        // Attendre que Supabase soit prêt
        let attempts = 0;
        while (!isSupabaseReady() && attempts < 20) {
            await new Promise(resolve => setTimeout(resolve, 100));
            attempts++;
        }

        if (!isSupabaseReady()) {
            showNotification('Erreur de connexion', 'error');
            return;
        }

        // Afficher le lien de partage
        document.getElementById('shareLink').textContent = window.location.href;

        // Charger les données
        await this.loadSpectatorData();
        this.startAutoRefresh();

        console.log('✅ Spectateur initialisé');
    }

    /**
     * Charger les données du match
     */
    async loadSpectatorData() {
        try {
            const match = await dataManager.getMatch(this.state.matchId);

            if (!match) {
                showNotification('Match non trouvé', 'error');
                return;
            }

            // Mettre à jour le titre
            document.getElementById('matchTitle').textContent = 
                `${match.team_name} vs ${match.opponent_name}`;

            // Mettre à jour le score board
            document.getElementById('team1Name').textContent = match.team_name;
            document.getElementById('team2Name').textContent = match.opponent_name;
            document.getElementById('team1Score').textContent = match.team_score;
            document.getElementById('team2Score').textContent = match.opponent_score;

            // Charger les événements
            await this.updateEventsList();
            await this.updateStats();

            // Démarrer la synchronisation
            syncManager.startSync(this.state.matchId, 2000);
            syncManager.onSync((syncData) => this.handleSync(syncData));

            showNotification('Match chargé', 'success');

        } catch (error) {
            console.error('❌ Erreur chargement :', error);
            showNotification('Erreur chargement du match', 'error');
        }
    }

    /**
     * Gérer les mises à jour de sync
     */
    handleSync(syncData) {
        if (syncData.match) {
            document.getElementById('team1Score').textContent = syncData.match.team_score;
            document.getElementById('team2Score').textContent = syncData.match.opponent_score;
        }

        if (syncData.events) {
            this.displayEvents(syncData.events);
        }

        if (syncData.playerStats) {
            this.updatePlayerDisplay(syncData.playerStats);
        }

        this.updateSyncStatus(true);
        this.state.lastSync = new Date();
    }

    /**
     * Afficher les événements
     */
    displayEvents(events) {
        const eventsList = document.getElementById('eventsList');
        eventsList.innerHTML = '';

        const iconMap = {
            goal: '⚽',
            shot_on_target: '🎯',
            shot_off_target: '📍',
            card: '🟨',
            foul: '⚠️',
            assist: '🎪',
            substitution: '🔄'
        };

        const lastEvents = events.slice(-20).reverse();

        lastEvents.forEach(event => {
            const minutes = Math.floor(event.event_time / 60);
            const element = document.createElement('div');
            element.className = 'event';

            let eventLabel = event.event_type;
            if (event.event_type === 'card' && event.card_type) {
                const cardIcons = { yellow: '🟨', red: '🟥', white: '⬜' };
                eventLabel += ` ${cardIcons[event.card_type] || ''}`;
            }

            element.innerHTML = `
                <div class="event-icon">${iconMap[event.event_type] || '📌'}</div>
                <div class="event-info">
                    <div class="event-type">${eventLabel}</div>
                    <div class="event-player">${event.is_team ? '✓ Notre équipe' : '- Adversaire'}</div>
                </div>
                <div class="event-time">${minutes}'</div>
            `;

            eventsList.appendChild(element);
        });
    }

    /**
     * Mettre à jour les événements
     */
    async updateEventsList() {
        try {
            const events = await dataManager.getMatchEvents(this.state.matchId);
            this.displayEvents(events);
        } catch (error) {
            console.error('Erreur événements :', error);
        }
    }

    /**
     * Mettre à jour les stats
     */
    async updateStats() {
        try {
            const events = await dataManager.getMatchEvents(this.state.matchId);
            const opponentStats = await dataManager.getOpponentStats(this.state.matchId);

            // Compter les stats de notre équipe
            const shotsOn = events.filter(e => e.event_type === 'shot_on_target' && e.is_team).length;
            const fouls = events.filter(e => e.event_type === 'foul' && e.is_team).length;
            const cards = events.filter(e => e.event_type === 'card' && e.is_team).length;

            document.getElementById('shotsOnTarget1').textContent = shotsOn;
            document.getElementById('fouls1').textContent = fouls;
            document.getElementById('cards1').textContent = cards;

            // Stats adversaire
            if (opponentStats) {
                document.getElementById('shotsOnTarget2').textContent = opponentStats.shots_on_target || 0;
                document.getElementById('fouls2').textContent = opponentStats.fouls || 0;
                document.getElementById('cards2').textContent = 
                    (opponentStats.yellow_cards || 0) + (opponentStats.red_cards || 0);
            }

        } catch (error) {
            console.error('Erreur stats :', error);
        }
    }

    /**
     * Afficher les joueurs
     */
    async updatePlayerDisplay(playerStats) {
        const playersSection = document.getElementById('playersSection');
        const playersList = document.getElementById('playersList');

        if (!playerStats || playerStats.length === 0) {
            playersSection.style.display = 'none';
            return;
        }

        playersSection.style.display = 'block';
        playersList.innerHTML = '';

        playerStats.forEach(stat => {
            const card = document.createElement('div');
            card.className = 'player-card';

            const playerName = stat.players?.name || 'Joueur';
            const goals = stat.goals || 0;
            const assists = stat.assists || 0;

            card.innerHTML = `
                <div class="player-number">${stat.players?.number || '?'}</div>
                <div class="player-name">${playerName}</div>
                <div class="player-stats">${goals}⚽ ${assists}🎪</div>
            `;

            playersList.appendChild(card);
        });
    }

    /**
     * Démarrer l'actualisation auto
     */
    startAutoRefresh() {
        setInterval(() => {
            if (this.state.autoRefresh) {
                this.updateEventsList();
                this.updateStats();
            }
        }, 5000);
    }

    /**
     * Basculer l'actualisation auto
     */
    toggleAutoRefresh() {
        this.state.autoRefresh = !this.state.autoRefresh;
        const btn = document.getElementById('autoRefreshBtn');
        btn.classList.toggle('active', this.state.autoRefresh);
        btn.textContent = this.state.autoRefresh ? '🔄 Auto' : '⏸️ Manuel';
    }

    /**
     * Mettre à jour le statut de sync
     */
    updateSyncStatus(isOnline = true) {
        const indicator = document.getElementById('syncIndicator');
        const text = document.getElementById('syncText');

        if (!isOnline) {
            indicator.classList.add('offline');
            text.textContent = 'Mode hors ligne';
        } else {
            indicator.classList.remove('offline');
            const time = this.state.lastSync 
                ? this.state.lastSync.toLocaleTimeString() 
                : 'À jour';
            text.textContent = `Synchronisé • ${time}`;
        }
    }

    /**
     * Copier le lien de partage
     */
    copyShareLink() {
        const link = document.getElementById('shareLink').textContent;
        navigator.clipboard.writeText(link).then(() => {
            showNotification('Lien copié !', 'success');
        }).catch(() => {
            showNotification('Erreur copie', 'error');
        });
    }
}

// ===== INITIALISATION =====
let spectator = new SpectatorInterface();

document.addEventListener('DOMContentLoaded', async function() {
    console.log('👁️ Spectateur chargé');
    await spectator.init();
});

// ===== FONCTIONS GLOBALES (pour les onclick du HTML) =====

function toggleAutoRefresh() {
    spectator.toggleAutoRefresh();
}

function copyShareLink() {
    spectator.copyShareLink();
}

// Gérer la déconnexion
window.addEventListener('offline', () => {
    spectator.state.isOffline = true;
    spectator.updateSyncStatus(false);
    showNotification('Mode hors ligne', 'warning');
});

window.addEventListener('online', () => {
    spectator.state.isOffline = false;
    spectator.updateSyncStatus(true);
    showNotification('Reconnecté', 'success');
});

console.log('✅ Spectateur JS chargé');