<script setup>
import { ref } from 'vue'

const LANG = ''

const tours = [
  { id: 'member', pick: 'a member', heading: 'Kairos for members', blurb: 'Your own groups, your own attendance, and the gatherings you belong to.', stops: 8 },
  { id: 'pastor', pick: 'a leader or pastor', heading: 'Kairos for leaders and pastors', blurb: 'Your branch: the directory, pastoral care, follow-ups and reports.', stops: 9 },
  { id: 'admin',  pick: 'an administrator',  heading: 'Kairos for administrators',  blurb: 'Branches, regions, approvals, grants and cross-branch reporting.',  stops: 9 },
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

# Video Tour

A narrated walkthrough of Kairos, recorded in the real application.

Start with the general tour if Kairos is new to you. Then pick the role tour
that matches your account: each one shows only what that role actually sees,
so none of them walks you past a screen you cannot open.

Everyone and everything in the recordings is demonstration data.

## Start here: what Kairos is

Nine stops across the whole platform, recorded as an administrator so the
shape of the thing is visible. It is the only tour that shows sections your
own role may not have.

<video class="tourvid" controls preload="metadata" playsinline :poster="`${clip('general')}.jpg`"><source :src="`${clip('general')}.mp4`" type="video/mp4" />Your browser cannot play embedded video. <a :href="`${clip('general')}.mp4`">Download this tour instead</a>.</video>

## Then: your own role

<div class="rolepick">
  <div class="q">I am…</div>
  <div class="row">
    <button v-for="t in tours" :key="t.id" :class="{ on: chosen === t.id }" @click="chosen = t.id">{{ t.pick }}</button>
  </div>
</div>

<div class="tourhead">
  <h3>{{ tour().heading }}</h3>
  <div class="meta">{{ tour().stops }} stops · {{ tour().blurb }}</div>
</div>

<video :key="chosen" class="tourvid" controls preload="metadata" playsinline :poster="`${clip(chosen)}.jpg`"><source :src="`${clip(chosen)}.mp4`" type="video/mp4" />Your browser cannot play embedded video. <a :href="`${clip(chosen)}.mp4`">Download this tour instead</a>.</video>

## Which tour is mine?

If you are not sure, sign in and look at your sidebar. The more responsibility
you carry, the more sections appear in it.

| You see | Your tour |
|---|---|
| Your own attendance, fellowships and departments | **A member** |
| Also Members, Concerns, Follow-ups and My Branch | **A leader or pastor** |
| Also Branches and Regions | **An administrator** |

Nothing is hidden from you out of secrecy. A section you cannot see is simply
one your role has no need of, and [Roles & Permissions](/getting-started/roles-permissions)
explains how that is decided.

## What each tour covers

### A member

Your overview, why your sidebar is short, My Attendance, your fellowship, your
departments, checking in, forms, and your profile.

### A leader or pastor

Your overview, [My Branch](/platform/branches), the [Members](/platform/members)
directory, [Follow-ups](/platform/follow-ups), [Concerns](/platform/concerns),
your own fellowship and department, the [Souls Pipeline](/platform/souls-pipeline)
and [Reports](/platform/reports).

### An administrator

Only the parts nobody else has: [Branches](/platform/branches), inside a branch
and its leadership, [Regions](/platform/regions), the
[approval queue](/administration/approvals), who holds which
[grant](/administration/permissions), the church-wide
[membership programme](/platform/membership), and cross-branch
[Reports](/platform/reports).

## A clip on every section too

Each section of this handbook opens with its own clip of up to thirty seconds,
showing that one screen and what to do on it. The tours above are for getting
your bearings; the section clips are for the moment you are stuck on something
specific.

## Prefer to read?

Every stop in every tour has a written page in this handbook. Start with
[Introduction](/getting-started/introduction), or go straight to the section
you need from the sidebar.
