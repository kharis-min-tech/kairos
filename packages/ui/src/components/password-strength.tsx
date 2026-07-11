'use client';

function PasswordRequirement({ met, label }: { met: boolean; label: string }) {
  return (
    <div className={`flex items-center gap-2 text-xs ${met ? 'text-emerald-600' : 'text-muted-foreground'}`}>
      <svg className="h-3.5 w-3.5 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
        {met ? (
          <path strokeLinecap="round" strokeLinejoin="round" d="M4.5 12.75l6 6 9-13.5" />
        ) : (
          <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v3.75m9-.75a9 9 0 11-18 0 9 9 0 0118 0zm-9 3.75h.008v.008H12v-.008z" />
        )}
      </svg>
      {label}
    </div>
  );
}

export function PasswordStrength({ password }: { password: string }) {
  const checks = [
    { label: 'At least 8 characters', met: password.length >= 8 },
    { label: 'One uppercase letter', met: /[A-Z]/.test(password) },
    { label: 'One number', met: /[0-9]/.test(password) },
    { label: 'One special character', met: /[^A-Za-z0-9]/.test(password) },
  ];
  const strength = checks.filter((c) => c.met).length;

  return (
    <div className="space-y-2" aria-live="polite">
      <div className="flex gap-1" role="presentation">
        {[1, 2, 3, 4].map((level) => (
          <div
            key={level}
            className={`h-1.5 flex-1 rounded-full ${
              level <= strength
                ? strength <= 1 ? 'bg-destructive'
                : strength <= 2 ? 'bg-amber-500'
                : strength <= 3 ? 'bg-yellow-500'
                : 'bg-emerald-500'
                : 'bg-muted'
            }`}
          />
        ))}
      </div>
      <ul className="space-y-1.5">
        {checks.map((check) => (
          <li key={check.label}>
            <PasswordRequirement met={check.met} label={check.label} />
          </li>
        ))}
      </ul>
    </div>
  );
}
