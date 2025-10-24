// ===== LOCAL STORAGE MANAGER =====
// Gestion centralisée du localStorage pour l'application

class StorageManager {
    constructor(prefix = 'footballstats') {
        this.prefix = prefix;
    }

    /**
     * Sauvegarder les données dans localStorage
     */
    save(key, data) {
        try {
            const storageKey = `${this.prefix}_${key}`;
            localStorage.setItem(storageKey, JSON.stringify(data));
            console.log(`✅ Données sauvegardées: ${key}`);
            return true;
        } catch (error) {
            console.error(`❌ Erreur sauvegarde ${key}:`, error);
            return false;
        }
    }

    /**
     * Charger les données depuis localStorage
     */
    load(key, defaultValue = null) {
        try {
            const storageKey = `${this.prefix}_${key}`;
            const data = localStorage.getItem(storageKey);
            return data ? JSON.parse(data) : defaultValue;
        } catch (error) {
            console.error(`❌ Erreur chargement ${key}:`, error);
            return defaultValue;
        }
    }

    /**
     * Supprimer les données du localStorage
     */
    remove(key) {
        try {
            const storageKey = `${this.prefix}_${key}`;
            localStorage.removeItem(storageKey);
            console.log(`✅ Données supprimées: ${key}`);
            return true;
        } catch (error) {
            console.error(`❌ Erreur suppression ${key}:`, error);
            return false;
        }
    }

    /**
     * Vider tout le localStorage de l'app
     */
    clear() {
        try {
            const keys = Object.keys(localStorage);
            keys.forEach(key => {
                if (key.startsWith(this.prefix)) {
                    localStorage.removeItem(key);
                }
            });
            console.log('✅ Storage vidé');
            return true;
        } catch (error) {
            console.error('❌ Erreur vidage storage:', error);
            return false;
        }
    }

    /**
     * Obtenir la taille du storage
     */
    getSize() {
        let total = 0;
        const keys = Object.keys(localStorage);
        keys.forEach(key => {
            if (key.startsWith(this.prefix)) {
                total += localStorage.getItem(key).length;
            }
        });
        return (total / 1024).toFixed(2) + ' KB';
    }
}

// ===== INITIALISATION GLOBALE =====

if (typeof window !== 'undefined') {
    window.storageManager = new StorageManager('footballstats');
    console.log('📦 Module StorageManager chargé');
}