# Rénov'Habitat — site vitrine

Site statique (HTML / CSS / JavaScript, sans dépendance ni étape de build) pour une entreprise de menuiserie et de rénovation : présentation du savoir-faire, réalisations **avant/après** avec curseur interactif, méthode de travail et formulaire de contact.

## Aperçu en local

```bash
# n'importe quel serveur statique fonctionne, par exemple :
npx http-server . -p 8080
# puis ouvrir http://localhost:8080
```

On peut aussi simplement ouvrir `index.html` dans un navigateur.

## À personnaliser

### 1. Coordonnées de l'entreprise — `js/config.js`

Téléphone, e-mail, zone d'intervention et horaires. Ces valeurs remplacent automatiquement les textes du site, et l'adresse e-mail est le destinataire du formulaire de contact.

> Les valeurs actuelles (`06 00 00 00 00`, `contact@votre-domaine.fr`, « Votre ville ») sont des **exemples à remplacer**.

### 2. Les réalisations avant/après — `js/projects.js`

Chaque chantier est un bloc dans la liste `PROJECTS` :

```js
{
  category: "fenetres",            // fenetres | portes | escaliers | placards | cuisines | terrasses
  title: "Titre du chantier",
  description: "Quelques lignes pour décrire le chantier.",
  tags: ["Matériau", "Type de travaux"],
  before: "assets/img/projects/mon-chantier-avant.jpg",
  after:  "assets/img/projects/mon-chantier-apres.jpg",
  altBefore: "Description de la photo avant (accessibilité)",
  altAfter:  "Description de la photo après (accessibilité)"
}
```

Les filtres (Fenêtres, Portes…) se mettent à jour tout seuls selon les catégories utilisées. Pour une nouvelle catégorie, l'ajouter dans `CATEGORIES` en haut du même fichier.

**Conseils pour les photos**

- Prendre l'avant et l'après **du même endroit, au même cadrage** : c'est ce qui rend la comparaison parlante.
- Format paysage 3:2 (ex. 1200 × 800 px), en `.jpg` ou `.webp`, 200 Ko environ chacune pour un site rapide.

> Les images actuelles de `assets/img/projects/` sont des **illustrations provisoires** : à remplacer par les vraies photos de l'entreprise.

### 3. Textes, couleurs

- Textes : directement dans `index.html`.
- Couleurs et typographies : variables en haut de `css/style.css` (`--bordeaux` reprend le rouge du logo, `#860308`).

## Formulaire de contact

Le formulaire ouvre la messagerie du visiteur avec la demande pré-remplie (`mailto:`), ce qui fonctionne sans serveur. Pour recevoir les demandes directement par e-mail, il peut être branché sur un service comme Formspree ou Netlify Forms.

## Structure

```
index.html            page unique
css/style.css         styles
js/config.js          coordonnées de l'entreprise
js/projects.js        liste des réalisations
js/main.js            curseur avant/après, filtres, menu, formulaire
assets/img/           logo (plusieurs variantes), favicon
assets/img/projects/  photos avant/après
```

## Mise en ligne

Le dossier peut être déployé tel quel sur n'importe quel hébergement statique (GitHub Pages, Netlify, Vercel, OVH…).
