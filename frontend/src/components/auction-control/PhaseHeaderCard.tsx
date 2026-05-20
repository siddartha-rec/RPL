import { Box, Button, Typography } from '@mui/material';
import type { ReactNode } from 'react';

export interface PhaseAction {
  label: string;
  onClick: () => void;
  variant: 'primary' | 'secondary' | 'danger';
  disabled?: boolean;
  icon?: ReactNode;
}

interface PhaseHeaderCardProps {
  icon: ReactNode;
  label: string;
  title: string;
  subtitle?: string;
  tone: 'neutral' | 'blue' | 'live' | 'success';
  actions: PhaseAction[];
}

const tones = {
  neutral: { bg: '#ffffff', border: '#e2e8f0', accent: '#475569' },
  blue:    { bg: 'linear-gradient(135deg,rgba(96,165,250,0.06),rgba(96,165,250,0.02))', border: 'rgba(96,165,250,0.3)', accent: '#1d4ed8' },
  live:    { bg: 'linear-gradient(135deg,rgba(239,68,68,0.06),rgba(239,68,68,0.02))', border: 'rgba(239,68,68,0.3)', accent: '#b91c1c' },
  success: { bg: 'linear-gradient(135deg,rgba(74,222,128,0.06),rgba(74,222,128,0.02))', border: 'rgba(74,222,128,0.3)', accent: '#16a34a' },
};

export default function PhaseHeaderCard({ icon, label, title, subtitle, tone, actions }: PhaseHeaderCardProps) {
  const t = tones[tone];
  return (
    <Box
      sx={{
        background: t.bg,
        border: `1px solid ${t.border}`,
        borderRadius: '16px',
        p: 2,
        mb: 2,
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
        flexWrap: 'wrap',
        gap: 1.5,
      }}
    >
      <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5 }}>
        <Box sx={{ width: 44, height: 44, borderRadius: '12px', background: t.accent, display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#fff' }}>
          {icon}
        </Box>
        <Box>
          <Typography sx={{ fontSize: '10px', color: t.accent, fontWeight: 800, letterSpacing: '1.5px' }}>{label}</Typography>
          <Typography sx={{ fontSize: '16px', fontWeight: 800, color: '#1e293b' }}>{title}</Typography>
          {subtitle && <Typography sx={{ fontSize: '12px', color: '#64748b' }}>{subtitle}</Typography>}
        </Box>
      </Box>
      <Box sx={{ display: 'flex', gap: 1, flexWrap: 'wrap' }}>
        {actions.map((a, i) => (
          <Button
            key={i}
            onClick={a.onClick}
            disabled={a.disabled}
            startIcon={a.icon}
            sx={buttonSx(a.variant)}
          >
            {a.label}
          </Button>
        ))}
      </Box>
    </Box>
  );
}

function buttonSx(variant: PhaseAction['variant']) {
  const base = { fontWeight: 800, fontSize: '13px', borderRadius: '10px', px: 2, py: 1, textTransform: 'none' as const };
  if (variant === 'primary') {
    return { ...base, background: 'linear-gradient(135deg,#3b82f6,#1d4ed8)', color: '#fff',
      '&:hover': { background: 'linear-gradient(135deg,#60a5fa,#3b82f6)' },
      '&:disabled': { background: '#e2e8f0', color: '#94a3b8' } };
  }
  if (variant === 'danger') {
    return { ...base, background: 'linear-gradient(135deg,#6d28d9,#4c1d95)', color: '#fff',
      '&:hover': { background: 'linear-gradient(135deg,#8b5cf6,#6d28d9)' },
      '&:disabled': { background: '#e2e8f0', color: '#94a3b8' } };
  }
  return { ...base, background: '#ffffff', color: '#475569', border: '1px solid #cbd5e1',
    '&:hover': { background: '#f1f5f9' },
    '&:disabled': { color: '#94a3b8', borderColor: '#e2e8f0' } };
}
