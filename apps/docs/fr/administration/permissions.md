# Permissions des utilisateurs

<SectionClip slug="administration/permissions" />

Dans Kairos, les permissions reposent sur des **habilitations fonctionnelles**, pas sur un titre. Comprendre la différence entre un rôle système, une habilitation et une portée est la clé pour configurer correctement les accès.

## Les deux rôles système

Chaque fiche de membre porte un `systemRole`, qui n'a que deux valeurs possibles :

| Rôle | Qui l'a |
|------|-----------|
| `admin` | La petite équipe de la plateforme. Contourne toutes les vérifications, dans toutes les antennes. À traiter comme un accès de secours, pas comme un titre. |
| `member` | Tout le monde, de la première visite au pasteur principal. Toute leur autorité vient des habilitations. |

## Les habilitations fonctionnelles

Une habilitation est un lot de droits nommé, attaché à une portée précise. Ce sont elles qui donnent à un `member` un accès au-delà de sa propre fiche. Un membre peut en détenir plusieurs, et chacune est indépendante.

| Habilitation | Nom dans la liste des rôles | Portée | Ce qu'elle ouvre |
|-------|----------------------|-------|-----------------|
| `BranchAdmin` | Administrateur système d'antenne | Antenne | Tout l'opérationnel de l'antenne, plus la possibilité d'accorder ce rôle et de nommer la direction. Lit aussi la boîte entraide. |
| `BranchDataAdmin` | Administrateur de données d'antenne | Antenne | L'opérationnel sans les clés de permissions : modification des membres, import et export, approbations. Pas d'attribution de rôles, et **aucune** vue entraide ni protection. |
| `FellowshipLeader` | Responsable de cellule | Cellule | Gère l'effectif, les réunions, les présences et les suivis d'une cellule. |
| `DepartmentLeader` | Responsable de département | Département | Gère l'effectif, les demandes, le planning, les tenues et les suivis d'un département. |
| `DepartmentDeputy` | Adjoint de département | Département | La même portée que le responsable, pour un département. |
| `SafeguardingLead` | Référent protection | Antenne | La boîte protection de l'antenne, et rien d'autre. Ni l'annuaire, ni les rapports, ni l'entraide. |
| `SafeguardingHead` | Responsable protection | Église | La protection dans toutes les antennes. La voie d'escalade au-dessus du référent d'une antenne. |
| `NewBelieversMentor` | Mentor Nouveaux croyants | Antenne | Les tâches de mentorat dans le parcours Nouveaux croyants. |
| `NewBelieversTeacher` | Enseignant Nouveaux croyants | Antenne | Les tâches d'enseignement dans le parcours Nouveaux croyants. |
| `MembershipAdmin` | Administrateur d'adhésion | Église | Mène le [cours de membre](/fr/platform/membership) de bout en bout : promotions, séances, vivier, admission, notation, remise des diplômes. |
| `MembershipChampion` | Référent d'adhésion | Antenne | Vue en lecture seule de la liste d'attente et des admis d'une antenne, plus les notifications d'adhésion de cette antenne. Jamais de modification. |

### L'habilitation déduite : pasteur d'antenne

Il existe une onzième habilitation que personne n'attribue. Kairos la déduit.

Celui qui occupe la ligne **Pasteur principal** dans la direction d'une antenne reçoit automatiquement une habilitation `BranchPastor`, à chaque requête. Elle porte la vue protection de cette antenne, et rien d'autre.

Elle existe parce que la vue protection doit suivre l'identité plutôt que l'autorité. Un pasteur principal et un ministre peuvent détenir exactement la même habilitation d'administrateur système d'antenne, et pourtant seul le pasteur principal doit voir la file protection. Aucune table rôle-vers-permission ne peut distinguer ces deux personnes ; c'est donc la fiche de direction qui parle.

Conséquences pratiques :

- Vous ne pouvez ni ajouter ni retirer Pasteur d'antenne dans la liste des rôles. Il n'y figurera pas.
- Pour donner la vue protection à quelqu'un, faites-en le pasteur principal de l'antenne, ou accordez-lui Référent protection.
- Mettre fin à une nomination de pasteur principal retire la vue protection du même coup.

## Les portées

Chaque habilitation est fixée à une portée, et il y en a quatre sortes :

| Sorte de portée | Ce qu'elle nomme | Utilisée par |
|------------|-------|---------|
| `branch` | Une antenne | La plupart des habilitations |
| `fellowship` | Une cellule | Responsable de cellule |
| `department` | Un département | Responsable et adjoint de département |
| `church` | Rien ; il n'y a qu'une église | Administrateur d'adhésion, responsable protection |

Une habilitation d'antenne atteint aussi les cellules et départements **à l'intérieur** de cette antenne. Une habilitation d'église atteint tout. L'inclusion ne va que dans un sens : détenir Administrateur système d'antenne pour toutes les antennes de l'église ne satisfait toujours pas une vérification à l'échelle de l'église, parce que l'église n'est pas à l'intérieur d'une antenne.

Voyez la [Référence des capacités](/fr/administration/capabilities) si vous avez besoin des règles exactes.

## Attribuer une habilitation

Où une habilitation s'attribue dépend de sa portée.

**Les habilitations d'antenne et d'église** s'attribuent depuis la fiche du membre :

1. Allez dans **Membres** et ouvrez la fiche
2. Ouvrez la section des rôles
3. Choisissez le rôle et l'antenne
4. Enregistrez

Un administrateur de la plateforme peut le faire pour n'importe quel membre, dans n'importe quelle antenne. Un administrateur système d'antenne peut accorder et retirer **Administrateur système d'antenne** dans sa propre antenne, et y nommer ou démettre la direction, mais n'atteint pas les autres antennes.

::: tip Les habilitations d'église demandent quand même une antenne
Quand vous accordez Administrateur d'adhésion ou Responsable protection, le formulaire demande encore quelle antenne. Cette antenne n'est qu'un repère de classement, pour que l'habilitation apparaisse au bon endroit. Elle ne la limite pas : l'habilitation atteint toute l'église de toute façon.
:::

**Les habilitations de cellule et de département ne s'attribuent pas ici.** Tenter d'ajouter Responsable de cellule depuis une fiche de membre est refusé, avec un message qui vous indique où aller. Ces habilitations s'écrivent toutes seules quand vous nommez quelqu'un responsable, co-responsable ou adjoint sur le groupe lui-même :

- Responsable et co-responsable de cellule : sur la cellule, depuis **Cellules**
- Responsable et adjoint de département : sur le département, depuis **Départements**

Les retirer du groupe retire l'habilitation.

## Retirer une habilitation

Retirez-la de la section des rôles du membre, ou retirez la personne du groupe qui la conférait. Rien n'est supprimé : l'attribution est marquée inactive, pour que l'historique de qui avait quoi, et quand, survive.

Le système refuse de retirer le dernier administrateur système d'une antenne. Une antenne doit toujours avoir quelqu'un qui peut distribuer les permissions.

## Quand un changement prend effet

Deux choses vont à des vitesses différentes, et il vaut mieux savoir laquelle est laquelle.

- Dès que vous enregistrez, le serveur cesse d'honorer une habilitation retirée et commence à honorer une nouvelle. Il n'y a aucune fenêtre où des permissions périmées s'appliquent encore.
- **L'écran de la personne est piloté par son jeton de connexion.** Boutons, entrées de menu et pages apparaissent ou disparaissent au prochain renouvellement du jeton, qui se fait en arrière-plan pendant l'usage normal, ou tout de suite si elle se déconnecte et se reconnecte.

Donc une habilitation retirée s'applique immédiatement, même si le bouton désormais interdit reste brièvement à l'écran : l'appuyer échoue. Une habilitation ajoutée est honorée par le serveur immédiatement, mais les nouvelles entrées de menu arrivent au renouvellement du jeton. Si quelqu'un dit « vous m'avez donné l'accès mais je ne le vois pas », demandez-lui de se déconnecter et de se reconnecter.

## Le titre de Pasteur

`pastor` survit à exactement un endroit : le **titre de civilité** sur la fiche d'un membre, à côté de « Révérend », « Ancien » et tout ce que vous voudrez taper. C'est un titre d'affichage, jusqu'à 50 caractères, et il n'accorde **rien**.

Un membre portant le titre « Pasteur » qui ne détient qu'une habilitation de responsable de cellule voit exactement ce que voit un responsable de cellule. Pour un accès à toute l'antenne, il lui faut une habilitation d'administrateur système d'antenne.

Notez que le titre est une chose distincte d'une **nomination** à la direction d'une antenne. Le titre dit comment on s'adresse à quelqu'un ; la fiche de direction (pasteur principal ou ministre) dit qui occupe la fonction dans une antenne, et seul le pasteur principal porte la vue protection déduite décrite plus haut.
