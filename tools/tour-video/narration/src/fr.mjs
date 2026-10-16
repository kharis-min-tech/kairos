/**
 * Every clip's script, in French. Mirrors en.mjs entry for entry.
 *
 * Vocabulary follows the app's own catalogue so the narration and the screen
 * agree: antenne for branch, cellule for fellowship, culte for service,
 * âme for soul, suivi for follow-up.
 */
const general = [
  ['Votre vue d’ensemble', 'La porte d’entrée, limitée à votre rôle.', 'Voici Kairos. Il s’ouvre sur votre vue d’ensemble, et tout ce que vous voyez ici correspond à ce dont vous êtes réellement responsable.'],
  ['La barre latérale', 'Six groupes. Vous ne voyez que les vôtres.', 'La barre latérale regroupe Personnes, Groupes, Rassemblements, Analyses et Organisation. Une section absente est simplement une section dont votre rôle n’a pas besoin.'],
  ['Membres', 'Tout le monde dans une seule liste.', 'Membres est l’annuaire. Toute l’église s’y trouve, avec son antenne de rattachement et si la classe d’adhésion a été faite.'],
  ['Cellules', 'Les petits groupes, avec une carte.', 'Les cellules sont les petits groupes. K-Groups, Kharis Express, New Breeds et les autres, avec une carte pour trouver la plus proche.'],
  ['Départements', 'Les équipes de ministère et leurs plannings.', 'Les départements sont les équipes de ministère. Chacune garde son effectif, son planning de service et les candidatures reçues.'],
  ['Présence', 'Cultes, enregistrement et feuilles de présence.', 'La présence couvre les cultes et l’enregistrement. Chacun peut s’enregistrer avec un QR code, ou l’accueil le fait à l’arrivée.'],
  ['Le parcours des âmes', 'Du premier contact jusqu’au département.', 'Le parcours des âmes suit une personne touchée par l’évangélisation : nouveau, suivi en cours, intéressé, converti, puis le discipulat.'],
  ['Rapports', 'Présence, croissance et engagement.', 'Les rapports transforment tout cela en chiffres. Tendances de présence, croissance des adhésions et engagement, toujours selon votre rôle.'],
  ['Votre langue', 'Kairos et ce manuel, en quatre langues.', 'Kairos parle anglais, français, krio et twi. Changez depuis la barre latérale, et le manuel s’ouvre dans la langue choisie.'],
];

const admin = [
  ['Votre vue d’ensemble', 'Toutes les antennes à la fois.', 'Voici la vue administrateur. Le Pouls compte toutes les antennes à la fois, et Vous attend liste ce qui attend quelqu’un aujourd’hui.'],
  ['Antennes', 'Les créer, les regrouper, les retirer.', 'Les antennes n’appartiennent qu’à vous. Seul un administrateur en crée une, la déplace de région ou la retire du service.'],
  ['Dans une antenne', 'Ses détails, et qui la dirige.', 'Ouvrez une antenne pour régler ses détails et sa direction. Nommer le pasteur principal ici lui donne la vue sur la file protection de cette antenne.'],
  ['Régions', 'La géographie qui regroupe vos antennes.', 'Les régions regroupent les antennes par géographie. Créez la région d’abord : une antenne ne peut exister sans la sienne.'],
  ['La file d’approbation', 'Personne n’entre sans qu’on le laisse entrer.', 'Toute personne inscrite d’elle-même attend ici. Approuvez-la et elle obtient l’accès complet ; refusez-la et le compte est supprimé.'],
  ['Qui détient quoi', 'Les habilitations, pas les titres.', 'Ouvrez un membre pour gérer ses habilitations. Kairos ne stocke que deux rôles système : tout le reste vient d’une habilitation.'],
  ['Les cours de membre', 'À l’échelle de l’église, hors de toute antenne.', 'Le programme d’adhésion est à l’échelle de l’église. Les promotions puisent partout, donc l’administrer demande une habilitation d’église.'],
  ['Rapports inter-antennes', 'La seule vue qui compare les antennes.', 'Les rapports sont la vue inter-antennes. Vous êtes le seul rôle à voir toutes les antennes côte à côte plutôt qu’une à la fois.'],
  ['Votre langue', 'Kairos et ce manuel, en quatre langues.', 'Kairos parle anglais, français, krio et twi. Changez depuis la barre latérale, et le manuel s’ouvre dans la langue choisie.'],
];

export default {
  general,
  admin,
  member: [
    ['Votre vue d’ensemble', 'Uniquement ce qui vous appartient.', 'Voici votre vue d’ensemble. Tout ici est à vous : vos groupes, votre présence, et ce que l’église attend de vous cette semaine.'],
    ['Ce que vous voyez', 'Une barre courte n’est pas une fonction manquante.', 'Votre barre latérale est courte parce que l’essentiel de Kairos n’est pas à vous de gérer. Rien ne vous est caché par secret.'],
    ['Votre présence', 'Chaque culte où vous avez été noté.', 'Ma présence affiche chaque culte où vous avez été enregistré, votre série en cours, et votre présence sur les dernières semaines.'],
    ['Votre cellule', 'Le petit groupe auquel vous appartenez.', 'Cellules montre le groupe auquel vous appartenez, quand il se réunit et où. Si vous n’en avez pas, la carte trouvera la plus proche.'],
    ['Vos départements', 'Les équipes où vous servez.', 'Départements liste les équipes où vous servez, votre prochain service au planning, et la tenue prévue s’il y en a une.'],
    ['S’enregistrer', 'Scannez, et vous êtes noté présent.', 'En arrivant, ouvrez Enregistrement et scannez le code affiché à l’entrée. Vous êtes noté présent sans faire la queue à l’accueil.'],
    ['Formulaires', 'Baptême, témoignage, première visite.', 'Les formulaires servent à demander un baptême, partager un témoignage, ou inscrire quelqu’un qui vient pour la première fois.'],
    ['Votre profil', 'Vos coordonnées, et qui peut les voir.', 'Votre profil contient vos coordonnées et vos paramètres, y compris la langue dans laquelle Kairos vous parle.'],
  ],
  pastor: [
    ['Votre vue d’ensemble', 'Votre antenne, et ce qu’elle attend de vous.', 'Votre vue d’ensemble s’ouvre sur votre antenne : combien de personnes dans l’assemblée, et ce qui attend votre intervention aujourd’hui.'],
    ['Votre antenne', 'Tout ce qui se trouve dans la vôtre.', 'Mon antenne, c’est l’ensemble de celle que vous dirigez. Ses membres, ses groupes, ses cultes, et les personnes qui viennent d’arriver.'],
    ['L’annuaire', 'Tout le monde, avec son statut.', 'L’annuaire liste toute votre antenne. La ligne indique s’il s’agit d’un visiteur, d’un habitué, ou de quelqu’un ayant fait la classe d’adhésion.'],
    ['Suivis', 'Trois files, sur un calendrier serré.', 'Les suivis comptent trois files : les premières visites sans contact, les personnes sans groupe, et les relances en retard.'],
    ['Préoccupations', 'Bien-être et protection, séparés.', 'Les préoccupations regroupent bien-être et protection. Ce sont deux boîtes distinctes, lues par des personnes délibérément différentes.'],
    ['Votre cellule', 'Le groupe que vous dirigez.', 'Pour la cellule que vous dirigez, vous pouvez faire l’appel, consigner un suivi, et voir qui a cessé de venir.'],
    ['Votre département', 'Effectif, planning et recrutement.', 'Pour votre département, vous gérez l’effectif, publiez le planning, et traitez les candidatures reçues.'],
    ['Le parcours des âmes', 'Du premier contact au département.', 'Le parcours des âmes suit une personne touchée par l’évangélisation, du premier contact jusqu’à son entrée dans un département.'],
    ['Rapports', 'Votre antenne, en chiffres.', 'Les rapports traduisent votre antenne en chiffres : tendances de présence, qui manque à l’appel, et la croissance des groupes.'],
  ],
  'platform-dashboard': [
    ['Pouls de l’église', 'Les quatre chiffres qui comptent.', 'Le pouls de l’église est en haut du tableau de bord : antennes, assemblée totale, membres confirmés et cellules, d’un coup d’œil.'],
    ['Attention requise', 'Ce qui attend votre intervention.', 'Cette section liste ce qui attend vraiment : approbations à donner, antennes sans pasteur, tout ce qui bloque. Cliquez pour y aller.'],
    ['Activité récente', 'Qui a rejoint, et quand.', 'Plus bas, l’activité récente montre qui s’est inscrit et quand, pour voir la semaine sans ouvrir autre chose.'],
  ],
  'platform-members': [
    ['L’annuaire', 'Tout le monde, en une liste.', 'Membres est l’annuaire. Toute l’église s’y trouve, avec son antenne de rattachement et si la classe d’adhésion a été faite.'],
    ['Trouver quelqu’un', 'Par nom, e-mail ou téléphone.', 'Tapez un nom, un e-mail ou un numéro dans la recherche. Vous pouvez aussi filtrer par antenne, par statut ou par rôle.'],
    ['Ouvrir un profil', 'Tout son historique au même endroit.', 'Cliquer sur une ligne ouvre la personne : ses coordonnées, ses groupes, sa présence et chaque suivi la concernant.'],
  ],
  'platform-branches': [
    ['Chaque antenne', 'Tout le réseau, listé.', 'Antennes liste chaque site de l’église, sa ville, sa région et le nombre de personnes dans son assemblée.'],
    ['À l’intérieur', 'Paramètres, direction et membres.', 'Ouvrez une antenne pour régler ses détails, assigner son pasteur, et voir les membres, groupes et cultes qui lui appartiennent.'],
  ],
  'platform-regions': [
    ['Régions', 'Des antennes regroupées géographiquement.', 'Les régions regroupent les antennes par géographie, pour que les rapports couvrent un pays plutôt qu’un seul site.'],
    ['Antennes rattachées', 'Une région occupée ne se supprime pas.', 'Chaque région affiche ses antennes rattachées. Une région qui en a ne peut être supprimée tant qu’elles ne sont pas déplacées.'],
  ],
  'platform-fellowships': [
    ['Les cellules', 'Chaque petit groupe, et son type.', 'Cellules liste chaque petit groupe : K-Groups, Kharis Express, New Breeds et les autres, avec son responsable et ses horaires.'],
    ['Filtrer par type', 'Réduire à ce que vous cherchez.', 'Les puces en haut filtrent par type, et le menu déroulant limite à une antenne, ce qui compte dès qu’il y en a plusieurs dizaines.'],
    ['Trouver sur la carte', 'La cellule la plus proche.', 'La carte les place géographiquement, ce qui répond à la vraie question : laquelle est la plus proche de chez moi.'],
  ],
  'platform-departments': [
    ['Équipes de ministère', 'Chaque équipe, et qui la dirige.', 'Les départements sont les équipes de ministère. Chacune affiche son responsable, son adjoint, et combien de personnes y servent.'],
    ['Dans un département', 'Effectif, planning, recrutement, tenue.', 'Ouvrez-en un et vous avez son effectif, son planning de service, les candidatures, et la tenue prévue pour un culte à venir.'],
  ],
  'platform-attendance': [
    ['Cultes', 'Chaque rassemblement et sa feuille.', 'La présence liste les cultes. Chacun indique combien de personnes ont été enregistrées et si la feuille est encore ouverte.'],
    ['Noter les présents', 'L’accueil, ou la personne elle-même.', 'Ouvrez un culte pour noter présent, en retard ou en ligne. Chacun peut aussi s’enregistrer avec le QR code à l’entrée.'],
  ],
  'platform-membership': [
    ['La classe', 'Quatre semaines, et ce qu’elle confère.', 'Adhésion, c’est la classe de quatre semaines. La terminer est ce qui fait formellement de quelqu’un un Membre.'],
    ['Promotions', 'Sessions, notes et remise des diplômes.', 'Une promotion est une session d’entrée. Vous planifiez ses quatre séances, notez la présence et l’examen, puis diplômez ceux qui ont réussi.'],
  ],
  'platform-new-believers': [
    ['Le parcours', 'Quatre séances, puis un département.', 'Nouveaux croyants est le parcours de discipulat. Quatre séances, puis l’entrée dans un département, chacun visible sur le tableau.'],
    ['Séances', 'Programmées, enseignées, pointées.', 'Les séances sont programmées par antenne avec un enseignant et une date. Faites l’appel, puis faites avancer les personnes à l’étape suivante.'],
  ],
  'platform-follow-ups': [
    ['Les files', 'Premières visites, sans groupe, en retard.', 'Les suivis comptent trois files : les premières visites sans contact, les personnes sans aucun groupe, et les relances en retard.'],
    ['En consigner un', 'Qui, comment, et la suite.', 'Consigner un suivi enregistre qui a pris contact, comment, ce qui s’est passé, et la suite. Il peut aussi être signalé comme préoccupation.'],
  ],
  'platform-concerns': [
    ['Bien-être et protection', 'Deux boîtes, volontairement séparées.', 'Les préoccupations contiennent deux boîtes. Bien-être et protection restent séparés à dessein, lus par des personnes différentes.'],
    ['En lire une', 'Le dossier, et qui l’a soulevée.', 'Ouvrir une préoccupation montre le suivi dont elle provient, qui l’a soulevée, et ce qui a été fait depuis.'],
  ],
  'platform-outreach': [
    ['Programmes', 'L’évangélisation, datée et située.', 'Les programmes d’évangélisation sont les sorties : où, quand, et quels ouvriers y participent.'],
    ['Enregistrer une âme', 'Un nom et un numéro suffisent.', 'Pendant une sortie, vous enregistrez les personnes rencontrées. Un nom et un téléphone suffisent ; le parcours prend le relais.'],
  ],
  'platform-forms': [
    ['Les formulaires', 'Six, pour ce que les gens demandent.', 'Les formulaires couvrent la première visite, le baptême, un témoignage, l’imposition du nom, la dédicace et les nouveaux croyants.'],
    ['En remplir un', 'Il arrive à la bonne personne.', 'Remplissez-en un et il parvient à la personne concernée, rattaché au dossier de l’intéressé s’il en a déjà un.'],
  ],
  'platform-souls-pipeline': [
    ['Le tableau', 'Nouveau, suivi en cours, converti.', 'Le parcours des âmes est un tableau. On passe de nouveau à suivi en cours puis converti, et la couleur indique le retard du contact.'],
    ['Faire avancer', 'Glissez, ou ouvrez et mettez à jour.', 'Glissez une carte vers la colonne suivante, ou ouvrez-la pour noter ce qui s’est passé et fixer la prochaine relance.'],
  ],
  'platform-souls-dashboard': [
    ['Les chiffres', 'Où en est le parcours.', 'Le tableau de bord des âmes traduit le parcours en chiffres : combien à chaque étape, combien de conversions, et la fraîcheur des suivis.'],
    ['Par statut', 'Cliquez une barre pour voir qui.', 'Les graphiques répartissent par statut et par urgence. Cliquez sur une barre pour voir exactement qui elle compte.'],
  ],
  'platform-profile': [
    ['Vos coordonnées', 'Vos informations de contact.', 'Votre profil contient vos coordonnées, votre antenne de rattachement, et les rôles qui vous ont été confiés dans l’église.'],
    ['Vos paramètres', 'Sécurité, notifications, langue.', 'Les paramètres couvrent votre mot de passe et vos méthodes de connexion, vos notifications, et la langue de Kairos.'],
  ],
  'church-management-member-lifecycle': [
    ['Du visiteur au membre', 'Quatre étapes, une seule liste.', 'Chacun se situe sur le même parcours : visiteur, habitué, puis membre une fois la classe de quatre semaines terminée.'],
    ['Où le statut s’affiche', 'Sur la ligne, et sur le profil.', 'La ligne de l’annuaire indique l’étape, ce qui permet de voir d’un coup d’œil qui n’a jamais été relancé.'],
  ],
  'church-management-attendance-tracking': [
    ['Faire l’appel', 'À l’accueil, à l’arrivée.', 'Ouvrez le culte et notez présent, en retard ou en ligne au fur et à mesure. L’absence est déduite, rien à cocher pour elle.'],
    ['Auto-enregistrement', 'Un QR code à l’entrée.', 'Chacun peut scanner le code à l’entrée et se noter présent, ce qui libère l’accueil pour ceux qui en ont besoin.'],
  ],
  'church-management-fellowship-management': [
    ['Animer une cellule', 'Votre groupe, votre feuille.', 'Si vous dirigez une cellule, vous gérez ses membres, consignez chaque réunion, et voyez qui a discrètement cessé de venir.'],
    ['Ses réunions', 'Un appel par réunion.', 'Chaque réunion a son propre appel. Sur quelques semaines, cela devient la tendance que lisent les rapports.'],
  ],
  'church-management-branch-management': [
    ['Paramètres d’antenne', 'Détails, horaires, enregistrement.', 'Une antenne porte son adresse, ses horaires de culte, et si l’auto-enregistrement est actif et pendant combien de temps.'],
    ['Qui la dirige', 'Pasteur, ministres, administrateurs.', 'La direction s’assigne ici : le pasteur principal, les ministres éventuels, et les administrateurs de l’antenne.'],
  ],
  'church-management-reporting': [
    ['Ce qui est rapporté', 'Présence, croissance, engagement.', 'Les rapports couvrent les tendances de présence, la croissance, l’engagement et l’évangélisation, selon ce que votre rôle permet de voir.'],
    ['Changer la période', 'Le dernier mois, ou l’année.', 'Changez la période pour l’élargir ou la réduire. Les chiffres et tous les graphiques suivent.'],
  ],
  'church-management-department-administration': [
    ['Effectifs et plannings', 'Qui sert, et quand.', 'Un département tient la liste de ceux qui y servent et un planning de qui sert quand, publié quelques semaines à l’avance.'],
    ['Recrutement', 'Candidature, entretien, essai.', 'Le recrutement va de la candidature à l’entretien, puis à la proposition et à la période d’essai, chaque candidat visible à son étape.'],
  ],
  'administration-permissions': [
    ['Des attributions, pas des titres', 'Un rôle, rattaché à une portée.', 'Les autorisations viennent d’attributions : un rôle nommé rattaché à une antenne, une cellule, un département, ou l’église entière.'],
    ['En accorder une', 'Elle prend effet aussitôt.', 'Accordez une attribution et la personne voit immédiatement les sections supplémentaires. Retirez-la et cela cesse, l’historique restant intact.'],
  ],
  'administration-capabilities': [
    ['Ce qu’est une capacité', 'Ce qu’une attribution confère vraiment.', 'Une attribution est un ensemble de capacités. Une capacité est la chose précise qu’elle permet, comme lire une antenne ou modifier un département.'],
    ['Où elles s’appliquent', 'Chaque page les vérifie.', 'Chaque page et chaque action vérifie une capacité, ce qui explique que deux personnes voient des écrans réellement différents.'],
  ],
  'administration-approvals': [
    ['La file', 'Les personnes en attente d’accès.', 'La file d’approbation contient toute personne inscrite mais pas encore approuvée. Tant qu’elle ne l’est pas, elle ne peut pas se connecter.'],
    ['Approuver quelqu’un', 'Vérifiez l’antenne, puis approuvez.', 'Vérifiez l’antenne choisie et les informations fournies, puis approuvez. La personne peut se connecter dès cet instant.'],
  ],
  'administration-settings': [
    ['Vos paramètres', 'Compte, sécurité, apparence.', 'Les paramètres couvrent votre compte, vos méthodes de connexion, l’apparence de Kairos, et la langue qu’il emploie.'],
    ['Notifications', 'Ce qui vous parvient, et à quel rythme.', 'Les notifications se règlent par catégorie : immédiat ou résumé quotidien, ou désactivé. Les alertes de sécurité arrivent toujours.'],
  ],
  'analytics-church-health': [
    ['L’église est-elle en santé', 'La présence face au registre.', 'La santé de l’église compare qui vient réellement à qui figure au registre, ce qui est plus utile que chacun des deux pris seul.'],
    ['Lire la tendance', 'La direction compte davantage.', 'Une seule semaine dit peu de chose. C’est la tendance sur huit semaines qui indique si quelque chose fonctionne.'],
  ],
  'analytics-engagement': [
    ['Qui est engagé', 'Plus que simplement venir.', 'L’engagement compte plus que la présence : appartenir à un groupe, servir dans une équipe, et faire l’objet d’un suivi.'],
    ['La vue engagement', 'Où les gens décrochent.', 'La répartition montre où les gens se désengagent, ce qui arrive généralement avant qu’ils cessent de venir, pas après.'],
  ],
  'analytics-growth-reports': [
    ['Croissance', 'Les nouveaux membres, dans le temps.', 'Les rapports de croissance comptent les nouveaux membres sur la période, où ils ont rejoint, et la comparaison avec les mois précédents.'],
    ['Nouveaux membres', 'D’où ils viennent.', 'La répartition montre par quelle antenne et par quel chemin ils sont arrivés, donc ce qui amène réellement du monde.'],
  ],
  'analytics-attendance-reports': [
    ['Rapports de présence', 'Par semaine, par antenne.', 'Les rapports de présence montrent les enregistrements par semaine face aux membres distincts, ce qui sépare la fréquence du nombre de personnes.'],
    ['Qui manque', 'Triés par durée d’absence.', 'La liste des absents est triée par nombre de cultes manqués d’affilée, ce qui en fait la liste dont le suivi pastoral a besoin.'],
  ],
  'getting-started-your-first-church': [
    ['Mise en place', 'Les régions, puis les antennes.', 'La mise en place commence par les régions, puis les antennes qu’elles contiennent, car chaque membre appartient à une antenne.'],
    ['Votre première antenne', 'Nommez-la, situez-la, dirigez-la.', 'Donnez à l’antenne un nom, une ville et des horaires de culte, puis assignez son pasteur. Les membres viennent ensuite.'],
  ],
  'getting-started-roles-permissions': [
    ['Qui peut faire quoi', 'Deux rôles système, beaucoup d’attributions.', 'Kairos ne stocke que deux rôles système, admin et membre. Tout le reste est une attribution rattachée à une portée précise.'],
    ['Le voir sur un compte', 'Ouvrez la personne, lisez ses attributions.', 'Ouvrez quelqu’un et vous voyez chaque attribution qu’il détient et où elle s’applique : la réponse honnête à pourquoi il voit une page.'],
  ],
};
