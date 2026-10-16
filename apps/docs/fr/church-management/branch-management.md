# Gestion des antennes

<SectionClip slug="church-management/branch-management" />

Créer et désactiver des antennes est réservé aux administrateurs. Les administrateurs d'antenne peuvent modifier les détails opérationnels de leur propre antenne et nommer sa direction, mais ne peuvent ni faire exister une antenne ni la faire disparaître.

## Créer une antenne

Allez dans **Antennes → + Nouvelle antenne** et remplissez :

| Champ | Obligatoire | Remarques |
|-------|----------|-------|
| Nom de l'antenne | Oui | Unique dans la région |
| Région | Oui | Doit exister ; créez la région d'abord |
| Type d'antenne | Oui | Principale, satellite, cellule, campus ou en ligne |
| Ville | Non | |
| Adresse | Non | |
| Téléphone | Non | Doit être unique dans tout le système |
| E-mail | Non | Doit être unique dans tout le système |
| Date de fondation | Non | Pour l'historique seulement |

## Nommer un pasteur

Une fois l'antenne créée, nommez son pasteur principal :

1. Allez dans **Mon antenne** (ou ouvrez l'antenne depuis **Antennes**)
2. Dans la section **Direction actuelle**, ajoutez le pasteur
3. Seuls des membres déjà dans le système peuvent être nommés
4. Chaque antenne a **un seul pasteur principal** à la fois
5. Des ministres peuvent être ajoutés en plus du pasteur principal

Nommer et mettre fin à une fonction demande la clé de permissions de l'antenne : un administrateur de la plateforme ou l'administrateur système de l'antenne peut le faire. Un administrateur de données d'antenne, non.

::: tip Le pasteur principal porte une permission
La direction d'une antenne est une fonction, pas une habilitation, mais le pasteur principal en poste obtient automatiquement la vue sur la [boîte protection](/fr/platform/concerns) de son antenne. Mettre fin à la nomination la retire. Voir [Permissions des utilisateurs](/fr/administration/permissions#l-habilitation-deduite-pasteur-d-antenne).
:::

Les nominations portent une date de début et une date de fin facultative, ce qui constitue un historique complet de la direction de l'antenne.

## Modifier une antenne

Cliquez sur une antenne depuis la page Antennes pour modifier son nom, son type, ses coordonnées ou sa région. Un administrateur de la plateforme peut modifier n'importe quelle antenne ; un administrateur système ou de données d'antenne peut modifier la sienne.

## Désactiver une antenne

Utilisez le bouton **Désactiver** sur la fiche de l'antenne. C'est une suppression douce : toutes les fiches de membres, l'historique des présences et les données de cette antenne sont conservés. L'antenne disparaît des vues actives mais reste dans les rapports.

## Gérer plusieurs antennes

Le filtre **Toutes les régions** de la page Antennes permet de restreindre par région. Pour les églises implantées dans plusieurs pays, cela garde la vue lisible.

## L'isolement des antennes

Les données sont strictement isolées par antenne. Un pasteur de Kharis London Central ne peut pas voir les membres, les départements, les cellules ni les rapports de Kharis Accra. Seuls les administrateurs ont une visibilité inter-antennes.

Cet isolement est appliqué au niveau de l'API, pas seulement par un filtre d'interface.
