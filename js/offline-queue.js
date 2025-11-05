// ===== OFFLINE QUEUE - USE CASE 3 =====
// Gestion des opérations en attente lorsque l'application est hors ligne
// PRINCIPE: FIFO (First In First Out) avec rejeu automatique à la reconnexion

class OfflineQueue {
    constructor() {
        this.queue = [];
        this.processing = false;
        this.maxRetries = 3;
        this.retryDelay = 2000; // 2 secondes entre chaque retry
        
        // Charger la queue depuis localStorage au démarrage
        this.loadQueue();
        
        console.log('📦 OfflineQueue initialisé');
    }

    // ===== GESTION QUEUE =====

    /**
     * Ajouter une opération à la queue
     */
    addOperation(operation) {
        const queueItem = {
            id: this.generateId(),
            ...operation,
            addedAt: Date.now(),
            retries: 0,
            status: 'pending'
        };

        this.queue.push(queueItem);
        this.saveQueue();
        
        console.log(`📝 Opération ajoutée à la queue:`, queueItem.id);
        console.log(`📊 Queue size: ${this.queue.length}`);
        
        return queueItem.id;
    }

    /**
     * Retirer une opération de la queue
     */
    removeOperation(operationId) {
        const index = this.queue.findIndex(op => op.id === operationId);
        if (index !== -1) {
            this.queue.splice(index, 1);
            this.saveQueue();
            console.log(`✅ Opération retirée de la queue:`, operationId);
            return true;
        }
        return false;
    }

    /**
     * Obtenir toutes les opérations en attente
     */
    getQueue() {
        return this.queue.filter(op => op.status === 'pending');
    }

    /**
     * Obtenir la taille de la queue
     */
    getQueueSize() {
        return this.queue.filter(op => op.status === 'pending').length;
    }

    /**
     * Vider complètement la queue
     */
    clearQueue() {
        this.queue = [];
        this.saveQueue();
        console.log('🗑️ Queue vidée');
    }

    // ===== TRAITEMENT QUEUE =====

    /**
     * Traiter la queue (rejeu des opérations)
     * Appelé automatiquement lors de la reconnexion
     */
    async processQueue() {
        if (this.processing) {
            console.log('⏳ Traitement déjà en cours...');
            return;
        }

        if (!navigator.onLine) {
            console.log('📴 Hors ligne - traitement impossible');
            return;
        }

        const pendingOps = this.getQueue();
        if (pendingOps.length === 0) {
            console.log('✅ Queue vide - rien à traiter');
            return;
        }

        console.log(`🔄 Traitement de ${pendingOps.length} opération(s)...`);
        this.processing = true;

        // Traiter les opérations une par une (FIFO)
        for (const operation of pendingOps) {
            await this.processOperation(operation);
        }

        this.processing = false;
        console.log('✅ Traitement de la queue terminé');
        
        // Notifier l'utilisateur
        if (window.showNotification) {
            window.showNotification(
                `${pendingOps.length} opération(s) synchronisée(s)`,
                'success'
            );
        }
    }

    /**
     * Traiter une opération individuelle
     */
    async processOperation(operation) {
        console.log(`🔄 Traitement de l'opération:`, operation.id);

        try {
            // Mettre à jour le statut
            operation.status = 'processing';
            this.saveQueue();

            // Exécuter l'opération selon son type
            let success = false;

            switch (operation.type) {
                case 'write':
                    success = await this.executeWrite(operation);
                    break;
                case 'delete':
                    success = await this.executeDelete(operation);
                    break;
                case 'update':
                    success = await this.executeUpdate(operation);
                    break;
                default:
                    console.warn(`⚠️ Type d'opération inconnu: ${operation.type}`);
                    success = false;
            }

            if (success) {
                // Supprimer de la queue si succès
                this.removeOperation(operation.id);
                console.log(`✅ Opération traitée avec succès:`, operation.id);
            } else {
                // Réessayer si échec
                await this.retryOperation(operation);
            }

        } catch (error) {
            console.error(`❌ Erreur traitement opération:`, operation.id, error);
            await this.retryOperation(operation);
        }
    }

    /**
     * Réessayer une opération échouée
     */
    async retryOperation(operation) {
        operation.retries++;
        
        if (operation.retries >= this.maxRetries) {
            console.error(`❌ Opération échouée après ${this.maxRetries} tentatives:`, operation.id);
            operation.status = 'failed';
            this.saveQueue();
            
            // Notifier l'utilisateur
            if (window.showNotification) {
                window.showNotification(
                    `Échec de synchronisation d'une opération`,
                    'error'
                );
            }
            return;
        }

        console.log(`🔄 Tentative ${operation.retries}/${this.maxRetries} pour:`, operation.id);
        operation.status = 'pending';
        this.saveQueue();

        // Attendre avant de réessayer
        await this.delay(this.retryDelay);
    }

    // ===== EXÉCUTION DES OPÉRATIONS =====

    /**
     * Exécuter une opération d'écriture
     */
    async executeWrite(operation) {
        if (!window.supabaseSync || !window.supabaseSync.isReady()) {
            console.warn('⚠️ Supabase non disponible');
            return false;
        }

        try {
            // Reconstruire l'opération à partir des données
            const { data } = operation;
            
            // Déterminer la table et l'action
            if (data.event_type) {
                // C'est un événement
                const result = await window.supabaseSync.recordEventRemote(data);
                return !!result;
            } else if (data.match_id && data.player_id) {
                // C'est une stat de joueur
                const result = await window.supabaseSync.updatePlayerStatsRemote(data);
                return !!result;
            } else if (data.opponent_name) {
                // C'est un match
                const result = await window.supabaseSync.createMatchRemote(data);
                return !!result;
            }
            
            console.warn('⚠️ Type de données non reconnu pour écriture');
            return false;

        } catch (error) {
            console.error('❌ Erreur executeWrite:', error);
            return false;
        }
    }

    /**
     * Exécuter une opération de suppression
     */
    async executeDelete(operation) {
        if (!window.supabaseSync || !window.supabaseSync.isReady()) {
            console.warn('⚠️ Supabase non disponible');
            return false;
        }

        try {
            const { data } = operation;
            
            // Déterminer ce qui doit être supprimé
            if (data.eventId) {
                const { error } = await window.supabaseSync.client
                    .from('match_events')
                    .delete()
                    .eq('id', data.eventId);
                return !error;
            } else if (data.playerId) {
                return await window.supabaseSync.removePlayerRemote(data.playerId);
            } else if (data.teamId) {
                return await window.supabaseSync.deleteTeamRemote(data.teamId);
            }

            return false;
        } catch (error) {
            console.error('❌ Erreur executeDelete:', error);
            return false;
        }
    }

    /**
     * Exécuter une opération de mise à jour
     */
    async executeUpdate(operation) {
        if (!window.supabaseSync || !window.supabaseSync.isReady()) {
            console.warn('⚠️ Supabase non disponible');
            return false;
        }

        try {
            const { data } = operation;
            
            if (data.match_id && !data.player_id) {
                // Mise à jour de match
                const result = await window.supabaseSync.updateMatchRemote(data);
                return !!result;
            } else if (data.player_id && !data.event_type) {
                // Mise à jour de joueur
                const result = await window.supabaseSync.updatePlayerRemote(data);
                return !!result;
            } else if (data.team_id) {
                // Mise à jour d'équipe
                const result = await window.supabaseSync.updateTeamRemote(data);
                return !!result;
            }

            return false;
        } catch (error) {
            console.error('❌ Erreur executeUpdate:', error);
            return false;
        }
    }

    // ===== PERSISTENCE =====

    /**
     * Sauvegarder la queue dans localStorage
     */
    saveQueue() {
        try {
            localStorage.setItem('offline_queue', JSON.stringify(this.queue));
        } catch (error) {
            console.error('❌ Erreur sauvegarde queue:', error);
        }
    }

    /**
     * Charger la queue depuis localStorage
     */
    loadQueue() {
        try {
            const saved = localStorage.getItem('offline_queue');
            if (saved) {
                this.queue = JSON.parse(saved);
                console.log(`📂 Queue chargée: ${this.queue.length} opération(s)`);
            }
        } catch (error) {
            console.error('❌ Erreur chargement queue:', error);
            this.queue = [];
        }
    }

    // ===== UTILITAIRES =====

    /**
     * Générer un ID unique
     */
    generateId() {
        return `op_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    }

    /**
     * Attendre un délai
     */
    delay(ms) {
        return new Promise(resolve => setTimeout(resolve, ms));
    }

    /**
     * Obtenir le statut de la queue
     */
    getStatus() {
        const pending = this.queue.filter(op => op.status === 'pending').length;
        const processing = this.queue.filter(op => op.status === 'processing').length;
        const failed = this.queue.filter(op => op.status === 'failed').length;
        
        return {
            total: this.queue.length,
            pending: pending,
            processing: processing,
            failed: failed,
            isProcessing: this.processing
        };
    }

    /**
     * Obtenir les opérations échouées
     */
    getFailedOperations() {
        return this.queue.filter(op => op.status === 'failed');
    }

    /**
     * Réessayer toutes les opérations échouées
     */
    retryFailedOperations() {
        const failed = this.getFailedOperations();
        
        failed.forEach(op => {
            op.status = 'pending';
            op.retries = 0;
        });
        
        this.saveQueue();
        console.log(`🔄 ${failed.length} opération(s) échouée(s) remise(s) en queue`);
        
        // Relancer le traitement
        this.processQueue();
    }

    /**
     * Obtenir des statistiques sur la queue
     */
    getStatistics() {
        const now = Date.now();
        const oldestOp = this.queue.reduce((oldest, op) => {
            return !oldest || op.addedAt < oldest.addedAt ? op : oldest;
        }, null);

        return {
            totalOperations: this.queue.length,
            pendingOperations: this.getQueueSize(),
            failedOperations: this.getFailedOperations().length,
            oldestOperation: oldestOp ? {
                id: oldestOp.id,
                age: Math.floor((now - oldestOp.addedAt) / 1000) + 's',
                type: oldestOp.type
            } : null,
            isProcessing: this.processing
        };
    }
}

// ===== INITIALISATION GLOBALE =====

if (typeof window !== 'undefined') {
    window.offlineQueue = new OfflineQueue();
    
    // Écouter la reconnexion pour traiter automatiquement la queue
    window.addEventListener('online', () => {
        console.log('🔌 Connexion rétablie - traitement de la queue');
        setTimeout(() => {
            window.offlineQueue.processQueue();
        }, 1000); // Attendre 1 seconde après la reconnexion
    });
    
    console.log('📦 Module OfflineQueue chargé (USE CASE 3)');
}