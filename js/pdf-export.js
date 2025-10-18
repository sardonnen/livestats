// ===== MODULE D'EXPORT PDF =====
// Génère des rapports PDF des matchs

class PDFExporter {
    constructor() {
        this.loadPDFLibrary();
    }

    /**
     * Charger la librairie jsPDF
     */
    loadPDFLibrary() {
        if (typeof jsPDF === 'undefined') {
            console.warn('⚠️ jsPDF non chargée. Import manuel nécessaire dans index.html');
        }
    }

    /**
     * Générer un rapport complet du match en PDF
     */
    async generateMatchReport(matchId) {
        try {
            // Récupérer les données
            const match = await dataManager.getMatch(matchId);
            const playerStats = await dataManager.getAllPlayerStats(matchId);
            const opponentStats = await dataManager.getOpponentStats(matchId);
            const events = await dataManager.getMatchEvents(matchId);

            if (!match) {
                showNotification('Match non trouvé', 'error');
                return;
            }

            // Créer le document PDF
            const doc = new jsPDF();
            let yPosition = 20;

            // En-tête
            doc.setFontSize(24);
            doc.text('Rapport de Match', 20, yPosition);
            yPosition += 15;

            // Informations du match
            doc.setFontSize(12);
            doc.text(`${match.team_name} vs ${match.opponent_name}`, 20, yPosition);
            yPosition += 8;

            doc.setFontSize(10);
            doc.text(`Score: ${match.team_score} - ${match.opponent_score}`, 20, yPosition);
            yPosition += 6;

            doc.text(`Date: ${new Date(match.match_date).toLocaleDateString('fr-FR')}`, 20, yPosition);
            yPosition += 6;

            if (match.venue) {
                doc.text(`Lieu: ${match.venue}`, 20, yPosition);
                yPosition += 6;
            }

            yPosition += 5;

            // Section des statistiques d'équipe
            if (opponentStats) {
                doc.setFontSize(14);
                doc.text('Statistiques d\'équipe', 20, yPosition);
                yPosition += 8;

                doc.setFontSize(10);
                const teamStatsData = [
                    ['Métrique', 'Notre équipe', 'Équipe adverse'],
                    ['Buts', match.team_score.toString(), match.opponent_score.toString()],
                    ['Tirs cadrés', this.countEventsByType(events, 'shot_on_target', true).toString(), (opponentStats.shots_on_target || 0).toString()],
                    ['Tirs non cadrés', this.countEventsByType(events, 'shot_off_target', true).toString(), (opponentStats.shots_off_target || 0).toString()],
                    ['Fautes', this.countEventsByType(events, 'foul', true).toString(), (opponentStats.fouls || 0).toString()],
                    ['Cartons jaunes', this.countEventsByType(events, 'card', true, 'yellow').toString(), (opponentStats.yellow_cards || 0).toString()],
                    ['Cartons rouges', this.countEventsByType(events, 'card', true, 'red').toString(), (opponentStats.red_cards || 0).toString()]
                ];

                doc.autoTable({
                    head: teamStatsData.slice(0, 1),
                    body: teamStatsData.slice(1),
                    startY: yPosition,
                    margin: { left: 20, right: 20 },
                    styles: {
                        fontSize: 10,
                        cellPadding: 4
                    },
                    headStyles: {
                        fillColor: [52, 152, 219],
                        textColor: 255,
                        fontStyle: 'bold'
                    },
                    alternateRowStyles: {
                        fillColor: [240, 240, 240]
                    }
                });

                yPosition = doc.lastAutoTable.finalY + 10;
            }

            // Vérifier s'il y a assez de place pour les stats joueurs
            if (yPosition > 250) {
                doc.addPage();
                yPosition = 20;
            }

            // Section des statistiques joueur
            doc.setFontSize(14);
            doc.text('Statistiques Individuelles', 20, yPosition);
            yPosition += 8;

            // Préparer les données des joueurs
            const playerStatsData = [
                ['Joueuse', 'Buts', 'Passes décisives', 'Tirs cadrés', 'Cartons', 'Temps (min)']
            ];

            playerStats.forEach(stat => {
                const playerName = stat.players?.name || 'Joueur inconnu';
                playerStatsData.push([
                    playerName,
                    stat.goals.toString(),
                    stat.assists.toString(),
                    stat.shots_on_target.toString(),
                    `${stat.yellow_cards}J ${stat.red_cards}R`,
                    stat.play_time_minutes.toString()
                ]);
            });

            doc.setFontSize(10);
            doc.autoTable({
                head: playerStatsData.slice(0, 1),
                body: playerStatsData.slice(1),
                startY: yPosition,
                margin: { left: 20, right: 20 },
                styles: {
                    fontSize: 9,
                    cellPadding: 3
                },
                headStyles: {
                    fillColor: [52, 152, 219],
                    textColor: 255,
                    fontStyle: 'bold'
                },
                alternateRowStyles: {
                    fillColor: [240, 240, 240]
                },
                columnStyles: {
                    0: { cellWidth: 50 },
                    1: { halign: 'center' },
                    2: { halign: 'center' },
                    3: { halign: 'center' },
                    4: { halign: 'center' },
                    5: { halign: 'center' }
                }
            });

            // Sauvegarder
            const fileName = `match_${match.team_name}_vs_${match.opponent_name}_${new Date().toISOString().split('T')[0]}.pdf`;
            doc.save(fileName);

            showNotification('PDF généré avec succès', 'success');
            console.log('✅ PDF généré :', fileName);

        } catch (error) {
            console.error('❌ Erreur génération PDF :', error);
            showNotification('Erreur lors de la génération du PDF', 'error');
        }
    }

    /**
     * Compter les événements par type
     */
    countEventsByType(events, eventType, isTeam = null, subType = null) {
        return events.filter(event => {
            const typeMatch = event.event_type === eventType;
            const teamMatch = isTeam === null || event.is_team === isTeam;
            const subTypeMatch = subType === null || event.card_type === subType;
            return typeMatch && teamMatch && subTypeMatch;
        }).length;
    }

    /**
     * Générer un rapport comparatif sur plusieurs matchs
     */
    async generateSeasonReport(teamId, limit = 10) {
        try {
            const matches = await dataManager.getMatchHistory(teamId, limit);

            if (matches.length === 0) {
                showNotification('Aucun match à exporter', 'warning');
                return;
            }

            const doc = new jsPDF();
            let yPosition = 20;

            // En-tête
            doc.setFontSize(20);
            doc.text('Rapport de Saison', 20, yPosition);
            yPosition += 15;

            // Statistiques globales
            doc.setFontSize(12);

            const totalGoals = matches.reduce((sum, m) => sum + m.team_score, 0);
            const totalAgainstGoals = matches.reduce((sum, m) => sum + m.opponent_score, 0);
            const wins = matches.filter(m => m.team_score > m.opponent_score).length;
            const draws = matches.filter(m => m.team_score === m.opponent_score).length;
            const losses = matches.filter(m => m.team_score < m.opponent_score).length;

            doc.text(`Nombre de matchs: ${matches.length}`, 20, yPosition);
            yPosition += 7;
            doc.text(`Victoires: ${wins} | Nuls: ${draws} | Défaites: ${losses}`, 20, yPosition);
            yPosition += 7;
            doc.text(`Buts marqués: ${totalGoals} | Buts encaissés: ${totalAgainstGoals}`, 20, yPosition);
            yPosition += 10;

            // Tableau des matchs
            const matchesData = [
                ['Date', 'Adversaire', 'Résultat', 'Lieu']
            ];

            matches.forEach(match => {
                const date = new Date(match.match_date).toLocaleDateString('fr-FR');
                const result = `${match.team_score}-${match.opponent_score}`;
                matchesData.push([
                    date,
                    match.opponent_name,
                    result,
                    match.venue || '-'
                ]);
            });

            doc.setFontSize(10);
            doc.autoTable({
                head: matchesData.slice(0, 1),
                body: matchesData.slice(1),
                startY: yPosition,
                margin: { left: 20, right: 20 },
                styles: {
                    fontSize: 9,
                    cellPadding: 3
                },
                headStyles: {
                    fillColor: [52, 152, 219],
                    textColor: 255,
                    fontStyle: 'bold'
                },
                alternateRowStyles: {
                    fillColor: [240, 240, 240]
                }
            });

            // Sauvegarder
            const fileName = `rapport_saison_${new Date().toISOString().split('T')[0]}.pdf`;
            doc.save(fileName);

            showNotification('Rapport de saison généré', 'success');

        } catch (error) {
            console.error('❌ Erreur génération rapport :', error);
            showNotification('Erreur lors de la génération du rapport', 'error');
        }
    }
}

// Créer l'instance globale
const pdfExporter = new PDFExporter();

console.log('📦 Module PDFExporter chargé');