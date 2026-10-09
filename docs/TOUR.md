# Kairos — A Guided Tour

A narrated walkthrough of Kairos for everyone who uses it week to week:
pastors, branch admins, fellowship leaders, and members. No technical
knowledge is needed, and nothing in the tour asks you to change anything.

## ▶ Watch the tour

**[docs/media/kairos-tour.mp4](media/kairos-tour.mp4)** · 5 minutes 15 seconds · 28 stops · with voiceover

> GitHub will not play the file inside this page — click the link above, then
> press **View raw** (or **Download**) to open it in your video player.

The video is a continuous screen recording of the real application on
**staging.kairos.kharis.org**. You watch the pointer move, the password being
typed, pages loading, the light/dark switch being flipped, and the sidebar
groups opening — all in real time. Everyone and everything in it is
demonstration data.

The tour is recorded twice over: first as a **system administrator**, who sees
every section, and then signed out and back in as an **ordinary member**, to
show how much smaller the app becomes when your role needs less of it.

## Looking for written help instead?

The full handbook lives at **<https://docs.kairos.kharis.org>** — Getting
Started, Platform, Church Management, Administration and Analytics. It is
linked from **Help & Guides** at the foot of the Kairos sidebar, and the tour
ends by opening it from there.

## The tour, step by step

### As an administrator

| # | Stop | What it covers |
|---|---|---|
| 1 | Welcome | What Kairos is for |
| 2 | Signing in | Email, password, and the reset link |
| 3 | Church Pulse | Branches, congregation, members, fellowships |
| 4 | Needs you | Welfare matters, join requests, follow-ups due |
| 5 | Finding your way around | The six sidebar groups |
| 6 | Light and dark mode | The toggle at the foot of the sidebar |
| 7 | Members | The directory of everyone in your church |
| 8 | Membership classes | Becoming a confirmed member |
| 9 | New Believers | The four-session journey to joining a department |
| 10 | Concerns | Pastoral matters, kept apart and permission-gated |
| 11 | Follow-ups | The queue of people owed a contact |
| 12 | Outreach Programs | Crusades, street missions, campus visits |
| 13 | Souls Pipeline | New → Following Up → Converted |
| 14 | Forms | First-timer cards and submissions from outside |
| 15 | Fellowships | K-Groups, Kharis Express, and the map view |
| 16 | Departments | Choir, ushers, media — rotas and uniforms |
| 17 | Attendance | Every Sunday, midweek and special service |
| 18 | Check in | The desk on a Sunday morning |
| 19 | Reports | Attendance, growth and outreach |
| 20 | Souls Dashboard | The whole outreach picture |
| 21 | Branches | Every congregation (system admins) |
| 22 | Regions | Branches grouped by country |
| 23 | My Branch | Your own congregation's details and leadership |
| 24 | Your Profile | Your details, groups and settings |

### As a member

| # | Stop | What it covers |
|---|---|---|
| 25 | Signing in as a member | Signing out, and back in |
| 26 | A member's view | A quieter sidebar — no Members, Concerns or Organisation |
| 27 | My Attendance | Your own record, without asking the office |
| 28 | Help & Guides | Opening the written handbook from the sidebar |

## What you see depends on who you are

Kairos shows people only what their role needs. A member sees their own
groups and their own attendance; a branch pastor sees the branch; a system
admin sees regions and branches as well. If a stop in the video is not in your
sidebar, your role does not need it. That is by design, not a fault.

## Notes for maintainers

The recording is not hand-made. It is a live capture of the deployed
application driven by Playwright: a scripted session signs in, navigates,
types, scrolls and clicks while Playwright records the viewport to video. The
on-screen pointer and the step captions are injected into the page during the
run, so they survive navigation — including onto the external docs site.

The narration is synthesised, not recorded in a studio. It uses
[Kokoro](https://github.com/thewh1teagle/kokoro-onnx) (82M, ONNX) with the
`bf_lily` British voice at speed 0.92. Each line is rendered to its own file;
the recorder timestamps every step as it performs it, and the narration is
then muxed onto those measured offsets, so audio and picture cannot drift
apart. Re-wording the tour means editing text, not booking a studio.

Things that will bite whoever re-records it:

- **The sidebar footer sits below the fold.** Settings, the theme toggle and
  sign-out are at roughly y=1136 in a 1080-high viewport, so they must be
  scrolled into view before they can be clicked.
- **Sign-out is an icon button.** It has `aria-label="Sign out"` and no text,
  so a text selector will not find it.
- **Help & Guides opens in a new tab,** which would leave the recording
  behind. Retarget it to `_self` before clicking so the take stays continuous.
- **Let the login page hydrate** before submitting. Submitting early makes the
  form fall back to a native GET, putting the password in the URL and never
  logging in.
- **If you record against a local dev server instead,** pre-warm every route
  first. Next compiles on first request, and a 30-second compile mid-take
  shows up as a long dead stretch.
