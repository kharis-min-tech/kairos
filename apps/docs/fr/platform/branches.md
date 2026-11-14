# Antennes

<SectionClip slug="platform/branches" />

La page Antennes affiche chaque site de l'église dans le système. Les administrateurs voient toutes les antennes de toutes les régions. Les pasteurs et les membres voient le contexte de leur propre antenne.

<div class="screenshot-window screenshot-light">

![Page Antennes : tous les sites de l'église](/screenshots/fr/branches.png)

</div>

<div class="screenshot-window screenshot-dark">

![Page Antennes en thème sombre](/screenshots/fr/branches-dark.png)

</div>

## Les fiches d'antenne

Chaque antenne apparaît sous forme de fiche avec :
- Le nom et le badge de type (**Principale** ou **Satellite**)
- Le nom de la région
- La ville, l'e-mail et le téléphone
- Un bouton **Désactiver** (administrateurs uniquement)

## Filtrer par région

Utilisez le menu **Toutes les régions** en haut pour filtrer par région. Utile quand vous gérez des antennes dans plusieurs pays.

## Ajouter une antenne

Cliquez sur **+ Nouvelle antenne** (administrateurs uniquement) et renseignez :

| Champ | Obligatoire | Remarques |
|-------|----------|-------|
| Nom de l'antenne | Oui | Doit être unique dans la région |
| Région | Oui | Doit exister ; créez-la d'abord |
| Type d'antenne | Oui | Principale, Satellite, Cellule, Campus ou En ligne |
| Ville | Non | Affichée sur la fiche |
| Adresse | Non | Adresse complète |
| Téléphone | Non | Doit être unique parmi toutes les antennes |
| E-mail | Non | Doit être unique parmi toutes les antennes |
| Date de création | Non | Donnée historique |

## Désactiver une antenne

Désactiver une antenne est une suppression en douceur : toutes les fiches de membres, les données de présence et l'historique sont conservés. L'antenne disparaît des vues actives mais reste en base.

Seuls les administrateurs peuvent désactiver une antenne.

## Mon antenne

Les membres et les pasteurs accèdent à la leur depuis le lien **Mon antenne** dans la barre latérale. Cette page montre les détails, la direction en place et des raccourcis.

<div class="screenshot-window screenshot-light">

![Page Mon antenne : détails, direction et actions rapides](/screenshots/fr/my-branch.png)

</div>

<div class="screenshot-window screenshot-dark">

![Page Mon antenne en thème sombre](/screenshots/fr/my-branch-dark.png)

</div>

### Détails de l'antenne

Affiche la ville, l'adresse, le téléphone, l'e-mail, le nombre total de membres et l'état d'activité.

### Direction en place

Liste le pasteur principal actuel et les ministres affectés à l'antenne, avec leurs noms et leurs fonctions. Une antenne a au plus un pasteur principal en exercice ; les ministres s'ajoutent à lui.

La direction d'une antenne est une **fonction**, pas une autorisation. Elle enregistre qui occupe quel poste. La seule chose qu'elle confère est le droit de regard en protection : le pasteur principal en exercice voit automatiquement la [boîte protection](/fr/platform/concerns) de son antenne, et un ministre non, même si tous deux détiennent la même attribution d'antenne.

### Actions rapides

Des boutons raccourcis vers **Voir les membres**, **Voir les cellules** et **Rapports** pour l'antenne.
