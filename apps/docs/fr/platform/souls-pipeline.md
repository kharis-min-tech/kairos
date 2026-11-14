# Suivi des âmes

<SectionClip slug="platform/souls-pipeline" />

Le Suivi des âmes est la vue opérationnelle pour accompagner chaque personne recueillie lors d'une action d'évangélisation. Il montre où chaque âme en est de son parcours et rend le suivi facile à consigner.

<div class="screenshot-window screenshot-light">

![Suivi des âmes : colonnes Kanban Nouveau, Suivi en cours et Converti](/screenshots/fr/souls-pipeline.png)

</div>

<div class="screenshot-window screenshot-dark">

![Suivi des âmes en thème sombre](/screenshots/fr/souls-pipeline-dark.png)

</div>

## Les étapes

Les âmes passent par quatre étapes :

| Étape | Ce qu'elle veut dire |
|-------|---------|
| Nouveau | Tout juste recueilli ; aucun suivi consigné |
| Suivi en cours | Un contact actif a été établi |
| Intéressé | Montre un intérêt réel pour la foi |
| Converti | A pris une décision ; prêt pour l'inscription aux Nouveaux croyants |

Une cinquième issue, **Pas intéressé**, sort du parcours actif mais reste conservée dans les fiches.

## Les fiches d'âme

Chaque fiche affiche :
- Le nom et le numéro de téléphone de l'âme
- L'ouvrier attribué (avec ses initiales)
- La date du dernier contact, ou « Aucun suivi consigné »
- Un point d'état (dont la couleur dit la santé du suivi)

## Recueillir une âme

Cliquez sur **+ Recueillir une âme** pour ajouter quelqu'un au parcours :

| Champ | Remarques |
|-------|-------|
| Prénom, Nom | Obligatoires |
| Téléphone | Recommandé pour le suivi |
| E-mail | Facultatif |
| Genre | Facultatif |
| Tranche d'âge | Facultative |
| Programme d'évangélisation | À relier au programme où la personne a été rencontrée |
| Adresse / Ville | Facultatif |
| Notes | Tout contexte initial |

L'âme est automatiquement attribuée au membre qui la recueille. Elle peut être réattribuée à un autre ouvrier si besoin.

## Consigner un suivi

Ouvrez une fiche d'âme et ajoutez une entrée de suivi :

- Date et heure
- Moyen de contact : appel, SMS, e-mail, WhatsApp, visite en personne, autre
- Résultat : réussi, pas de réponse, mauvais numéro, rappeler plus tard, pas intéressé, intéressé
- Durée en minutes
- Notes
- Date du prochain suivi

## Filtrer le parcours

| Filtre | Options |
|--------|---------|
| Antenne | Toutes les antennes ou une antenne précise (administrateurs uniquement) |
| Cellules | Mes cellules ou une cellule précise |
| Départements | Mes départements ou un département précis |
| Ouvrier | N'importe lequel ou un membre précis |
| Source | Tous les programmes ou un programme précis |

Triez par **Date d'ajout**, **Nom** ou **Dernier contact**.

## Les indicateurs de santé du suivi

- **Critique** : aucun contact depuis 7 jours ou plus
- **À surveiller** : un contact a eu lieu mais rien n'avance
- **Sur la bonne voie** : suivi récent et fructueux

## Le passage aux Nouveaux croyants

Quand une âme est marquée **Convertie**, une inscription est créée automatiquement dans le parcours [Nouveaux croyants](/fr/platform/new-believers).
