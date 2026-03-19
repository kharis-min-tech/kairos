export default function AuthLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex min-h-screen">
      {/* Left branding panel — hidden on mobile */}
      <div className="relative hidden w-[480px] flex-col justify-between overflow-hidden bg-primary p-10 text-primary-foreground lg:flex">
        {/* Decorative circles */}
        <div className="absolute -left-20 -top-20 h-72 w-72 rounded-full bg-white/5" />
        <div className="absolute -bottom-32 -right-16 h-96 w-96 rounded-full bg-white/5" />
        <div className="absolute bottom-40 left-10 h-40 w-40 rounded-full bg-white/[0.03]" />

        <div className="relative z-10">
          <h1 className="text-4xl font-bold tracking-tight">Kairos</h1>
          <p className="mt-1 text-sm font-medium text-white/70">Church Administration</p>
        </div>

        <div className="relative z-10 space-y-6">
          <blockquote className="border-l-2 border-white/30 pl-4">
            <p className="text-lg font-light italic leading-relaxed text-white/90">
              &ldquo;Let all things be done decently and in order.&rdquo;
            </p>
            <footer className="mt-2 text-sm text-white/60">— 1 Corinthians 14:40 (NKJV)</footer>
          </blockquote>
        </div>

        <div className="relative z-10">
          <p className="text-xs text-white/40">&copy; {new Date().getFullYear()} Kairos Church Administration</p>
        </div>
      </div>

      {/* Right content panel */}
      <div className="flex flex-1 items-center justify-center bg-muted/30 px-4 py-12">
        <div className="w-full max-w-md space-y-6">
          {/* Mobile-only branding */}
          <div className="text-center lg:hidden">
            <h1 className="text-3xl font-bold tracking-tight text-primary">Kairos</h1>
            <p className="mt-1 text-sm text-muted-foreground">Church Administration</p>
          </div>
          {children}
        </div>
      </div>
    </div>
  );
}
