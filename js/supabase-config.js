// ===== CONFIGURATION SUPABASE =====
// Cette file doit être chargée en premier dans votre HTML

// ⚠️ REMPLACEZ CES VALEURS PAR VOS CLÉS SUPABASE
const SUPABASE_CONFIG = {
    URL: 'https://owndxnyutzshavtyajjw.supabase.co',
    ANON_KEY: 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im93bmR4bnl1dHpzaGF2dHlhamp3Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjA3MzM5MzYsImV4cCI6MjA3NjMwOTkzNn0.nJ5fgpsjctFYigiY1Z7PF59M0A7EaJGPDXro9XWRNf4'
};

// Importer la librairie Supabase
let supabaseClient = null;

// Initialiser le client Supabase
async function initializeSupabase() {
    try {
        // Attendre que la librairie soit chargée
        if (typeof supabase === 'undefined') {
            console.error('❌ Librairie Supabase non chargée. Vérifiez le <script> dans index.html');
            return false;
        }

        // Créer le client
        supabaseClient = supabase.createClient(
            SUPABASE_CONFIG.URL,
            SUPABASE_CONFIG.ANON_KEY
        );

        console.log('✅ Client Supabase initialisé');

        // Tester la connexion
        const { data, error } = await supabaseClient
            .from('teams')
            .select('count', { count: 'exact', head: true });

        if (error) {
            console.warn('⚠️ Impossible de se connecter à Supabase :', error.message);
            console.warn('Vérifiez vos clés d\'accès dans SUPABASE_CONFIG');
            return false;
        }

        console.log('✅ Connexion à Supabase vérifiée');
        return true;

    } catch (error) {
        console.error('❌ Erreur initialisation Supabase :', error);
        return false;
    }
}

// Fonction utilitaire pour vérifier si connecté
function isSupabaseReady() {
    return supabaseClient !== null;
}

// Initialiser au chargement du DOM
document.addEventListener('DOMContentLoaded', initializeSupabase);

console.log('📦 Module Supabase Config chargé');