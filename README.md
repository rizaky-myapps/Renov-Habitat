# Rénov'Habitat — site vitrine

Site statique (HTML / CSS / JavaScript, sans étape de build) pour une entreprise de menuiserie et de rénovation, avec une page d'administration pour gérer les photos avant/après.

## Les pages

| Page | Fichier | Contenu |
|---|---|---|
| Accueil | `index.html` | Présentation, comparateur avant/après, aperçu des métiers et des dernières réalisations |
| Savoir-faire | `savoir-faire.html` | Détail de chaque métier, méthode de travail |
| Réalisations | `realisations.html` | Toutes les réalisations avant/après, filtrables par catégorie |
| Contact | `contact.html` | Coordonnées et formulaire de demande de devis |
| **Administration** | `admin/index.html` | Gestion des photos avant/après (voir ci-dessous) |

Sur chaque comparateur, le libellé **Avant** n'apparaît que sur la photo avant, et **Après** que sur la photo après : ils sont découpés avec leur photo quand on déplace le curseur.

## Aperçu en local

Les réalisations sont chargées depuis `data/projects.json`, il faut donc un petit serveur (ouvrir `index.html` directement ne suffit pas) :

```bash
npx http-server . -p 8080
# puis ouvrir http://localhost:8080
```

## Administration des photos avant/après

Adresse : **`https://<votre-site>/admin/`** (par exemple `https://rizaky-myapps.github.io/Renov-Habitat/admin/`). La page n'est pas référencée par les moteurs de recherche et n'apparaît pas dans le menu du site.

### Comment ça marche

Le site est hébergé sur GitHub Pages, qui ne sert que des fichiers fixes. La page d'administration enregistre donc les modifications **directement dans le dépôt GitHub**, avec votre code d'accès personnel :

- `data/projects.json` : la liste des réalisations ;
- `assets/img/projects/` : les photos.

Chaque enregistrement est **un seul commit** (photos + liste), puis GitHub Pages republie le site : comptez **1 à 2 minutes** avant que le changement soit visible. L'historique de GitHub conserve toutes les versions, ce qui permet de revenir en arrière.

### Première connexion : créer le code d'accès

1. Connectez-vous à GitHub avec le compte propriétaire du dépôt, puis ouvrez <https://github.com/settings/personal-access-tokens/new>.
2. Nom : par exemple « Rénov'Habitat admin ». Choisissez une durée de validité.
3. **Repository access** : « Only select repositories », puis le dépôt du site.
4. **Permissions → Repository permissions → Contents** : « Read and write ».
5. « Generate token », copiez le code (il commence par `github_pat_`) et collez-le sur la page d'administration. GitHub ne l'affiche qu'une seule fois.

Le code est conservé uniquement dans le navigateur (le temps de l'onglet, ou sur l'appareil si « Rester connecté » est coché) et n'est envoyé qu'à `api.github.com`. Il ne doit jamais être partagé ni écrit dans le dépôt. Quand il expire, il suffit d'en générer un nouveau.

### Réglage à vérifier : `js/config.js`

```js
admin: {
  owner: "rizaky-myapps",             // propriétaire du dépôt
  repo: "Renov-Habitat",              // nom du dépôt
  branch: "claude/upbeat-turing-qrvmxm" // branche publiée par GitHub Pages
}
```

`branch` doit être **la branche publiée par GitHub Pages** (Settings → Pages → Branch). Si le site passe un jour sur une autre branche (par exemple `main`), changez cette valeur.

### Utilisation

- **Ajouter une réalisation** : titre, catégorie (ou nouvelle catégorie), description, mots-clés, photo avant, photo après. L'aperçu du comparateur s'affiche avant publication. Les photos sont automatiquement redimensionnées (1600 px maximum) et compressées dans le navigateur : inutile de les préparer.
- **Modifier** : changer les textes, ou remplacer une seule des deux photos.
- **Classer** : les flèches ↑ ↓ changent l'ordre, puis « Enregistrer l'ordre ». La **1ʳᵉ réalisation** est celle du haut de l'accueil, les 2ᵉ à 4ᵉ sont aperçues sur l'accueil, toutes figurent sur la page Réalisations. Une nouvelle réalisation est ajoutée en première position.
- **Supprimer** : retire la réalisation et ses deux photos du site.

Conseil pour de beaux comparateurs : prendre l'avant et l'après **du même endroit, au même cadrage**. L'administration avertit si les deux photos n'ont pas le même format.

> Les 6 réalisations livrées avec le site sont des **illustrations de démonstration** : à supprimer une fois les vraies photos ajoutées.

### Limites à connaître

- Si la branche publiée est **protégée** par des règles GitHub (pull request obligatoire…), l'enregistrement sera refusé : l'administration écrit directement sur la branche.
- Deux personnes qui enregistrent exactement en même temps : l'administration relit les données et réessaie automatiquement ; en cas d'échec, elle demande de recharger la page.
- **Statistiques de visites** : non incluses pour le moment. Elles demanderaient un service externe qui enregistre les visites (GitHub Pages ne le permet pas).

## Personnaliser

- **Coordonnées** (téléphone, e-mail, zone, horaires) : `js/config.js`. Elles remplacent automatiquement les textes du site, et l'e-mail est le destinataire du formulaire de contact. Les valeurs actuelles (`06 00 00 00 00`, `contact@votre-domaine.fr`, « Votre ville ») sont des **exemples à remplacer**.
- **Textes des pages** : directement dans les fichiers `.html` (l'en-tête et le pied de page sont répétés dans chaque page).
- **Couleurs et typographies** : variables en haut de `css/style.css` (`--bordeaux` reprend le rouge du logo, `#860308`).
- **Catégories** : créées depuis l'administration, ou dans `data/projects.json` (clé `categories`).

## Formulaire de contact

Il ouvre la messagerie du visiteur avec la demande pré-remplie (`mailto:`), ce qui fonctionne sans serveur. Pour recevoir les demandes directement, il peut être branché sur un service comme Formspree ou Netlify Forms.

## Structure

```
index.html, savoir-faire.html, realisations.html, contact.html    pages publiques
admin/index.html                 page d'administration
css/style.css                    styles du site
css/admin.css                    styles de l'administration
js/config.js                     coordonnées de l'entreprise + réglages de l'administration
js/slider.js                     comparateur avant/après (partagé site + admin)
js/main.js                       menu, réalisations, filtres, formulaire
js/admin.js                      administration (connexion, ajout, modification, ordre, suppression)
data/projects.json               liste des réalisations (modifiée par l'administration)
assets/img/                      logo (plusieurs variantes), favicon
assets/img/projects/             photos avant/après
.nojekyll                        demande à GitHub Pages de servir les fichiers tels quels
```

## Mise en ligne (GitHub Pages)

Settings → Pages → « Deploy from a branch » → choisir la branche et le dossier `/ (root)`. L'adresse du site est de la forme `https://<compte>.github.io/<dépôt>/`. Le dossier peut aussi être déployé tel quel sur n'importe quel hébergement statique (Netlify, Vercel, OVH…) : dans ce cas, l'administration continue d'écrire dans le dépôt GitHub, qu'il faut alors relier à l'hébergeur pour republier automatiquement.
