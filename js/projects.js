/* ------------------------------------------------------------------
   Réalisations avant/après.

   Pour ajouter un chantier : copier un bloc ci-dessous, puis déposer
   les deux photos dans assets/img/projects/ (idéalement au même
   cadrage, format paysage 3:2, ex. 1200 × 800 px, en .jpg ou .webp).

   category : fenetres | portes | escaliers | placards | cuisines | terrasses
------------------------------------------------------------------- */
window.CATEGORIES = {
  fenetres:  "Fenêtres",
  portes:    "Portes",
  escaliers: "Escaliers",
  placards:  "Placards",
  cuisines:  "Cuisines",
  terrasses: "Terrasses"
};

window.PROJECTS = [
  {
    category: "fenetres",
    title: "Fenêtres remplacées par de l'aluminium",
    description: "Les anciens châssis en bois, écaillés et à simple vitrage, laissent place à des fenêtres aluminium anthracite à double vitrage : plus de lumière, de confort et de silence.",
    tags: ["Aluminium anthracite", "Double vitrage", "Dépose & pose"],
    before: "assets/img/projects/fenetres-avant.svg",
    after: "assets/img/projects/fenetres-apres.svg",
    altBefore: "Fenêtre en bois dégradée avant rénovation",
    altAfter: "Fenêtre aluminium anthracite à double vitrage après rénovation"
  },
  {
    category: "portes",
    title: "Une entrée qui donne le ton",
    description: "Remplacement d'une porte d'entrée fatiguée par un modèle bordeaux à rainures verticales, poignée barre en inox et imposte vitrée pour laisser entrer la lumière.",
    tags: ["Porte d'entrée", "Poignée inox", "Imposte vitrée"],
    before: "assets/img/projects/porte-avant.svg",
    after: "assets/img/projects/porte-apres.svg",
    altBefore: "Porte d'entrée en bois usée avant rénovation",
    altAfter: "Porte d'entrée bordeaux moderne après rénovation"
  },
  {
    category: "escaliers",
    title: "Escalier relooké en chêne clair",
    description: "L'escalier sombre et massif s'allège : marches en chêne, contremarches blanches et garde-corps filaire noir pour un résultat lumineux et contemporain.",
    tags: ["Marches en chêne", "Garde-corps métal", "Rénovation"],
    before: "assets/img/projects/escalier-avant.svg",
    after: "assets/img/projects/escalier-apres.svg",
    altBefore: "Escalier en bois sombre avant rénovation",
    altAfter: "Escalier en chêne clair avec garde-corps fin après rénovation"
  },
  {
    category: "placards",
    title: "Un dressing sur mesure dans l'alcôve",
    description: "Une alcôve inexploitée devient un grand placard intégré du sol au plafond, avec portes en bois, poignées discrètes et éclairage intégré.",
    tags: ["Sur mesure", "Façades en chêne", "Éclairage LED"],
    before: "assets/img/projects/placard-avant.svg",
    after: "assets/img/projects/placard-apres.svg",
    altBefore: "Alcôve vide avec simple tringle avant aménagement",
    altAfter: "Grand placard sur mesure en bois après aménagement"
  },
  {
    category: "cuisines",
    title: "Cuisine repensée de A à Z",
    description: "Meubles jaunis et crédence défraîchie remplacés par des façades blanches, des bas en bois clair, un plan de travail épuré et une crédence lumineuse.",
    tags: ["Meubles sur mesure", "Plan de travail", "Crédence"],
    before: "assets/img/projects/cuisine-avant.svg",
    after: "assets/img/projects/cuisine-apres.svg",
    altBefore: "Cuisine datée avant rénovation",
    altAfter: "Cuisine moderne blanche et bois après rénovation"
  },
  {
    category: "terrasses",
    title: "Terrasse bois et pergola",
    description: "La dalle fissurée disparaît sous une terrasse en bois, complétée par une pergola qui crée un véritable espace de vie extérieur.",
    tags: ["Terrasse bois", "Pergola", "Aménagement extérieur"],
    before: "assets/img/projects/terrasse-avant.svg",
    after: "assets/img/projects/terrasse-apres.svg",
    altBefore: "Dalle de béton fissurée avant aménagement",
    altAfter: "Terrasse en bois avec pergola après aménagement"
  }
];
