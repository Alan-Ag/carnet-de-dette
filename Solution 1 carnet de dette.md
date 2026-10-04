# Solution 1 — Carnet de dette (PWA hors ligne)

Application web mobile pour un commerçant : suivre ce que chaque client doit.
Installable sur le téléphone, fonctionne sans internet, données stockées sur l'appareil.

## Fonctionnalités (V1)

- Liste des clients triée par montant dû, recherche, total à recevoir.
- Fiche client : solde, « + Dette », « Paiement reçu », historique (toucher une ligne pour la modifier/supprimer).
- Relance du client par WhatsApp ou SMS avec message pré-rempli.
- Réglages : nom de la boutique, devise (FCFA par défaut).
- Sauvegarde : export / import d'un fichier `.json`.

## Fichiers

| Fichier | Rôle |
| --- | --- |
| `index.html` | Écrans et formulaires |
| `styles.css` | Style (clair/sombre automatique) |
| `app.js` | Logique : navigation, calculs, formulaires, relances, sauvegarde |
| `db.js` | Stockage local IndexedDB (`clients`, `transactions`, `settings`) |
| `sw.js` | Cache hors ligne — incrémenter `VERSION` à chaque mise à jour |
| `manifest.json`, `icons/` | Installation sur l'écran d'accueil |

## Lancer en local

```bash
python3 -m http.server 8000
# puis ouvrir http://localhost:8000
```

Pour l'installer sur un téléphone, il faut la servir en **HTTPS** (ex. GitHub Pages, Netlify, Cloudflare Pages),
puis « Ajouter à l'écran d'accueil » dans Chrome.

## Limites connues

- Données sur un seul appareil : penser à exporter régulièrement.
- Un seul utilisateur, pas de synchronisation.

## Pistes V2

- Rappel automatique d'export, partage du fichier de sauvegarde par WhatsApp.
- Date d'échéance par dette et liste des retards.
- Reçu / relevé de compte partageable (image ou PDF).
- Gestion des dettes fournisseurs (ce que la boutique doit).
- Synchronisation cloud optionnelle.
