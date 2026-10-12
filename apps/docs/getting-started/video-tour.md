<script setup>
import { ref } from 'vue'

const tours = [
  {
    id: 'member',
    pick: 'a member',
    heading: 'Kairos for members',
    blurb: 'Your own groups, your own attendance, and the gatherings you belong to.',
    length: '2 min 39',
    stops: 13,
  },
  {
    id: 'leader',
    pick: 'a leader or pastor',
    heading: 'Kairos for leaders and pastors',
    blurb: 'Everything a member sees, plus the branch directory, pastoral care and follow-ups.',
    length: '3 min 25',
    stops: 17,
  },
  {
    id: 'admin',
    pick: 'an administrator',
    heading: 'Kairos for administrators',
    blurb: 'The whole platform, including every branch and region.',
    length: '4 min 08',
    stops: 20,
  },
]

const chosen = ref('member')
const tour = () => tours.find(t => t.id === chosen.value)
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
</style>

# Video Tour

A narrated walkthrough of Kairos, recorded in the real application. There are
three of them, because Kairos shows each person only what their role needs.
Choose the one that fits you.

Everyone and everything in the recordings is demonstration data.

<div class="rolepick">
  <div class="q">I am…</div>
  <div class="row">
    <button v-for="t in tours" :key="t.id" :class="{ on: chosen === t.id }" @click="chosen = t.id">{{ t.pick }}</button>
  </div>
</div>

<div class="tourhead">
  <h3>{{ tour().heading }}</h3>
  <div class="meta">{{ tour().length }} · {{ tour().stops }} stops · {{ tour().blurb }}</div>
</div>

<video :key="chosen" class="tourvid" controls preload="metadata" playsinline :poster="`/tour-${chosen}.jpg`"><source :src="`/tour-${chosen}.mp4`" type="video/mp4" />Your browser cannot play embedded video. <a :href="`/tour-${chosen}.mp4`">Download this tour instead</a>.</video>

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

Signing in, your Overview, light and dark mode, My Attendance, Fellowships,
Departments, Attendance, Check in, New Believers, Membership classes, your
Profile, and where to find this handbook.

### A leader or pastor

Everything above, and then My Branch, the [Members](/platform/members)
directory, [Concerns](/platform/concerns), [Follow-ups](/platform/follow-ups),
the [Souls Pipeline](/platform/souls-pipeline) and
[Reports](/platform/reports).

### An administrator

The whole platform. Church Pulse and Needs You on the dashboard, the six
sidebar groups, every section in People, Groups, Gatherings and Insights, and
then [Branches](/platform/branches) and [Regions](/platform/regions) under
Organisation.

## Prefer to read?

Every stop in every tour has a written page in this handbook. Start with
[Introduction](/getting-started/introduction), or go straight to the section
you need from the sidebar.
