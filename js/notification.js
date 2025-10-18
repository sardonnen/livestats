// ===== SYSTÈME DE NOTIFICATIONS =====
// Affiche des notifications non-intrusive à l'écran

class NotificationManager {
    constructor() {
        this.container = null;
        this.notifications = [];
        this.maxNotifications = 5;
        this.defaultDuration = 3000;
        this.init();
    }

    init() {
        // Créer le conteneur
        this.container = document.createElement('div');
        this.container.id = 'notification-container';
        this.container.style.cssText = `
            position: fixed;
            top: 20px;
            right: 20px;
            z-index: 10000;
            display: flex;
            flex-direction: column;
            gap: 10px;
            max-width: 400px;
            pointer-events: none;
        `;

        document.body.appendChild(this.container);
        console.log('✅ NotificationManager initialisé');
    }

    /**
     * Afficher une notification
     * @param {string} message - Message à afficher
     * @param {string} type - Type : 'success', 'error', 'warning', 'info'
     * @param {number} duration - Durée en ms (0 = permanent)
     */
    show(message, type = 'info', duration = null) {
        if (!this.container) {
            console.error('Conteneur notifications non disponible');
            return;
        }

        // Limiter le nombre de notifications
        if (this.notifications.length >= this.maxNotifications) {
            this.remove(this.notifications[0].id);
        }

        // Créer l'ID unique
        const notificationId = 'notif_' + Date.now() + Math.random().toString(36).substr(2, 9);

        // Créer l'élément
        const notification = document.createElement('div');
        notification.id = notificationId;
        notification.className = `notification notification-${type}`;
        notification.style.cssText = `
            background: ${this.getColor(type)};
            color: white;
            padding: 15px 20px;
            border-radius: 8px;
            box-shadow: 0 4px 12px rgba(0, 0, 0, 0.15);
            animation: slideInRight 0.3s ease;
            display: flex;
            align-items: center;
            gap: 12px;
            min-height: 50px;
            pointer-events: all;
            cursor: pointer;
            transition: all 0.3s ease;
            border-left: 4px solid rgba(255, 255, 255, 0.3);
        `;

        // Ajouter l'icône
        const icon = document.createElement('span');
        icon.innerHTML = this.getIcon(type);
        icon.style.fontSize = '20px';

        // Ajouter le message
        const messageEl = document.createElement('span');
        messageEl.textContent = message;
        messageEl.style.flex = '1';

        // Ajouter le bouton de fermeture
        const closeBtn = document.createElement('button');
        closeBtn.innerHTML = '✕';
        closeBtn.style.cssText = `
            background: none;
            border: none;
            color: white;
            cursor: pointer;
            font-size: 18px;
            padding: 0;
            width: 24px;
            height: 24px;
            display: flex;
            align-items: center;
            justify-content: center;
            opacity: 0.8;
            transition: opacity 0.2s;
        `;
        closeBtn.onmouseover = () => closeBtn.style.opacity = '1';
        closeBtn.onmouseout = () => closeBtn.style.opacity = '0.8';
        closeBtn.onclick = (e) => {
            e.stopPropagation();
            this.remove(notificationId);
        };

        // Assembler
        notification.appendChild(icon);
        notification.appendChild(messageEl);
        notification.appendChild(closeBtn);

        // Ajouter au conteneur
        this.container.appendChild(notification);

        // Enregistrer
        const notifObj = { id: notificationId, element: notification, type };
        this.notifications.push(notifObj);

        // Au clic, fermer
        notification.onclick = () => this.remove(notificationId);

        // Auto-fermeture si durée spécifiée
        const duration_final = duration !== null ? duration : this.defaultDuration;
        if (duration_final > 0) {
            setTimeout(() => {
                this.remove(notificationId);
            }, duration_final);
        }

        console.log(`📢 Notification ${type} :`, message);
        return notificationId;
    }

    /**
     * Afficher une notification de succès
     */
    success(message, duration = null) {
        return this.show(message, 'success', duration);
    }

    /**
     * Afficher une notification d'erreur
     */
    error(message, duration = null) {
        return this.show(message, 'error', duration);
    }

    /**
     * Afficher une notification d'avertissement
     */
    warning(message, duration = null) {
        return this.show(message, 'warning', duration);
    }

    /**
     * Afficher une notification d'information
     */
    info(message, duration = null) {
        return this.show(message, 'info', duration);
    }

    /**
     * Retirer une notification
     */
    remove(notificationId) {
        const index = this.notifications.findIndex(n => n.id === notificationId);
        if (index !== -1) {
            const notif = this.notifications[index];
            notif.element.style.animation = 'slideOutRight 0.3s ease';

            setTimeout(() => {
                if (notif.element.parentNode) {
                    notif.element.parentNode.removeChild(notif.element);
                }
                this.notifications.splice(index, 1);
            }, 300);
        }
    }

    /**
     * Effacer toutes les notifications
     */
    clearAll() {
        this.notifications.forEach(notif => {
            this.remove(notif.id);
        });
    }

    /**
     * Obtenir la couleur selon le type
     */
    getColor(type) {
        const colors = {
            success: '#27ae60',
            error: '#e74c3c',
            warning: '#f39c12',
            info: '#3498db'
        };
        return colors[type] || colors.info;
    }

    /**
     * Obtenir l'icône selon le type
     */
    getIcon(type) {
        const icons = {
            success: '✓',
            error: '✕',
            warning: '⚠',
            info: 'ℹ'
        };
        return icons[type] || icons.info;
    }
}

// Créer l'instance globale
const notificationManager = new NotificationManager();

/**
 * Fonction globale pour les notifications (compatibilité)
 */
function showNotification(message, type = 'info', duration = null) {
    notificationManager.show(message, type, duration);
}

// Ajouter les animations CSS
const style = document.createElement('style');
style.innerHTML = `
    @keyframes slideInRight {
        from {
            transform: translateX(400px);
            opacity: 0;
        }
        to {
            transform: translateX(0);
            opacity: 1;
        }
    }

    @keyframes slideOutRight {
        from {
            transform: translateX(0);
            opacity: 1;
        }
        to {
            transform: translateX(400px);
            opacity: 0;
        }
    }

    .notification {
        box-sizing: border-box;
    }

    .notification:hover {
        transform: translateX(-5px);
        box-shadow: 0 6px 16px rgba(0, 0, 0, 0.2);
    }
`;
document.head.appendChild(style);

console.log('📦 Module NotificationManager chargé');