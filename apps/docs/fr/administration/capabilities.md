# Référence des capacités

<SectionClip slug="administration/capabilities" />

Cette page est la version précise de [Permissions des utilisateurs](/fr/administration/permissions). Elle est écrite pour qui doit répondre « pourquoi cette personne voit-elle cela ? » avec certitude, et pour les développeurs qui étendent le système.

Les habilitations ne sont pas vérifiées directement. Chacune est traduite en un ensemble de **capacités**, et chaque garde-fou de Kairos, sur le serveur comme dans les deux applications, pose la même question : cette personne détient-elle cette capacité, à cette portée ?

## Le catalogue des capacités

Les voici toutes. Il n'y en a pas d'autres.

| Capacité | Ce qu'elle garde |
|------------|---------------|
| `branch:read` | Lire les données d'une antenne par-delà les frontières d'antenne |
| `branch:write` | Les opérations d'antenne : fiches de membres, import et export, présences, files de suivi |
| `branch:rbac` | Accorder Administrateur système d'antenne, et nommer ou démettre la direction |
| `fellowship:read` | Lire l'effectif et les réunions d'une cellule |
| `fellowship:write` | Gérer une cellule : effectif, demandes, réunions, présences |
| `department:read` | Lire l'effectif d'un département |
| `department:write` | Gérer un département : effectif, demandes, planning, tenues, recrutement |
| `safeguarding:read` | L'onglet protection de la boîte [Préoccupations](/fr/platform/concerns) |
| `safeguarding:write` | Agir sur une préoccupation de protection |
| `welfare:read` | L'onglet entraide de la boîte [Préoccupations](/fr/platform/concerns) |
| `signup:approve` | Approuver ou refuser une inscription faite par la personne elle-même |
| `newbelievers:mentor` | Les tâches de mentorat dans le parcours Nouveaux croyants |
| `newbelievers:teach` | Les tâches d'enseignement dans le parcours Nouveaux croyants |
| `membership:admin` | Tout l'administratif du [cours de membre](/fr/platform/membership) |
| `membership:branch:read` | La vue en lecture seule d'un référent d'adhésion sur l'avancement d'une antenne |

## Quelle habilitation porte quelle capacité

| Habilitation | Capacités |
|-------|--------------|
| `BranchAdmin` | `branch:read`, `branch:write`, `branch:rbac`, `signup:approve`, `welfare:read` |
| `BranchDataAdmin` | `branch:read`, `branch:write`, `signup:approve` |
| `FellowshipLeader` | `fellowship:read`, `fellowship:write` |
| `DepartmentLeader` | `department:read`, `department:write` |
| `DepartmentDeputy` | `department:read`, `department:write` |
| `SafeguardingLead` | `safeguarding:read`, `safeguarding:write` |
| `SafeguardingHead` | `safeguarding:read`, `safeguarding:write` |
| `BranchPastor` (déduite) | `safeguarding:read`, `safeguarding:write` |
| `NewBelieversMentor` | `newbelievers:mentor` |
| `NewBelieversTeacher` | `newbelievers:teach` |
| `MembershipAdmin` | `membership:admin` |
| `MembershipChampion` | `membership:branch:read` |

### Pourquoi entraide et protection sont séparées

L'arrangement actuel est délibéré des deux côtés :

- `BranchAdmin` détient `welfare:read` mais **pas** `safeguarding:read`. L'entraide est du soin pastoral et revient à la direction de l'antenne.
- `SafeguardingLead` détient `safeguarding:read` mais **pas** `welfare:read`. La protection est de la sauvegarde et revient à quelqu'un d'indépendant de la direction. Le référent protection est toujours une autre personne que le pasteur principal, par construction.
- Un pasteur principal obtient la vue protection par l'habilitation déduite `BranchPastor` : un ministre détenant la même habilitation d'administrateur système d'antenne ne l'obtient donc pas.
- `BranchDataAdmin` n'a ni l'une ni l'autre.

## Comment une vérification est tranchée

Les règles, dans l'ordre :

1. **`systemRole` vaut `admin`.** Toujours autorisé. C'est le contournement de secours.
2. **Aucune portée n'a été demandée.** N'importe quelle habilitation portant la capacité suffit.
3. **Correspondance exacte.** La sorte et l'identifiant de portée de l'habilitation sont ceux de la cible.
4. **Correspondance hiérarchique.** Une habilitation `branch` satisfait une cible `fellowship` ou `department` dans la même antenne, à condition que l'appelant transmette l'antenne parente de la cible.
5. **Une habilitation d'église atteint tout.** Il n'y a qu'une église et elle est la racine : une habilitation d'église satisfait une cible à n'importe quelle profondeur — toute antenne, toute cellule, tout département. C'est ainsi qu'un responsable protection lit la file de chaque antenne depuis une seule habilitation.
6. **Une cible d'église n'accepte pas de correspondance hiérarchique.** L'inclusion ne va que dans un sens. Aucune habilitation d'antenne, quel qu'en soit le nombre, ne satisfait une vérification à l'échelle de l'église. Seule une habilitation d'église, ou un administrateur de la plateforme, le fait.

C'est la règle 6 qui surprend. Un membre qui est administrateur système de toutes les antennes de l'église ne peut toujours pas administrer le programme d'adhésion, parce que ce programme est à l'échelle de l'église et que l'église n'est à l'intérieur d'aucune antenne.
