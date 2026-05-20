import { Box, Typography } from '@mui/material';
import type { PhaseDerivation } from './types';

interface StepperLabel {
  title: string;
  sub: string;
  done: boolean;
  current: boolean;
}

interface AuctionStepperProps {
  phase: PhaseDerivation;
  retentionCount: number;
  retentionTotal: number;
  mainSoldCount: number;
  onStepClick?: (index: 0 | 1 | 2) => void;
}

export default function AuctionStepper({
  phase, retentionCount, retentionTotal, mainSoldCount, onStepClick,
}: AuctionStepperProps) {
  const steps: StepperLabel[] = [
    {
      title: 'RETENTION',
      sub: phase.isRetention
        ? `OPEN · ${retentionCount}/${retentionTotal} entered`
        : phase.stepIndex > 0
        ? `locked · ${retentionCount} retained`
        : 'not started',
      done: phase.stepIndex > 0,
      current: phase.isRetention,
    },
    {
      title: 'MAIN AUCTION',
      sub: phase.isMain ? `● LIVE · ${mainSoldCount} sold` : phase.stepIndex > 1 ? 'completed' : 'waiting',
      done: phase.stepIndex > 1,
      current: phase.isMain,
    },
    {
      title: 'COMPLETE',
      sub: phase.isComplete ? 'auction completed' : '—',
      done: phase.isComplete,
      current: phase.isComplete,
    },
  ];

  return (
    <Box
      sx={{
        background: '#ffffff',
        border: '1px solid #e2e8f0',
        borderRadius: '16px',
        p: 2.25,
        mb: 2,
      }}
    >
      <Box sx={{ display: 'flex', alignItems: 'center', gap: 0 }}>
        {steps.map((s, i) => {
          const idx = i as 0 | 1 | 2;
          const node = s.done ? (
            <Box sx={nodeStyle('#4ade80', '#fff')}>✓</Box>
          ) : s.current ? (
            <Box sx={nodeStyle('linear-gradient(135deg,#ef4444,#b91c1c)', '#fff', true)}>●</Box>
          ) : (
            <Box sx={nodeStyle('#e2e8f0', '#94a3b8')}>{i + 1}</Box>
          );
          const labelColor = s.done ? '#16a34a' : s.current ? '#b91c1c' : '#94a3b8';
          return (
            <>
              <Box
                key={s.title}
                onClick={() => onStepClick?.(idx)}
                sx={{ flex: 1, textAlign: 'center', cursor: onStepClick ? 'pointer' : 'default' }}
              >
                {node}
                <Typography sx={{ fontSize: '11px', fontWeight: 800, color: labelColor, mt: 0.75, letterSpacing: '0.8px' }}>
                  {s.title}
                </Typography>
                <Typography sx={{ fontSize: '10px', fontWeight: 700, color: labelColor, opacity: 0.85 }}>
                  {s.sub}
                </Typography>
              </Box>
              {i < steps.length - 1 && (
                <Box
                  key={`bar-${i}`}
                  sx={{
                    flex: 2,
                    height: 3,
                    background: steps[i].done
                      ? '#4ade80'
                      : steps[i].current
                      ? 'linear-gradient(90deg,#ef4444 0%,#ef4444 65%,#e2e8f0 65%)'
                      : '#e2e8f0',
                  }}
                />
              )}
            </>
          );
        })}
      </Box>
    </Box>
  );
}

function nodeStyle(bg: string, color: string, glow = false) {
  return {
    width: 36,
    height: 36,
    borderRadius: '50%',
    background: bg,
    color,
    display: 'inline-flex',
    alignItems: 'center',
    justifyContent: 'center',
    fontSize: 14,
    fontWeight: 800,
    boxShadow: glow ? '0 0 16px rgba(239,68,68,0.45)' : 'none',
  };
}
