import React from 'react';

type AvatarSize = 'xs' | 'sm' | 'md' | 'lg' | 'xl';
type AvatarVariant = 'dark' | 'light';

interface MemberAvatarProps {
  photoUrl?: string | null;
  firstName?: string | null;
  lastName?: string | null;
  size?: AvatarSize;
  variant?: AvatarVariant;
  className?: string;
}

const sizeClasses: Record<AvatarSize, string> = {
  xs: 'h-7 w-7 text-xs',
  sm: 'h-10 w-10 text-sm',
  md: 'h-9 w-9 text-sm',
  lg: 'h-14 w-14 text-xl',
  xl: 'h-16 w-16 text-2xl',
};

const variantClasses: Record<AvatarVariant, string> = {
  dark: 'bg-white/20 text-white font-semibold',
  light: 'bg-violet-500/15 text-violet-600 dark:text-violet-400 font-bold',
};

export function MemberAvatar({
  photoUrl,
  firstName,
  lastName,
  size = 'sm',
  variant = 'light',
  className = '',
}: MemberAvatarProps) {
  const initials =
    ((firstName?.[0] ?? '') + (lastName?.[0] ?? '')).toUpperCase() || '?';

  const baseClasses = `flex-shrink-0 rounded-full ${sizeClasses[size]}`;

  if (photoUrl) {
    return (
      <img
        src={photoUrl}
        alt={`${firstName ?? ''} ${lastName ?? ''}`.trim() || 'Member'}
        className={`${baseClasses} object-cover ${className}`}
      />
    );
  }

  return (
    <div
      className={`${baseClasses} flex items-center justify-center ${variantClasses[variant]} ${className}`}
    >
      {initials}
    </div>
  );
}
