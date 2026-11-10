<script setup>
import { ref } from 'vue'

const LANG = '-tw'

const tours = [
  { id: 'member', pick: 'ɔmanfoɔ', heading: 'Kairos ma asɔremufoɔ', blurb: 'W\'ankasa akuo, w\'ankasa mmaeɛ, ne nhyiamu a wowɔ mu.', stops: 8 },
  { id: 'pastor', pick: 'kannifoɔ anaa ɔsɔfoɔ', heading: 'Kairos ma akannifoɔ ne asɔfoɔ', blurb: 'W\'asɔre baa: nhwɛmu, ɔhwɛ, nkɔdi akyi, ne nkaeɛbɔ.', stops: 9 },
  { id: 'admin',  pick: 'sohwɛfoɔ',  heading: 'Kairos ma sohwɛfoɔ',  blurb: 'Asɔre mmaa, amantam, ɔpene, tumi, ne nkaeɛbɔ a ɛtra asɔre mmaa so.',  stops: 9 },
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

# Video Akwantuo

Kairos akwantuo a wɔaka ho asɛm, a wɔtwaa no wɔ app no ankasa mu.

Firi akwantuo kɛseɛ no ase sɛ Kairos yɛ foforɔ ma wo a. Afei yi akwantuo a
ɛfata w'akawnt: emu biara kyerɛ deɛ saa dibea no hunu ankasa nko ara, enti emu
biara mfa wo nkɔ skrin a wontumi mmue so.

Nnipa ne nneɛma a ɛwɔ mfonini no mu nyinaa yɛ nhwɛsoɔ nsɛm.

## Firi ha: deɛ Kairos yɛ

Agyinabea nkron a ɛtra nhyehyɛeɛ no nyinaa so, a wɔtwaeɛ sɛ sohwɛfoɔ sɛdeɛ adeɛ
no tebea nyinaa bɛda adi. Ɛno nko ara ne akwantuo a ɛkyerɛ afa a ebia w'ankasa
dibea nni bi.

<video class="tourvid" controls preload="metadata" playsinline :poster="`${clip('general')}.jpg`"><source :src="`${clip('general')}.mp4`" type="video/mp4" />Wo browser ntumi nto saa video yi. <a :href="`${clip('general')}.mp4`">Twe akwantuo no</a>.</video>

<p class="silentnote">Twi nne biara nni hɔ nnɛ, enti Borɔfo nne na ɛkenkan Twi no — ɛnka no yie. Nsɛm a wɔatwerɛ no ne Twi ankasa, enti di akyi.</p>

## Afei: w'ankasa dibea

<div class="rolepick">
  <div class="q">Meyɛ…</div>
  <div class="row">
    <button v-for="t in tours" :key="t.id" :class="{ on: chosen === t.id }" @click="chosen = t.id">{{ t.pick }}</button>
  </div>
</div>

<div class="tourhead">
  <h3>{{ tour().heading }}</h3>
  <div class="meta">agyinabea {{ tour().stops }} · {{ tour().blurb }}</div>
</div>

<video :key="chosen" class="tourvid" controls preload="metadata" playsinline :poster="`${clip(chosen)}.jpg`"><source :src="`${clip(chosen)}.mp4`" type="video/mp4" />Wo browser ntumi nto saa video yi. <a :href="`${clip(chosen)}.mp4`">Twe akwantuo no</a>.</video>

## Akwantuo bɛn na ɛyɛ me dea?

Sɛ wonnim a, bue w'akawnt na hwɛ wo nkyekyɛmu. Dodoɔ a asɛyɛdeɛ wɔ wo so no, saa
ara na afa a ɛwɔ mu dɔɔso.

| Deɛ wohunu | W'akwantuo |
|---|---|
| W'ankasa mmaeɛ, wo fekuo ne w'adwumakuo | **Ɔmanfoɔ** |
| Ne Asɔremufoɔ, Nsɛm a Ɛhaw, Nkɔdi Akyi ne Me Asɔre Baa | **Kannifoɔ anaa Ɔsɔfoɔ** |
| Ne Asɔre Mmaa ne Amantam | **Sohwɛfoɔ** |

Wɔmmfa biribiara nsie wo kokoam. Afa a wonhunu no yɛ deɛ wo dibea nhia, na
[Dibea ne Akwannya](/tw/getting-started/roles-permissions) kyerɛ sɛdeɛ wɔsi ho
gyinae.

## Deɛ akwantuo biara fa ho

### Ɔmanfoɔ

Wo nhwɛmu, deɛ enti a wo nkyekyɛmu yɛ tiawa, Me Mmaeɛ, wo fekuo, w'adwumakuo,
dinkyerɛw, nkrataa, ne wo nkrataa fa.

### Kannifoɔ anaa Ɔsɔfoɔ

Wo nhwɛmu, [Me Asɔre Baa](/tw/platform/branches),
[Asɔremufoɔ](/tw/platform/members) nhwɛmu, [Nkɔdi Akyi](/tw/platform/follow-ups),
[Nsɛm a Ɛhaw](/tw/platform/concerns), w'ankasa fekuo ne adwumakuo,
[Akra Ɔkwan](/tw/platform/souls-pipeline) ne [Nkaeɛbɔ](/tw/platform/reports).

### Sohwɛfoɔ

Afa a obiara foforɔ nni bi nko ara: [Asɔre Mmaa](/tw/platform/branches), asɔre
baa bi mu ne n'akannifoɔ, [Amantam](/tw/platform/regions),
[ɔpene nhwɛmu](/tw/administration/approvals), hwan na ɔkura
[tumi](/tw/administration/permissions) bɛn, asɔre no nyinaa
[asɔremufoɔ nhyehyɛeɛ](/tw/platform/membership), ne
[Nkaeɛbɔ](/tw/platform/reports) a ɛtra asɔre mmaa so.

## Video tiawa wɔ afa biara so nso

Nwoma yi afa biara bue wɔ ne video tiawa a ɛnnuru simma aduasa so, a ɛkyerɛ saa
skrin no ne deɛ wobɛyɛ wɔ so. Akwantuo a ɛwɔ soro hɔ no boa wo ma wohunu baabi a
wowɔ; afa no mu video tiawa no boa wo bere a woagyina biribi pɔtee so.

## Wopɛ sɛ wokenkan?

Agyinabea biara a ɛwɔ akwantuo biara mu wɔ ne kratafa wɔ nwoma yi mu. Firi
[Nnianim Asɛm](/tw/getting-started/introduction) ase, anaa kɔ afa a wohia no so
tẽẽ firi nkyekyɛmu no mu.
