# Préoccupations

<SectionClip slug="platform/concerns" />

La page **Préoccupations** est la boîte de réception des [suivis](/fr/platform/follow-ups) que quelqu'un a signalés comme demandant attention. Elle a deux onglets, qui portent deux types de préoccupation, lus par deux groupes de personnes différents.

## Entraide et protection ne sont pas la même chose

Ce ne sont pas deux niveaux de gravité d'une même chose. Ce sont deux domaines distincts, et Kairos les tient séparés exprès.

| | Entraide | Protection |
|---|---------|--------------|
| Ce que c'est | Soin pastoral : quelqu'un est en difficulté, en deuil, malade, en peine financière ou pratique | Sauvegarde : une préoccupation concernant un enfant ou un adulte vulnérable |
| Qui doit agir | La direction pastorale de l'antenne | Quelqu'un d'indépendant de la direction de l'antenne |
| Qui lit l'onglet | L'administrateur système d'antenne | Le pasteur principal de l'antenne, le référent protection de l'antenne, et le responsable protection de l'église |

Un même suivi peut porter les deux signalements et apparaîtra dans les deux onglets.

## Pourquoi les listes de lecteurs diffèrent

C'est la partie à lire attentivement, parce que c'est toute la raison d'être de la séparation.

**L'entraide reposait autrefois sur l'accès général à l'antenne.** Cela voulait dire qu'un administrateur de données d'antenne — quelqu'un dont le travail est les fiches et les registres, et qui n'a aucune responsabilité pastorale — pouvait lire la boîte entraide *et* la boîte protection. Donner à l'entraide sa propre permission a corrigé cela.

**La protection, délibérément, ne suit pas l'administration de l'antenne.** Un administrateur système d'antenne n'obtient pas l'onglet protection par cette habilitation. La vue protection vient de l'un de ces trois endroits :

- **Être le pasteur principal de l'antenne.** Kairos le déduit de la fiche de direction de l'antenne, automatiquement, à chaque requête. Ce n'est pas une habilitation que l'on attribue.
- **Détenir l'habilitation Référent protection** pour l'antenne. Elle est censée revenir à quelqu'un d'autre que le pasteur principal : le rôle existe pour être indépendant de la direction de l'antenne.
- **Détenir l'habilitation Responsable protection**, qui est à l'échelle de l'église et lit la file de chaque antenne depuis une seule habilitation. C'est la voie d'escalade au-dessus du référent d'une antenne, pour quand une préoccupation soulevée dans une antenne doit en sortir entièrement.

La conséquence qui surprend : un **ministre** détenant exactement la même habilitation d'administrateur système d'antenne que le pasteur principal de son antenne ne voit **pas** l'onglet protection. C'est la fonction, pas l'habilitation, qui l'ouvre. Voir [Permissions des utilisateurs](/fr/administration/permissions#l-habilitation-deduite-pasteur-d-antenne).

## Ce que vous voyez

Les onglets n'apparaissent que si vous pouvez les lire. Quelqu'un qui a la vue protection sans la vue entraide voit un seul onglet, et non un onglet entraide qui refuse de s'ouvrir. Si vous ne pouvez lire ni l'un ni l'autre, la page n'est pas dans votre menu.

Chaque onglet liste les suivis signalés de votre antenne, avec la personne, la date du contact et les notes. Ouvrez une fiche pour aller à la fiche du membre et à l'historique complet des suivis.

L'onglet protection d'un responsable protection est à l'échelle de l'église plutôt que de l'antenne : il liste donc les préoccupations de toutes les antennes.

## Les préoccupations au sujet de personnes sans groupe

Les suivis signalés sont trouvés par **antenne**, pas par groupe. Une préoccupation soulevée au sujet de quelqu'un qui n'appartient ni à une cellule ni à un département atteint quand même la bonne boîte. Cela compte, parce que c'est souvent exactement de cette personne qu'il s'agit.

## Soulever une préoccupation

Ce n'est pas sur cette page qu'on soulève une préoccupation. On la soulève en cochant **préoccupation d'entraide** ou **préoccupation de protection** au moment de consigner un suivi, depuis une cellule, un département, la page Suivis ou la fiche d'un membre. Voir [Suivis](/fr/platform/follow-ups#les-deux-signalements).

::: warning Kairos n'est pas l'escalade
La boîte de réception garantit que la bonne personne voit la chose. Elle ne remplit pas la politique de protection de votre église, et elle ne remplace pas un appel téléphonique. Suivez votre procédure écrite ; utilisez le signalement pour que la trace existe.
:::
