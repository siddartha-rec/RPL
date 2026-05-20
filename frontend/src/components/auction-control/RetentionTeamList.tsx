import { Box, Typography } from '@mui/material';
import type { Team } from '../../types';

export interface TeamRetentionStat {
  used: number;
  spent: number;
}

interface RetentionTeamListProps {
  teams: Team[];
  selectedTeamId: number | null;
  onSelect: (teamId: number) => void;
  maxRetentions: number;
  statsByTeam: Record<number, TeamRetentionStat>;
}

export default function RetentionTeamList({ teams, selectedTeamId, onSelect, maxRetentions, statsByTeam }: RetentionTeamListProps) {
  return (
    <Box sx={{ background: '#fff', border: '1px solid #e2e8f0', borderRadius: '14px', overflow: 'hidden' }}>
      <Box sx={{ px: 1.75, py: 1.25, background: '#f1f5f9', borderBottom: '1px solid #e2e8f0' }}>
        <Typography sx={{ fontSize: '10px', fontWeight: 800, color: '#475569', letterSpacing: '1px' }}>
          TEAMS · {teams.length}
        </Typography>
      </Box>
      <Box sx={{ p: 0.75, maxHeight: 520, overflowY: 'auto' }}>
        {teams.length === 0 && (
          <Typography sx={{ p: 2, fontSize: '12px', color: '#94a3b8' }}>
            No teams in this league. Add teams under Admin · Teams first.
          </Typography>
        )}
        {teams.map(team => {
          const selected = team.id === selectedTeamId;
          const stat = statsByTeam[team.id] ?? { used: 0, spent: 0 };
          const full = stat.used >= maxRetentions;
          const remaining = team.budget - team.budgetSpent;
          const dotColor = team.color || '#94a3b8';

          return (
            <Box
              key={team.id}
              onClick={() => onSelect(team.id)}
              sx={{
                p: 1.25,
                borderRadius: '10px',
                cursor: 'pointer',
                mb: 0.5,
                border: selected ? `1.5px solid ${dotColor}` : '1.5px solid transparent',
                background: selected ? `${dotColor}18` : 'transparent',
                '&:hover': { background: selected ? `${dotColor}22` : '#f8fafc' },
                transition: 'all 0.15s ease',
              }}
            >
              <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                  <Box sx={{ width: 10, height: 10, borderRadius: '50%', background: dotColor }} />
                  <Typography sx={{ fontSize: '13px', fontWeight: selected ? 800 : 700, color: selected ? '#1e293b' : '#475569' }}>
                    {team.name}
                  </Typography>
                </Box>
                <Typography sx={{ fontSize: '10px', fontWeight: 800, color: full ? '#16a34a' : '#94a3b8' }}>
                  {stat.used}/{maxRetentions}{full ? ' ✓' : ''}
                </Typography>
              </Box>
              {selected && (
                <Typography sx={{ fontSize: '10px', color: '#475569', mt: 0.25, ml: 2.25 }}>
                  Spent {stat.spent} CR · {remaining} left
                </Typography>
              )}
            </Box>
          );
        })}
      </Box>
    </Box>
  );
}
