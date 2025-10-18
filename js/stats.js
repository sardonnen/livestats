// ===== GESTION DES STATISTIQUES - stats.html =====

class StatsManager {
    constructor() {
        this.currentMatch = null;
        this.matches = [];
        this.init();
    }

    /**
     * Initialiser
     */
    async init() {
        console.log('🚀 Initialisation Stats Manager');

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

        await this.loadMatches();
    }

    /**
     * Charger les matchs
     */
    async loadMatches() {
        try {
            const teamName = this.getTeamName();
            if (!teamName) {
                this.showEmpty();
                return;
            }

            const team = await dataManager.ensureTeam(teamName);
            if (!team) {
                this.showEmpty();
                return;
            }

            this.matches = await dataManager.getMatchHistory(team.id, 50);

            if (this.matches.length === 0) {
                this.showEmpty();
                return;
            }

            // Remplir le sélecteur
            this.populateMatchSelector();
            
            // Charger le premier match
            if (this.matches.length > 0) {
                this.currentMatch = this.matches[0];
                await this.displayMatch(this.currentMatch);
            }

        } catch (error) {
            console.error('Erreur chargement matchs :', error);
            this.showEmpty();
        }
    }

    /**
     * Obtenir le nom de l'équipe
     */
    getTeamName() {
        try {
            const config = localStorage.getItem('matchConfig');
            if (config) {
                const parsed = JSON.parse(config);
                return parsed.teamName;
            }
        } catch (error) {
            console.error('Erreur lecture config :', error);
        }
        return null;
    }

    /**
     * Remplir le sélecteur de matchs
     */
    populateMatchSelector() {
        const selector = document.getElementById('matchSelector');
        selector.innerHTML = '<option value="">-- Sélectionner un match --</option>';

        this.matches.forEach((match, index) => {
            const date = new Date(match.match_date).toLocaleDateString('fr-FR');
            const result = `${match.team_score}-${match.opponent_score}`;
            const option = document.createElement('option');
            option.value = index;
            option.textContent = `${date} : ${match.team_name} ${result} ${match.opponent_name}`;
            selector.appendChild(option);
        });
    }

    /**
     * Charger un match sélectionné
     */
    async loadMatch() {
        const selector = document.getElementById('matchSelector');
        const index = selector.value;

        if (index === '') {
            document.getElementById('matchSummaryCard').style.display = 'none';
            document.getElementById('comparisonCard').style.display = 'none';
            document.getElementById('playerStatsCard').style.display = 'none';
            document.getElementById('eventsCard').style.display = 'none';
            document.getElementById('actionsCard').style.display = 'none';
            return;
        }

        this.currentMatch = this.matches[index];
        await this.displayMatch(this.currentMatch);
    }

    /**
     * Afficher les détails d'un match
     */
    async displayMatch(match) {
        try {
            // Afficher le résumé
            document.getElementById('team1Name').textContent = match.team_name;
            document.getElementById('team2Name').textContent = match.opponent_name;
            document.getElementById('score1').textContent = match.team_score;
            document.getElementById('score2').textContent = match.opponent_score;
            document.getElementById('matchDateInfo').textContent = new Date(match.match_date).toLocaleDateString('fr-FR');
            document.getElementById('matchStatus').textContent = match.status === 'finished' ? '✅ Terminé' : '⏳ En cours';

            // Meta infos
            const metaHTML = `
                <div class="stat-row">
                    <span class="stat-label">📍 Lieu</span>
                    <span class="stat-number">${match.venue || '-'}</span>
                </div>
                <div class="stat-row">
                    <span class="stat-label">⏱️ Durée</span>
                    <span class="stat-number">${match.duration || 90}\'</span>
                </div>
            `;
            document.getElementById('matchMetaInfo').innerHTML = metaHTML;

            // Charger les événements
            const events = await dataManager.getMatchEvents(match.id);
            
            // Charger les stats des joueurs
            const playerStats = await dataManager.getAllPlayerStats(match.id);
            
            // Charger les stats adversaire
            const opponentStats = await dataManager.getOpponentStats(match.id);

            // Afficher les stats
            this.displayComparison(events, opponentStats);
            this.displayPlayerStats(playerStats);
            this.displayEvents(events);

            // Afficher les cards
            document.getElementById('matchSummaryCard').style.display = 'block';
            document.getElementById('comparisonCard').style.display = 'block';
            if (playerStats.length > 0) {
                document.getElementById('playerStatsCard').style.display = 'block';
            }
            document.getElementById('eventsCard').style.display = 'block';
            document.getElementById('actionsCard').style.display = 'block';

        } catch (error) {
            console.error('Erreur affichage match :', error);
            showNotification('Erreur chargement statistiques', 'error');
        }
    }

    /**
     * Afficher la comparaison équipes
     */
    displayComparison(events, opponentStats) {
        // Notre équipe
        const shotsOn = events.filter(e => e.event_type === 'shot_on_target' && e.is_team).length;
        const shotsOff = events.filter(e => e.event_type === 'shot_off_target' && e.is_team).length;
        const fouls = events.filter(e => e.event_type === 'foul' && e.is_team).length;
        const yellowCards = events.filter(e => e.event_type === 'card' && e.is_team && e.card_type === 'yellow').length;
        const redCards = events.filter(e => e.event_type === 'card' && e.is_team && e.card_type === 'red').length;

        const team1StatsHTML = `
            <div class="stat-row">
                <span class="stat-label">⚽ Buts</span>
                <span class="stat-number">${this.currentMatch.team_score}</span>
            </div>
            <div class="stat-row">
                <span class="stat-label">🎯 Tirs cadrés</span>
                <span class="stat-number">${shotsOn}</span>
            </div>
            <div class="stat-row">
                <span class="stat-label">📍 Tirs non cadrés</span>
                <span class="stat-number">${shotsOff}</span>
            </div>
            <div class="stat-row">
                <span class="stat-label">⚠️ Fautes</span>
                <span class="stat-number">${fouls}</span>
            </div>
            <div class="stat-row">
                <span class="stat-label">🟨 Cartons jaunes</span>
                <span class="stat-number">${yellowCards}</span>
            </div>
            <div class="stat-row">
                <span class="stat-label">🟥 Cartons rouges</span>
                <span class="stat-number">${redCards}</span>
            </div>
        `;

        document.getElementById('team1Stats').innerHTML = team1StatsHTML;

        // Équipe adverse
        const team2StatsHTML = `
            <div class="stat-row">
                <span class="stat-label">⚽ Buts</span>
                <span class="stat-number">${this.currentMatch.opponent_score}</span>
            </div>
            <div class="stat-row">
                <span class="stat-label">🎯 Tirs cadrés</span>
                <span class="stat-number">${opponentStats?.shots_on_target || 0}</span>
            </div>
            <div class="stat-row">
                <span class="stat-label">📍 Tirs non cadrés</span>
                <span class="stat-number">${opponentStats?.shots_off_target || 0}</span>
            </div>
            <div class="stat-row">
                <span class="stat-label">⚠️ Fautes</span>
                <span class="stat-number">${opponentStats?.fouls || 0}</span>
            </div>
            <div class="stat-row">
                <span class="stat-label">🟨 Cartons jaunes</span>
                <span class="stat-number">${opponentStats?.yellow_cards || 0}</span>
            </div>
            <div class="stat-row">
                <span class="stat-label">🟥 Cartons rouges</span>
                <span class="stat-number">${opponentStats?.red_cards || 0}</span>
            </div>
        `;

        document.getElementById('team2Stats').innerHTML = team2StatsHTML;
    }

    /**
     * Afficher les stats individuelles
     */
    displayPlayerStats(playerStats) {
        const container = document.getElementById('playerStatsTable');

        if (playerStats.length === 0) {
            container.innerHTML = '<p style="text-align: center;">Aucune donnée de joueur</p>';
            return;
        }

        let html = `
            <table style="width: 100%; border-collapse: collapse;">
                <thead>
                    <tr style="border-bottom: 2px solid rgba(255,255,255,0.2);">
                        <th style="padding: 10px; text-align: left;">Joueuse</th>
                        <th style="padding: 10px; text-align: center;">⚽ Buts</th>
                        <th style="padding: 10px; text-align: center;">🎪 Passes</th>
                        <th style="padding: 10px; text-align: center;">🎯 Tirs</th>
                        <th style="padding: 10px; text-align: center;">🟨 Cartons</th>
                        <th style="padding: 10px; text-align: center;">⏱️ Temps</th>
                    </tr>
                </thead>
                <tbody>
        `;

        playerStats.forEach(stat => {
            const playerName = stat.players?.name || 'Joueur';
            const number = stat.players?.number ? `#${stat.players.number}` : '';
            const tirs = (stat.shots_on_target || 0) + (stat.shots_off_target || 0);
            const cartons = `${stat.yellow_cards || 0}J ${stat.red_cards || 0}R`;

            html += `
                <tr style="border-bottom: 1px solid rgba(255,255,255,0.1);">
                    <td style="padding: 10px;">${playerName} ${number}</td>
                    <td style="padding: 10px; text-align: center;">${stat.goals || 0}</td>
                    <td style="padding: 10px; text-align: center;">${stat.assists || 0}</td>
                    <td style="padding: 10px; text-align: center;">${tirs}</td>
                    <td style="padding: 10px; text-align: center;">${cartons}</td>
                    <td style="padding: 10px; text-align: center;">${stat.play_time_minutes || 0}'</td>
                </tr>
            `;
        });

        html += `
                </tbody>
            </table>
        `;

        container.innerHTML = html;
    }

    /**
     * Afficher les événements
     */
    displayEvents(events) {
        const container = document.getElementById('eventsList');

        if (events.length === 0) {
            container.innerHTML = '<p style="text-align: center;">Aucun événement</p>';
            return;
        }

        const iconMap = {
            goal: '⚽',
            shot_on_target: '🎯',
            shot_off_target: '📍',
            card: '🟨',
            foul: '⚠️',
            assist: '🎪'
        };

        container.innerHTML = '';

        events.forEach(event => {
            const minutes = Math.floor(event.event_time / 60);
            const team = event.is_team ? this.currentMatch.team_name : this.currentMatch.opponent_name;
            const item = document.createElement('div');
            item.className = 'event-item';
            item.innerHTML = `
                <span>${iconMap[event.event_type] || '📌'} ${event.event_type}</span>
                <span style="opacity: 0.7;">${team}</span>
                <span class="event-time">${minutes}'</span>
            `;
            container.appendChild(item);
        });
    }

    /**
     * Exporter en PDF
     */
    async exportPDF() {
        if (!this.currentMatch) {
            showNotification('Sélectionnez un match d\'abord', 'warning');
            return;
        }

        showNotification('Génération PDF...', 'info');
        await pdfExporter.generateMatchReport(this.currentMatch.id);
    }

    /**
     * Exporter en CSV
     */
    exportCSV() {
        if (!this.currentMatch) {
            showNotification('Sélectionnez un match d\'abord', 'warning');
            return;
        }

        const csv = `Match: ${this.currentMatch.team_name} vs ${this.currentMatch.opponent_name}\nScore: ${this.currentMatch.team_score}-${this.currentMatch.opponent_score}\nDate: ${new Date(this.currentMatch.match_date).toLocaleDateString('fr-FR')}\n`;

        const blob = new Blob([csv], { type: 'text/csv' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `match_${this.currentMatch.team_name}_${new Date().toISOString().split('T')[0]}.csv`;
        a.click();

        showNotification('CSV exporté', 'success');
    }

    /**
     * Afficher le message vide
     */
    showEmpty() {
        document.getElementById('emptyMessage').style.display = 'block';
        document.getElementById('matchSummaryCard').style.display = 'none';
        document.getElementById('comparisonCard').style.display = 'none';
        document.getElementById('playerStatsCard').style.display = 'none';
        document.getElementById('eventsCard').style.display = 'none';
        document.getElementById('actionsCard').style.display = 'none';
    }
}

// ===== INITIALISATION =====
let statsManager = new StatsManager();

console.log('✅ Stats Manager chargé');