# Cours de membre

<SectionClip slug="platform/membership" />

La page Adhésion fait tourner le cours de membre en quatre semaines : le parcours qui fait de quelqu'un un Membre de l'église au sens formel.

::: warning Ce que « Membre » veut dire ici
Dans cette église, un Membre est précisément quelqu'un qui a terminé le cours de membre en quatre semaines et reçu son certificat. Rien d'autre ne le confère. Venir chaque dimanche pendant un an, non. Servir dans un département, non. Diriger une cellule, non. Terminer le parcours Nouveaux croyants, non. Et créer un compte, certainement pas.

Toute personne qui a une fiche dans Kairos figure dans l'annuaire et compte dans les présences, parce qu'elle fait partie de l'église et doit être comptée. Mais le chiffre **Membres** du tableau de bord et des rapports compte les diplômés du cours, et le chiffre **Fidèles** compte les habitués qui n'ont pas encore fait le cours. Les deux sont vrais ; ce n'est pas le même nombre.
:::

## Qui s'en occupe

Le parcours est **à l'échelle de l'église**, pas par antenne. Les promotions puisent dans toutes les antennes : aucune habilitation d'antenne ne pourrait décrire une autorité sur l'une d'elles.

| Qui | Ce qu'il peut faire |
|-----|-----------------|
| **Administrateur d'adhésion** (habilitation à l'échelle de l'église) | Tout : créer des promotions, programmer les séances, travailler le vivier d'intéressés, admettre, marquer présences et devoirs, enregistrer l'examen final, diplômer la promotion |
| **Référent d'adhésion** (habilitation par antenne) | Lecture seule. Voit la liste d'attente et les admis de son antenne, et reçoit les notifications d'adhésion de cette antenne. Ne peut ni créer de promotion ni rien marquer. |
| **Responsables de cellule et de département** | Voient l'avancement du cours pour les membres de leur propre groupe uniquement |
| **Administrateur de la plateforme** | Tout, comme toujours |
| **Tout le monde** | Parcourir les promotions, manifester son intérêt, suivre son propre avancement |

::: tip Un administrateur système d'antenne n'est pas un administrateur d'adhésion
Comme le parcours est à l'échelle de l'église, une habilitation d'antenne ne l'atteint pas, quel que soit le nombre d'antennes administrées. L'habilitation Administrateur d'adhésion doit être donnée explicitement. Voir [Permissions des utilisateurs](/fr/administration/permissions).
:::

## L'inscription n'est pas en libre-service

C'est le point qui surprend le plus. Un membre ne peut pas s'inscrire lui-même dans une promotion. Le chemin passe toujours par :

1. **Le membre manifeste son intérêt.** Un geste depuis la page Adhésion. Cela le place dans le **vivier d'intéressés**, qui n'est rattaché à aucune promotion.
2. **Un administrateur l'admet.** Depuis le vivier, un administrateur d'adhésion choisit des personnes et les admet dans une promotion précise.

Que le vivier soit indépendant des promotions, c'est tout l'intérêt : on peut dire « oui, je veux le faire » la semaine où on le décide, sans attendre qu'une promotion soit programmée ni deviner à laquelle on pourra assister.

Manifester son intérêt est refusé si la personne a déjà terminé le cours, ou a déjà une inscription en cours.

### Le délai d'attente

Une entrée dans le vivier dure **180 jours**. Ensuite elle expire.

L'expiration n'est pas une tâche de nuit. Elle s'applique dès que quelqu'un lit ou écrit dans le vivier, ce qui veut dire que la liste qu'un administrateur regarde est toujours déjà juste, sans fenêtre où une entrée périmée paraîtrait vivante. Une entrée expirée est archivée environ un mois plus tard.

Expiré, retiré et admis sont définitifs. Si l'intérêt de quelqu'un expire et qu'il veut revenir, il le manifeste à nouveau et les 180 jours repartent.

### Admettre des personnes

Ouvrez la promotion et admettez depuis la liste d'attente. Quelques points :

- L'admission est refusée si la promotion est terminée ou annulée, ou si ses inscriptions sont fermées.
- Toute personne ayant déjà terminé le cours est écartée.
- Toute personne inscrite dans une autre promotion est signalée plutôt que déplacée en silence.
- Admettre deux fois la même personne est sans effet.
- Vous pouvez admettre quelqu'un qui n'est jamais passé par le vivier, pour la personne inscrite sur papier à l'accueil. Elle est enregistrée comme n'étant pas venue du vivier, pour que les deux chemins restent distinguables dans les rapports.

Le retrait est possible par le membre lui-même ou par un administrateur, avec un motif : a cessé de venir, s'est retiré, a déménagé, reporté à la promotion suivante, ou autre. Un diplômé ne peut pas être retiré.

## Les promotions

Une promotion est une session du cours. Créez-la depuis **Adhésion**, puis programmez ses séances.

| Champ | Remarques |
|-------|-------|
| Nom | Obligatoire |
| Description | Facultative |
| Date de début | Obligatoire |
| Date de remise | La cérémonie d'intronisation ou de remise des certificats |
| Date limite de l'examen final | Facultative ; si elle est posée, un examen passé après ne compte pas |
| Statut | Prévue, En cours, Terminée ou Annulée |
| Inscriptions ouvertes | Désactivez pour arrêter les admissions sans annuler la promotion |
| Note de passage des devoirs | Sur 100, 50 par défaut |
| Note de passage du quiz | Sur 100, 50 par défaut |
| Note de passage de l'examen final | Sur 100, 50 par défaut |

Les notes de passage appartiennent à la promotion : une session donnée peut poser sa propre barre. Changer une note de passage plus tard ne **re-corrige pas** le travail déjà noté : la réussite ou l'échec est décidé et enregistré au moment où vous saisissez la note.

Une promotion ne peut pas être supprimée tant que quelqu'un y est inscrit. La suppression est de toute façon douce ; l'historique survit.

### Les séances

Chaque promotion a **quatre** séances, numérotées de 1 à 4. C'est fixe et non configurable. Chaque séance prend un titre, une date, un lieu, un enseignant facultatif et des notes.

Désigner quelqu'un comme enseignant d'une séance est un fait d'organisation, rien de plus. Cela ne confère aucune permission. La notation est faite par les administrateurs.

## Tenir le registre

Ouvrez une séance et enregistrez, par personne :

- Présent, oui ou non
- La note du devoir, qui donne réussite ou échec face à la note de passage des devoirs de la promotion
- La note du quiz, qui donne réussite ou échec face à la note de passage du quiz
- Des notes

L'examen final est enregistré une fois par personne, pas par séance, avec la date à laquelle il a été passé. L'intronisation est enregistrée comme suivie ou non.

## Diplômer

La remise du diplôme est conditionnée. Une personne est prête seulement quand **les six** conditions sont vraies :

1. Elle a assisté à toutes les séances programmées
2. Elle a réussi le devoir de chaque séance
3. Elle a réussi le quiz de chaque séance
4. Elle a réussi l'examen final
5. Elle a passé l'examen final avant la date limite, si la promotion en a posé une
6. Elle a assisté à l'intronisation

Si vous essayez de diplômer quelqu'un qui n'est pas prêt, Kairos refuse et vous dit laquelle des six manque, personne par personne, pour que vous voyiez d'un coup d'œil qui attend quoi.

::: tip Programmées, pas théoriques
« Toutes les séances » veut dire toutes celles que vous avez réellement programmées. Si une promotion n'a jamais eu que deux séances au calendrier, l'évaluation ne regarde que ces deux-là. Programmez les quatre avant de commencer à noter.
:::

### La dérogation

Un administrateur peut diplômer quelqu'un qui n'est pas prêt, mais doit donner un motif écrit, conservé sur sa fiche. À utiliser pour les vrais cas limites — quelqu'un qui a suivi une séance dans une autre antenne — et non pour liquider un retard.

### Ce que la remise du diplôme fait

Diplômer inscrit sur la fiche du membre la date où le cours a été terminé. Cette date est le seul signal qui fait de quelqu'un un Membre confirmé, et c'est elle que compte le chiffre Membres des rapports. Il existe aussi une dérogation manuelle sur la fiche du membre elle-même, pour les membres historiques qui ont terminé le cours bien avant l'existence de Kairos.

## Notifications

Quatre moments déclenchent une notification au pasteur principal de l'antenne du membre et aux référents d'adhésion de cette antenne :

- Quelqu'un rejoint la liste d'attente
- Quelqu'un est admis dans une promotion
- Quelqu'un est diplômé
- Quelqu'un se retire, ou son intérêt expire

## Ce qu'un membre voit

Depuis **Adhésion**, sans aucune habilitation, un membre peut :

- Parcourir les promotions et leurs calendriers de séances
- Manifester son intérêt, et le retirer
- Voir sa propre inscription, ses notes, et exactement ce qui manque encore avant de pouvoir être diplômé
- Voir la date à laquelle il a terminé le cours, une fois que c'est fait
