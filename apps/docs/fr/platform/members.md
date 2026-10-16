# Membres

<SectionClip slug="platform/members" />

La page Membres est l'annuaire de l'église. Elle affiche les personnes de votre antenne (ou de toutes les antennes pour les administrateurs) avec leur statut, leurs coordonnées et leur cellule.

::: tip Qui figure dans l'annuaire
L'annuaire couvre les **membres confirmés** (les personnes ayant terminé la [classe d'adhésion](/fr/platform/membership)) et les **habitués** (celles qui viennent sans avoir encore fait la classe). Les fiches de visiteurs et d'enfants, généralement créées par un formulaire de première visite ou une procédure de protection, restent derrière leurs propres écrans, pour que le registre ne soit pas noyé sous des lignes sans connexion. Utilisez les filtres pour n'afficher qu'un type.
:::

<div class="screenshot-window screenshot-light">

![Page Membres : fiches avec statut d'approbation, coordonnées et boutons Désactiver](/screenshots/fr/members.png)

</div>

<div class="screenshot-window screenshot-dark">

![Page Membres en thème sombre](/screenshots/fr/members-dark.png)

</div>

## L'annuaire des membres

Chaque fiche affiche :
- Le nom et les initiales de l'avatar
- L'antenne de rattachement
- L'e-mail et le téléphone
- Le badge de statut (Approuvé, En attente)
- Un bouton **Désactiver**, pour toute personne ayant une attribution d'antenne

## Rechercher et filtrer

Utilisez la barre de recherche pour trouver quelqu'un par nom ou e-mail. Filtrez avec les menus déroulants :

- **Toutes les cellules** : limiter aux membres d'une cellule précise
- **Antenne** : filtrer par antenne (administrateurs uniquement)
- **Tous les statuts** : filtrer par Approuvé, En attente ou Inactif

## Ajouter un membre

Cliquez sur **+ Ajouter un membre** pour en créer un manuellement. Champs requis :

| Champ | Remarques |
|-------|-------|
| Prénom, Nom | Obligatoires |
| E-mail | Doit être unique |
| Téléphone | Recommandé |
| Antenne de rattachement | Obligatoire ; définit sa portée |
| Sexe | Homme ou Femme |
| Date de naissance | Facultative |
| Adresse | Facultative |
| Contact d'urgence | Nom, téléphone et lien |

Les membres ajoutés manuellement par quelqu'un ayant une attribution d'antenne sont approuvés automatiquement.

## Inscription autonome

Les membres peuvent s'inscrire eux-mêmes depuis la page de connexion. Ils démarrent avec le statut **En attente** et doivent être approuvés avant d'obtenir l'accès complet. Un membre en attente ne peut voir que son propre profil.

## File d'approbation

Le bouton **File d'approbation** en haut de la page Membres affiche toutes les inscriptions en attente. Cliquez pour examiner puis approuver ou refuser chaque demande. Voir [Approbations](/fr/administration/approvals) pour le détail.

## Importer des membres par CSV

Cliquez sur **Importer CSV** pour téléverser des membres en masse. Le fichier doit comporter des colonnes pour le prénom, le nom, l'e-mail, le téléphone, le sexe, la date de naissance et l'antenne. Le système valide chaque ligne avant l'import et affiche un aperçu avec les erreurs signalées.

## Exporter les membres

Cliquez sur **Exporter CSV** pour télécharger la vue filtrée actuelle. Utile pour un rapport ou une migration de données.

## Revue de protection

Le bouton **Revue de protection** ouvre une vue filtrée des fiches portant des notes ou des signalements de protection.

C'est distinct de la boîte [Préoccupations](/fr/platform/concerns). La revue de protection porte sur les fiches elles-mêmes, principalement les visiteurs et les enfants en attente de décision ; la boîte Préoccupations porte sur des suivis que quelqu'un a signalés. Les deux sont lues par des personnes différentes : Préoccupations exige un droit de regard en protection, qu'une attribution d'antenne ne confère pas.

## Désactiver un membre

Désactiver un membre est une suppression en douceur. Son profil, son historique de présence, ses notes de suivi et ses appartenances sont tous conservés. Il perd l'accès au système, mais ses données restent intactes pour les rapports.

La désactivation exige une attribution d'antenne, ou le statut d'administrateur de la plateforme.
