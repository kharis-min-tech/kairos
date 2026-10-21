<script setup>
import { ref } from 'vue'

const LANG = '-kri'

const tours = [
  { id: 'member', pick: 'mɛmba', heading: 'Kairos fɔ mɛmba dɛn', blurb: 'Yu yon grup, yu yon atɛndans, ɛn di mitin dɛn we yu de na dɛn.', stops: 8 },
  { id: 'pastor', pick: 'lida ɔ pasto', heading: 'Kairos fɔ lida ɛn pasto dɛn', blurb: 'Yu branch: di dayrɛktri, pastɔral kia, fɔlo ɔp ɛn ripɔt.', stops: 9 },
  { id: 'admin',  pick: 'admin',  heading: 'Kairos fɔ admin dɛn',  blurb: 'Branch, rijɔn, aproval, grant ɛn ripɔt akrɔs branch dɛn.',  stops: 9 },
]

const chosen = ref('member')
const tour = () => tours.find(t => t.id === chosen.value)
const clip = id => `/clips/${id}${LANG}`
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

# Vidio Tɔ

Wan tɔ fɔ Kairos wit vɔys, we dɛn rɛkɔd insay di tru aplikeshɔn.

Stat wit di jɛnɛral tɔ if Kairos nyu to yu. Afta dat, pik di rol tɔ we mach yu
akawnt: ɛvri wan de sho wetin dat rol tru-tru de si nɔmɔ, so nɔn pan dɛn nɔ de
kɛr yu pas skrin we yu nɔ kin opin.

Ɔl di pipul ɛn ɔl di tin dɛn insay di rɛkɔdin na dɛmɔnstreshɔn data.

## Stat ya: wetin Kairos bi

Nayn stɔp akrɔs di ful platfɔm, we dɛn rɛkɔd as admin so dat yu kin si di shep
fɔ di ful tin. Na di onli tɔ we de sho sɛkshɔn dɛn we yu yon rol kin nɔ gɛt.

<video class="tourvid" controls preload="metadata" playsinline :poster="`${clip('general')}.jpg`"><source :src="`${clip('general')}.mp4`" type="video/mp4" />Yu brawza nɔ kin ple dis vidio. <a :href="`${clip('general')}.mp4`">Dawnlod di tɔ</a>.</video>

<p class="silentnote">Nɔ Krio tɔk-vɔys nɔ de yet, so na Inglish vɔys de rid di Krio — di sawnd nɔ go rayt ɔltɛm. Di kapshɔn dɛn na di tru Krio, so fɔlo dɛn.</p>

## Dɔn: yu yon rol

<div class="rolepick">
  <div class="q">A na…</div>
  <div class="row">
    <button v-for="t in tours" :key="t.id" :class="{ on: chosen === t.id }" @click="chosen = t.id">{{ t.pick }}</button>
  </div>
</div>

<div class="tourhead">
  <h3>{{ tour().heading }}</h3>
  <div class="meta">{{ tour().stops }} stɔp · {{ tour().blurb }}</div>
</div>

<video :key="chosen" class="tourvid" controls preload="metadata" playsinline :poster="`${clip(chosen)}.jpg`"><source :src="`${clip(chosen)}.mp4`" type="video/mp4" />Yu brawza nɔ kin ple dis vidio. <a :href="`${clip(chosen)}.mp4`">Dawnlod di tɔ</a>.</video>

## Us tɔ na mi yon?

If yu nɔ shɔ, sayn in ɛn luk yu saydba. Di mɔ risponsibiliti yu kɛr, na di mɔ
sɛkshɔn de sho insay am.

| Wetin yu de si | Yu tɔ |
|---|---|
| Yu yon atɛndans, fɛloship ɛn dipatmɛnt | **Mɛmba** |
| Plɔs Mɛmba, Kɔnsɛn, Fɔlo ɔp ɛn Mi Branch | **Lida ɔ Pasto** |
| Plɔs Branch ɛn Rijɔn | **Admin** |

Nɔtin nɔ de ayd frɔm yu bikɔs dɛn want sikrit. Sɛkshɔn we yu nɔ kin si na
sɛkshɔn we yu rol nɔ nid, ɛn
[Rol ɛn Pamishɔn dɛn](/kri/getting-started/roles-permissions) de ɛksplen aw dɛn
de disayd am.

## Wetin ɛvri tɔ de kɔva

### Mɛmba

Yu ovavyu, wetin mek yu saydba shɔt, Mi Atɛndans, yu fɛloship, yu dipatmɛnt
dɛn, chɛk in, fɔm dɛn, ɛn yu prɔfayl.

### Lida ɔ Pasto

Yu ovavyu, [Mi Branch](/kri/platform/branches), di
[Mɛmba](/kri/platform/members) dayrɛktri, [Fɔlo ɔp dɛn](/kri/platform/follow-ups),
[Kɔnsɛn dɛn](/kri/platform/concerns), yu yon fɛloship ɛn dipatmɛnt, di
[Sol Paplayn](/kri/platform/souls-pipeline) ɛn [Ripɔt dɛn](/kri/platform/reports).

### Admin

Na di pat dɛn we nɔbɔdi ɛls nɔ gɛt nɔmɔ: [Branch dɛn](/kri/platform/branches),
insay wan branch ɛn in lidaship, [Rijɔn dɛn](/kri/platform/regions), di
[aproval kyu](/kri/administration/approvals), udat ol us
[grant](/kri/administration/permissions), di chɔch-wayd
[mɛmbaship program](/kri/platform/membership), ɛn
[Ripɔt](/kri/platform/reports) akrɔs branch dɛn.

## Wan klip pan ɛvri sɛkshɔn bak

Ɛvri sɛkshɔn insay dis andbuk de opin wit in yon klip we nɔ pas tɔti sɛkɔn, we
de sho dat wan skrin ɛn wetin fɔ du de. Di tɔ dɛn we de ɔp de na fɔ mek yu no
usay yu de; di sɛkshɔn klip na fɔ di tɛm we yu tap pan wan spɛshal tin.

## Yu prifa fɔ rid?

Ɛvri stɔp insay ɛvri tɔ gɛt in rayt pej insay dis andbuk. Stat wit
[Introdɔkshɔn](/kri/getting-started/introduction), ɔ go stret to di sɛkshɔn we
yu nid frɔm di saydba.
