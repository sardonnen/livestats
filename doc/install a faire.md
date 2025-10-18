# 📋 Checklist Installation - Football Stats v2

## ÉTAPE 1 : Supabase ✅ (Déjà fait)
- [x] Compte Supabase créé
- [x] Tables SQL exécutées
- [x] Clés récupérées (URL + ANON_KEY)

---

## ÉTAPE 2 : Structurer le Git (À faire maintenant)

### 2.1 - Créer la structure de dossiers
```bash
cd votre-repo
mkdir -p js pages css
```

### 2.2 - Fichiers à garder de l'ancien projet
```
✅ css/style.css
✅ index.html (ancien)
✅ pages/team.html
✅ pages/composition.html
✅ pages/stats.html (ancien)
```

### 2.3 - Fichiers à SUPPRIMER
```
❌ js/app.js
❌ js/storage.js
❌ js/api.js
❌ js/live.js
❌ pages/match.html
❌ pages/live.html
```

---

## ÉTAPE 3 : Copier les nouveaux fichiers depuis les artifacts

### 3.1 - Fichiers JavaScript (5 fichiers)

**Fichier 1 : `js/supabase-config.js`**
```
⬇️ À copier depuis l'artifact "supabase_config_js"
📍 Destination : js/supabase-config.js
⚠️ IMPORTANT : Remplacer vos clés Supabase !
```

**Fichier 2 : `js/data-manager.js`**
```
⬇️ À copier depuis l'artifact "data_manager_js"
📍 Destination : js/data-manager.js
```

**Fichier 3 : `js/sync-manager.js`**
```
⬇️ À copier depuis l'artifact "sync_manager_js"
📍 Destination : js/sync-manager.js
```

**Fichier 4 : `js/notification.js`**
```
⬇️ À copier depuis l'artifact "notification_js"
📍 Destination : js/notification.js
```

**Fichier 5 : `js/pdf-export.js`**
```
⬇️ À copier depuis l'artifact "pdf_export_js"
📍 Destination : js/pdf-export.js
```

### 3.2 - Fichiers HTML (4 fichiers)

**Fichier 1 : `index.html` (REMPLACER L'ANCIEN)**
```
⬇️ À copier depuis l'artifact "index_html_updated"
📍 Destination : index.html
⚠️ Cela remplace votre ancien index.html
```

**Fichier 2 : `pages/live-match.html` (NOUVEAU)**
```
⬇️ À copier depuis l'artifact "live_match_html"
📍 Destination : pages/live-match.html
```

**Fichier 3 : `pages/spectator.html` (NOUVEAU)**
```
⬇️ À copier depuis l'artifact "spectator_html"
📍 Destination : pages/spectator.html
```

### 3.3 - Fichiers CSS

**Fichier : `css/style.css` (À compléter)**
```
✅ Vous avez déjà ce fichier
⬇️ À ajouter À LA FIN : l'artifact "style_css_additions"
📍 Copiez tout le contenu CSS et ajoutez-le à la fin de votre fichier
```

### 3.4 - Documentation

**Fichier : `README.md` (REMPLACER L'ANCIEN)**
```
⬇️ À copier depuis l'artifact "readme_v2"
📍 Destination : README.md
```

---

## ÉTAPE 4 : Configuration des clés Supabase

### 4.1 - Ouvrir `js/supabase-config.js`

```javascript
const SUPABASE_CONFIG = {
    URL: 'https://YOUR_PROJECT_ID.supabase.co',  // ← REMPLACER
    ANON_KEY: 'YOUR_ANON_KEY_HERE'                 // ← REMPLACER
};
```

### 4.2 - Récupérer vos vraies clés

1. Aller sur https://supabase.com/dashboard
2. Sélectionner votre projet
3. Cliquer ⚙️ "Project Settings"
4. Aller dans "API"
5. Copier :
   - **SUPABASE_URL** (example: `https://abcd1234.supabase.co`)
   - **SUPABASE_ANON_KEY** (longue clé commençant par `eyJ...`)

### 4.3 - Remplacer dans le fichier

```javascript
const SUPABASE_CONFIG = {
    URL: 'https://abcd1234.supabase.co',          // ✅ Votre URL
    ANON_KEY: 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ...'  // ✅ Votre clé
};
```

### 4.4 - Sauvegarder 💾

---

## ÉTAPE 5 : Déployer sur GitHub Pages

### 5.1 - Git commands
```bash
cd votre-repo

# Ajouter les fichiers
git add .

# Créer un commit
git commit -m "Mise à jour v2 avec Supabase"

# Pousser sur GitHub
git push origin main
```

### 5.2 - Vérifier GitHub Pages

1. Aller sur https://github.com/votre-username/votre-repo
2. Cliquer ⚙️ "Settings"
3. Cliquer "Pages" dans le menu gauche
4. Source doit être : "Deploy from a branch" + "main"

### 5.3 - Accéder à l'app

```
Votre app est disponible à :
https://votre-username.github.io/votre-repo/
```

---

## ÉTAPE 6 : Test de l'application

### 6.1 - Ouvrir l'application

```
https://votre-username.github.io/votre-repo/
```

### 6.2 - Vérifier la connexion Supabase

- Vous devez voir : **✅ Connexion** dans le premier card
- Si ❌ : Vérifier vos clés dans `js/supabase-config.js`

### 6.3 - Tester un workflow complet

1. **Onglet "👥 Équipe"**
   - ✅ Ajouter quelques joueuses (ex: Sarah, Marie, etc.)

2. **Onglet "📋 Compo"**
   - ✅ Sélectionner 11 joueuses

3. **Accueil**
   - ✅ Cliquez "🆕 Nouveau Match"
   - ✅ Vous allez sur l'interface live

4. **Interface Live**
   - ✅ Cliquez sur les boutons d'actions (But, Tir, etc.)
   - ✅ Les événements s'affichent en bas
   - ✅ Marquez quelques buts

5. **Générer le lien spectateur**
   - ⏱️ Attendez 5 secondes
   - ✅ Cliquez le statut de sync 🔄 (bas droite)
   - ✅ Un lien devrait s'afficher

6. **Test spectateur**
   - ✅ Ouvrir le lien dans un nouvel onglet/téléphone
   - ✅ Le score et les événements se mettent à jour en direct

7. **Après le match**
   - ✅ Allez dans "📊 Stats"
   - ✅ Vous devez voir les stats du match

---

## ÉTAPE 7 : Correction des problèmes

### Problème 1 : "❌ Impossible de se connecter à Supabase"

**Solution :**
1. Ouvrir la console (F12)
2. Vérifier les messages d'erreur
3. Vérifier dans `js/supabase-config.js` :
   - URL correcte ?
   - ANON_KEY correct ?
4. Dans Supabase Dashboard, vérifier les logs

### Problème 2 : "Interface live ne répond pas"

**Solution :**
### Problème 2 : "Interface live ne répond pas"

**Solution :**
1. Vérifier que la composition est créée (onglet "📋 Compo")
2. Vérifier que les joueuses sont ajoutées (onglet "👥 Équipe")
3. Rafraîchir la page (F5)
4. Vérifier console (F12) pour erreurs

### Problème 3 : "Spectateur ne voit rien"

**Solution :**
1. Vérifier que le lien contient `?match=...`
2. Vérifier que le match est en cours sur l'admin
3. Vérifier la connexion internet
4. Attendre 2-3 secondes pour la première sync

### Problème 4 : "Export PDF ne fonctionne pas"

**Solution :**
1. Vérifier que jsPDF est chargé (voir console)
2. Vérifier que le match a des événements
3. Vérifier les permissions du navigateur

---

## ÉTAPE 8 : Checklist Finale

### ✅ Avant de dire "Terminé"

- [ ] Tous les fichiers JS copiés dans `js/`
- [ ] Tous les fichiers HTML copiés dans `pages/`
- [ ] `index.html` remplacé par la nouvelle version
- [ ] `css/style.css` complété avec les additions
- [ ] `js/supabase-config.js` configuré avec vos clés
- [ ] `README.md` remplacé par la nouvelle version
- [ ] Git commit et push effectués
- [ ] Application accessible à `https://votre-username.github.io/votre-repo/`
- [ ] Console (F12) montre ✅ Supabase initialisé
- [ ] Test workflow complet réussi (équipe → compo → match → live → stats)

---

## RÉSUMÉ DES FICHIERS À CRÉER/MODIFIER

### 🆕 NOUVEAUX FICHIERS (à créer)

```
js/supabase-config.js        ← À copier (⚠️ modifiez les clés)
js/data-manager.js            ← À copier
js/sync-manager.js            ← À copier
js/notification.js            ← À copier
js/pdf-export.js              ← À copier
pages/live-match.html         ← À copier
pages/spectator.html          ← À copier
```

### 🔄 FICHIERS À MODIFIER

```
index.html                    ← Remplacer par la nouvelle version
css/style.css                 ← Ajouter le CSS à la fin
README.md                     ← Remplacer par la nouvelle version
```

### ✅ FICHIERS À GARDER (sans modification)

```
css/style.css                 ← Garder l'ancien + ajouter le nouveau CSS
pages/team.html               ← Garder tel quel
pages/composition.html        ← Garder tel quel
pages/stats.html              ← Peut être gardé (mis à jour optionnellement)
```

### ❌ FICHIERS À SUPPRIMER

```
js/app.js                     ← SUPPRIMER
js/storage.js                 ← SUPPRIMER
js/api.js                     ← SUPPRIMER
js/live.js                    ← SUPPRIMER
pages/match.html              ← SUPPRIMER
pages/live.html               ← SUPPRIMER
```

---

## 🎯 PROCHAINES ÉTAPES APRÈS INSTALLATION

### 1. Tester complètement
- Vérifier tous les onglets
- Faire un test de match complet
- Tester le spectateur sur mobile

### 2. Personnaliser
- Changer les couleurs dans `css/style.css`
- Ajouter votre logo
- Modifier les textes

### 3. Utiliser en production
- Créer votre équipe
- Ajouter vos joueuses
- Démarrer vos matchs

### 4. Améliorations futures
- Ajouter l'authentification (voir Supabase Auth)
- Ajouter d'autres types d'événements
- Intégrer avec une vidéo
- Créer des rapports PDF plus beaux

---

## 📞 BESOIN D'AIDE ?

### Si quelque chose ne fonctionne pas :

1. **Vérifier la console (F12)**
   ```
   Clic droit → Inspecter → Console
   ```

2. **Messages courants et solutions :**

   | Message | Solution |
   |---------|----------|
   | `Cannot read property 'createClient'` | Supabase librairie pas chargée |
   | `Unauthorized` | Clés Supabase incorrectes |
   | `CORS error` | Vérifier les politiques RLS |
   | `Match non trouvé` | Attendre que les données se synchent |

3. **Vérifier Supabase Dashboard**
   - Aller sur https://supabase.com/dashboard
   - Cliquer sur votre projet
   - "SQL Editor" → Vérifier les données
   - Vérifier les logs dans "Database" → "Logs"

---

## ✨ Merci d'utiliser Football Stats Manager v2 !

Si vous trouvez des bugs ou avez des suggestions, n'hésitez pas à les noter.

**Bon football ! ⚽**