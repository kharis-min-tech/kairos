# Tableau de bord

<SectionClip slug="platform/dashboard" />

Le tableau de bord est la première chose que vous voyez après la connexion. Il donne un aperçu immédiat de ce qui se passe dans votre église, selon votre rôle.

<div class="screenshot-window screenshot-light">

![Tableau de bord administrateur de Kairos : statistiques, cellules à venir et rapports](/screenshots/fr/dashboard.png)

</div>

<div class="screenshot-window screenshot-dark">

![Tableau de bord administrateur de Kairos en thème sombre](/screenshots/fr/dashboard-dark.png)

</div>

## Une page, construite en blocs

Le tableau de bord était autrefois sept pages différentes cachées derrière une seule adresse, chacune avec son jeu de chiffres figé. C'est désormais un ensemble de blocs, et ceux qui apparaissent dépendent de l'**altitude** à laquelle vos attributions vous placent.

| Altitude | Qui s'y trouve | Ce qu'ils obtiennent |
|----------|-------------|---------------|
| Église | Administrateurs de la plateforme | Les chiffres de toute l'église ; pas d'agenda personnel |
| Antenne | Toute personne ayant une attribution d'antenne | Les chiffres de l'antenne, sa file et un agenda |
| Groupe | Responsables de cellule et de département | Un agenda et une file, limités à leur propre groupe |
| Personnel | Tous les autres | Leur propre semaine |

L'altitude se déduit des capacités, jamais d'un champ « rôle ». C'est pourquoi un responsable de cellule voit désormais les chiffres de sa cellule : dans l'ancienne disposition, il retombait sur la vue de l'antenne et voyait des chiffres qui ne le regardaient pas.

Un badge sous le message d'accueil indique la lentille que vous utilisez. Il est purement indicatif et ne contrôle aucun accès.

## Les blocs

### Pouls

La rangée de chiffres en haut, à l'altitude antenne et au-dessus.

Le **pouls de l'église** affiche Antennes, Assemblée totale, Membres confirmés et Cellules. Le **pouls de l'antenne** affiche Assemblée totale, Membres confirmés, Présence la semaine dernière et Cellules.

::: tip Assemblée totale et Membres confirmés sont deux chiffres différents
L'assemblée totale, c'est le registre entier. Les membres confirmés ne comptent que les personnes ayant terminé la [classe d'adhésion](/fr/platform/membership). Une antenne en bonne santé en a généralement beaucoup plus des premiers que des seconds. Voir [Rapports de croissance](/fr/analytics/growth-reports#repartition-de-l-assemblee).
:::

En dessous, le Pouls affiche des **avertissements** quand quelque chose demande attention : une feuille de présence jamais faite, des membres qui s'éloignent, des antennes en retard, ou une antenne sans pasteur principal. Chaque avertissement renvoie directement à la page où le corriger.

### Attention requise

Ce qui attend réellement votre intervention, compté et lié : inscriptions à approuver, préoccupations signalées, suivis arrivés à échéance. Les éléments urgents sont marqués.

Cela remplace une situation où les approbations n'étaient qu'un chiffre sur une carte qu'il fallait remarquer, et où les préoccupations vivaient sur une page qu'il fallait penser à visiter.

### Agenda

Ce qui est prévu, dans l'ordre : réunions de cellule, cultes et séances à venir. À l'altitude groupe, cela se limite à votre propre groupe.

### Groupes

À l'altitude église, un résumé par antenne. En dessous, un résumé des groupes que vous dirigez.

### Activité récente

Un fil alimenté par cinq sources réelles : nouvelles inscriptions, formulaires envoyés, diplômés de la classe d'adhésion, réunions de cellule et âmes touchées.

### Pour commencer

Uniquement pour les personnes qui n'ont pas fini de se mettre en place. Il propose l'étape concrète suivante : compléter votre profil, rejoindre une cellule, ou vous inscrire à la classe d'adhésion.

### Série

Votre propre suite de cultes consécutifs.

### Verset du jour

Une écriture, qui change chaque jour.

## Ce qu'est devenu Mission Control

Les versions antérieures du tableau de bord avaient une bande « Mission Control Reports » de six mini-graphiques et une bande d'engagement « Mission Summary ». Les deux ont disparu, remplacées par le Pouls et ses avertissements. Les chiffres sous-jacents n'ont pas disparu ; ils ont rejoint les endroits où on peut vraiment les interroger :

- Tendances de présence et carte de chaleur par membre : [Rapports de présence](/fr/analytics/attendance-reports)
- Croissance des adhésions et répartition de l'assemblée : [Rapports de croissance](/fr/analytics/growth-reports)
- L'entonnoir des âmes : [Tableau de bord des âmes](/fr/platform/souls-dashboard)
