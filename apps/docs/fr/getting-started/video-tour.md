<script setup>
import { ref } from 'vue'

const LANG = '-fr'

const tours = [
  { id: 'member', pick: 'un membre', heading: 'Kairos pour les membres', blurb: 'Vos groupes, vos présences et les rassemblements auxquels vous appartenez.', stops: 8 },
  { id: 'pastor', pick: 'un responsable ou un pasteur', heading: 'Kairos pour les responsables et les pasteurs', blurb: 'Votre antenne : l\'annuaire, le soin pastoral, les suivis et les rapports.', stops: 9 },
  { id: 'admin',  pick: 'un administrateur',  heading: 'Kairos pour les administrateurs',  blurb: 'Antennes, régions, approbations, habilitations et rapports inter-antennes.',  stops: 9 },
]

const chosen = ref('member')
const tour = () => tours.find(t => t.id === chosen.value)
// Same base as SectionClip, so the role tours follow the clips wherever they
// are served from. Spelled out in full because Vite substitutes this exact
// expression at build time and leaves any variation of it alone.
const CLIPS = (import.meta.env.VITE_CLIPS_BASE || '/clips').replace(/\/$/, '')
const clip = id => `${CLIPS}/${id}${LANG}`
</script>

<style scoped>
.rolepick { margin: 2rem 0 1.25rem; }
.rolepick .q {
  font-size: 15px; font-weight: 600; color: var(--vp-c-text-2);
  margin-bottom: .75rem;
}
.rolepick .row { display: flex; flex-wrap: wrap; gap: .6rem; }
.rolepick button {
  border-radius: 999px;
  border: 1px solid var(--vp-c-divider);
  background: var(--vp-c-bg-soft);
  color: var(--vp-c-text-1);
  font-size: 15px; font-weight: 600;
  padding: .6rem 1.35rem;
  cursor: pointer;
  transition: background .18s, border-color .18s, color .18s, transform .18s;
}
.rolepick button:hover { border-color: var(--vp-c-brand-1); transform: translateY(-1px); }
.rolepick button.on {
  background: var(--vp-c-brand-1);
  border-color: var(--vp-c-brand-1);
  color: #fff;
}
.tourhead { margin-top: .5rem; }
.tourhead h3 { margin: 0 0 .2rem; border: 0; padding: 0; }
.tourhead .meta { font-size: 14px; color: var(--vp-c-text-2); }
.tourvid {
  width: 100%; border-radius: 10px; margin: 1rem 0 0;
  box-shadow: 0 12px 40px rgba(0,0,0,.18); background: #000;
}
.silentnote {
  font-size: 14px; color: var(--vp-c-text-3); margin: .6rem 0 0;
}
</style>

# Visite guidée

Une visite commentée de Kairos, enregistrée dans la vraie application.

Commencez par la visite générale si Kairos vous est nouveau. Choisissez ensuite
la visite correspondant à votre rôle : chacune ne montre que ce que ce rôle voit
réellement, donc aucune ne vous fait passer devant un écran que vous ne pouvez
pas ouvrir.

Toutes les personnes et toutes les données des enregistrements sont des
démonstrations.

## Commencez ici : ce qu'est Kairos

Neuf arrêts à travers toute la plateforme, enregistrés en tant qu'administrateur
pour que la forme de l'ensemble soit visible. C'est la seule visite qui montre
des sections que votre propre rôle n'a peut-être pas.

<video class="tourvid" controls preload="metadata" playsinline :poster="`${clip('general')}.jpg`"><source :src="`${clip('general')}.mp4`" type="video/mp4" />Votre navigateur ne peut pas lire cette vidéo. <a :href="`${clip('general')}.mp4`">Téléchargez la visite</a>.</video>

<p class="silentnote">Le krio et le twi n’ont pas encore de voix de synthèse : ces visites sont lues par une voix anglaise et la prononciation est approximative. Les sous-titres portent la vraie langue.</p>

## Ensuite : votre propre rôle

<div class="rolepick">
  <div class="q">Je suis…</div>
  <div class="row">
    <button v-for="t in tours" :key="t.id" :class="{ on: chosen === t.id }" @click="chosen = t.id">{{ t.pick }}</button>
  </div>
</div>

<div class="tourhead">
  <h3>{{ tour().heading }}</h3>
  <div class="meta">{{ tour().stops }} arrêts · {{ tour().blurb }}</div>
</div>

<video :key="chosen" class="tourvid" controls preload="metadata" playsinline :poster="`${clip(chosen)}.jpg`"><source :src="`${clip(chosen)}.mp4`" type="video/mp4" />Votre navigateur ne peut pas lire cette vidéo. <a :href="`${clip(chosen)}.mp4`">Téléchargez la visite</a>.</video>

## Quelle visite est la mienne ?

Si vous hésitez, connectez-vous et regardez votre menu. Plus vous portez de
responsabilités, plus il contient de sections.

| Vous voyez | Votre visite |
|---|---|
| Vos présences, vos cellules et vos départements | **Un membre** |
| Aussi Membres, Préoccupations, Suivis et Mon antenne | **Un responsable ou un pasteur** |
| Aussi Antennes et Régions | **Un administrateur** |

Rien ne vous est caché par secret. Une section que vous ne voyez pas est
simplement une section dont votre rôle n'a pas besoin, et
[Rôles et permissions](/fr/getting-started/roles-permissions) explique comment
cela se décide.

## Ce que couvre chaque visite

### Un membre

Votre vue d'ensemble, pourquoi votre menu est court, Mes présences, votre
cellule, vos départements, le pointage, les formulaires et votre fiche.

### Un responsable ou un pasteur

Votre vue d'ensemble, [Mon antenne](/fr/platform/branches), l'annuaire
[Membres](/fr/platform/members), les [Suivis](/fr/platform/follow-ups), les
[Préoccupations](/fr/platform/concerns), votre propre cellule et votre
département, le [Suivi des âmes](/fr/platform/souls-pipeline) et les
[Rapports](/fr/platform/reports).

### Un administrateur

Seulement ce que personne d'autre n'a : [Antennes](/fr/platform/branches),
l'intérieur d'une antenne et sa direction, [Régions](/fr/platform/regions), la
[file d'approbation](/fr/administration/approvals), qui détient quelle
[habilitation](/fr/administration/permissions), le
[cours de membre](/fr/platform/membership) à l'échelle de l'église, et les
[Rapports](/fr/platform/reports) inter-antennes.

## Un clip sur chaque section aussi

Chaque section de ce manuel s'ouvre sur son propre clip de trente secondes au
plus, qui montre cet écran-là et quoi y faire. Les visites ci-dessus servent à
s'orienter ; les clips de section servent au moment où vous bloquez sur quelque
chose de précis.

## Vous préférez lire ?

Chaque arrêt de chaque visite a sa page écrite dans ce manuel. Commencez par
l'[Introduction](/fr/getting-started/introduction), ou allez directement à la
section dont vous avez besoin depuis le menu.
