# ⚽ Football Stats Manager v2 - Supabase

Application web complète pour gérer et analyser les statistiques de matchs de football en temps réel avec synchronisation multi-appareils.

## 🚀 Fonctionnalités Principales

### Admin (Mise à jour live)
- ✅ **Interface mobile optimisée** pour saisie rapide pendant le match
- ✅ **Chronomètre et score** dominants à l'écran
- ✅ **Actions rapides** : Buts, tirs, cartons, fautes, passes décisives, changements
- ✅ **Synchronisation temps réel** avec Supabase
- ✅ **Mode hors ligne** avec sync automatique à la reconnexion
- ✅ **Historique événements** en direct

### Spectateur (Accès par URL)
- 👁️ **Consultation en direct** via lien unique
- 📊 **Stats en temps réel** (équipe vs adversaire)
- 👥 **Liste des joueurs** et leurs stats live
- 📡 **Synchronisation automatique** chaque 2 secondes
- 🔄 **Mode hors ligne** avec données en cache

### Analytics (Post-match)
- 📈 **Stats détaillées par joueuse** :
  - Buts, passes décisives, tirs (cadrés/non cadrés)
  - Cartons, fautes, temps de jeu
- 📊 **Comparaison équipe vs adversaire**
- 📜 **Historique complet** de tous les matchs
- 📄 **Export PDF** du rapport de match
- 📊 **Rapport de saison** avec comparaisons

## 📋 Installation Rapide

### Étape 1 : Prérequis
- Node.js (optionnel, pour le développement)
- Un compte Supabase gratuit : https://supabase.com

### Étape 2 : Configuration Supabase

1. **Créer un projet Supabase**
   - Allez sur https://supabase.com
   - Cliquez "Start your project"
   - Créez un nouveau projet

2. **Récupérer les clés**
   - Allez dans "Project Settings" → "API"
   - Notez : **SUPABASE_URL** et **SUPABASE_ANON_KEY**

3. **Créer les tables**
   - Allez dans "SQL Editor"
   - Copiez-collez le [script SQL](./docs/supabase-schema.sql)
   - Cliquez "Run"

### Étape 3 : Configurer l'Application

1. **Ouvrir `js/supabase-config.js`**
```javascript
const SUPABASE_CONFIG = {
    URL: 'https://VOTRE_PROJECT_ID.supabase.co',  // ← Remplacez
    ANON_KEY: 'VOTRE_ANON_KEY_HERE'                 // ← Remplacez
};
```

2. **Sauvegarder le fichier**

3. **Ouvrir `index.html` dans votre navigateur**
   - Vous verrez le statut de connexion Supabase
   - ✅ = Connecté et prêt !

## 📖 Guide d'Utilisation

### Pour les Admin (Mise à jour)

1. **Configurer l'équipe**
   - Onglet "👥 Équipe"
   - Ajouter vos joueuses et positions

2. **Composer le match**
   - Onglet "📋 Compo"
   - Sélectionner vos 11 titulaires

3. **Démarrer le match**
   - Cliquez "🆕 Nouveau Match" sur l'accueil
   - Vous êtes redirigé vers l'interface live

4. **Pendant le match**
   - Cliquez sur les **grands boutons colorés** pour les actions
   - Le chronomètre est au centre
   - Les événements s'affichent en bas

5. **Générer le lien spectateur**
   - Pendant le match, cliquez "🔗 Lien Live"
   - Partagez l'URL avec les spectateurs
   - Une nouvelle URL pour chaque match

### Pour les Spectateurs (Consultation)

1. **Recevoir le lien**
   - Exemple : `https://votre-app.com/pages/spectator.html?match=abc123`

2. **Ouvrir dans le navigateur**
   - Pas besoin de compte ou login
   - Le score et les stats se mettent à jour automatiquement

3. **Partager le lien**
   - Chaque spectateur peut cliquer le bouton "📋 Copier le lien"
   - Pour partager avec d'autres

### Après le Match

1. **Consulter les stats**
   - Onglet "📊 Stats"
   - Voir toutes les stats individuelles

2. **Exporter en PDF**
   - Cliquez "📄 Export PDF"
   - Télécharge un rapport complet

3. **Voir l'historique**
   - Cliquez "📜 Historique"
   - Accédez à tous vos matchs précédents

## 🏗️ Structure du Projet

```
football-stats-v2/
├── index.html                  # Accueil
├── css/
│   └── style.css              # Styles globaux
├── js/
│   ├── supabase-config.js    # ⚙️ CONFIG ICI
│   ├── data-manager.js        # Gestion Supabase
│   ├── sync-manager.js        # Synchronisation
│   ├── notification.js        # Notifications
│   └── pdf-export.js          # Export PDF
├── pages/
│   ├── team.html              # Gestion équipe
│   ├── composition.html       # Composition
│   ├── live-match.html        # Interface admin LIVE
│   ├── spectator.html         # Interface spectateur
│   └── stats.html             # Statistiques
└── README.md
```

## 🔐 Sécurité

### Clés Supabase
- **ANON_KEY** : Clé publique, visible dans le code (normal)
- **MASTER_KEY** : Ne jamais partager ⚠️

### Authentification
- Version simple : pas d'authentification
- Les spectateurs accèdent via URL unique par match
- Pour multi-utilisateurs : ajouter l'authentification Supabase

## 🚨 Troubleshooting

### "❌ Client Supabase non initialisé"
→ Vérifiez `js/supabase-config.js`
→ Vérifiez que la librairie Supabase est chargée dans `index.html`

### "⚠️ Impossible de se connecter à Supabase"
→ Vérifiez vos clés SUPABASE_URL et SUPABASE_ANON_KEY
→ Vérifiez les politiques RLS dans Supabase Dashboard

### "Mode hors ligne"
→ C'est normal si pas de connexion internet
→ Les données se synchoniseront à la reconnexion

### Données non sauvegardées
→ Vérifiez la console (F12) pour les erreurs
→ Vérifiez que la base de données est accessible

## 📱 Responsive Design

L'application fonctionne sur :
- ✅ Desktop (1920px+)
- ✅ Tablette (768px - 1024px)
- ✅ Mobile (320px - 768px) - **Optimisée pour saisie rapide**

## 🎯 Raccourcis Clavier (Interface Live)

- `Espace` : Démarrer/Pause chronomètre
- `Échap` : Fermer les modales

## 📊 Données Stockées dans Supabase

### Tables principales
- **matches** : Matchs créés
- **match_events** : Tous les événements (buts, tirs, cartons...)
- **player_match_stats** : Stats joueurs par match
- **player_play_times** : Temps de jeu (entrée/sortie)
- **opponent_stats** : Stats équipe adverse
- **teams** : Équipes
- **players** : Joueuses

## 🔄 Synchronisation

- **Interface Admin** : Sync toutes les 3 secondes
- **Spectateur** : Sync toutes les 2 secondes
- **Mode hors ligne** : Mise en cache automatique
- **Reconnexion** : Sync immédiate à la rétablissement de connexion

## 📈 Performances

- **Quota Supabase gratuit** :
  - 500 MB stockage
  - 2 millions de requêtes/mois
  - **Suffisant pour 100+ matchs par an**

## 🚀 Prochaines Améliorations Possibles

- [ ] Authentification multi-utilisateurs
- [ ] Mode sombre
- [ ] Notifications push
- [ ] Cartes de chaleur des tirs
- [ ] Analyse vidéo intégrée
- [ ] API GraphQL
- [ ] Mode tournoi

## 📞 Support

Pour les problèmes :
1. Vérifiez la console navigateur (F12)
2. Consultez le [Supabase Documentation](https://supabase.com/docs)
3. Vérifiez les logs dans Supabase Dashboard

## 📄 Licence

Ce projet est sous licence MIT.

---

**Fait avec ❤️ pour les passionnés de football** ⚽