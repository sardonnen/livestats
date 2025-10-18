// ===== UTILITAIRE DE NETTOYAGE =====
// À exécuter une seule fois pour nettoyer les anciens IDs

/**
 * Générer un UUID valide
 */
function generateUUID() {
    return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, function(c) {
        const r = Math.random() * 16 | 0;
        const v = c === 'x' ? r : (r & 0x3 | 0x8);
        return v.toString(16);
    });
}

/**
 * Nettoyer les joueuses et générer nouveaux UUIDs
 */
function cleanupPlayers() {
    try {
        const players = JSON.parse(localStorage.getItem('players') || '[]');
        
        // Régénérer les IDs
        const cleanedPlayers = players.map(player => ({
            ...player,
            id: generateUUID()  // Nouveau UUID valide
        }));

        localStorage.setItem('players', JSON.stringify(cleanedPlayers));
        console.log('✅ Joueuses nettoyées avec nouveaux UUIDs');
        console.log('Nombre de joueuses:', cleanedPlayers.length);
        
        // Réinitialiser la composition
        localStorage.removeItem('composition');
        localStorage.removeItem('compositionFull');
        console.log('✅ Composition réinitialisée');
        
        return true;
    } catch (error) {
        console.error('❌ Erreur nettoyage:', error);
        return false;
    }
}

/**
 * Exécuter le nettoyage
 */
console.log('🧹 Nettoyage des joueuses...');
if (cleanupPlayers()) {
    console.log('✅ Nettoyage réussi ! Vous pouvez rafraîchir la page.');
} else {
    console.log('❌ Erreur lors du nettoyage');
}