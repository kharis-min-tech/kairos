'use client';

import Link from 'next/link';
import { Church, Users, BookOpen, Heart, ArrowRight } from 'lucide-react';
import { Button } from '@/components/ui/button';

const FEATURES = [
  { icon: Users, label: 'Member Management', desc: 'Track and grow your congregation' },
  { icon: BookOpen, label: 'Attendance Tracking', desc: 'Monitor service and fellowship attendance' },
  { icon: Heart, label: 'Donations & Giving', desc: 'Manage tithes, offerings and reports' },
] as const;

export default function WelcomePage() {
  return (
    <div className="flex min-h-screen flex-col">
      {/* Hero */}
      <div className="relative flex flex-1 flex-col items-center justify-center bg-gradient-to-br from-primary via-primary/90 to-secondary px-6 py-16 text-white">
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_30%_40%,rgba(255,255,255,0.08),transparent_70%)]" />

        <div className="relative z-10 max-w-md text-center">
          <div className="mx-auto mb-6 flex h-20 w-20 items-center justify-center rounded-2xl bg-white/15 backdrop-blur-sm">
            <Church size={40} className="text-white" />
          </div>

          <h1 className="text-4xl font-bold tracking-tight sm:text-5xl">Kairos</h1>
          <p className="mt-2 text-lg text-white/80">Church Management Platform</p>
          <p className="mt-4 text-sm leading-relaxed text-white/70">
            Streamline your church operations with powerful tools for member management,
            attendance tracking, and financial oversight.
          </p>

          <div className="mt-8 flex flex-col gap-3 sm:flex-row sm:justify-center">
            <Link href="/register">
              <Button size="lg" className="w-full min-h-[48px] bg-white text-primary hover:bg-white/90 sm:w-auto">
                Get Started <ArrowRight size={18} className="ml-2" />
              </Button>
            </Link>
            <Link href="/login">
              <Button size="lg" variant="outline" className="w-full min-h-[48px] border-white/30 text-white hover:bg-white/10 sm:w-auto">
                Sign In
              </Button>
            </Link>
          </div>
        </div>
      </div>

      {/* Features */}
      <div className="bg-background px-6 py-12">
        <div className="mx-auto grid max-w-md gap-6 sm:max-w-2xl sm:grid-cols-3">
          {FEATURES.map(({ icon: Icon, label, desc }) => (
            <div key={label} className="flex flex-col items-center text-center">
              <div className="mb-3 flex h-12 w-12 items-center justify-center rounded-xl bg-primary/10">
                <Icon size={24} className="text-primary" />
              </div>
              <h3 className="text-sm font-semibold text-foreground">{label}</h3>
              <p className="mt-1 text-xs text-muted-foreground">{desc}</p>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
