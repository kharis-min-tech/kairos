"use client";

import { useState } from "react";
import Link from "next/link";
import {
  Users,
  Building2,
  ClipboardList,
  Heart,
  DollarSign,
  Bell,
  BarChart2,
  Search,
  MessageSquare,
  FileSpreadsheet,
} from "lucide-react";

// ─── Style picker ──────────────────────────────────────────────────────────────
const STYLES = [
  { id: "cryptix", label: "Cryptix" },
  { id: "landio", label: "Landio" },
  { id: "nexa", label: "Nexa" },
  { id: "careon", label: "Careon" },
  { id: "aset", label: "Aset" },
] as const;
type StyleId = (typeof STYLES)[number]["id"];

// ─── Shared content ────────────────────────────────────────────────────────────
const FEATURES = [
  {
    Icon: Users,
    title: "Member Directory",
    desc: "Full profiles, roles, branch assignments and contact details in one place.",
  },
  {
    Icon: Building2,
    title: "Multi-Branch Management",
    desc: "Oversee every campus, cell, and satellite branch from a single dashboard.",
  },
  {
    Icon: ClipboardList,
    title: "Attendance Tracking",
    desc: "Record service, fellowship, and department meeting attendance automatically.",
  },
  {
    Icon: Heart,
    title: "Fellowship Groups",
    desc: "K-Groups, Kharis Express, New Breeds and more — manage them all with ease.",
  },
  {
    Icon: DollarSign,
    title: "Giving & Donations",
    desc: "Track tithes, offerings, and special gifts with full anonymity support.",
  },
  {
    Icon: Bell,
    title: "Notifications",
    desc: "Broadcast announcements to the whole church, a region, or a specific role.",
  },
];

const PAIN_POINTS = [
  { Icon: FileSpreadsheet, text: "Scattered spreadsheets with no single source of truth" },
  { Icon: Search, text: "No way to see who's been absent for weeks" },
  { Icon: MessageSquare, text: "Member contact info living in personal WhatsApp groups" },
  { Icon: BarChart2, text: "Manual donation reports that take hours each Sunday" },
];

const STATS = [
  { value: "500+", label: "Members Tracked" },
  { value: "12", label: "Branch Types Supported" },
  { value: "100%", label: "Data Ownership" },
  { value: "0", label: "Spreadsheets Needed" },
];

// ─── STYLE 1: Cryptix — Dark, gradient-heavy, violet/amber palette ─────────────
function CryptixLanding() {
  return (
    <div className="min-h-screen bg-[#0a0614] text-white font-sans">
      {/* Nav */}
      <nav className="fixed top-0 inset-x-0 z-50 flex items-center justify-between px-8 py-4 bg-[#0a0614]/80 backdrop-blur border-b border-violet-900/40">
        <span className="text-xl font-bold tracking-tight">
          <span className="text-violet-400">K</span>airos
        </span>
        <div className="hidden md:flex items-center gap-8 text-sm text-white/60">
          <a href="#features" className="hover:text-white transition-colors">Features</a>
          <a href="#why" className="hover:text-white transition-colors">Why Kairos</a>
        </div>
        <Link
          href="/login"
          className="rounded-full bg-violet-700 hover:bg-violet-600 px-5 py-2 text-sm font-medium transition-colors"
        >
          Sign In
        </Link>
      </nav>

      {/* Hero */}
      <section className="relative pt-40 pb-32 px-6 text-center overflow-hidden">
        <div className="absolute inset-0 pointer-events-none">
          <div className="absolute top-1/3 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[700px] h-[700px] rounded-full bg-violet-700/25 blur-[120px]" />
          <div className="absolute top-1/2 left-1/4 w-[300px] h-[300px] rounded-full bg-amber-600/15 blur-[100px]" />
        </div>

        <div className="relative max-w-4xl mx-auto">
          <div className="inline-flex items-center gap-2 rounded-full border border-violet-600/40 bg-violet-700/15 px-4 py-1.5 text-xs text-violet-300 mb-8">
            <span className="w-1.5 h-1.5 rounded-full bg-violet-400 animate-pulse" />
            Built for growing churches
          </div>
          <h1 className="text-5xl md:text-7xl font-extrabold leading-tight tracking-tight">
            Church admin,{" "}
            <span className="bg-gradient-to-r from-violet-400 to-amber-400 bg-clip-text text-transparent">
              finally sorted.
            </span>
          </h1>
          <p className="mt-6 text-lg md:text-xl text-white/50 max-w-2xl mx-auto leading-relaxed">
            Kairos replaces the spreadsheets, WhatsApp groups, and manual
            registers that are slowing your church down.
          </p>
          <div className="mt-10 flex flex-col sm:flex-row gap-4 justify-center">
            <Link
              href="/login"
              className="rounded-full bg-violet-700 hover:bg-violet-600 px-8 py-3.5 font-semibold text-sm transition-all hover:shadow-[0_0_30px_rgba(109,40,217,0.5)]"
            >
              Get Started
            </Link>
            <a
              href="#features"
              className="rounded-full border border-white/10 bg-white/5 hover:bg-white/10 px-8 py-3.5 font-semibold text-sm transition-colors"
            >
              Explore Features
            </a>
          </div>
        </div>

        <div className="relative mt-20 grid grid-cols-2 md:grid-cols-4 gap-4 max-w-3xl mx-auto">
          {STATS.map((s) => (
            <div key={s.label} className="rounded-2xl border border-violet-800/30 bg-violet-900/20 backdrop-blur p-5">
              <div className="text-3xl font-black text-violet-400">{s.value}</div>
              <div className="text-xs text-white/40 mt-1">{s.label}</div>
            </div>
          ))}
        </div>
      </section>

      {/* Pain points */}
      <section id="why" className="py-24 px-6">
        <div className="max-w-5xl mx-auto grid md:grid-cols-2 gap-12 items-center">
          <div>
            <p className="text-amber-400 text-sm font-semibold uppercase tracking-widest mb-3">The Problem</p>
            <h2 className="text-4xl font-bold leading-tight">Sound familiar?</h2>
            <p className="mt-4 text-white/50 leading-relaxed">
              Most churches are managed with a patchwork of tools that don't talk
              to each other. Kairos changes that.
            </p>
          </div>
          <div className="space-y-4">
            {PAIN_POINTS.map((p) => (
              <div key={p.text} className="flex items-start gap-4 rounded-xl border border-violet-800/30 bg-violet-900/10 p-4">
                <p.Icon className="h-5 w-5 text-amber-400 mt-0.5 shrink-0" />
                <span className="text-sm text-white/60 leading-relaxed">{p.text}</span>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Features */}
      <section id="features" className="py-24 px-6">
        <div className="max-w-5xl mx-auto">
          <p className="text-violet-400 text-sm font-semibold uppercase tracking-widest mb-3 text-center">Features</p>
          <h2 className="text-4xl font-bold text-center mb-16">Everything your team needs</h2>
          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-5">
            {FEATURES.map((f) => (
              <div
                key={f.title}
                className="group rounded-2xl border border-violet-800/30 bg-violet-900/10 p-6 hover:border-violet-600/40 hover:bg-violet-700/15 transition-all"
              >
                <div className="w-10 h-10 rounded-xl bg-violet-700/30 border border-violet-600/30 flex items-center justify-center mb-4">
                  <f.Icon className="h-5 w-5 text-violet-300" />
                </div>
                <h3 className="mt-2 font-semibold text-base">{f.title}</h3>
                <p className="mt-2 text-sm text-white/50 leading-relaxed">{f.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* CTA */}
      <section className="py-32 px-6 text-center relative overflow-hidden">
        <div className="absolute inset-0 pointer-events-none">
          <div className="absolute bottom-0 left-1/2 -translate-x-1/2 w-[600px] h-[300px] rounded-full bg-violet-700/25 blur-[100px]" />
        </div>
        <div className="relative max-w-2xl mx-auto">
          <h2 className="text-5xl font-extrabold leading-tight">
            Ready to bring{" "}
            <span className="bg-gradient-to-r from-violet-400 to-amber-400 bg-clip-text text-transparent">
              order to your church?
            </span>
          </h2>
          <p className="mt-4 text-white/50">One platform. Every branch. Every member.</p>
          <Link
            href="/login"
            className="mt-8 inline-block rounded-full bg-violet-700 hover:bg-violet-600 px-10 py-4 font-semibold transition-all hover:shadow-[0_0_40px_rgba(109,40,217,0.5)]"
          >
            Get Started Today
          </Link>
        </div>
      </section>

      <footer className="border-t border-violet-900/30 px-8 py-8 flex items-center justify-between text-xs text-white/30">
        <span>© {new Date().getFullYear()} Kairos. Church Administration Platform.</span>
        <Link href="/login" className="hover:text-white/60 transition-colors">Sign In →</Link>
      </footer>
    </div>
  );
}

// ─── STYLE 2: Landio — Dark monochromatic, clean SaaS, violet/amber accents ───
function LandioLanding() {
  return (
    <div className="min-h-screen bg-[#0a0a0a] text-white font-sans">
      {/* Nav */}
      <nav className="fixed top-0 inset-x-0 z-50 flex items-center justify-between px-8 py-4 bg-[#0a0a0a]/90 backdrop-blur border-b border-white/[0.06]">
        <div className="flex items-center gap-2">
          <div className="w-7 h-7 rounded-md bg-violet-600 flex items-center justify-center">
            <span className="text-white text-xs font-black">K</span>
          </div>
          <span className="font-semibold tracking-tight">Kairos</span>
        </div>
        <nav className="hidden md:flex items-center gap-8 text-sm text-white/50">
          <a href="#features" className="hover:text-white transition-colors">Features</a>
          <a href="#why" className="hover:text-white transition-colors">Why Us</a>
        </nav>
        <Link
          href="/login"
          className="rounded-lg bg-violet-700 hover:bg-violet-600 text-white px-5 py-2 text-sm font-semibold transition-colors"
        >
          Sign In
        </Link>
      </nav>

      {/* Hero */}
      <section className="pt-40 pb-24 px-6">
        <div className="max-w-5xl mx-auto">
          <div className="inline-flex items-center gap-2 rounded-md border border-white/10 px-3 py-1 text-xs text-white/40 mb-8">
            Church Administration · Multi-Branch · Real-time
          </div>
          <h1 className="text-6xl md:text-8xl font-black leading-[0.95] tracking-tight">
            The
            <br />
            <span className="text-violet-400">church OS</span>
            <br />
            you needed.
          </h1>
          <div className="mt-8 flex items-end justify-between flex-wrap gap-6">
            <p className="max-w-md text-white/40 text-lg leading-relaxed">
              One platform to manage every branch, member, fellowship,
              and giving record — without the spreadsheets.
            </p>
            <Link
              href="/login"
              className="rounded-xl bg-violet-700 hover:bg-violet-600 text-white px-8 py-3.5 font-bold text-sm transition-colors whitespace-nowrap"
            >
              Open Dashboard →
            </Link>
          </div>
        </div>

        {/* Stats bar */}
        <div className="max-w-5xl mx-auto mt-20 grid grid-cols-2 md:grid-cols-4 divide-x divide-white/[0.06] border border-white/[0.06] rounded-2xl overflow-hidden">
          {STATS.map((s) => (
            <div key={s.label} className="p-6 bg-white/[0.02]">
              <div className="text-4xl font-black text-violet-400">{s.value}</div>
              <div className="text-xs text-white/30 mt-2">{s.label}</div>
            </div>
          ))}
        </div>
      </section>

      {/* Pain */}
      <section id="why" className="py-24 px-6 border-t border-white/[0.06]">
        <div className="max-w-5xl mx-auto">
          <p className="text-xs font-semibold uppercase tracking-[0.2em] text-white/30 mb-6">The Problem</p>
          <div className="grid md:grid-cols-2 gap-x-16 gap-y-6">
            <h2 className="text-3xl font-bold text-white/80 leading-snug">
              Churches deserve better than cobbled-together tools.
            </h2>
            <div className="space-y-3">
              {PAIN_POINTS.map((p) => (
                <div key={p.text} className="flex items-center gap-3 text-sm text-white/40 py-3 border-b border-white/[0.06]">
                  <p.Icon className="h-4 w-4 text-amber-400/70 shrink-0" />
                  <span>{p.text}</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* Features */}
      <section id="features" className="py-24 px-6 border-t border-white/[0.06]">
        <div className="max-w-5xl mx-auto">
          <p className="text-xs font-semibold uppercase tracking-[0.2em] text-white/30 mb-6">Features</p>
          <div className="grid md:grid-cols-2 gap-px bg-white/[0.06]">
            {FEATURES.map((f) => (
              <div key={f.title} className="bg-[#0a0a0a] p-8 hover:bg-white/[0.02] transition-colors">
                <f.Icon className="h-6 w-6 text-violet-400 mb-4" />
                <h3 className="font-bold text-base mb-2">{f.title}</h3>
                <p className="text-sm text-white/40 leading-relaxed">{f.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* CTA */}
      <section className="py-32 px-6 border-t border-white/[0.06] text-center">
        <div className="max-w-2xl mx-auto">
          <h2 className="text-5xl md:text-6xl font-black leading-tight">
            One platform.<br />Every branch.
          </h2>
          <p className="mt-4 text-white/30 text-lg">No spreadsheets. No guesswork.</p>
          <Link
            href="/login"
            className="mt-10 inline-block rounded-xl bg-violet-700 hover:bg-violet-600 text-white px-10 py-4 font-bold transition-colors"
          >
            Open Dashboard →
          </Link>
        </div>
      </section>

      <footer className="border-t border-white/[0.06] px-8 py-6 flex items-center justify-between text-xs text-white/20">
        <span>© {new Date().getFullYear()} Kairos</span>
        <Link href="/login" className="hover:text-white/40 transition-colors">Sign In</Link>
      </footer>
    </div>
  );
}

// ─── STYLE 3: Nexa — Bold dark-agency, full-bleed photo hero ─────────────────
function NexaLanding() {
  const TESTIMONIALS = [
    { img: "https://randomuser.me/api/portraits/men/75.jpg", name: "Pastor James O.", org: "Grace Chapel, Lagos", quote: "Kairos transformed how we manage our 3 campuses. Member tracking, attendance, giving — all in one." },
    { img: "https://randomuser.me/api/portraits/women/44.jpg", name: "Sarah Mensah", org: "New Life Church, Accra", quote: "The reports we get every Sunday have completely replaced our manual spreadsheet process." },
    { img: "https://randomuser.me/api/portraits/men/32.jpg", name: "Elder David K.", org: "Living Word Ministry", quote: "Finally a platform designed for how African churches actually operate. Highly recommended." },
  ];
  return (
    <div className="min-h-screen bg-[#0d0d0d] text-white font-sans">
      {/* Nav */}
      <nav className="fixed top-0 inset-x-0 z-50 flex items-center justify-between px-8 py-5 z-50">
        <span className="font-black text-2xl tracking-tighter">KAIROS</span>
        <div className="hidden md:flex items-center gap-10 text-sm font-bold uppercase tracking-widest text-white/60">
          <a href="#about" className="hover:text-white transition-colors">About</a>
          <a href="#features" className="hover:text-white transition-colors">Features</a>
          <a href="#reviews" className="hover:text-white transition-colors">Reviews</a>
        </div>
        <Link
          href="/login"
          className="rounded-full bg-violet-700 text-white px-6 py-2.5 text-sm font-black uppercase tracking-widest hover:bg-violet-600 transition-colors"
        >
          Sign In ↗
        </Link>
      </nav>

      {/* Hero — full-bleed photo with oversized text ON TOP */}
      <section className="relative min-h-screen overflow-hidden">
        {/* Background photo */}
        <img
          src="https://picsum.photos/seed/nexa-team/1600/900"
          alt="Church team"
          className="absolute inset-0 w-full h-full object-cover object-center"
        />
        {/* Dark violet tint overlay */}
        <div className="absolute inset-0 bg-gradient-to-b from-[#0d0d0d]/60 via-violet-950/50 to-[#0d0d0d]" />
        <div className="absolute inset-0 bg-violet-900/30 mix-blend-multiply" />

        {/* Giant text — sits ON the photo */}
        <div className="relative z-10 flex flex-col justify-center min-h-screen px-8 md:px-16 pb-32">
          <p className="text-white/50 text-sm uppercase tracking-[0.3em] mb-4 mt-24">The #1 Church Admin Platform</p>
          <h1 className="text-[clamp(4rem,13vw,11rem)] font-black leading-[0.85] tracking-[-0.03em] uppercase mix-blend-normal">
            Admin<br />
            <span className="text-white/20">Without</span><br />
            The<br />
            <span className="relative inline-block">
              <span className="relative z-10">Chaos</span>
              <span className="absolute bottom-1 left-0 h-[8px] w-full bg-violet-600 z-0 opacity-90" />
            </span>
          </h1>

          {/* Social proof badge — bottom left, like agencee */}
          <div className="absolute bottom-12 left-8 md:left-16 bg-black/70 backdrop-blur-md border border-white/10 rounded-2xl px-4 py-3 flex items-center gap-4 max-w-xs">
            <div className="flex -space-x-2 shrink-0">
              {[75, 44, 32, 67].map((n, gender) => (
                <img key={n} src={`https://randomuser.me/api/portraits/${gender % 2 === 0 ? "men" : "women"}/${n}.jpg`} className="w-8 h-8 rounded-full border-2 border-black object-cover" alt="" />
              ))}
            </div>
            <div>
              <p className="font-black text-sm uppercase tracking-tight">#1 Church Admin Platform</p>
              <div className="flex items-center gap-1.5 mt-0.5">
                <div className="flex gap-0.5">{[1,2,3,4,5].map((i) => <span key={i} className="text-violet-400 text-xs">★</span>)}</div>
                <span className="text-white/40 text-xs">500+ 5-Star Reviews</span>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Full-bleed dark photo — second section (like the agencee office shot) */}
      <section id="about" className="relative h-[70vh] overflow-hidden">
        <img
          src="https://picsum.photos/seed/nexa-office/1600/700"
          alt="Church leadership"
          className="absolute inset-0 w-full h-full object-cover object-center"
        />
        <div className="absolute inset-0 bg-gradient-to-r from-[#0d0d0d] via-[#0d0d0d]/70 to-transparent" />
        <div className="absolute inset-0 bg-violet-900/20 mix-blend-multiply" />
        <div className="relative z-10 h-full flex flex-col justify-center px-8 md:px-16 max-w-2xl">
          <p className="text-xs uppercase tracking-[0.3em] text-violet-400 mb-4">About Kairos</p>
          <h2 className="text-4xl md:text-5xl font-black uppercase leading-tight">
            Built for<br />church leaders<br /><span className="text-violet-400">who mean business</span>
          </h2>
          <p className="mt-6 text-white/50 text-base leading-relaxed max-w-lg">
            Kairos replaces scattered spreadsheets with a unified platform for members,
            attendance, giving, and fellowships — across every branch you oversee.
          </p>
          <Link href="/login" className="mt-8 self-start bg-violet-700 text-white px-8 py-3 font-black uppercase text-sm tracking-widest hover:bg-violet-600 transition-colors">
            Enter Platform →
          </Link>
        </div>
      </section>

      {/* Stats */}
      <section className="py-20 px-8 md:px-16 border-y border-white/10">
        <div className="max-w-6xl mx-auto grid grid-cols-2 md:grid-cols-4 gap-8">
          {STATS.map((s) => (
            <div key={s.label}>
              <div className="text-5xl font-black text-violet-400">{s.value}</div>
              <div className="text-xs uppercase tracking-widest text-white/30 mt-2">{s.label}</div>
            </div>
          ))}
        </div>
      </section>

      {/* Features */}
      <section id="features" className="py-24 px-8 md:px-16">
        <p className="text-xs uppercase tracking-[0.3em] text-white/30 mb-12">What's Inside</p>
        <div className="max-w-6xl mx-auto grid md:grid-cols-3 gap-0 border border-white/10 divide-y md:divide-y-0 md:divide-x divide-white/10">
          {FEATURES.map((f) => (
            <div key={f.title} className="p-8 hover:bg-white/[0.03] transition-colors">
              <f.Icon className="h-7 w-7 text-violet-400" />
              <h3 className="mt-6 text-lg font-black uppercase tracking-tight">{f.title}</h3>
              <p className="mt-3 text-sm text-white/40 leading-relaxed">{f.desc}</p>
            </div>
          ))}
        </div>
      </section>

      {/* Testimonials */}
      <section id="reviews" className="py-32 px-8 md:px-16 border-t border-white/10">
        <div className="max-w-6xl mx-auto">
          <p className="text-xs uppercase tracking-[0.3em] text-white/30 mb-12">Reviews</p>
          <div className="grid md:grid-cols-3 gap-6">
            {TESTIMONIALS.map((t) => (
              <div key={t.name} className="border border-white/10 p-6 hover:border-violet-700/30 transition-colors">
                <div className="flex gap-0.5 mb-5">
                  {[1,2,3,4,5].map((i) => <span key={i} className="text-violet-400 text-sm">★</span>)}
                </div>
                <p className="text-sm text-white/60 leading-relaxed italic">&ldquo;{t.quote}&rdquo;</p>
                <div className="mt-6 flex items-center gap-3 border-t border-white/10 pt-5">
                  <img src={t.img} alt={t.name} className="w-10 h-10 rounded-full object-cover grayscale" />
                  <div>
                    <p className="font-bold text-sm">{t.name}</p>
                    <p className="text-[11px] text-white/30 mt-0.5 uppercase tracking-wider">{t.org}</p>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* CTA */}
      <section className="py-32 px-8 md:px-16 border-t border-white/10">
        <div className="max-w-4xl mx-auto">
          <h2 className="text-[clamp(3rem,8vw,6rem)] font-black uppercase leading-[0.85] tracking-tight">
            Build a<br />
            <span className="text-violet-400">stronger</span><br />
            church.
          </h2>
          <Link
            href="/login"
            className="mt-10 inline-block bg-violet-700 text-white px-10 py-4 font-black uppercase text-sm tracking-widest hover:bg-violet-600 transition-colors"
          >
            Enter Platform →
          </Link>
        </div>
      </section>

      <footer className="border-t border-white/10 px-8 py-6 flex items-center justify-between text-xs text-white/20 uppercase tracking-widest">
        <span>© {new Date().getFullYear()} Kairos</span>
        <Link href="/login" className="hover:text-white/40 transition-colors">Login</Link>
      </footer>
    </div>
  );
}

// ─── STYLE 4: Careon — Full-bleed photo hero, nonprofit/community feel ─────────
function CareonLanding() {
  const TESTIMONIALS = [
    { img: "https://randomuser.me/api/portraits/men/75.jpg", name: "Pastor James O.", church: "Grace Chapel, Lagos", quote: "Kairos transformed how we manage our 3 branches. What took hours now takes minutes every Sunday." },
    { img: "https://randomuser.me/api/portraits/women/44.jpg", name: "Sarah Mensah", church: "New Life Church, Accra", quote: "The attendance and giving reports have made our leadership meetings so much more productive." },
    { img: "https://randomuser.me/api/portraits/men/32.jpg", name: "Elder David K.", church: "Living Word Ministry", quote: "Finally a system that understands how our fellowships and departments actually work." },
  ];
  const IMPACT_CARDS = [
    { seed: "kairos-worship", stat: "500+", label: "Members Tracked", sub: "Across all branches" },
    { seed: "kairos-youth", stat: "12+", label: "Branch Types", sub: "Main, satellite, cell & more" },
    { seed: "kairos-community", stat: "100%", label: "Data Ownership", sub: "Your church, your data" },
  ];
  return (
    <div className="min-h-screen bg-[#f4f4f0] text-gray-900 font-sans">
      {/* Nav — floating pill, Careon style */}
      <nav className="fixed top-4 left-1/2 -translate-x-1/2 z-50 flex items-center gap-6 bg-black/80 backdrop-blur-xl rounded-full px-6 py-3 text-sm text-white shadow-xl">
        <div className="flex items-center gap-2 mr-2">
          <div className="w-6 h-6 rounded-full bg-gradient-to-br from-violet-600 to-amber-500 flex items-center justify-center">
            <span className="text-white text-[10px] font-bold">K</span>
          </div>
          <span className="font-bold text-white text-sm">Kairos</span>
        </div>
        <a href="#about" className="text-white/60 hover:text-white transition-colors hidden md:block">About</a>
        <a href="#impact" className="text-white/60 hover:text-white transition-colors hidden md:block">Impact</a>
        <a href="#features" className="text-white/60 hover:text-white transition-colors hidden md:block">Features</a>
        <Link
          href="/login"
          className="ml-2 rounded-full bg-violet-600 hover:bg-violet-500 text-white px-5 py-1.5 text-sm font-semibold transition-colors"
        >
          Sign In →
        </Link>
      </nav>

      {/* Hero — full-bleed photo with dark overlay, text bottom-left, Careon style */}
      <section className="relative min-h-screen overflow-hidden">
        <img
          src="https://picsum.photos/seed/kairos-congregation/1600/900"
          alt="Church congregation"
          className="absolute inset-0 w-full h-full object-cover object-center"
        />
        {/* Layered overlays */}
        <div className="absolute inset-0 bg-gradient-to-t from-black/85 via-black/40 to-black/20" />
        <div className="absolute inset-0 bg-violet-950/20" />

        {/* Text content — bottom-left, like Careon */}
        <div className="relative z-10 flex flex-col justify-end min-h-screen px-8 md:px-16 pb-20 max-w-3xl">
          <p className="text-violet-300 text-sm font-semibold uppercase tracking-[0.2em] mb-4">Together, We Grow</p>
          <h1 className="text-5xl md:text-7xl font-bold text-white leading-[1.0]">
            Serve.<br />Lead.<br />Transform
          </h1>
          <p className="mt-4 text-white/60 text-base leading-relaxed max-w-md">
            Kairos powers church administration so leaders can focus on people, discipleship, and mission.
          </p>
          <div className="mt-8 flex items-center gap-4 flex-wrap">
            <Link
              href="/login"
              className="rounded-full bg-violet-600 hover:bg-violet-500 text-white px-8 py-3.5 font-semibold text-sm transition-colors shadow-lg"
            >
              Get Started →
            </Link>
            <a
              href="#about"
              className="rounded-full bg-white/10 hover:bg-white/20 backdrop-blur border border-white/20 text-white px-8 py-3.5 font-semibold text-sm transition-colors"
            >
              Learn About Us
            </a>
          </div>
        </div>
      </section>

      {/* About — light bg, text left, photo right (like Careon's About Us section) */}
      <section id="about" className="py-20 px-8 md:px-16 bg-[#f4f4f0]">
        <div className="max-w-6xl mx-auto grid md:grid-cols-2 gap-16 items-center">
          <div>
            <p className="flex items-center gap-2 text-violet-600 text-sm font-semibold mb-4">
              <span className="w-2 h-2 rounded-full bg-violet-600 inline-block" />
              About Kairos
            </p>
            <h2 className="text-4xl md:text-5xl font-bold text-gray-900 leading-snug">
              United Together to<br />Create Enduring Hope
            </h2>
            <p className="mt-4 text-gray-500 leading-relaxed">
              We are a purpose-built platform empowering church leaders with the
              tools they need — member management, attendance, giving, and fellowship
              — all in one place.
            </p>
            <a href="#features" className="mt-8 inline-flex items-center gap-2 rounded-full border border-gray-900 text-gray-900 px-6 py-2.5 text-sm font-semibold hover:bg-gray-900 hover:text-white transition-colors">
              Learn More →
            </a>
          </div>
          <div className="rounded-2xl overflow-hidden shadow-xl h-72 md:h-96">
            <img
              src="https://picsum.photos/seed/kairos-about/700/500"
              alt="Church community"
              className="w-full h-full object-cover"
            />
          </div>
        </div>
      </section>

      {/* Impact — stat cards with photo backgrounds (like Careon's "Together for change") */}
      <section id="impact" className="py-20 px-8 md:px-16 bg-[#f4f4f0]">
        <div className="max-w-6xl mx-auto">
          <p className="flex items-center gap-2 text-violet-600 text-sm font-semibold mb-3">
            <span className="w-2 h-2 rounded-full bg-violet-600 inline-block" />
            Our Impact
          </p>
          <div className="flex flex-col md:flex-row md:items-end justify-between gap-4 mb-10">
            <h2 className="text-4xl font-bold text-gray-900">Together for change</h2>
            <p className="text-gray-400 text-sm max-w-xs leading-relaxed">Connecting members, tracking growth, and empowering every branch of your church.</p>
          </div>
          <div className="grid md:grid-cols-3 gap-5">
            {IMPACT_CARDS.map((c) => (
              <div key={c.seed} className="relative h-56 rounded-2xl overflow-hidden">
                <img src={`https://picsum.photos/seed/${c.seed}/600/400`} alt={c.label} className="absolute inset-0 w-full h-full object-cover" />
                <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/30 to-black/10" />
                <div className="relative z-10 flex flex-col justify-end h-full p-5">
                  <p className="text-4xl font-black text-white leading-none">{c.stat}</p>
                  <p className="text-base font-bold text-white mt-1">{c.label}</p>
                  <p className="text-sm text-white/60 mt-0.5">{c.sub}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Features — dark section, photo-background cards (like Careon "Causes That Inspire") */}
      <section id="features" className="py-24 px-8 md:px-16 bg-gray-950 text-white">
        <div className="max-w-6xl mx-auto">
          <div className="flex flex-col md:flex-row md:items-end justify-between gap-6 mb-12">
            <div>
              <p className="flex items-center gap-2 text-violet-400 text-sm font-semibold mb-3">
                <span className="w-2 h-2 rounded-full bg-violet-400 inline-block" />
                Causes That Inspire
              </p>
              <h2 className="text-4xl font-bold leading-tight">
                Everything Your<br />Church Needs
              </h2>
            </div>
            <Link href="/login" className="shrink-0 rounded-full border border-white/20 hover:border-white/40 text-white px-6 py-2.5 text-sm font-semibold transition-colors">
              Get Started →
            </Link>
          </div>
          <div className="grid md:grid-cols-3 gap-5">
            {FEATURES.map((f, i) => {
              const seeds = ["feat-members", "feat-branches", "feat-attendance", "feat-giving", "feat-fellowship", "feat-reports"];
              return (
                <div key={f.title} className="relative rounded-2xl overflow-hidden h-60 group">
                  <img src={`https://picsum.photos/seed/${seeds[i]}/600/400`} alt={f.title} className="absolute inset-0 w-full h-full object-cover transition-transform duration-500 group-hover:scale-105" />
                  <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/40 to-black/10" />
                  <div className="relative z-10 flex flex-col justify-end h-full p-5">
                    <div className="w-9 h-9 rounded-xl bg-violet-600/80 backdrop-blur flex items-center justify-center mb-3">
                      <f.Icon className="h-4.5 w-4.5 text-white h-4 w-4" />
                    </div>
                    <h3 className="font-bold text-white text-base">{f.title}</h3>
                    <p className="text-white/60 text-xs mt-1 leading-relaxed">{f.desc}</p>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </section>

      {/* Testimonials */}
      <section className="py-24 px-8 md:px-16 bg-[#f4f4f0]">
        <div className="max-w-6xl mx-auto">
          <p className="flex items-center gap-2 text-violet-600 text-sm font-semibold mb-3">
            <span className="w-2 h-2 rounded-full bg-violet-600 inline-block" />
            Stories
          </p>
          <h2 className="text-3xl font-bold text-gray-900 mb-12">Voices from the community</h2>
          <div className="grid md:grid-cols-3 gap-6">
            {TESTIMONIALS.map((t) => (
              <div key={t.name} className="bg-white rounded-2xl border border-gray-100 p-6 shadow-sm hover:shadow-md transition-shadow">
                <div className="flex gap-0.5 mb-4">
                  {[1,2,3,4,5].map((i) => <span key={i} className="text-amber-400 text-sm">★</span>)}
                </div>
                <p className="text-gray-600 text-sm leading-relaxed italic">&ldquo;{t.quote}&rdquo;</p>
                <div className="mt-6 flex items-center gap-3 pt-4 border-t border-gray-100">
                  <img src={t.img} alt={t.name} className="w-10 h-10 rounded-full object-cover" />
                  <div>
                    <p className="font-semibold text-gray-900 text-sm">{t.name}</p>
                    <p className="text-xs text-gray-400">{t.church}</p>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* CTA — full-bleed dark photo (like Careon dark "United, We Transform" section) */}
      <section className="relative py-32 px-8 md:px-16 overflow-hidden">
        <img
          src="https://picsum.photos/seed/kairos-cta/1600/600"
          alt=""
          className="absolute inset-0 w-full h-full object-cover"
        />
        <div className="absolute inset-0 bg-gradient-to-r from-violet-900/90 via-violet-900/75 to-transparent" />
        <div className="relative z-10 max-w-6xl mx-auto flex flex-col md:flex-row md:items-center justify-between gap-10">
          <div>
            <h2 className="text-4xl md:text-5xl font-bold text-white leading-tight">
              Your church deserves<br />a better system.
            </h2>
            <p className="mt-4 text-white/60 text-lg max-w-md">
              Start managing members, attendance, and giving — all in one place.
            </p>
          </div>
          <div className="flex flex-col sm:flex-row gap-4 shrink-0">
            <Link href="/login" className="rounded-full bg-white text-violet-700 px-8 py-4 font-bold text-sm hover:bg-violet-50 transition-colors text-center">
              Get Started Today
            </Link>
            <a href="#about" className="rounded-full border border-white/30 text-white px-8 py-4 font-semibold text-sm hover:border-white/60 transition-colors text-center">
              Learn More
            </a>
          </div>
        </div>
      </section>

      <footer className="border-t border-gray-100 px-8 py-8 flex items-center justify-between text-sm text-gray-400 bg-[#f4f4f0]">
        <span>© {new Date().getFullYear()} Kairos. Church Administration Platform.</span>
        <Link href="/login" className="hover:text-gray-600 transition-colors">Sign In →</Link>
      </footer>
    </div>
  );
}

// ─── STYLE 5: Aset — Dark professional, feature-grid, B2B SaaS feel ──────────
function AsetLanding() {
  return (
    <div className="min-h-screen bg-[#06080f] text-white font-sans">
      {/* Nav */}
      <nav className="fixed top-0 inset-x-0 z-50 flex items-center justify-between px-8 py-4 bg-[#06080f]/95 backdrop-blur border-b border-white/[0.04]">
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-violet-600 to-violet-800 flex items-center justify-center">
            <span className="text-white text-xs font-black">K</span>
          </div>
          <span className="font-bold text-sm tracking-tight">Kairos</span>
          <span className="ml-1 rounded-full bg-violet-500/10 border border-violet-500/20 text-violet-400 text-[10px] px-2 py-0.5 font-medium">Admin</span>
        </div>
        <div className="hidden md:flex items-center gap-6 text-sm text-white/40">
          <a href="#features" className="hover:text-white transition-colors">Features</a>
          <a href="#why" className="hover:text-white transition-colors">Overview</a>
        </div>
        <Link
          href="/login"
          className="flex items-center gap-2 rounded-lg border border-white/10 bg-white/5 hover:bg-white/8 px-4 py-2 text-sm font-medium transition-colors"
        >
          Sign In <span className="text-white/30">→</span>
        </Link>
      </nav>

      {/* Hero */}
      <section className="pt-40 pb-24 px-6">
        <div className="max-w-5xl mx-auto text-center">
          <div className="inline-flex items-center gap-2 rounded-lg border border-white/[0.08] bg-white/[0.03] px-3.5 py-1.5 text-xs text-white/40 mb-8">
            <span className="w-1.5 h-1.5 rounded-full bg-emerald-400" />
            Multi-Branch Church Administration Platform
          </div>
          <h1 className="text-5xl md:text-6xl lg:text-7xl font-bold leading-[1.05] tracking-tight">
            The complete operating<br />
            system for{" "}
            <span className="bg-gradient-to-r from-violet-400 via-purple-400 to-indigo-400 bg-clip-text text-transparent">
              modern churches
            </span>
          </h1>
          <p className="mt-6 text-base md:text-lg text-white/40 max-w-xl mx-auto leading-relaxed">
            Unified member management, attendance tracking, fellowship groups,
            and giving records — across all your branches.
          </p>
          <div className="mt-10 flex flex-col sm:flex-row gap-3 justify-center items-center">
            <Link
              href="/login"
              className="rounded-lg bg-violet-700 hover:bg-violet-600 px-7 py-3 text-sm font-semibold transition-colors"
            >
              Access Dashboard
            </Link>
            <a
              href="#features"
              className="text-sm text-white/40 hover:text-white transition-colors underline underline-offset-4"
            >
              View all features
            </a>
          </div>
        </div>

        {/* Stats row */}
        <div className="max-w-5xl mx-auto mt-20 flex flex-wrap justify-center gap-px">
          {STATS.map((s, i) => (
            <div key={s.label} className={`flex-1 min-w-[140px] px-8 py-6 text-center ${i < STATS.length - 1 ? "border-r border-white/[0.04]" : ""}`}>
              <div className="text-4xl font-bold text-violet-400">{s.value}</div>
              <div className="text-xs text-white/25 mt-2">{s.label}</div>
            </div>
          ))}
        </div>
      </section>

      {/* Pain */}
      <section id="why" className="py-24 px-6 border-y border-white/[0.04] bg-white/[0.01]">
        <div className="max-w-5xl mx-auto">
          <div className="flex flex-col md:flex-row gap-16 items-start">
            <div className="md:w-80 shrink-0">
              <div className="text-[10px] font-semibold uppercase tracking-[0.2em] text-white/25 mb-4">Overview</div>
              <h2 className="text-2xl font-bold leading-snug text-white/90">
                Why churches switch to Kairos
              </h2>
              <p className="mt-3 text-sm text-white/35 leading-relaxed">
                Your data deserves better than a patchwork of disconnected tools.
              </p>
            </div>
            <div className="flex-1 grid sm:grid-cols-2 gap-4">
              {PAIN_POINTS.map((p) => (
                <div key={p.text} className="rounded-xl border border-white/[0.05] bg-white/[0.02] p-5">
                  <p.Icon className="h-5 w-5 text-violet-400 mb-3" />
                  <p className="text-sm text-white/45 leading-relaxed">{p.text}</p>
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* Features — detailed grid */}
      <section id="features" className="py-24 px-6">
        <div className="max-w-5xl mx-auto">
          <div className="mb-12">
            <div className="text-[10px] font-semibold uppercase tracking-[0.2em] text-white/25 mb-4">Capabilities</div>
            <h2 className="text-2xl font-bold text-white/90">Everything you need to run your church</h2>
          </div>
          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-4">
            {FEATURES.map((f) => (
              <div key={f.title} className="group rounded-xl border border-white/[0.05] bg-white/[0.015] p-6 hover:border-violet-500/20 hover:bg-violet-500/5 transition-all duration-200">
                <div className="w-10 h-10 rounded-lg bg-violet-700/20 border border-violet-600/20 flex items-center justify-center mb-5">
                  <f.Icon className="h-5 w-5 text-violet-400" />
                </div>
                <h3 className="font-semibold text-sm text-white/80">{f.title}</h3>
                <p className="mt-2 text-xs text-white/35 leading-relaxed">{f.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* CTA */}
      <section className="py-24 px-6 border-t border-white/[0.04]">
        <div className="max-w-5xl mx-auto flex flex-col md:flex-row items-center justify-between gap-8 rounded-2xl border border-violet-800/30 bg-violet-900/10 p-10">
          <div>
            <h2 className="text-2xl font-bold text-white/90">Ready to modernise your church's operations?</h2>
            <p className="mt-2 text-sm text-white/35">Sign in to access your dashboard across all branches.</p>
          </div>
          <Link
            href="/login"
            className="shrink-0 rounded-lg bg-violet-700 hover:bg-violet-600 px-7 py-3 text-sm font-semibold transition-colors whitespace-nowrap"
          >
            Access Dashboard →
          </Link>
        </div>
      </section>

      <footer className="border-t border-white/[0.04] px-8 py-6 flex items-center justify-between text-xs text-white/20">
        <span>© {new Date().getFullYear()} Kairos — Church Administration Platform</span>
        <Link href="/login" className="hover:text-white/40 transition-colors">Sign In</Link>
      </footer>
    </div>
  );
}

// ─── Root page — style switcher ────────────────────────────────────────────────
export default function HomePage() {
  const [activeStyle, setActiveStyle] = useState<StyleId>("cryptix");

  const pages: Record<StyleId, React.ReactNode> = {
    cryptix: <CryptixLanding />,
    landio: <LandioLanding />,
    nexa: <NexaLanding />,
    careon: <CareonLanding />,
    aset: <AsetLanding />,
  };

  return (
    <div className="relative">
      {/* Floating style picker */}
      <div className="fixed bottom-6 left-1/2 -translate-x-1/2 z-[100] flex items-center gap-1 rounded-full bg-black/80 backdrop-blur-xl border border-white/10 p-1.5 shadow-2xl">
        {STYLES.map((s) => (
          <button
            key={s.id}
            onClick={() => setActiveStyle(s.id)}
            className={`rounded-full px-4 py-1.5 text-xs font-semibold transition-all ${
              activeStyle === s.id
                ? "bg-white text-black"
                : "text-white/50 hover:text-white"
            }`}
          >
            {s.label}
          </button>
        ))}
      </div>

      {pages[activeStyle]}
    </div>
  );
}
