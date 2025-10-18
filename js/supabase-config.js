// ===== CONFIGURATION SUPABASE =====
// À adapter avec vos identifiants Supabase

// REMPLACEZ CES VALEURS PAR VOS CREDENTIALS SUPABASE
const SUPABASE_URL = 'https://owndxnyutzshavtyajjw.supabase.co';
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im93bmR4bnl1dHpzaGF2dHlhamp3Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjA3MzM5MzYsImV4cCI6MjA3NjMwOTkzNn0.nJ5fgpsjctFYigiY1Z7PF59M0A7EaJGPDXro9XWRNf4';

// ===== INITIALISATION SUPABASE =====

class SupabaseManager {
    constructor() {
        this.initialized = false;
        this.error = null;
        this.initSupabase();
    }

    initSupabase() {
        // Vérifier que les credentials sont définis
        if (SUPABASE_URL === 'https://YOUR_PROJECT.supabase.co' || 
            SUPABASE_ANON_KEY === 'YOUR_ANON_KEY') {
            console.warn('⚠️ Supabase credentials non configurés !');
            console.warn('Remplacez SUPABASE_URL et SUPABASE_ANON_KEY dans supabase-config.js');
            this.error = 'Supabase non configuré';
            return false;
        }

        try {
            // Initialiser le sync manager
            window.initSupabaseSync(SUPABASE_URL, SUPABASE_ANON_KEY);
            
            if (window.supabaseSync && window.supabaseSync.isReady()) {
                this.initialized = true;
                console.log('✅ Supabase configuré et prêt');
                this.setupAutoSync();
                return true;
            } else {
                this.error = 'Client Supabase non prêt';
                console.error('❌ Client Supabase non prêt');
                return false;
            }
        } catch (error) {
            this.error = error.message;
            console.error('❌ Erreur initialisation Supabase:', error);
            return false;
        }
    }

    isReady() {
        return this.initialized && window.supabaseSync && window.supabaseSync.isReady();
    }

    setupAutoSync() {
        // Synchronisation automatique toutes les 30 secondes si changements
        if (window.teamManager) {
            window.teamManager.enableAutoSync(30000);
        }

        // Sync au changement de connexion
        window.addEventListener('online', () => {
            console.log('✅ Connexion internet rétablie');
            if (this.isReady() && window.teamManager) {
                window.teamManager.syncWithSupabase().then(success => {
                    if (success) {
                        console.log('✅ Synchronisation complète');
                    }
                });
            }
        });

        window.addEventListener('offline', () => {
            console.log('⚠️ Mode hors ligne - Les changements seront synchronisés à la reconnexion');
        });
    }

    /**
     * Télécharger toutes les données de Supabase (fusion locale)
     */
    async downloadAllData() {
        if (!this.isReady()) {
            console.warn('⚠️ Supabase non prêt');
            return false;
        }

        try {
            console.log('📥 Téléchargement des données depuis Supabase...');
            const remoteTeams = await window.supabaseSync.downloadTeams();
            
            if (remoteTeams && Array.isArray(remoteTeams)) {
                // Fusionner avec les données locales
                if (window.teamManager) {
                    window.teamManager.mergeRemoteTeams(remoteTeams);
                    console.log('✅ Données fusionnées:', remoteTeams.length, 'équipes');
                }
                return true;
            }
            return false;
        } catch (error) {
            console.error('❌ Erreur téléchargement données:', error);
            return false;
        }
    }

    /**
     * Synchroniser les données locales vers Supabase
     */
    async uploadAllData() {
        if (!this.isReady()) {
            console.warn('⚠️ Supabase non prêt');
            return false;
        }

        try {
            if (window.teamManager) {
                console.log('📤 Envoi des données vers Supabase...');
                const success = await window.teamManager.syncWithSupabase();
                if (success) {
                    console.log('✅ Synchronisation complète');
                }
                return success;
            }
        } catch (error) {
            console.error('❌ Erreur upload données:', error);
            return false;
        }
    }
}

// ===== INITIALISATION GLOBALE =====

if (typeof window !== 'undefined') {
    window.supabaseManager = new SupabaseManager();
    console.log('📦 Module SupabaseManager chargé');
}