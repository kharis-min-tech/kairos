# Départements

<SectionClip slug="platform/departments" />

Les départements sont les équipes de ministère au sein de chaque antenne. Kairos couvre toute la gamme des ministères de Kharis Church.

<div class="screenshot-window screenshot-light">

![Page Départements : fiches avec responsable, effectif et badges d'attente](/screenshots/fr/departments.png)

</div>

<div class="screenshot-window screenshot-dark">

![Page Départements en thème sombre](/screenshots/fr/departments-dark.png)

</div>

## Les types de ministère

Un département se crée à partir d'un **catalogue** de types de ministère plutôt qu'en saisissant un nom, pour qu'un même ministère veuille dire la même chose dans chaque antenne. Le catalogue est une liste gérée ; le menu déroulant du formulaire de création fait toujours autorité pour votre église.

Voici les types livrés avec Kairos :

| Ministère | Description |
|----------|-------------|
| Admin | Feuilles de présence du jour et accueil des premières visites |
| Chorale | Ministère musical et louange |
| Design | Graphisme et création |
| Théâtre | Théâtre et scène |
| Équipe de suivi | Recontacte les premières visites, et les membres sans cellule ni département |
| Hospitalité | Repas, rafraîchissements et accueil des invités |
| Équipe d'accueil | Accueille les nouveaux le jour même |
| Nouveaux croyants | Accompagnement et discipulat des nouveaux convertis |
| Production | Régie et lumière |
| Gardiens du sanctuaire | Nettoyage et préparation des locaux |
| Réseaux sociaux | Présence en ligne et contenus |
| Son | Ingénierie et mixage audio |
| Placiers | Portes, placement et ordre |
| Entraide | Soin pastoral et aide matérielle |

::: tip Équipe d'accueil et Équipe de suivi ne font pas le même travail
L'équipe d'accueil reçoit quelqu'un pendant qu'il est dans le bâtiment. L'équipe de suivi le recontacte après, et travaille aussi la liste des membres qui n'appartiennent encore à aucun groupe. Ce sont délibérément deux départements distincts, parce que ce sont deux créneaux et deux compétences. Voir [Suivis](/fr/platform/follow-ups).
:::

Utilisez le menu **Toutes les antennes** pour filtrer quand vous gérez plusieurs sites.

## Les fiches de département

Chaque fiche affiche :
- Le nom du département et l'antenne
- Le nom du responsable
- Le nombre de membres actifs
- La description
- Un bouton **Désactiver** (pasteurs et administrateurs uniquement)
- Un badge **En attente** s'il y a des demandes d'adhésion à traiter

## Créer un département

Cliquez sur **+ Nouveau département** (pasteurs et administrateurs uniquement) :

<div class="screenshot-window screenshot-light">

![Formulaire de création d'un département](/screenshots/fr/set-up-department-light.png)

</div>

<div class="screenshot-window screenshot-dark">

![Formulaire de création en thème sombre](/screenshots/fr/set-up-department.png)

</div>

| Champ | Remarques |
|-------|-------|
| Type de ministère | À choisir dans la liste ci-dessus |
| Antenne | Obligatoire |
| Responsable | Obligatoire ; doit être un membre de l'antenne |
| Adjoint | Facultatif ; doit être différent du responsable |
| Date de début | Aujourd'hui par défaut |
| Description | Facultative |

Chaque antenne peut avoir une seule instance active de chaque type de département.

## Rejoindre un département

Un membre peut demander à rejoindre un département depuis son profil ou la page du département. La demande part au responsable pour approbation. Un membre peut appartenir à **deux départements** au maximum en même temps. Le système avertit le responsable si le membre en a déjà deux, mais un administrateur peut passer outre.

## Demandes en attente

Quand une fiche affiche un badge **en attente**, le responsable a des demandes d'adhésion non traitées.

## L'effectif du département

Les responsables voient l'effectif complet, avec les coordonnées, les dates d'arrivée et les notes de suivi.

## Qui peut gérer les départements

| Action | Membre | Responsable | Pasteur | Admin |
|--------|--------|--------|--------|-------|
| Voir la liste | Oui | Oui | Oui | Oui |
| Créer un département | Non | Non | Oui | Oui |
| Désactiver un département | Non | Non | Oui | Oui |
| Approuver les demandes | Non | Le sien | Oui | Oui |
| Voir l'effectif | Non | Le sien | Oui | Oui |
| Consigner un suivi | Non | Le sien | Oui | Oui |
