# Le parcours d'un membre

<SectionClip slug="church-management/member-lifecycle" />

Ce guide couvre tout le parcours d'un membre dans Kairos, de la première inscription à l'approbation, à l'adhésion active, puis éventuellement à la désactivation.

## 1. L'inscription

Un nouveau membre peut s'inscrire lui-même depuis l'écran de connexion en cliquant sur **Créer un compte**. Il renseigne :

- Prénom et nom
- Adresse e-mail
- Mot de passe
- Numéro de téléphone
- Date de naissance et genre
- Antenne de rattachement
- Adresse (facultative à l'inscription)

Après envoi, le compte est créé au statut **En attente**. La personne reçoit une confirmation et peut se connecter, mais son accès se limite à sa propre fiche tant qu'elle n'est pas approuvée.

Un pasteur ou un administrateur peut aussi ajouter un membre directement par **Membres → + Ajouter un membre**. Les membres ajoutés ainsi sont approuvés automatiquement.

## 2. L'approbation

Les inscriptions en attente apparaissent dans la **File d'approbation**, accessible depuis l'en-tête de la page Membres. Approuver demande une habilitation d'antenne, ou le rôle d'administrateur de la plateforme.

Pour approuver :
1. Allez dans **Membres → File d'approbation**
2. Examinez les informations soumises
3. Cliquez sur **Approuver**. L'accès complet est immédiat
4. Ou cliquez sur **Refuser**. Le compte est supprimé

Une fois approuvé, le membre voit toute la navigation correspondant à son rôle et peut :
- Voir et modifier sa fiche
- Voir ses cellules et ses départements
- Soumettre des formulaires
- Consulter son historique de présence

## 3. L'adhésion active

Un membre actif et approuvé peut :
- Tenir sa fiche à jour (coordonnées, photo, contact d'urgence)
- Demander à rejoindre une cellule
- Demander à rejoindre jusqu'à deux départements
- Manifester son intérêt pour un cours de membre
- S'inscrire aux programmes d'évangélisation de son antenne
- Soumettre des formulaires (première visite, baptême, témoignage, etc.)
- Consulter son historique dans Mes présences

## 4. L'attribution des rôles

Où une habilitation s'attribue dépend de sa portée.

- **Les habilitations d'antenne et d'église** s'attribuent depuis la section des rôles de la fiche du membre. Un administrateur de la plateforme peut le faire partout ; un administrateur système d'antenne peut accorder ce même rôle dans sa propre antenne.
- **Les habilitations de cellule et de département sont conférées par le groupe.** Nommez quelqu'un responsable ou co-responsable d'une cellule, ou responsable ou adjoint d'un département, et l'habilitation s'écrit toute seule. Le retirer du groupe la retire. On ne peut pas les ajouter depuis une fiche de membre.

Exemples :
- Nommé responsable d'une cellule → ouvre l'effectif, les réunions et les suivis de cette cellule
- Nommé responsable d'un département → ouvre l'effectif, le planning et les suivis de ce département
- `BranchAdmin` sur une antenne → les opérations de l'antenne, et la possibilité de l'accorder à d'autres

**Quand le changement prend effet :** le serveur relit les habilitations en base à chaque requête, donc une habilitation ajoutée ou retirée s'applique immédiatement. Les menus et boutons de la personne, eux, sont dessinés d'après son jeton de connexion : ils changent au prochain renouvellement du jeton, ou tout de suite si elle se déconnecte et se reconnecte.

## 4b. Devenir Membre

Être sur le registre n'est pas la même chose qu'être Membre. L'étape formelle est le cours de membre en quatre semaines : manifester son intérêt, être admis dans une promotion par un administrateur d'adhésion, suivre et réussir les quatre séances, réussir l'examen final, assister à l'intronisation, et être diplômé.

Jusque-là, la personne compte comme **Fidèle** dans le tableau de bord et les rapports, pas comme Membre. Voir [Cours de membre](/fr/platform/membership).

## 5. La désactivation

Désactiver un membre est une suppression douce. Toutes ses données (présences, notes de suivi, historique de département, dossier de cours) sont conservées. Il perd l'accès à la connexion, mais rien ne disparaît des rapports ni de l'historique.

La désactivation demande une habilitation d'antenne, ou le rôle d'administrateur de la plateforme.

Un membre peut aussi supprimer son propre compte depuis **Paramètres → Confidentialité et données**, et télécharger une copie de ses données avant de le faire.

Pour désactiver : ouvrez la fiche du membre sur la page Membres et cliquez sur **Désactiver**. Confirmez.

Pour réactiver : retrouvez la personne avec le filtre de statut **Inactif** et cliquez sur **Réactiver**.

## 6. Import et export CSV

Pour les opérations en masse :

- **Importer un CSV** : chargez un tableur de membres pour créer plusieurs comptes d'un coup. Le système valide chaque ligne et montre un aperçu avant l'import.
- **Exporter en CSV** : téléchargez la liste filtrée actuelle. Utile pour les rapports, les publipostages externes ou une migration.

Les deux sont dans l'en-tête de la page Membres, pour quiconque a une habilitation d'antenne.
