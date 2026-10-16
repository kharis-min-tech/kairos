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

Deux absences sont délibérées :

- **Il n'y a pas de `members:write`.** Les fiches de membres sont des données d'antenne : elles sont gardées par `branch:write`.
- **`membership:admin` n'a pas de séparation lecture/écriture.** Aucun écran d'adhésion destiné aux membres ne demande de capacité, donc tout ce que la capacité garde est par définition de l'administration.

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

`welfare:read` reposait autrefois sur `branch:write`. Cela voulait dire qu'un administrateur de données d'antenne — un rôle purement opérationnel, sans responsabilité pastorale — pouvait lire la boîte entraide *et* la boîte protection. Donner à l'entraide sa propre capacité a corrigé cela.

L'arrangement actuel est délibéré des deux côtés :

- `BranchAdmin` détient `welfare:read` mais **pas** `safeguarding:read`. L'entraide est du soin pastoral et revient à la direction de l'antenne.
- `SafeguardingLead` détient `safeguarding:read` mais **pas** `welfare:read`. La protection est de la sauvegarde et revient à quelqu'un d'indépendant de la direction. Le référent protection est toujours une autre personne que le pasteur principal, par construction.
- Un pasteur principal obtient la vue protection par l'habilitation déduite `BranchPastor` : un ministre détenant la même habilitation d'administrateur système d'antenne ne l'obtient donc pas.
- `BranchDataAdmin` n'a ni l'une ni l'autre.

## Comment une vérification est tranchée

Une seule fonction tranche toutes les vérifications de capacité du produit : `matchesCapability`, dans `packages/types/src/rbac.ts`. Le serveur l'applique, et l'application web comme l'application mobile y conditionnent leurs boutons : un bouton proposé par l'une ou l'autre est un bouton que le serveur honorera. Elle a été recopiée à la main à trois endroits jusqu'à l'arrivée de la portée église ; les copies ont disparu, et il ne doit plus en apparaître.

Les règles, dans l'ordre :

1. **`systemRole` vaut `admin`.** Toujours autorisé. C'est le contournement de secours.
2. **Aucune portée n'a été demandée.** N'importe quelle habilitation portant la capacité suffit.
3. **Correspondance exacte.** La sorte et l'identifiant de portée de l'habilitation sont ceux de la cible.
4. **Correspondance hiérarchique.** Une habilitation `branch` satisfait une cible `fellowship` ou `department` dans la même antenne, à condition que l'appelant transmette l'antenne parente de la cible.
5. **Une habilitation d'église atteint tout.** Il n'y a qu'une église et elle est la racine : une habilitation d'église satisfait une cible à n'importe quelle profondeur — toute antenne, toute cellule, tout département. C'est ainsi qu'un responsable protection lit la file de chaque antenne depuis une seule habilitation.
6. **Une cible d'église n'accepte pas de correspondance hiérarchique.** L'inclusion ne va que dans un sens. Aucune habilitation d'antenne, quel qu'en soit le nombre, ne satisfait une vérification à l'échelle de l'église. Seule une habilitation d'église, ou un administrateur de la plateforme, le fait.

C'est la règle 6 qui surprend. Un membre qui est administrateur système de toutes les antennes de l'église ne peut toujours pas administrer le programme d'adhésion, parce que ce programme est à l'échelle de l'église et que l'église n'est à l'intérieur d'aucune antenne.

## D'où viennent les habilitations

Les habilitations sont résolues depuis la base à chaque requête, par `resolveGrants` dans `apps/api/src/lib/grants.ts`. Elle combine deux sources :

1. **Les habilitations stockées** dans la table `member_roles` : les lignes créées quand vous attribuez un rôle. Les lignes à portée église stockent un identifiant de remplacement pour la portée, et l'antenne inscrite sur la ligne n'est qu'un repère de classement, pas la portée de l'habilitation.
2. **L'habilitation déduite Pasteur d'antenne**, fabriquée pour qui occupe la ligne Pasteur principal dans `branch_leadership` pour une antenne. Elle n'est jamais écrite dans `member_roles` et n'apparaît jamais dans la liste des rôles.

## Comment le code s'y branche

Sur le serveur :

```ts
// One capability, scoped to a route parameter
requireCapability('branch:write', (c) => c.req.param('branchId'))

// Any one of a set is enough
requireAnyCapability(['branch:write', 'safeguarding:read'])

// Inside a service, where the entity is already loaded
enforceBranchScope(auth, branchId)
enforceLeaderOrAbove(auth, entity)
```

Dans l'application web :

```ts
const caps = useCapabilities()

if (caps.has('branch:write', { kind: 'branch', id: branchId })) {
  // show the edit control
}
```

Les deux appellent le même comparateur. Notez que certains modules, celui de l'adhésion en particulier, font leur contrôle dans la couche service plutôt qu'en middleware de route, parce qu'une même route peut être légitimement atteinte par plusieurs détenteurs différents avec des restrictions différentes. Lisez le service, pas seulement le routeur, quand vous devez savoir qui peut appeler quoi.
