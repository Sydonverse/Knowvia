import React from 'react';
import {
  Code2,
  ShieldCheck,
  Box,
  BarChart3,
  Palette,
  Sparkles,
} from 'lucide-react';

export interface DepartmentIconBadgeProps {
  department?: string | { name?: string; slug?: string; icon?: string } | null;
  size?: 'sm' | 'md' | 'lg' | 'xl';
  className?: string;
  showLabel?: boolean;
  subtitle?: string;
}

interface DeptMeta {
  name: string;
  subtitle: string;
  icon: React.ComponentType<{ size?: number; className?: string; strokeWidth?: number }>;
  gradient: string;
  iconGlow: string;
}

export const DepartmentIconBadge: React.FC<DepartmentIconBadgeProps> = ({
  department,
  size = 'md',
  className = '',
  showLabel = false,
  subtitle,
}) => {
  const deptName = typeof department === 'string' ? department : department?.name || '';
  const deptSlug = (typeof department === 'string' ? department : department?.slug || deptName)
    .toLowerCase()
    .trim();

  // Match department to icon metadata
  let meta: DeptMeta;

  if (deptSlug.includes('web')) {
    meta = {
      name: deptName || 'Web Development',
      subtitle: subtitle || 'Frontend, APIs & Systems',
      icon: Code2,
      gradient: 'linear-gradient(135deg, #0ea5e9 0%, #2563eb 50%, #4f46e5 100%)',
      iconGlow: 'rgba(14, 165, 233, 0.35)',
    };
  } else if (deptSlug.includes('cyber') || deptSlug.includes('security')) {
    meta = {
      name: deptName || 'Cybersecurity',
      subtitle: subtitle || 'Security & Threat Defense',
      icon: ShieldCheck,
      gradient: 'linear-gradient(135deg, #2563eb 0%, #4f46e5 50%, #6366f1 100%)',
      iconGlow: 'rgba(79, 70, 229, 0.35)',
    };
  } else if (deptSlug.includes('3d') || deptSlug.includes('model')) {
    meta = {
      name: deptName || '3D Modelling',
      subtitle: subtitle || 'Mesh, Assets & Spatial',
      icon: Box,
      gradient: 'linear-gradient(135deg, #0284c7 0%, #6366f1 50%, #7c3aed 100%)',
      iconGlow: 'rgba(99, 102, 241, 0.35)',
    };
  } else if (deptSlug.includes('data') || deptSlug.includes('analys')) {
    meta = {
      name: deptName || 'Data Analysis',
      subtitle: subtitle || 'Insights & Model Pipelines',
      icon: BarChart3,
      gradient: 'linear-gradient(135deg, #06b6d4 0%, #0ea5e9 50%, #3b82f6 100%)',
      iconGlow: 'rgba(6, 182, 212, 0.35)',
    };
  } else if (deptSlug.includes('design') || deptSlug.includes('graphic')) {
    meta = {
      name: deptName || 'Graphic Design',
      subtitle: subtitle || 'Visual Identity & UX',
      icon: Palette,
      gradient: 'linear-gradient(135deg, #38bdf8 0%, #4f46e5 50%, #818cf8 100%)',
      iconGlow: 'rgba(56, 189, 248, 0.35)',
    };
  } else {
    meta = {
      name: deptName || 'Department Workspace',
      subtitle: subtitle || 'Knowledge Repository',
      icon: Sparkles,
      gradient: 'linear-gradient(135deg, #0ea5e9 0%, #4f46e5 100%)',
      iconGlow: 'rgba(79, 70, 229, 0.3)',
    };
  }

  const IconComponent = meta.icon;

  // Sizing tokens
  const iconSizes: Record<string, number> = {
    sm: 14,
    md: 18,
    lg: 24,
    xl: 32,
  };

  const iconPx = iconSizes[size] || 18;

  return (
    <div className={`dept-badge-pill dept-badge-${size} ${className}`} title={meta.name}>
      {/* 3D Frosted Icon Orb */}
      <div
        className="dept-badge-orb"
        style={{
          background: meta.gradient,
          boxShadow: `0 4px 14px ${meta.iconGlow}, inset 0 1px 1px rgba(255, 255, 255, 0.45)`,
        }}
      >
        <IconComponent size={iconPx} strokeWidth={2.2} className="dept-badge-icon" />
      </div>

      {/* Optional typography label for pill treatment */}
      {showLabel && (
        <div className="dept-badge-labels">
          <span className="dept-badge-name">{meta.name}</span>
          {meta.subtitle && <span className="dept-badge-sub">{meta.subtitle}</span>}
        </div>
      )}
    </div>
  );
};
