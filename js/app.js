// ===== APPLICATION PRINCIPALE - INDEX.HTML =====
// Gère l'accueil et l'initialisation de l'application

class FootballStatsApp {
    constructor() {
        this.isInitialized = false;
    }

    /**
     * Initialiser l'application
     */
    async init() {
        console.log('🚀 Initialisation Football Stats App');

        // Attendre que Supabase soit prêt
        let attempts = 0;
        while (!isSupabaseReady() && attempts < 20) {
            await new Promise(resolve => setTimeout(resolve, 100));
            attempts++;
        }

        if (isSupabaseReady()) {
            this.updateDatabaseStatus();
            document.getElementById('dbStatus').textContent = '✅';
        } else {
            document.getElementById('dbStatus').textContent = '❌';
            showNotification('Vérifiez votre configuration Supabase', 'error');
            return;
        }

        // Charger les données depuis localStorage
        this.loadSavedConfig();

        this.isInitialized = true;
        console.log('✅ Application initialisée');
    }

    /**
     * Mettre à jour le statut de la base de données
     */
    async updateDatabaseStatus() {
        try {
            // Compter les matchs
            const { count: matchCount } = await supabaseClient
                .from('matches')
                .select('*', { count: 'exact', head: true });

            // Compter les joueuses
            const { count: playerCount } = await supabaseClient
                .from('players')
                .select('*', { count: 'exact', head: true });

            document.getElementById('matchCount').textContent = matchCount || 0;
            document.getElementById('playerCount').textContent = playerCount || 0;

        } catch (error) {
            console.error('Erreur récupération stats :', error);
        }
    }

    /**
     * Charger la configuration sauvegardée
     */
    loadSavedConfig() {
        const saved = localStorage.getItem('matchConfig');
        if (saved) {
            try {
                const config = JSON.parse(saved);
                document.getElementById('teamName').value = config.teamName || '';
                document.getElementById('opponentName').value = config.opponentName || '';
                document.getElementById('venue').value = config.venue || '';
                
                if (config.matchDate) {
                    document.getElementById('matchDate').value = config.matchDate;
                }
            } catch (error) {
                console.warn('Erreur chargement config :', error);
            }
        }
    }

    /**
     * Démarrer un nouveau match
     */
    async startNewMatch() {
        try {
            const teamName = document.getElementById('teamName').value.trim();
            const opponentName = document.getElementById('opponentName').value.trim();
            const venue = document.getElementById('venue').value.trim();
            const matchDate = document.getElementById('matchDate').value;

            if (!teamName || !opponentName) {
                showNotification('Veuillez saisir les deux équipes', 'warning');
                return;
            }

            showNotification('Démarrage du match...', 'info');

            // Sauvegarder la config
            localStorage.setItem('matchConfig', JSON.stringify({
                teamName,
                opponentName,
                venue,
                matchDate: matchDate || new Date().toISOString()
            }));

            // Créer l'équipe
            const team = await dataManager.ensureTeam(teamName);
            if (!team) {
                showNotification('Erreur création équipe', 'error');
                return;
            }

            // Charger les joueuses
            const playersData = localStorage.getItem('players');
            const players = playersData ? JSON.parse(playersData) : [];

            if (players.length === 0) {
                showNotification('Aucune joueuse trouvée. Allez dans "Équipe" d\'abord.', 'warning');
                return;
            }

            // Créer le match
            const match = await dataManager.createMatch(
                team.id,
                teamName,
                opponentName,
                venue,
                90
            );

            if (!match) {
                showNotification('Erreur création match', 'error');
                return;
            }

            // Sauvegarder les données du match
            localStorage.setItem('currentMatch', JSON.stringify({
                id: match.id,
                teamId: team.id,
                teamName,
                opponentName,
                venue,
                players
            }));

            showNotification('Match démarré ! Redirection...', 'success');

            // Rediriger
            setTimeout(() => {
                window.location.href = 'pages/live-match.html';
            }, 1000);

        } catch (error) {
            console.error('❌ Erreur :', error);
            showNotification('Erreur démarrage match', 'error');
        }
    }

    /**
     * Afficher l'historique des matchs
     */
    async viewRecentMatches() {
        try {
            // Rediriger vers stats
            window.location.href = 'pages/stats.html?view=history';
        } catch (error) {
            showNotification('Erreur historique', 'error');
        }
    }

    /**
     * Générer un rapport de saison
     */
    async generateSeasonReport() {
        try {
            const teamData = localStorage.getItem('matchConfig');
            if (!teamData) {
                showNotification('Aucun match enregistré', 'warning');
                return;
            }

            const config = JSON.parse(teamData);
            const team = await dataManager.ensureTeam(config.teamName);
            if (!team) {
                showNotification('Erreur', 'error');
                return;
            }

            showNotification('Génération du rapport...', 'info');
            await pdfExporter.generateSeasonReport(team.id);

        } catch (error) {
            console.error('❌ Erreur rapport :', error);
            showNotification('Erreur génération rapport', 'error');
        }
    }
}

// ===== INITIALISATION AU CHARGEMENT =====
let app = new FootballStatsApp();

document.addEventListener('DOMContentLoaded', async function() {
    console.log('📄 Index.html chargé');
    await app.init();
});