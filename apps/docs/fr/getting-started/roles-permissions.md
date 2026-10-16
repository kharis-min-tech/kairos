# Rôles et permissions

<SectionClip slug="getting-started/roles-permissions" />

Ce que vous pouvez voir et faire dans Kairos est décidé par les **habilitations** de votre compte, pas par un titre. Il n'y a pas de sélecteur de rôle, et pas d'étape après la connexion où vous choisissez qui être. Vos permissions sont posées à la configuration de votre compte et prennent effet dès votre prochaine connexion.

## La première chose à comprendre

Kairos ne stocke que deux rôles système : `admin` et `member`. Toute personne qui n'est pas dans la petite équipe de la plateforme est un `member`, y compris le pasteur principal.

L'autorité réelle vient des **habilitations** : un lot de droits nommé, fixé à une antenne, une cellule, un département ou l'église entière. Détenez une habilitation Responsable de cellule pour Grace K-Group et vous pouvez animer Grace K-Group. N'en détenez aucune et vous gérez votre propre fiche. Détenez-en plusieurs et vous les avez toutes, chacune dans sa frontière.

::: warning « Pasteur » et « Responsable » ne sont pas des rôles
Ce sont des mots utiles pour désigner un *ensemble* d'habilitations, et cette documentation les emploie ainsi. Mais il n'y a pas de rôle Pasteur ni de rôle Responsable à attribuer. Un membre dont la fiche porte le titre « Pasteur » a exactement les permissions que ses habilitations lui donnent, c'est-à-dire parfois aucune.
:::

## Les quatre formes d'accès

Presque tout le monde dans une église relève de l'un de quatre schémas. Le reste de cette documentation emploie ces étiquettes comme raccourci, y compris dans les tableaux « qui peut faire quoi » de chaque page.

| Étiquette | Ce que ça veut vraiment dire | Portée |
|-------|-----------------------|-------|
| **Membre** | Aucune habilitation | Ses propres données seulement |
| **Responsable** | Une habilitation de responsable de cellule, de département ou d'adjoint | Le groupe nommé sur l'habilitation, et rien d'autre |
| **Pasteur** | Une habilitation d'administrateur système ou de données d'antenne | Une antenne |
| **Admin** | `systemRole` valant `admin` | Tout, dans toutes les antennes |

Pour le catalogue complet, y compris les habilitations d'église qui n'entrent dans aucune de ces quatre formes, voir [Permissions des utilisateurs](/fr/administration/permissions).

---

## Membre

Tout le monde commence ici. Après l'inscription et l'approbation, un membre peut :

**Il peut :**
- Voir et modifier sa propre fiche (nom, coordonnées, photo, contact d'urgence)
- Voir son statut d'adhésion et son antenne de rattachement
- Voir à quels départements et cellules il appartient
- Consulter son historique dans **Mes présences**
- Soumettre des formulaires : première visite, cours Nouveaux croyants, baptême, témoignage, imposition du nom, présentation d'enfant
- Parcourir les promotions du cours de membre et manifester son intérêt
- Demander à rejoindre une cellule, un département ou un programme d'évangélisation de son antenne
- S'inscrire comme ouvrier sur un programme d'évangélisation
- Exporter ses données et demander la suppression de son compte, depuis les Paramètres

**Il ne peut pas :**
- Voir les fiches ou les données des autres membres
- Gérer un groupe, une cellule ou un département
- Approuver des demandes ou prendre des mesures administratives
- Ouvrir l'annuaire des membres, les files de suivi ou la boîte Préoccupations

::: tip Les membres en attente
Un membre en attente (inscrit mais pas encore approuvé) ne voit que sa propre fiche, jusqu'à ce que quelqu'un ayant le droit d'approuver dans son antenne valide le compte.
:::

---

## Responsable

Un responsable est quelqu'un nommé responsable, co-responsable ou adjoint d'un groupe. C'est la nomination sur le groupe qui crée l'habilitation ; il n'y a rien à attribuer à la main. Son accès est strictement limité à ce groupe. Un responsable sans groupe a le même accès qu'un membre.

**Il peut :**
- Voir et gérer l'effectif de son département ou de sa cellule
- Accepter ou refuser les demandes d'adhésion à son groupe
- Pointer les réunions et en créer
- Consigner des suivis sur les membres de son groupe
- Voir les coordonnées des membres de son groupe
- Créer et modifier les programmes d'évangélisation qu'il coordonne

**Ce qu'il voit des Nouveaux croyants et de l'adhésion :**
- Un responsable de cellule ou de département voit l'avancement Nouveaux croyants et cours de membre de **ses propres gens**, restreint par qui est dans son groupe plutôt que par antenne

**Rapports :**
- Des données limitées aux membres de son groupe, pas à toute l'antenne

**Il ne peut pas :**
- Accéder à des données hors de son groupe
- Créer des antennes, approuver des inscriptions ou attribuer des habilitations
- Voir l'effectif d'autres départements ou cellules
- Lire la boîte entraide ou la boîte protection

---

## Pasteur

« Pasteur » signifie ici quelqu'un détenant une habilitation d'antenne. Il y en a deux sortes, et la différence compte.

**Administrateur système d'antenne** détient les clés de permissions de l'antenne :
- Tout ce que fait un administrateur de données d'antenne, plus
- Accorder et retirer Administrateur système d'antenne dans sa propre antenne
- Nommer ou démettre la direction de l'antenne (pasteur principal, ministre)
- Lire la boîte entraide de l'antenne

**Administrateur de données d'antenne**, c'est l'opérationnel sans les clés :
- Voir et gérer tous les membres de son antenne
- Approuver les nouvelles inscriptions
- Désactiver et réactiver des membres
- Importer et exporter les données des membres en CSV
- Créer et gérer toutes les cellules et tous les départements de son antenne
- Créer les programmes d'évangélisation de son antenne
- Enregistrer les présences aux cultes et aux réunions de cellule
- Travailler les files premières visites, sans groupe et à faire
- Voir et exporter tous les types de soumissions, et gérer les visiteurs dormants
- Accéder aux rapports d'antenne : croissance, tendances de présence, activité des cellules, parcours Nouveaux croyants

**Aucun des deux ne peut :**
- Accéder aux données d'une autre antenne
- Créer, modifier ou désactiver des antennes
- Faire de quelqu'un un administrateur de la plateforme
- Voir les analyses de toute l'église
- Administrer le cours de membre, qui est à l'échelle de l'église

::: warning La protection n'est pas incluse
Aucune des deux habilitations d'antenne ne porte la vue protection. Le **pasteur principal** de l'antenne l'obtient automatiquement du fait de sa fonction, et un **référent protection** l'obtient par habilitation. Un ministre détenant la même habilitation d'administrateur système que le pasteur principal ne voit pas la file protection. Voir [Permissions des utilisateurs](/fr/administration/permissions#l-habilitation-deduite-pasteur-d-antenne).
:::

---

## Admin

Les administrateurs de la plateforme ont un accès complet et sans restriction. Toute vérification de capacité renvoie vrai pour eux, dans toutes les antennes. C'est un accès de secours pour la petite équipe qui fait tourner le système, pas une marque d'ancienneté.

**Ils peuvent :**
- Créer et gérer les antennes et les régions
- Attribuer et retirer des habilitations à n'importe quel membre de n'importe quelle antenne
- Gérer les membres de toutes les antennes
- Voir les analyses de toute l'église et sortir des rapports inter-antennes
- Administrer le cours de membre
- Gérer les files d'approbation de toutes les antennes
- Configurer des réglages système indisponibles à tout autre

---

## Les habilitations d'église

Deux habilitations n'appartiennent à l'antenne de personne, parce que ce qu'elles couvrent est à l'échelle de l'église :

| Habilitation | Portée |
|-------|-------|
| **Administrateur d'adhésion** | Tout le cours de membre : promotions, séances, vivier, admission, notation, remise des diplômes. Les promotions sont à l'échelle de l'église : aucune habilitation d'antenne ne pourrait décrire une autorité sur l'une d'elles. |
| **Responsable protection** | La protection dans toutes les antennes. La voie d'escalade au-dessus du référent d'une antenne, parce qu'une préoccupation soulevée dans une antenne doit parfois en sortir entièrement. |

Une habilitation d'église atteint toutes les antennes. L'inverse n'est jamais vrai : détenir une habilitation dans chaque antenne ne satisfait toujours pas une vérification à l'échelle de l'église.

---

## La matrice des permissions

En utilisant les quatre étiquettes ci-dessus.

| Action | Membre | Responsable | Pasteur | Admin |
|--------|--------|--------|--------|-------|
| Modifier sa fiche | Oui | Oui | Oui | Oui |
| Voir ses présences | Oui | Oui | Oui | Oui |
| Soumettre des formulaires | Oui | Oui | Oui | Oui |
| Manifester son intérêt pour un cours de membre | Oui | Oui | Oui | Oui |
| Exporter ses données / demander la suppression | Oui | Oui | Oui | Oui |
| Voir l'effectif d'un groupe | Non | Son groupe | Oui | Oui |
| Accepter les demandes | Non | Son groupe | Oui | Oui |
| Pointer les présences | Non | Son groupe | Oui | Oui |
| Gérer les membres | Non | Non | Son antenne | Oui |
| Approuver les inscriptions | Non | Non | Son antenne | Oui |
| Importer / exporter en CSV | Non | Non | Son antenne | Oui |
| Créer des départements | Non | Non | Son antenne | Oui |
| Files de suivi | Non | Non | Son antenne | Oui |
| Rapports d'antenne | Non | Son groupe | Son antenne | Oui |
| Boîte entraide | Non | Non | Administrateur système d'antenne uniquement | Oui |
| Boîte protection | Non | Non | Pasteur principal ou référent protection uniquement | Oui |
| Administrer les cours de membre | Non | Non | Non (habilitation d'église) | Oui |
| Accorder Administrateur système d'antenne | Non | Non | Administrateur système, son antenne | Oui |
| Nommer la direction d'une antenne | Non | Non | Administrateur système, son antenne | Oui |
| Gérer les antennes | Non | Non | Non | Oui |
| Gérer les régions | Non | Non | Non | Oui |
| Analyses de toute l'église | Non | Non | Non | Oui |
| Faire de quelqu'un un administrateur de la plateforme | Non | Non | Non | Oui |
