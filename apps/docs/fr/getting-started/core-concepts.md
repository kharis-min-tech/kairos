# Notions clés

Comprendre ces six notions rendra le reste de la documentation beaucoup plus facile à suivre.

## 1. Les antennes

Une **antenne** est un site unique de l’église. Chaque donnée dans Kairos (membres, départements, cellules, programmes d’évangélisation, relevés de présence) appartient à une antenne. L’antenne est l’unité d’organisation de base.

Chaque antenne a :
- Un nom, un type (Principale, Satellite, Campus, etc.), une ville et des coordonnées
- Une région de rattachement
- Un pasteur principal et, éventuellement, des ministres
- Ses propres membres, cellules et départements

Les antennes ne voient pas les données les unes des autres, sauf si vous êtes administrateur.

## 2. Les personnes, et ce que « membre » veut dire

Tout le monde dans Kairos figure dans une seule liste. Une personne a une antenne de rattachement, et peut appartenir à une cellule et jusqu’à deux départements à l’intérieur de celle-ci.

C’est le mot *Membre* qui demande de la nuance. Dans cette église, un Membre est précisément quelqu’un qui a **terminé la classe d’adhésion de quatre semaines**. Venir depuis des années, servir dans un département, ou même diriger une cellule ne fait pas de quelqu’un un Membre au sens formel. Voir [Classes d’adhésion](/fr/platform/membership).

Chaque personne porte donc deux étiquettes indépendantes, et il vaut la peine de ne pas les confondre :

**Quel type de personne elle est :**
- **Membre** : a terminé la classe d’adhésion
- **Habitué** : vient sans avoir encore fait la classe. La majorité de l’assemblée, en général.
- **Visiteur** : vient de temps en temps, souvent créé par un formulaire de première visite
- **Enfant** : suivi à part, avec ses propres protections

**Si elle peut se connecter :**
- **En attente** : inscrite mais pas encore approuvée
- **Approuvée / Active** : accès complet accordé
- **Inactive** : supprimée en douceur, l’historique est conservé

Les visiteurs et les enfants restent visibles dans l’annuaire et dans les totaux de présence, parce qu’ils font partie de l’église et qu’il faut les compter. Ils sont simplement étiquetés pour que la différence saute aux yeux.

## 3. Rôles et attributions

Kairos utilise deux rôles au niveau du système (`admin` et `member`), mais les vraies autorisations viennent des **attributions fonctionnelles**. Une attribution est un ensemble de droits nommé, rattaché à une portée précise, et il y a quatre portées possibles : une **antenne**, une **cellule**, un **département**, ou l’**église** entière.

Par exemple, un membre ayant une attribution `FellowshipLeader` pour « Grace K-Group » peut gérer cette cellule mais rien en dehors. Le même membre, avec une attribution `DepartmentLeader` pour « Chorale à Kharis London », gère ce département séparément.

La portée « église » existe pour les deux choses qui ne sont véritablement pas propres à une antenne : le programme de la classe d’adhésion, dont les promotions puisent dans toutes les antennes, et le Responsable de la protection, parce qu’une préoccupation soulevée dans une antenne doit parfois en sortir complètement. Une attribution d’église atteint chaque antenne. L’inverse n’est jamais vrai : détenir une attribution dans chaque antenne ne satisfait toujours pas une vérification de portée « église ».

Voir [Rôles et autorisations](/fr/getting-started/roles-permissions) pour le détail complet.

## 4. Le parcours des âmes

Kairos suit le cheminement des personnes touchées par l’évangélisation. Une **âme** est quelqu’un enregistré lors d’une sortie d’évangélisation. Elle avance dans un parcours :

**Nouveau → Suivi en cours → Intéressé → Converti**

Une fois convertie, la personne peut être inscrite au parcours de discipulat **Nouveaux croyants**, qui compte quatre sessions avant l’intégration dans un département. À noter : terminer les Nouveaux croyants n’est pas la même chose que terminer la classe d’adhésion. Le premier est un discipulat pour un nouveau converti ; la seconde est ce qui fait formellement de quelqu’un un Membre.

## 5. Suivis et préoccupations

Un **suivi** est la trace d’un contact pastoral : qui a pris contact, comment, ce qui s’est passé, et ce qui devrait suivre. Chaque suivi nomme le cadre dans lequel il a eu lieu : une cellule, un département, ou simplement l’antenne. Cette dernière option compte : elle signifie que quelqu’un qui n’appartient à aucun groupe peut tout de même être suivi.

N’importe quel suivi peut être signalé comme préoccupation de **bien-être** ou de **protection**, indépendamment l’une de l’autre. Ces deux signalements alimentent deux boîtes de réception distinctes, lues par des personnes délibérément différentes. Voir [Suivis](/fr/platform/follow-ups) et [Préoccupations](/fr/platform/concerns).

## 6. Suppressions en douceur

Rien n’est définitivement supprimé dans Kairos. Désactiver un membre, une cellule ou un département conserve tout l’historique. Les relevés de présence, les notes de suivi et les attributions de rôles restent intacts. C’est important pour les rapports et pour la redevabilité.
