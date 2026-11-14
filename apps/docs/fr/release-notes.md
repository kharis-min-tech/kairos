# Notes de version

## Octobre 2026

### Permissions

- **L'entraide séparée de la protection.** Lire les préoccupations d'entraide pastorale est désormais une permission à part. Cela reposait auparavant sur l'accès général à l'antenne, ce qui permettait à un administrateur de données d'antenne — un rôle de registre sans responsabilité pastorale — de lire la boîte entraide *et* la boîte protection. Voir [Référence des capacités](/fr/administration/capabilities#pourquoi-entraide-et-protection-sont-separees).
- **Responsable protection**, une habilitation d'église qui lit la file protection de chaque antenne. La voie d'escalade au-dessus du référent d'une antenne, pour quand une préoccupation doit sortir de l'antenne où elle a été soulevée.
- **La vue protection suit désormais la fonction de pasteur principal.** Celui qui occupe la nomination de pasteur principal d'une antenne voit automatiquement la file protection de cette antenne. Un ministre détenant la même habilitation d'antenne, non. Cette habilitation est déduite de la fiche de direction et n'est pas attribuable.
- **« Ancien » renommé « Ministre »** dans la direction d'antenne.
- Corrigé : un jeton de connexion renouvelé était fabriqué avec une liste de permissions vide, ce qui retirait silencieusement tous les boutons et toutes les pages soumis à permission jusqu'à ce que la personne se déconnecte et se reconnecte.

### Suivis et préoccupations

- **Un suivi déclare désormais son propre contexte** : une cellule, un département, ou simplement l'antenne. L'option antenne veut dire que **quelqu'un qui n'appartient à aucun groupe peut maintenant être suivi**, ce qui était impossible auparavant : un suivi devait s'accrocher à un groupe, donc les personnes qui avaient le plus besoin de contact étaient exactement celles pour qui le système ne pouvait rien enregistrer.
- **Nouvelle page Suivis** avec trois files : **Premières visites** (venues par un formulaire d'accueil dans les 60 derniers jours, personne n'a pris contact), **Sans groupe** (ni cellule ni département), et **À faire** (une date de prochain contact arrivée).
- **Nouvelle boîte Préoccupations** avec des onglets entraide et protection distincts, chacun visible seulement par qui peut le lire.
- **Équipe de suivi** ajoutée comme type de département, distincte de l'équipe d'accueil qui reçoit le jour même.

### Tableau de bord

- **Le centre de pilotage a été reconstruit.** Sept variantes par persona cachées derrière une seule URL sont devenues un seul jeu de blocs, choisi d'après l'altitude où vos habilitations vous placent. Cela a corrigé entre autres le cas d'un responsable de cellule voyant des chiffres d'antenne, parce que l'ancien dispositif le faisait tomber sur la variante antenne.
- **Avertissements du Pouls** : feuilles non prises, membres qui s'éloignent, antennes qui décrochent, antennes sans pasteur principal, chacun comme un lien vers l'endroit où corriger.
- **Vous attend** rassemble ce qui attend réellement après vous. Les approbations n'étaient qu'un nombre sur une carte qu'il fallait remarquer.
- **Activité récente** est désormais un vrai flux de cinq sources : inscriptions, formulaires, remises de diplômes, réunions de cellule, âmes atteintes.
- Les sections du menu se replient, et celle qui contient votre page s'ouvre d'elle-même.

### Langues

- **Kairos parle anglais, français, krio et twi.** L'application web, l'application mobile et ce manuel suivent tous le même choix : ouvrir le guide d'aide pendant que Kairos est en français ouvre le manuel en français.
- **Chaque page du manuel existe dans les quatre langues**, avec ses propres captures et son propre clip.
- **Un clip sur chaque section**, de trente secondes au plus, plus une visite générale et une visite par rôle. Toutes les langues sont narrées. Il n'existe toujours pas de voix de synthèse pour le krio ni le twi : ces clips sont lus par une voix anglaise et la prononciation est approximative ; les sous-titres portent la vraie langue.
- Les références bibliques sont localisées par nom de livre seulement. Le texte des versets n'est jamais traduit automatiquement.

### Divers

- Les responsables de groupe voient désormais l'avancement Nouveaux croyants et cours de membre de leurs propres gens, restreint par qui est dans leur groupe plutôt que par antenne.
- Références de membre à choisir ou à saisir sur le champ responsable légal des premières visites et sur les deux champs parent des formulaires enfant.
- Page de connexion redessinée.

---

## Septembre 2026

### Cours de membre

Tout le module est nouveau. Voir [Cours de membre](/fr/platform/membership).

- Le cours de quatre semaines, avec promotions, séances, feuilles par séance, notes de devoir et de quiz, examen final et intronisation.
- **L'inscription n'est pas en libre-service.** Manifestez votre intérêt, rejoignez le vivier, et un administrateur d'adhésion vous admet dans une promotion. Les entrées du vivier durent 180 jours.
- **Administrateur d'adhésion**, une habilitation d'église, parce que les promotions puisent dans toutes les antennes et qu'aucune habilitation d'antenne ne pourrait décrire une autorité sur l'une d'elles.
- **Référent d'adhésion**, une habilitation d'antenne en lecture seule : la vue sur la liste d'attente locale et les admis, plus les notifications d'adhésion de cette antenne.
- **Une condition de diplôme** à six exigences, une dérogation administrateur qui exige un motif écrit, et des notes de passage par promotion pour qu'une session puisse poser sa propre barre.
- Être diplômé inscrit la date sur la fiche du membre, ce qui donne au chiffre **Membres confirmés** des rapports un sens précis.
- Quatre notifications de cycle de vie au pasteur principal de l'antenne et aux référents d'adhésion : rejoint la liste d'attente, admis, diplômé, retiré ou expiré.

### Divers

- Des sessions de connexion plus longues, pour que la connexion biométrique sur mobile reste armée entre deux connexions par mot de passe.
- Une seule liste de suggestions d'adresse, partagée entre le web et le mobile.

---

## Août 2026

### Connexion

- **Connexion avec Google, Microsoft ou Apple**, à côté de l'e-mail et du mot de passe. Tous les chemins arrivent au même compte : quelqu'un inscrit avec un mot de passe peut ensuite se connecter avec Google et rester la même personne avec le même historique.
- Un passage d'accueil pour les nouveaux comptes à authentification unique, et un e-mail de sécurité chaque fois qu'un fournisseur est relié à un compte existant.

### Présences

- **Pointage autonome.** Les membres peuvent s'enregistrer à un culte : d'un geste, ou en scannant un QR code sur l'écran de l'accueil qui se renouvelle toutes les 30 secondes, pour que la capture de dimanche dernier ne marche pas.
- Réglage par antenne de la fenêtre de pointage et du seuil de retard.
- **Rapports de présence**, un nouvel écran détaillé : carte de chaleur par membre sur 13 semaines avec le compte d'absences consécutives, tranches de fréquence de Hebdomadaire à Dormante, répartition premières visites / habitués, et un **dénominateur des membres engagés** réglable sur 3, 6 ou 12 mois. Voir [Rapports de présence](/fr/analytics/attendance-reports).

### Suivis

- **Les suivis ont été repensés autour de leur forme réelle** : un contact ou une visite, avec le multi-canal (une tentative par appel, SMS et WhatsApp est un seul enregistrement et non trois), le type de visite, annoncée ou non, l'arrivée et le départ, le résultat et les accompagnants.
- Des signalements **entraide** et **protection** indépendants sur tout suivi.
- L'historique des suivis sur la fiche du membre, en une seule chronologie tous contextes confondus.

### Cartes et adresses

- **Mapbox** est devenu l'unique fournisseur de cartes et de saisie d'adresse, sur le web comme sur le mobile.
- La saisie assistée d'adresse branchée sur l'inscription, les membres, les antennes, les cellules et la fiche.
- Les cellules et les antennes stockent désormais leur propre adresse et leurs coordonnées.

### Documentation

- Ce site de documentation est passé en ligne sur **docs.kairos.kharis.org**, avec des points d'entrée **Aide et guides** dans le menu de l'application, sur la page d'accueil et sur l'écran de bienvenue.

---

## Juillet 2026

### Première version

- **Authentification** : inscription, connexion, réinitialisation du mot de passe, parcours d'approbation, jetons portant les habilitations fonctionnelles
- **Antennes et régions** : gestion complète, suppressions douces et historique de direction
- **Membres** : annuaire, fiches, import et export CSV, file d'approbation, revue de protection
- **Cellules** : tous les types, carte avec recherche par code postal et par pays et estimations de temps de trajet, présence aux réunions, suivis
- **Départements** : tous les types de ministère, gestion de l'effectif, parcours des demandes, suivis, recrutement (Candidature → Entretien → Proposition → Période d'essai → Membre), modèles de planning et planification, calendrier des tenues
- **Présences** : enregistrement et pointage, Mes présences avec 12 semaines d'historique et la série en cours
- **Programmes d'évangélisation** : création, inscription des ouvriers, lien avec le recueil des âmes
- **Suivi des âmes** : tableau Kanban (Nouveau → Suivi en cours → Intéressé → Converti), consignation des suivis, indicateurs critique / à surveiller / sur la bonne voie, export CSV
- **Nouveaux croyants** : parcours de discipulat en quatre séances, planification, pointage, alertes de stagnation
- **Formulaires et saisie** : première visite, cours Nouveaux croyants, baptême, témoignage, imposition du nom, présentation d'enfant ; vue des soumissions avec filtres et export CSV ; outil des visiteurs dormants
- **Tableau de bord des âmes** : anneau d'état, âmes par statut, santé des suivis, entonnoir de conversion, taux de passage, filtres de période et de programme
- **Rapports et analyses** : croissance des effectifs, taux de présence hebdomadaire, indicateurs d'évangélisation, cellules les plus suivies
- **Fiche** : informations personnelles, appartenances, rôles de direction, contact d'urgence
- **Paramètres** : changement de mot de passe, changement d'e-mail, connexions récentes, thème, langue, préférences d'e-mail, mentions légales et consentement

---

## Livré depuis, et bon à savoir

- **Exporter mes données** et **Supprimer mon compte** sont en service dans **Paramètres → Confidentialité et données**. Ils étaient annoncés comme à venir dans la première version.
- **L'envoi de photo de profil** fonctionne de bout en bout.
- **Les e-mails transactionnels** partent pour de vrai, par Amazon SES. La première version notait que les e-mails de réinitialisation et d'approbation n'apparaissaient que dans la réponse de l'API, en mode développement.
- **Les préférences de notification** par catégorie, dans **Paramètres → Notifications**.
- **La politique d'usage acceptable** et **l'engagement de confidentialité** ont rejoint les conditions générales et l'avis de confidentialité, avec suivi des versions et nouvelle acceptation quand une politique est réémise.

---

## En test

- **Une application mobile** pour Android et iOS, couvrant l'essentiel de ce que fait l'application web, plus la connexion biométrique et la prise de présence hors ligne. Construite sur la même API. Pas encore distribuée sur les magasins d'applications.
