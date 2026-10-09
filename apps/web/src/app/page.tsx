import Link from "next/link";
import {
  Users,
  Building2,
  ClipboardList,
  Heart,
  BarChart2,
  ShieldCheck,
  FileSpreadsheet,
  Search,
  MessageSquare,
  ArrowUpRight,
  LayoutDashboard,
  Map,
  CalendarCheck,
  GraduationCap,
  Briefcase,
  Megaphone,
  Sparkles,
  FileText,
  UserCircle,
  Settings,
  LogOut,
  ChevronRight,
  BookOpen,
} from "lucide-react";
import { ThemeToggle } from "@/components/theme-toggle";
import { Reveal } from "@/components/motion/reveal";
import { HandDrawn } from "@/components/motion/hand-drawn";
import { TypedText } from "@/components/motion/typed-text";
import { CardField } from "@/components/motion/card-field";
import { FloatCard } from "@/components/motion/float-card";
import { Spotlight } from "@/components/motion/spotlight";
import { Halo } from "@/components/motion/halo";
import { Assemble } from "@/components/motion/assemble";

// ─── Content ──────────────────────────────────────────────────────────────────
// Six shipped capabilities. Donations + Notifications deliberately left off
// (donations descoped from MVP; notifications owned outside this surface).

// Docs host — every feature card links out to its dedicated docs page so
// prospects can dig in one click. Kept as a constant so the surface can be
// pointed at a preview environment without hunting every href.
const DOCS_BASE = "https://docs.kairos.kharis.org";

const FEATURES = [
  {
    Icon: Users,
    title: "Member Directory",
    desc: "Full profiles, roles, branch assignments and contact details in one place.",
    href: `${DOCS_BASE}/platform/members`,
  },
  {
    Icon: Building2,
    title: "Multi-Branch Management",
    desc: "Oversee every campus, cell, and satellite branch from a single dashboard.",
    href: `${DOCS_BASE}/platform/branches`,
  },
  {
    Icon: ClipboardList,
    title: "Attendance Tracking",
    desc: "Record service, fellowship, and department meeting attendance, with clean weekly reports.",
    href: `${DOCS_BASE}/platform/attendance`,
  },
  {
    Icon: Heart,
    title: "Fellowships & Pipelines",
    desc: "K-Groups, new-believer discipleship, soul follow-ups: track every relationship.",
    href: `${DOCS_BASE}/platform/fellowships`,
  },
  {
    Icon: BarChart2,
    title: "Reports & Insights",
    desc: "Attendance trends, fellowship growth, leader-scoped dashboards, with no spreadsheet stitching.",
    href: `${DOCS_BASE}/platform/reports`,
  },
  {
    Icon: ShieldCheck,
    title: "Roles & Permissions",
    desc: "Branch admins, fellowship leaders, safeguarding leads: each sees only what they should.",
    href: `${DOCS_BASE}/administration/permissions`,
  },
];

const PAIN_POINTS = [
  { Icon: FileSpreadsheet, text: "Scattered spreadsheets with no single source of truth" },
  { Icon: Search, text: "No way to see who's been absent for weeks" },
  { Icon: MessageSquare, text: "Member contact info trapped in personal WhatsApp groups" },
  { Icon: BarChart2, text: "Sunday reports that take hours of manual stitching" },
];

const STATS = [
  { value: "Multi", label: "Branch · Region · Country" },
  { value: "Real-time", label: "Sync across every campus" },
  { value: "GDPR", label: "UK-first, auditable" },
  { value: "Zero", label: "Spreadsheets needed" },
];

// ─── Helpers ──────────────────────────────────────────────────────────────────

function PreviewWindow({
  url,
  prominent = false,
  children,
}: {
  url: string;
  prominent?: boolean;
  children: React.ReactNode;
}) {
  return (
    <div
      className={`rounded-xl border border-black/10 dark:border-white/[0.08] bg-white dark:bg-[#0a0a0a] overflow-hidden ${
        prominent
          ? "shadow-[0_30px_80px_-20px_rgba(93,63,211,0.35)] dark:shadow-[0_30px_80px_-20px_rgba(93,63,211,0.45),0_0_0_1px_rgba(248,181,55,0.08)]"
          : "shadow-[0_20px_60px_-25px_rgba(0,0,0,0.15)] dark:shadow-[0_20px_60px_-25px_rgba(0,0,0,0.7)]"
      }`}
    >
      {/* Chrome */}
      <div className="flex items-center gap-2 px-3 py-2.5 bg-black/[0.02] dark:bg-white/[0.02] border-b border-black/[0.06] dark:border-white/[0.06]">
        <div className="flex items-center gap-1.5">
          <span className="w-2 h-2 rounded-full bg-[#ff5f56]" />
          <span className="w-2 h-2 rounded-full bg-[#ffbd2e]" />
          <span className="w-2 h-2 rounded-full bg-[#27c93f]" />
        </div>
        <div className="flex-1 mx-3">
          <div className="text-[10px] text-black/40 dark:text-white/30 bg-black/[0.02] dark:bg-white/[0.03] border border-black/[0.05] dark:border-white/[0.05] rounded-md px-3 py-1 truncate text-center">
            {url}
          </div>
        </div>
      </div>
      {/* Body */}
      <div className="p-4 md:p-5">{children}</div>
    </div>
  );
}

// ─── Page ─────────────────────────────────────────────────────────────────────

export default function KairosLanding() {
  return (
    <div className="min-h-screen bg-white dark:bg-[#0d0d0d] text-[#1a1c1c] dark:text-white font-sans antialiased">
      {/* Without JS nothing adds .mo-in, so undo the hidden starting states. */}
      <noscript>
        <style>{`.mo-reveal{opacity:1!important}.mo-draw{stroke-dasharray:none!important;stroke-dashoffset:0!important}.mo-bar-y,.mo-bar-x{transform:none!important}`}</style>
      </noscript>

      {/* ── Nav ─────────────────────────────────────────────────────────── */}
      <nav className="fixed top-0 inset-x-0 z-50 bg-white/85 dark:bg-[#0d0d0d]/85 backdrop-blur-xl border-b border-black/[0.07] dark:border-white/[0.07]">
        <div className="flex items-center justify-between px-6 md:px-16 py-4 md:py-5">
          <Link href="/" className="font-black text-xl tracking-tighter transition-opacity hover:opacity-80">
            <span className="text-[#f8b537]">K</span>AIROS
          </Link>
          <div className="hidden md:flex items-center gap-8 text-sm text-black/55 dark:text-white/55">
            <a href="#why" className="hover:text-black dark:hover:text-white transition-colors">Why Kairos</a>
            <a href="#features" className="hover:text-black dark:hover:text-white transition-colors">Features</a>
            <a href="#preview" className="hover:text-black dark:hover:text-white transition-colors">Preview</a>
            <a
              href="https://docs.kairos.kharis.org"
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-1 hover:text-black dark:hover:text-white transition-colors"
            >
              Help & Guides
              <ArrowUpRight className="h-3 w-3" />
            </a>
          </div>
          <div className="flex items-center gap-2">
            <ThemeToggle className="rounded-full border border-black/15 dark:border-white/15 hover:border-[#f8b537]/60 bg-black/[0.02] dark:bg-white/[0.04] hover:bg-black/[0.05] dark:hover:bg-white/[0.07] text-black/85 dark:text-white/90 hover:text-[#f8b537] dark:hover:text-[#f8b537] w-9 h-9 inline-flex items-center justify-center" />
            <Link
              href="/login"
              className="inline-flex items-center gap-1.5 rounded-full border border-black/15 dark:border-white/15 hover:border-[#f8b537]/60 dark:hover:border-[#f8b537]/60 bg-black/[0.02] dark:bg-white/[0.04] hover:bg-black/[0.05] dark:hover:bg-white/[0.07] text-black/85 dark:text-white/90 hover:text-[#f8b537] dark:hover:text-[#f8b537] px-5 py-2 text-sm font-semibold transition-all"
            >
              Sign In
              <ArrowUpRight className="h-3.5 w-3.5" />
            </Link>
          </div>
        </div>
      </nav>

      {/* ── Hero ────────────────────────────────────────────────────────── */}
      {/*
        Hero text stays white in BOTH themes because it sits over the photo.
        Only the bottom-fade tint switches: in light mode it fades to white
        (matching the page below); in dark mode to #0d0d0d.
      */}
      <section className="relative min-h-screen overflow-hidden" aria-label="Kairos church administration platform">
        {/* Layer 1: gradient fallback (always rendered, hidden by photo when present) */}
        <div
          aria-hidden
          className="absolute inset-0 bg-[radial-gradient(ellipse_at_top_left,#f8b537_0%,transparent_45%),radial-gradient(ellipse_at_bottom_right,#451ebb_0%,transparent_50%),linear-gradient(180deg,#1a0d2e_0%,#0d0d0d_100%)]"
        />
        {/* Layer 2: real Kharis hero — missing /landing/hero.jpg silently shows nothing */}
        <div
          aria-hidden
          className="absolute inset-0 bg-cover bg-center"
          style={{ backgroundImage: "url('/landing/hero.jpg')" }}
        />
        {/* Layer 3: tint — top stays dark (photo contrast); bottom fades to page bg */}
        <div className="absolute inset-0 bg-gradient-to-b from-[#0d0d0d]/30 via-[#0d0d0d]/40 to-white dark:to-[#0d0d0d]" />
        <div className="absolute inset-0 bg-[#451ebb]/15 mix-blend-multiply" />
        {/* Canvas: dot grid, cursor glow, and the cards that drift in. The
            cards sit in the free right-hand side of the hero, so they only
            appear from xl up where there is room beside the headline. */}
        <div
          aria-hidden
          className="absolute inset-0 [background-image:radial-gradient(rgba(255,255,255,0.14)_1px,transparent_1.2px)] [background-size:24px_24px]"
        />
        <Spotlight size={560} />
        <CardField className="hidden xl:block">
          <FloatCard position={{ right: "26%", top: "15%" }} depth={0.5} fx={-260} fy={-160} fr={-18} tilt={-5} i={0}>
            <div className="w-[230px] rounded bg-card p-[7px] pb-2.5 text-card-foreground shadow-[0_24px_60px_-16px_rgba(0,0,0,0.4)]">
              <div
                className="h-[140px] rounded-sm bg-cover bg-center"
                style={{ backgroundImage: "url('/landing/hero.jpg')" }}
              />
              <div className="mt-2 px-[3px] text-[11px] font-semibold">Sunday Service · London Central</div>
            </div>
          </FloatCard>
          <FloatCard position={{ right: "5%", top: "17%" }} depth={0.8} fx={280} fy={-140} fr={14} tilt={3} i={1}>
            <div className="flex items-center gap-2.5 rounded border border-border bg-card px-3.5 py-3 text-card-foreground shadow-[0_20px_50px_-16px_rgba(0,0,0,0.35)]">
              <span className="grid h-8 w-8 place-items-center rounded-full bg-[#5d3fd3] text-[11px] font-bold text-white">MT</span>
              <div>
                <div className="text-[13px] font-bold">Mary T.</div>
                <div className="text-[11px] text-muted-foreground">
                  Just enrolled · <span className="text-[#f8b537]">Welcome</span>
                </div>
              </div>
            </div>
          </FloatCard>
          <FloatCard position={{ right: "31%", top: "47%" }} depth={0.3} fx={-300} fy={40} fr={10} tilt={-2} i={2}>
            <div className="relative rounded bg-muted px-3.5 py-2.5 font-mono text-xs font-medium text-muted-foreground">
              attendance_FINAL_v3 (2).xlsx
              <HandDrawn
                d="M2 12 C 70 6, 160 14, 298 7"
                viewBox="0 0 300 20"
                stroke="#F8B537"
                strokeWidth={3}
                delay={1800}
                when="load"
                className="absolute left-1.5 top-1/2 h-3.5 w-[calc(100%-12px)] -translate-y-1/2"
              />
            </div>
          </FloatCard>
          <FloatCard position={{ right: "3%", top: "46%" }} depth={0.6} fx={300} fy={60} fr={-10} tilt={2} i={3}>
            <div className="relative rounded bg-muted px-3.5 py-2.5 text-xs text-muted-foreground">
              WhatsApp · Youth Leaders (214 unread)
              <HandDrawn
                d="M2 9 C 90 14, 200 5, 298 11"
                viewBox="0 0 300 20"
                stroke="#F8B537"
                strokeWidth={3}
                delay={2000}
                when="load"
                className="absolute left-1.5 top-1/2 h-3.5 w-[calc(100%-12px)] -translate-y-1/2"
              />
            </div>
          </FloatCard>
          <FloatCard position={{ right: "29%", bottom: "9%" }} depth={0.9} fx={-120} fy={260} fr={-12} tilt={-3} i={4}>
            <div className="w-[180px] rounded border border-border bg-card px-4 py-3.5 text-card-foreground shadow-[0_20px_50px_-16px_rgba(0,0,0,0.35)]">
              <div className="flex justify-between text-[10px] tracking-[0.14em] text-muted-foreground">
                <span>SUNDAY</span>
                <span className="font-bold tracking-normal text-[#10b981]">+8%</span>
              </div>
              <div className="mt-0.5 text-[28px] font-extrabold">312</div>
              <div className="mt-1.5 flex h-[34px] items-end gap-1">
                {[40, 55, 48, 70].map((h, k) => (
                  <div key={k} className="flex-1 bg-[#5d3fd3]/40" style={{ height: `${h}%` }} />
                ))}
                <div className="h-full flex-1 bg-gradient-to-t from-[#5d3fd3] to-[#f8b537]" />
              </div>
            </div>
          </FloatCard>
          <FloatCard position={{ right: "6%", bottom: "10%" }} depth={0.4} fx={160} fy={240} fr={12} tilt={4} i={5}>
            <div className="w-[220px] rounded-[3px] bg-[#fdf3dc] px-[18px] py-4 text-[#3b2a06] shadow-[0_20px_50px_-16px_rgba(0,0,0,0.35)]">
              <div className="text-[10px] font-bold tracking-[0.16em] text-[#b07a10]">DAILY VERSE</div>
              <div className="mt-1.5 text-sm italic leading-[1.45]">&ldquo;Love one another as I have loved you.&rdquo;</div>
              <div className="mt-1.5 text-[11px] text-[#8a6410]">— John 15:12</div>
            </div>
          </FloatCard>
        </CardField>

        {/* Content (text stays white in both themes — sits on photo) */}
        <div className="relative z-10 flex flex-col justify-end min-h-screen px-6 md:px-16 pb-20 md:pb-28 pt-32">
          <p
            className="mo-load text-white/60 text-[11px] md:text-xs uppercase tracking-[0.35em] mb-6"
            style={{ ["--i" as string]: 0 }}
          >
            Church Administration · Multi-Branch · Real-time
          </p>
          <h1 className="font-black uppercase tracking-[-0.025em] leading-[0.88] text-[clamp(3.5rem,12vw,10rem)] text-white">
            <span className="mo-load block" style={{ ["--i" as string]: 1 }}>Church</span>
            <span className="mo-load block" style={{ ["--i" as string]: 2 }}>Admin</span>
            <span
              className="mo-load block bg-gradient-to-r from-[#f8b537] to-[#5d3fd3] bg-clip-text text-transparent"
              style={{ ["--i" as string]: 3 }}
            >
              Finally
            </span>
            <span className="mo-load relative inline-block" style={{ ["--i" as string]: 4 }}>
              <span className="relative z-10">Sorted.</span>
              <HandDrawn
                d="M4 16 C 60 6, 130 4, 190 9 S 270 16, 296 7"
                viewBox="0 0 300 24"
                stroke="#5D3FD3"
                strokeWidth={5}
                delay={1500}
                when="load"
                className="pointer-events-none absolute -bottom-[18px] left-[-2%] z-0 h-6 w-[104%]"
              />
            </span>
          </h1>
          <TypedText
            className="mt-8 max-w-xl text-base md:text-lg text-white/65 leading-relaxed"
            text="Kairos replaces the spreadsheets, WhatsApp groups, and manual registers that are slowing your church down."
          />
          <div className="mo-load mt-10 flex flex-col sm:flex-row gap-3" style={{ ["--i" as string]: 6 }}>
            <Halo radiusClass="rounded-full" className="mo-lift [--lift-rot:1deg]">
              <Link
                href="/login"
                className="inline-flex w-full items-center justify-center gap-2 rounded-full bg-[#5D3FD3] hover:bg-[#451ebb] text-white px-8 py-3.5 font-bold text-sm uppercase tracking-[0.15em] transition-colors"
              >
                Get Started
                <ArrowUpRight className="h-4 w-4" />
              </Link>
            </Halo>
            <a
              href="#features"
              className="mo-lift [--lift-rot:-1deg] inline-flex items-center justify-center rounded-full border border-white/15 hover:border-white/40 bg-white/[0.03] hover:bg-white/[0.06] text-white px-8 py-3.5 font-bold text-sm uppercase tracking-[0.15em] transition-colors"
            >
              Explore Features
            </a>
          </div>
        </div>
      </section>

      {/* ── Stats band ──────────────────────────────────────────────────── */}
      <section className="border-y border-black/[0.06] dark:border-white/[0.06] bg-[#f9f9f9] dark:bg-[#0a0a0a]">
        <div className="max-w-6xl mx-auto grid grid-cols-2 md:grid-cols-4 divide-x divide-black/[0.06] dark:divide-white/[0.06]">
          {STATS.map((s, i) => (
            <Reveal key={s.label} index={i} className="p-6 md:p-8">
              <div className="text-2xl md:text-3xl font-black text-[#f8b537] leading-none">
                {s.value}
              </div>
              <div className="mt-2 text-[10px] md:text-[11px] uppercase tracking-[0.18em] text-black/55 dark:text-white/45 leading-snug">
                {s.label}
              </div>
            </Reveal>
          ))}
        </div>
      </section>

      {/* ── Problem: 'Sound familiar?' (Cryptix copy, Nexa typography) ──── */}
      <section id="why" className="py-24 md:py-32 px-6 md:px-16">
        <div className="max-w-6xl mx-auto grid md:grid-cols-12 gap-12 items-start">
          <div className="md:col-span-5">
            <Reveal as="p" index={0} className="text-[11px] font-bold uppercase tracking-[0.3em] text-[#f8b537] mb-5">
              The Problem
            </Reveal>
            <Reveal as="h2" index={1} className="font-black uppercase tracking-tight leading-[0.9] text-5xl md:text-6xl">
              Sound
              <br />
              familiar?
            </Reveal>
            <Reveal as="p" index={2} className="mt-6 text-black/55 dark:text-white/55 leading-relaxed max-w-md">
              Most churches are managed with a patchwork of tools that don't
              talk to each other. Kairos changes that.
            </Reveal>
          </div>
          <ul className="md:col-span-7 space-y-3">
            {PAIN_POINTS.map((p, i) => (
              <Reveal
                as="li"
                key={p.text}
                index={i}
                className="relative flex items-start gap-4 rounded-lg border border-black/[0.08] dark:border-white/[0.06] bg-black/[0.02] dark:bg-white/[0.02] hover:bg-black/[0.04] dark:hover:bg-white/[0.04] hover:border-black/[0.15] dark:hover:border-white/[0.12] transition-colors p-5"
              >
                <Spotlight size={260} />
                <p.Icon className="h-5 w-5 text-[#f8b537] mt-0.5 shrink-0" />
                <span className="relative text-sm md:text-base text-black/70 dark:text-white/70 leading-relaxed">
                  {p.text}
                  <HandDrawn
                    d="M2 11 C 80 5, 190 15, 298 8"
                    viewBox="0 0 300 20"
                    stroke="#F8B537"
                    strokeWidth={2.5}
                    delay={i * 100 + 600}
                    className="pointer-events-none absolute left-0 top-1/2 h-3 w-full -translate-y-1/2"
                  />
                </span>
              </Reveal>
            ))}
          </ul>
        </div>
      </section>

      {/* ── Features grid (Nexa-style bordered cells) ───────────────────── */}
      <section id="features" className="py-24 md:py-32 px-6 md:px-16 border-t border-black/[0.06] dark:border-white/[0.06]">
        <div className="max-w-6xl mx-auto">
          <Reveal as="p" index={0} className="text-[11px] font-bold uppercase tracking-[0.3em] text-black/45 dark:text-white/40 mb-5">
            What's Inside
          </Reveal>
          <Reveal as="h2" index={1} className="font-black uppercase tracking-tight leading-[0.9] text-4xl md:text-5xl max-w-3xl">
            Everything your<br />team needs.
          </Reveal>
          <div className="mt-16 grid md:grid-cols-3 gap-px bg-black/[0.06] dark:bg-white/[0.06] border border-black/[0.06] dark:border-white/[0.06]">
            {FEATURES.map((f, i) => (
              <Reveal
                as="a"
                key={f.title}
                index={i}
                href={f.href}
                target="_blank"
                rel="noreferrer"
                className="relative bg-white dark:bg-[#0d0d0d] hover:bg-black/[0.02] dark:hover:bg-white/[0.02] transition-colors p-8 group flex flex-col"
              >
                <Spotlight size={300} />
                <div className="flex items-start justify-between">
                  <f.Icon className="h-7 w-7 text-[#f8b537] group-hover:text-[#5D3FD3] transition-colors" />
                  <ArrowUpRight className="h-4 w-4 text-black/25 dark:text-white/20 group-hover:text-[#5D3FD3] transition-colors" />
                </div>
                <h3 className="mt-6 text-base font-black uppercase tracking-tight">
                  {f.title}
                </h3>
                <p className="mt-3 text-sm text-black/55 dark:text-white/50 leading-relaxed">
                  {f.desc}
                </p>
                <span className="mt-4 text-[11px] font-bold uppercase tracking-[0.2em] text-black/35 dark:text-white/35 group-hover:text-[#5D3FD3] transition-colors">
                  Read the docs →
                </span>
              </Reveal>
            ))}
          </div>
        </div>
      </section>

      {/* ── Product Teaser: 'A Look Inside' ────────────────────────────── */}
      <section id="preview" className="relative py-24 md:py-32 px-6 md:px-16 border-t border-black/[0.06] dark:border-white/[0.06] overflow-hidden">
        <div
          aria-hidden
          className="absolute inset-0 bg-[radial-gradient(ellipse_at_center,#451ebb_0%,transparent_55%)] opacity-10 dark:opacity-25"
        />
        <div className="relative max-w-6xl mx-auto">
          <Reveal as="p" index={0} className="text-[11px] font-bold uppercase tracking-[0.3em] text-[#f8b537] mb-5">
            A Look Inside
          </Reveal>
          <div className="grid md:grid-cols-12 gap-12 items-end mb-16">
            <Reveal as="h2" index={1} className="md:col-span-7 font-black uppercase tracking-tight leading-[0.9] text-4xl md:text-5xl">
              Built for the<br />way you actually<br />run things.
            </Reveal>
            <Reveal as="p" index={2} className="md:col-span-5 text-black/55 dark:text-white/55 leading-relaxed">
              Real-time dashboards, scoped to the branch you lead and the
              fellowships you steward. No more screenshots from one tab into
              another tab.
            </Reveal>
          </div>

          {/* Card cluster — 3 floating browser windows */}
          <div className="relative mx-auto max-w-5xl">
            <div className="grid md:grid-cols-3 gap-4 md:gap-2 items-start">
              {/* ── Left card: Members directory ────────────────────────── */}
              <div className="md:translate-x-3 md:translate-y-6 md:rotate-[-2deg] z-10">
                <Assemble ax={-420} ay={120} ar={-14}>
                <PreviewWindow url="kairos.kharis.org/members">
                  <div className="flex items-center justify-between mb-4">
                    <h4 className="text-[#1a1c1c] dark:text-white text-sm font-bold">Members</h4>
                    <span className="text-[10px] text-black/45 dark:text-white/40">1,847 active</span>
                  </div>
                  <div className="rounded-md bg-black/[0.02] dark:bg-white/[0.04] border border-black/[0.08] dark:border-white/[0.08] px-3 py-2 mb-3 flex items-center gap-2">
                    <span className="text-black/40 dark:text-white/30 text-[11px]">⌕</span>
                    <span className="text-[11px] text-black/40 dark:text-white/30">Search members…</span>
                  </div>
                  <div className="flex gap-1.5 mb-3">
                    {["All", "Leaders", "Admins"].map((t, i) => (
                      <span
                        key={t}
                        className={`text-[10px] px-2 py-0.5 rounded-full ${
                          i === 0
                            ? "bg-[#5D3FD3]/15 text-[#5D3FD3] dark:bg-[#5D3FD3]/20 dark:text-[#a78bfa] border border-[#5D3FD3]/30"
                            : "text-black/45 dark:text-white/40 border border-black/10 dark:border-white/10"
                        }`}
                      >
                        {t}
                      </span>
                    ))}
                  </div>
                  <ul className="space-y-2.5">
                    {[
                      { initials: "DB", name: "Daniel B.", role: "Branch Admin", roleColor: "gold" },
                      { initials: "SM", name: "Sarah M.", role: "Fellowship Lead", roleColor: "purple" },
                      { initials: "JO", name: "James O.", role: "Member", roleColor: "muted" },
                      { initials: "EA", name: "Esther A.", role: "Safeguarding", roleColor: "purple" },
                      { initials: "MK", name: "Michael K.", role: "Member", roleColor: "muted" },
                    ].map((m) => (
                      <li key={m.name} className="flex items-center gap-2.5">
                        <span className="w-6 h-6 rounded-full bg-gradient-to-br from-[#5d3fd3] to-[#451ebb] flex items-center justify-center text-[9px] font-bold text-white shrink-0">
                          {m.initials}
                        </span>
                        <span className="flex-1 text-[11px] text-black/75 dark:text-white/80 truncate">{m.name}</span>
                        <span
                          className={`text-[9px] px-1.5 py-0.5 rounded ${
                            m.roleColor === "gold"
                              ? "bg-[#f8b537]/15 text-[#a0721b] dark:text-[#f8b537]"
                              : m.roleColor === "purple"
                              ? "bg-[#5D3FD3]/15 text-[#5D3FD3] dark:bg-[#5D3FD3]/20 dark:text-[#a78bfa]"
                              : "bg-black/[0.04] dark:bg-white/[0.05] text-black/45 dark:text-white/40"
                          }`}
                        >
                          {m.role}
                        </span>
                      </li>
                    ))}
                  </ul>
                </PreviewWindow>
                </Assemble>
              </div>

              {/* ── Center card: Dashboard (prominent) ──────────────────── */}
              <div className="md:scale-[1.04] md:-translate-y-2 md:z-20 relative">
                <Assemble ax={0} ay={260} ar={6}>
                <PreviewWindow url="kairos.kharis.org/dashboard" prominent>
                  <div className="flex items-center justify-between mb-5">
                    <div>
                      <p className="text-[10px] uppercase tracking-widest text-black/45 dark:text-white/40">Branch</p>
                      <h4 className="text-[#1a1c1c] dark:text-white text-sm font-bold">Kharis London Central</h4>
                    </div>
                    <span className="text-[10px] text-black/45 dark:text-white/40 rounded-md border border-black/10 dark:border-white/10 px-2 py-1">
                      This Week ▾
                    </span>
                  </div>
                  <div className="grid grid-cols-4 gap-2 mb-5">
                    {[
                      { label: "Members", value: "387" },
                      { label: "Sunday", value: "312", trend: "+8%" },
                      { label: "New", value: "12" },
                      { label: "Leaders", value: "28" },
                    ].map((s) => (
                      <div
                        key={s.label}
                        className="rounded-md border border-black/[0.08] dark:border-white/[0.08] bg-black/[0.02] dark:bg-white/[0.02] p-2.5"
                      >
                        <div className="text-base font-black text-[#1a1c1c] dark:text-white leading-none">{s.value}</div>
                        <div className="text-[9px] uppercase tracking-wider text-black/45 dark:text-white/40 mt-1">{s.label}</div>
                        {s.trend && (
                          <div className="text-[9px] text-[#16a34a] dark:text-[#22c55e] mt-0.5">{s.trend}</div>
                        )}
                      </div>
                    ))}
                  </div>
                  <div className="rounded-md border border-black/[0.08] dark:border-white/[0.08] bg-black/[0.02] dark:bg-white/[0.02] p-3">
                    <div className="flex items-center justify-between mb-3">
                      <span className="text-[10px] uppercase tracking-widest text-black/45 dark:text-white/40">
                        Attendance · 6 weeks
                      </span>
                      <span className="text-[10px] text-[#f8b537] font-bold">↑ Growing</span>
                    </div>
                    <div className="flex items-end justify-between gap-1.5 h-16">
                      {[42, 55, 48, 68, 72, 81].map((h, i) => (
                        <div
                          key={i}
                          style={{ height: `${h}%`, ["--i" as string]: i }}
                          className={`mo-bar-y flex-1 rounded-sm ${
                            i === 5
                              ? "bg-gradient-to-t from-[#5d3fd3] to-[#f8b537]"
                              : "bg-[#5D3FD3]/35 dark:bg-[#5D3FD3]/40"
                          }`}
                        />
                      ))}
                    </div>
                    <div className="flex items-end justify-between gap-1.5 mt-1.5 text-[8px] text-black/40 dark:text-white/30 uppercase">
                      {["W1", "W2", "W3", "W4", "W5", "Now"].map((w) => (
                        <span key={w} className="flex-1 text-center">{w}</span>
                      ))}
                    </div>
                  </div>
                </PreviewWindow>
                </Assemble>
              </div>

              {/* ── Right card: Branch performance ──────────────────────── */}
              <div className="md:-translate-x-3 md:translate-y-6 md:rotate-[2deg] z-10">
                <Assemble ax={420} ay={140} ar={12}>
                <PreviewWindow url="kairos.kharis.org/reports">
                  <div className="flex items-center justify-between mb-4">
                    <h4 className="text-[#1a1c1c] dark:text-white text-sm font-bold">Branch Performance</h4>
                    <span className="text-[10px] text-black/45 dark:text-white/40">Q3</span>
                  </div>
                  <ul className="space-y-3">
                    {[
                      { name: "London Central", growth: 12, width: 78 },
                      { name: "Manchester", growth: 8, width: 60 },
                      { name: "Accra Main", growth: 18, width: 92 },
                      { name: "Kumasi", growth: 14, width: 70 },
                      { name: "Freetown", growth: 5, width: 45 },
                    ].map((b, bi) => (
                      <li key={b.name}>
                        <div className="flex items-center justify-between mb-1.5">
                          <span className="text-[11px] text-black/75 dark:text-white/80">{b.name}</span>
                          <span className="text-[10px] text-[#16a34a] dark:text-[#22c55e] font-bold">+{b.growth}%</span>
                        </div>
                        <div className="h-1.5 rounded-full bg-black/[0.06] dark:bg-white/[0.06] overflow-hidden">
                          <div
                            style={{ width: `${b.width}%`, ["--i" as string]: bi }}
                            className="mo-bar-x h-full rounded-full bg-gradient-to-r from-[#5d3fd3] to-[#f8b537]"
                          />
                        </div>
                      </li>
                    ))}
                  </ul>
                  <div className="mt-5 pt-4 border-t border-black/[0.06] dark:border-white/[0.06] flex items-center justify-between">
                    <span className="text-[10px] uppercase tracking-widest text-black/45 dark:text-white/40">Total Members</span>
                    <span className="text-[11px] font-bold text-[#1a1c1c] dark:text-white">1,847</span>
                  </div>
                </PreviewWindow>
                </Assemble>
              </div>
            </div>
          </div>

          {/* ── Control Centre: full post-login overview ──────────────── */}
          <div className="relative mx-auto max-w-6xl mt-20 md:mt-28">
            <Assemble ax={0} ay={160} ar={-3}>
            <PreviewWindow url="kairos.kharis.org/dashboard" prominent>
              <div className="flex gap-3 md:gap-4">
                {/* ── Sidebar ──────────────────────────────────────── */}
                <aside className="w-32 md:w-40 shrink-0 border-r border-black/[0.06] dark:border-white/[0.06] pr-2 md:pr-3 flex flex-col">
                  <div className="flex items-center gap-1.5 pb-3 border-b border-black/[0.05] dark:border-white/[0.05]">
                    <span className="w-6 h-6 rounded-md bg-gradient-to-br from-[#5d3fd3] to-[#451ebb] flex items-center justify-center shrink-0">
                      <span className="text-white text-[9px] font-black">K</span>
                    </span>
                    <div className="min-w-0">
                      <div className="text-[10px] font-bold text-[#1a1c1c] dark:text-white leading-tight">Kairos</div>
                      <div className="text-[7px] text-black/45 dark:text-white/40 leading-tight">Church Admin</div>
                    </div>
                  </div>

                  <ul className="pt-3 space-y-0.5 text-[9px] flex-1">
                    {[
                      { Icon: LayoutDashboard, label: "Overview", active: true },
                      { Icon: Building2, label: "Branches" },
                      { Icon: Map, label: "Regions" },
                      { Icon: Users, label: "Members" },
                      { Icon: Heart, label: "Fellowships" },
                      { Icon: CalendarCheck, label: "Attendance" },
                      { Icon: ClipboardList, label: "My Attendance", muted: true },
                      { Icon: BarChart2, label: "Reports" },
                      { Icon: GraduationCap, label: "New Believers" },
                      { Icon: Briefcase, label: "Departments" },
                      { Icon: Megaphone, label: "Outreach Programs" },
                      { Icon: Sparkles, label: "Souls Pipeline" },
                      { Icon: FileText, label: "Forms" },
                      { Icon: BarChart2, label: "Souls Dashboard" },
                      { Icon: UserCircle, label: "Profile" },
                    ].map((item, i) => (
                      <li key={`${item.label}-${i}`}>
                        <span
                          className={`flex items-center gap-1.5 rounded px-1.5 py-1 ${
                            item.active
                              ? "bg-[#5D3FD3]/15 text-[#5D3FD3] dark:bg-[#5D3FD3]/25 dark:text-[#a78bfa] font-semibold"
                              : item.muted
                              ? "text-black/35 dark:text-white/30"
                              : "text-black/60 dark:text-white/55"
                          }`}
                        >
                          <item.Icon className="w-2.5 h-2.5 shrink-0" strokeWidth={2} />
                          <span className="truncate">{item.label}</span>
                        </span>
                      </li>
                    ))}
                  </ul>

                  <div className="mt-3 pt-3 border-t border-black/[0.05] dark:border-white/[0.05]">
                    <div className="flex items-center gap-1.5 mb-1.5">
                      <span className="w-6 h-6 rounded-full bg-gradient-to-br from-[#5d3fd3] to-[#451ebb] flex items-center justify-center text-[8px] font-bold text-white shrink-0">
                        DB
                      </span>
                      <div className="min-w-0 flex-1">
                        <div className="text-[8px] font-semibold text-[#1a1c1c] dark:text-white truncate">Daniel...</div>
                        <div className="text-[7px] text-black/45 dark:text-white/40 truncate">Adminis...</div>
                      </div>
                    </div>
                    <div className="flex gap-1.5 text-black/45 dark:text-white/40">
                      <Settings className="w-2.5 h-2.5" />
                      <Sparkles className="w-2.5 h-2.5" />
                      <LogOut className="w-2.5 h-2.5" />
                    </div>
                  </div>
                </aside>

                {/* ── Main content ──────────────────────────────────── */}
                <div className="flex-1 min-w-0 flex flex-col gap-3">
                  {/* Greeting */}
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <p className="text-[9px] uppercase tracking-widest text-black/45 dark:text-white/40">Saturday 27 June</p>
                      <h4 className="text-[#1a1c1c] dark:text-white text-base font-bold mt-0.5 leading-tight">Good day, Daniel!</h4>
                      <span className="inline-flex items-center mt-1.5 text-[9px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-full bg-[#5D3FD3]/15 text-[#5D3FD3] dark:bg-[#5D3FD3]/20 dark:text-[#a78bfa]">
                        Administrator
                      </span>
                    </div>
                    <span className="text-[10px] font-bold px-3 py-1.5 rounded-md bg-[#5D3FD3] text-white inline-flex items-center gap-1 shrink-0">
                      <span className="text-sm leading-none">+</span> New Entry
                    </span>
                  </div>

                  {/* KPI row */}
                  <div className="grid grid-cols-4 gap-2">
                    {[
                      { label: "Total Branches", value: "24", sub: "Active", color: "#16a34a", colorDark: "#22c55e", Icon: Building2 },
                      { label: "Total Members", value: "1,847", sub: "+47 this month", color: "#1a1c1c", colorDark: "#ffffff", Icon: Users },
                      { label: "Total Fellowships", value: "62", sub: "Scheduled", color: "#f8b537", colorDark: "#f8b537", Icon: Heart },
                      { label: "Pending Approvals", value: "8", sub: "Requests", color: "#dc2626", colorDark: "#f87171", Icon: ShieldCheck },
                    ].map((s) => (
                      <div key={s.label} className="rounded-md border border-black/[0.08] dark:border-white/[0.08] bg-black/[0.02] dark:bg-white/[0.02] p-2.5">
                        <div className="flex items-start justify-between mb-1">
                          <div className="text-[8px] uppercase tracking-wider text-black/45 dark:text-white/40 font-bold leading-tight">{s.label}</div>
                          <s.Icon className="w-3 h-3 text-black/35 dark:text-white/30 shrink-0" />
                        </div>
                        <div className="text-lg font-black leading-none mt-1.5 text-[color:var(--v)] dark:text-[color:var(--vd)]" style={{ ["--v" as string]: s.color, ["--vd" as string]: s.colorDark }}>
                          {s.value}
                        </div>
                        <div className="text-[8px] text-black/45 dark:text-white/40 mt-1 truncate">{s.sub}</div>
                      </div>
                    ))}
                  </div>

                  {/* Activity row */}
                  <div className="grid grid-cols-3 gap-2">
                    <div className="rounded-md border border-black/[0.08] dark:border-white/[0.08] bg-black/[0.02] dark:bg-white/[0.02] p-2.5">
                      <div className="flex items-center justify-between mb-2">
                        <span className="text-[8px] uppercase tracking-wider text-black/55 dark:text-white/45 font-bold">Upcoming Fellowships</span>
                        <span className="text-[8px] text-[#5D3FD3] dark:text-[#a78bfa] font-bold">View all</span>
                      </div>
                      <ul className="space-y-1.5">
                        <li className="flex items-center justify-between text-[8px]">
                          <span className="text-black/75 dark:text-white/80 truncate">K-Group Lambeth</span>
                          <span className="text-black/45 dark:text-white/40 shrink-0 ml-1">Wed 7pm</span>
                        </li>
                        <li className="flex items-center justify-between text-[8px]">
                          <span className="text-black/75 dark:text-white/80 truncate">Express Camden</span>
                          <span className="text-black/45 dark:text-white/40 shrink-0 ml-1">Sat 10am</span>
                        </li>
                        <li className="flex items-center justify-between text-[8px]">
                          <span className="text-black/75 dark:text-white/80 truncate">New Breeds</span>
                          <span className="text-black/45 dark:text-white/40 shrink-0 ml-1">Sun 4pm</span>
                        </li>
                      </ul>
                    </div>

                    <div className="rounded-md border border-black/[0.08] dark:border-white/[0.08] bg-black/[0.02] dark:bg-white/[0.02] p-2.5">
                      <span className="text-[8px] uppercase tracking-wider text-black/55 dark:text-white/45 font-bold block mb-2">Recent Community Activity</span>
                      <ul className="space-y-1.5">
                        <li className="flex items-center gap-1.5 text-[8px]">
                          <span className="w-1 h-1 rounded-full bg-[#16a34a] shrink-0" />
                          <span className="text-black/75 dark:text-white/80 truncate">5 new members approved</span>
                        </li>
                        <li className="flex items-center gap-1.5 text-[8px]">
                          <span className="w-1 h-1 rounded-full bg-[#5D3FD3] shrink-0" />
                          <span className="text-black/75 dark:text-white/80 truncate">Mary T. joined K-Group</span>
                        </li>
                        <li className="flex items-center gap-1.5 text-[8px]">
                          <span className="w-1 h-1 rounded-full bg-[#f8b537] shrink-0" />
                          <span className="text-black/75 dark:text-white/80 truncate">Manchester +12% week</span>
                        </li>
                      </ul>
                    </div>

                    <div className="rounded-md border border-black/[0.08] dark:border-white/[0.08] bg-black/[0.02] dark:bg-white/[0.02] p-2.5">
                      <span className="text-[8px] uppercase tracking-wider text-black/55 dark:text-white/45 font-bold block mb-2">Pending Approvals</span>
                      <div className="text-base font-black text-[#dc2626] dark:text-[#f87171] leading-none">8</div>
                      <div className="text-[8px] text-black/45 dark:text-white/40 mt-1">Requests · Review now</div>
                    </div>
                  </div>

                  {/* Mission Control + Right rail */}
                  <div className="grid grid-cols-12 gap-2">
                    <div className="col-span-9 rounded-md border border-black/[0.08] dark:border-white/[0.08] bg-black/[0.02] dark:bg-white/[0.02] p-2.5">
                      <span className="text-[8px] uppercase tracking-wider text-black/55 dark:text-white/45 font-bold block mb-2">Mission Control Reports</span>
                      <div className="grid grid-cols-6 gap-1.5">
                        <div className="rounded-sm bg-black/[0.03] dark:bg-white/[0.02] p-1.5">
                          <div className="text-[7px] uppercase tracking-wider text-black/55 dark:text-white/45 font-bold leading-tight">Growth</div>
                          <div className="text-[6px] text-black/40 dark:text-white/35 mb-0.5">Last 6 months</div>
                          <svg viewBox="0 0 60 20" className="w-full h-5" preserveAspectRatio="none">
                            <polyline points="0,18 12,16 24,12 36,13 48,7 60,3" fill="none" stroke="#5D3FD3" strokeWidth="1.5" />
                            <circle cx="60" cy="3" r="2" fill="#f8b537" />
                          </svg>
                        </div>
                        <div className="rounded-sm bg-black/[0.03] dark:bg-white/[0.02] p-1.5">
                          <div className="text-[7px] uppercase tracking-wider text-black/55 dark:text-white/45 font-bold leading-tight">Service Att.</div>
                          <div className="text-[6px] text-black/40 dark:text-white/35 mb-1">Last 30 days</div>
                          <div className="text-sm font-black text-[#1a1c1c] dark:text-white leading-none">1,243</div>
                          <div className="text-[6px] text-black/40 dark:text-white/35">Check-ins</div>
                        </div>
                        <div className="rounded-sm bg-black/[0.03] dark:bg-white/[0.02] p-1.5">
                          <div className="text-[7px] uppercase tracking-wider text-black/55 dark:text-white/45 font-bold leading-tight">Rate</div>
                          <div className="text-[6px] text-black/40 dark:text-white/35 mb-1">Active branches</div>
                          <div className="text-sm font-black text-[#16a34a] dark:text-[#22c55e] leading-none">84%</div>
                          <div className="text-[6px] text-black/40 dark:text-white/35">21 / 24 active</div>
                        </div>
                        <div className="rounded-sm bg-black/[0.03] dark:bg-white/[0.02] p-1.5">
                          <div className="text-[7px] uppercase tracking-wider text-black/55 dark:text-white/45 font-bold leading-tight">Engagement</div>
                          <div className="text-[6px] text-black/40 dark:text-white/35 mb-1">Members</div>
                          <div className="text-sm font-black text-[#f8b537] leading-none">High</div>
                          <div className="text-[6px] text-black/40 dark:text-white/35">1,547 active</div>
                        </div>
                        <div className="rounded-sm bg-black/[0.03] dark:bg-white/[0.02] p-1.5">
                          <div className="text-[7px] uppercase tracking-wider text-black/55 dark:text-white/45 font-bold leading-tight">By Branch</div>
                          <div className="text-[6px] text-black/40 dark:text-white/35 mb-1">Top 3</div>
                          <div className="flex items-end gap-0.5 h-4">
                            <div className="mo-bar-y flex-1 bg-[#5D3FD3] rounded-sm" style={{ height: "90%", ["--i" as string]: 0 }} />
                            <div className="mo-bar-y flex-1 bg-[#5D3FD3]/70 rounded-sm" style={{ height: "70%", ["--i" as string]: 1 }} />
                            <div className="mo-bar-y flex-1 bg-[#5D3FD3]/45 rounded-sm" style={{ height: "55%", ["--i" as string]: 2 }} />
                          </div>
                          <div className="text-[6px] text-black/40 dark:text-white/35 mt-0.5">LDN · MAN · ACC</div>
                        </div>
                        <div className="rounded-sm bg-black/[0.03] dark:bg-white/[0.02] p-1.5">
                          <div className="text-[7px] uppercase tracking-wider text-black/55 dark:text-white/45 font-bold leading-tight">New Believers</div>
                          <div className="text-[6px] text-black/40 dark:text-white/35 mb-1">Pipeline</div>
                          <div className="text-sm font-black text-[#5D3FD3] dark:text-[#a78bfa] leading-none">89</div>
                          <div className="text-[6px] text-black/40 dark:text-white/35">Enrollments</div>
                        </div>
                      </div>
                    </div>

                    <div className="col-span-3 space-y-2">
                      <div className="rounded-md border border-black/[0.08] dark:border-white/[0.08] bg-black/[0.02] dark:bg-white/[0.02] p-2.5">
                        <span className="text-[8px] uppercase tracking-wider text-black/55 dark:text-white/45 font-bold block mb-2">Quick Actions</span>
                        <ul className="space-y-1.5">
                          {[
                            { Icon: Building2, label: "Manage Branches" },
                            { Icon: BarChart2, label: "View Reports" },
                            { Icon: FileSpreadsheet, label: "Export CSV" },
                          ].map((a) => (
                            <li key={a.label} className="flex items-center gap-1.5 text-[8px]">
                              <a.Icon className="w-2.5 h-2.5 text-black/55 dark:text-white/45 shrink-0" />
                              <span className="text-black/75 dark:text-white/80 truncate flex-1">{a.label}</span>
                              <ChevronRight className="w-2.5 h-2.5 text-black/35 dark:text-white/30 shrink-0" />
                            </li>
                          ))}
                        </ul>
                      </div>
                      <div className="rounded-md border border-[#f8b537]/30 bg-[#f8b537]/10 dark:bg-[#f8b537]/[0.06] p-2.5">
                        <div className="flex items-center gap-1.5 mb-1.5">
                          <BookOpen className="w-2.5 h-2.5 text-[#f8b537]" />
                          <span className="text-[8px] uppercase tracking-wider text-[#f8b537] font-bold">Daily Verse</span>
                        </div>
                        <p className="text-[8px] text-black/75 dark:text-white/80 italic leading-snug">
                          &ldquo;Love one another as I have loved you.&rdquo;
                        </p>
                        <p className="text-[8px] text-[#f8b537] mt-1 font-bold">— John 15:12</p>
                      </div>
                    </div>
                  </div>

                  {/* Mission Summary band */}
                  <div className="flex items-center justify-between gap-2 rounded-md border border-black/[0.08] dark:border-white/[0.08] bg-black/[0.02] dark:bg-white/[0.02] px-3 py-2">
                    <div className="flex items-center gap-1.5 shrink-0">
                      <span className="w-5 h-5 rounded bg-[#5D3FD3]/15 dark:bg-[#5D3FD3]/25 flex items-center justify-center">
                        <BarChart2 className="w-3 h-3 text-[#5D3FD3] dark:text-[#a78bfa]" />
                      </span>
                      <span className="text-[8px] uppercase tracking-widest text-black/55 dark:text-white/45 font-bold leading-tight">Mission<br />Summary</span>
                    </div>
                    <div className="flex items-center gap-3 md:gap-5">
                      {[
                        { label: "Branches", value: "24", color: "#5D3FD3", colorDark: "#a78bfa" },
                        { label: "Members", value: "1,847", color: "#5D3FD3", colorDark: "#a78bfa" },
                        { label: "Fellowships", value: "62", color: "#16a34a", colorDark: "#22c55e" },
                        { label: "Attendance", value: "84%", color: "#16a34a", colorDark: "#22c55e" },
                        { label: "Engagement", value: "High", color: "#f8b537", colorDark: "#f8b537" },
                      ].map((s) => (
                        <div key={s.label} className="text-center">
                          <div className="text-sm font-black leading-none text-[color:var(--v)] dark:text-[color:var(--vd)]" style={{ ["--v" as string]: s.color, ["--vd" as string]: s.colorDark }}>
                            {s.value}
                          </div>
                          <div className="text-[7px] uppercase tracking-wider text-black/45 dark:text-white/40 mt-0.5">{s.label}</div>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              </div>
            </PreviewWindow>
            </Assemble>
          </div>

          {/* ── 5th card: Discipleship pipeline (wider, no rotation) ───── */}
          <div className="relative mx-auto max-w-4xl mt-20 md:mt-28">
            <Assemble ax={0} ay={140} ar={3}>
            <PreviewWindow url="kairos.kharis.org/new-believers" prominent>
              <div className="flex items-center justify-between mb-5">
                <div>
                  <p className="text-[10px] uppercase tracking-widest text-black/45 dark:text-white/40">Module</p>
                  <h4 className="text-[#1a1c1c] dark:text-white text-sm font-bold">Discipleship Pipeline</h4>
                </div>
                <div className="flex items-center gap-2">
                  <span className="text-[10px] text-black/45 dark:text-white/40">Active</span>
                  <span className="text-[11px] font-black text-[#f8b537]">89</span>
                </div>
              </div>
              <div className="grid grid-cols-3 gap-3">
                {[
                  {
                    stage: "Welcome",
                    count: 18,
                    accent: "#f8b537",
                    items: [
                      { initials: "MT", name: "Mary T.", note: "Just enrolled" },
                      { initials: "JD", name: "John D.", note: "Week 1" },
                      { initials: "FB", name: "Faith B.", note: "Week 1" },
                    ],
                  },
                  {
                    stage: "Foundation",
                    count: 47,
                    accent: "#5D3FD3",
                    items: [
                      { initials: "JA", name: "James A.", note: "Week 3 / 4" },
                      { initials: "GL", name: "Grace L.", note: "Week 2 / 4" },
                      { initials: "PN", name: "Paul N.", note: "Week 1 / 4" },
                    ],
                  },
                  {
                    stage: "Membership Ready",
                    count: 24,
                    accent: "gradient",
                    items: [
                      { initials: "EO", name: "Esther O.", note: "✓ Class complete" },
                      { initials: "DK", name: "David K.", note: "✓ Class complete" },
                    ],
                  },
                ].map((col) => (
                  <div
                    key={col.stage}
                    className="rounded-md border border-black/[0.06] dark:border-white/[0.06] bg-black/[0.02] dark:bg-white/[0.02] p-3"
                  >
                    <div className="flex items-center justify-between mb-3 pb-2 border-b border-black/[0.05] dark:border-white/[0.05]">
                      <div className="flex items-center gap-2 min-w-0">
                        <span
                          className="w-1 h-3.5 rounded-full shrink-0"
                          style={{
                            background:
                              col.accent === "gradient"
                                ? "linear-gradient(180deg,#f8b537,#5d3fd3)"
                                : col.accent,
                          }}
                        />
                        <span className="text-[10px] font-bold uppercase tracking-wider text-black/75 dark:text-white/80 truncate">
                          {col.stage}
                        </span>
                      </div>
                      <span className="text-[10px] font-black text-black/55 dark:text-white/50 shrink-0">{col.count}</span>
                    </div>
                    <ul className="space-y-2">
                      {col.items.map((p) => (
                        <li
                          key={p.name}
                          className="flex items-center gap-2 rounded-md bg-black/[0.02] dark:bg-white/[0.02] border border-black/[0.04] dark:border-white/[0.04] p-1.5"
                        >
                          <span className="w-5 h-5 rounded-full bg-gradient-to-br from-[#5d3fd3] to-[#451ebb] flex items-center justify-center text-[8px] font-bold text-white shrink-0">
                            {p.initials}
                          </span>
                          <div className="min-w-0">
                            <div className="text-[10px] font-semibold text-black/80 dark:text-white/85 truncate leading-tight">
                              {p.name}
                            </div>
                            <div className="text-[9px] text-black/45 dark:text-white/40 truncate leading-tight">
                              {p.note}
                            </div>
                          </div>
                        </li>
                      ))}
                    </ul>
                  </div>
                ))}
              </div>
              <div className="mt-4 pt-3 border-t border-black/[0.06] dark:border-white/[0.06] flex items-center justify-between text-[10px]">
                <span className="uppercase tracking-widest text-black/45 dark:text-white/40">Last activity</span>
                <span className="text-black/60 dark:text-white/60">
                  Mary T. <span className="text-[#f8b537]">→ Welcome</span> · 12m ago
                </span>
              </div>
            </PreviewWindow>
            </Assemble>
          </div>
        </div>
      </section>

      {/* ── Final CTA (Landio tagline) ──────────────────────────────────── */}
      <section className="relative py-32 md:py-40 px-6 md:px-16 border-t border-black/[0.06] dark:border-white/[0.06] overflow-hidden">
        <div
          aria-hidden
          className="absolute inset-0 bg-[radial-gradient(ellipse_at_center,#451ebb_0%,transparent_60%)] opacity-12 dark:opacity-30"
        />
        <div className="relative max-w-5xl mx-auto">
          <h2 className="font-black uppercase tracking-tight leading-[0.9] text-[clamp(2.5rem,8vw,6rem)]">
            <Reveal as="span" index={0} className="block">One platform.</Reveal>
            <Reveal as="span" index={1} className="block">Every branch.</Reveal>
            <Reveal as="span" index={2} className="block">
              <span className="bg-gradient-to-r from-[#f8b537] to-[#5d3fd3] bg-clip-text text-transparent">
                No spreadsheets.
              </span>
            </Reveal>
            <Reveal as="span" index={3} className="block">
              <span className="relative inline-block">
                <span className="bg-gradient-to-r from-[#f8b537] to-[#5d3fd3] bg-clip-text text-transparent">
                  No guesswork.
                </span>
                <HandDrawn
                  d="M40 72 C 24 24, 180 6, 330 18 C 404 26, 396 96, 300 108 C 180 122, 44 112, 24 74 C 14 50, 60 30, 120 24"
                  viewBox="0 0 400 120"
                  stroke="#F8B537"
                  strokeWidth={3}
                  delay={1000}
                  className="pointer-events-none absolute left-1/2 top-1/2 h-[136%] w-[112%] -translate-x-1/2 -translate-y-1/2"
                />
              </span>
            </Reveal>
          </h2>
          <Halo radiusClass="rounded-full" className="mo-lift [--lift-rot:1deg] mt-12">
            <Link
              href="/login"
              className="inline-flex w-full items-center justify-center gap-2 rounded-full bg-[#5D3FD3] hover:bg-[#451ebb] text-white px-10 py-4 font-bold text-sm uppercase tracking-[0.15em] transition-colors"
            >
              Get Started Today
              <ArrowUpRight className="h-4 w-4" />
            </Link>
          </Halo>
        </div>
      </section>

      {/* ── Footer (Cryptix tagline as quiet caption) ──────────────────── */}
      <footer className="border-t border-black/[0.06] dark:border-white/[0.06] px-6 md:px-12 py-8 flex flex-col md:flex-row md:items-center md:justify-between gap-4 text-xs">
        <div className="flex flex-col gap-1">
          <span className="text-black/45 dark:text-white/40 uppercase tracking-[0.15em]">
            One platform. Every branch. Every member.
          </span>
          <span className="text-black/35 dark:text-white/25">
            © {new Date().getFullYear()} Kairos, Church Administration Platform
          </span>
        </div>
        <div className="flex items-center gap-6 self-start md:self-auto">
          <a
            href="https://docs.kairos.kharis.org"
            target="_blank"
            rel="noopener noreferrer"
            className="text-black/45 dark:text-white/40 hover:text-black/70 dark:hover:text-white/70 uppercase tracking-[0.15em] transition-colors inline-flex items-center gap-1.5"
          >
            Help & Guides
            <ArrowUpRight className="h-3 w-3" />
          </a>
          <Link
            href="/login"
            className="text-black/45 dark:text-white/40 hover:text-black/70 dark:hover:text-white/70 uppercase tracking-[0.15em] transition-colors inline-flex items-center gap-1.5"
          >
            Sign In
            <ArrowUpRight className="h-3 w-3" />
          </Link>
        </div>
      </footer>
    </div>
  );
}
