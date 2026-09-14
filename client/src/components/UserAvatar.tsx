import React from 'react';
import { getInitials, formatDisplayName } from '../utils/avatar';

export type AvatarSize = 'xs' | 'sm' | 'md' | 'lg';

interface UserAvatarProps {
  name?: string | null;
  firstName?: string | null;
  lastName?: string | null;
  size?: AvatarSize;
  className?: string;
  style?: React.CSSProperties;
  role?: string;
}

/**
 * Universal initials-only user avatar component for Knowvia.
 * 
 * Rules enforced:
 * - Never renders an <img> tag or external photo.
 * - Always renders deterministic, clean uppercase initials.
 * - Single names like 'NASCOM' display as 'N'.
 * - Preserves sizing and theme tokens across Navbar, Chat, Announcements, and Admin views.
 */
export const UserAvatar: React.FC<UserAvatarProps> = ({
  name,
  firstName,
  lastName,
  size = 'sm',
  className = '',
  style,
  role,
}) => {
  const initials = getInitials(name || firstName, lastName);
  const displayName = name || formatDisplayName(firstName, lastName);

  const roleClass = role ? `avatar-role-${role.toLowerCase()}` : '';

  return (
    <div
      className={`user-initials-avatar size-${size} ${roleClass} ${className}`.trim()}
      style={style}
      aria-label={`${displayName} (${initials})`}
      title={displayName}
    >
      <span className="user-initials-text">{initials}</span>
    </div>
  );
};
