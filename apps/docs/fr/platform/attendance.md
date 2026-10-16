# Présences

<SectionClip slug="platform/attendance" />

La page Présences couvre la présence aux cultes : cultes du dimanche, cultes de semaine et cultes spéciaux. La présence aux réunions de cellule se gère séparément, depuis chaque cellule.

<div class="screenshot-window screenshot-light">

![Page Présences aux cultes : liste des cultes du dimanche par antenne avec les liens Pointer](/screenshots/fr/attendance.png)

</div>

<div class="screenshot-window screenshot-dark">

![Page Présences aux cultes en thème sombre](/screenshots/fr/attendance-dark.png)

</div>

## La liste des cultes

Chaque ligne affiche :
- Le badge du type de culte (par exemple **Dimanche**)
- Le nom et le thème du culte
- La date, l'antenne et le titre de la prédication
- Le lien **Pointer →** qui ouvre la feuille de présence du culte

## Filtrer

Filtrez la liste par :
- **Type** : tous les types, culte du dimanche, culte de semaine, culte spécial
- **Du / Au** : période

## Enregistrer un culte

Cliquez sur **+ Enregistrer un culte** (pasteurs et administrateurs uniquement) :

| Champ | Remarques |
|-------|-------|
| Antenne | Obligatoire |
| Type de culte | Dimanche, semaine, spécial, réunion de prière, autre |
| Date | Obligatoire |
| Titre / thème du culte | Facultatif |
| Prédicateur | Facultatif ; à relier à un membre |
| Sujet de la prédication | Facultatif |
| Affluence attendue | Facultative |

## Pointer les membres

Une fois le culte créé, ouvrez-le avec **Pointer →**. Marquez chaque membre :
- **Présent**
- **Absent**
- **En ligne**

Vous pouvez aussi signaler un membre comme **Première visite** au moment du pointage.

Enregistrer les présences d'un culte demande une habilitation sur l'antenne, ou le rôle d'administrateur de la plateforme.

## Rapports

Pour l'écran de rapport détaillé — carte de chaleur par membre, tranches de fréquence, répartition premières visites / habitués — ouvrez **Rapports** depuis la page Présences. Voir [Rapports de présence](/fr/analytics/attendance-reports#l-ecran-de-rapport-detaille).

## Pointage autonome

Les membres peuvent se pointer eux-mêmes, pour que l'accueil ne soit pas la seule porte d'entrée du registre. **Pointer** est dans le menu de tout le monde.

Deux façons de faire :

- **Pointer d'un geste.** Un seul geste enregistre le membre à un culte dont la fenêtre de pointage est ouverte.
- **Scanner le QR code de l'accueil.** Un administrateur ouvre le culte et affiche **QR de pointage autonome** sur un écran à l'accueil. Le code se renouvelle toutes les 30 secondes, et le membre le scanne depuis **Pointer → Scanner le QR à l'accueil**. Le code précédent reste valable un instant après le renouvellement, pour ne pas rejeter quelqu'un en plein scan.

C'est le renouvellement du code qui empêche un membre de se pointer depuis chez lui : une capture d'écran prise dimanche dernier ne vaut plus rien.

### Réglages de l'antenne

Chaque antenne règle son propre pointage autonome dans **Mon antenne → Réglages de présence** :

| Réglage | Ce qu'il fait |
|---------|--------------|
| Pointage autonome activé | L'interrupteur principal. Désactivé, aucune des deux voies ne fonctionne pour cette antenne. |
| Ouverture avant le début | Combien de minutes avant le culte la fenêtre s'ouvre |
| Fermeture après le début | Combien de minutes après le début la fenêtre se ferme |
| En retard après | Combien de minutes après le début un pointage est noté **En retard** plutôt que **Présent** |

Pointer deux fois ne crée pas deux enregistrements, et le seuil de retard est appliqué par le serveur : il est donc le même quelle que soit la voie utilisée.

## Mes présences

Chaque membre a sa page **Mes présences** dans le menu. Elle est privée : seuls le membre, son pasteur et l'équipe d'administration la voient.

<div class="screenshot-window screenshot-light">

![Page Mes présences : taux de 67 %, ponctualité, série en cours et historique](/screenshots/fr/my-attendance.png)

</div>

<div class="screenshot-window screenshot-dark">

![Page Mes présences en thème sombre](/screenshots/fr/my-attendance-dark.png)

</div>

### Ce qu'elle affiche

- **Taux de présence** : le pourcentage sur les 12 dernières semaines, avec un mot d'encouragement
- **Présent sur total** : par exemple « 2 cultes sur 3 »
- **Vu pour la dernière fois** : la date et le culte de la dernière présence

### Répartition de la ponctualité

Un histogramme montrant comment vos cultes se répartissent entre Présent, En retard, En ligne et Manqué.

### Série en cours

Le nombre de cultes consécutifs auxquels vous avez assisté.

### Historique des cultes

La liste de tous les cultes des 12 dernières semaines, du plus ancien au plus récent, avec votre statut pour chacun (Manqué, Présent, En ligne, En retard).
