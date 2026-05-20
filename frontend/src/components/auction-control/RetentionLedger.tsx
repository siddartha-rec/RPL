import { useMemo, useState } from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { Box, Typography, Button, TextField, Alert } from '@mui/material';
import type { Team, Player, League } from '../../types';
import { retentionPick } from '../../api/auctions';

interface RetentionLedgerProps {
  auctionId: number;
  league: League;
  team: Team | null;
  retainedForTeam: Player[];
  availablePlayers: Player[];
  refetch: () => void;
}

export default function RetentionLedger({ auctionId, league, team, retainedForTeam, availablePlayers, refetch }: RetentionLedgerProps) {
  const qc = useQueryClient();
  const [playerId, setPlayerId] = useState<number | ''>('');
  const [price, setPrice] = useState<string>('');
  const [error, setError] = useState<string | null>(null);

  const usedSlots = retainedForTeam.length;
  const spent = retainedForTeam.reduce((s, p) => s + (p.soldPrice ?? 0), 0);
  const remainingBudget = team ? team.budget - team.budgetSpent : 0;

  const addMut = useMutation({
    mutationFn: () => retentionPick(auctionId, Number(playerId), {
      teamId: team!.id,
      price: price === '' ? undefined : Number(price),
    }),
    onSuccess: () => {
      setPlayerId('');
      setPrice('');
      setError(null);
      qc.invalidateQueries({ queryKey: ['players'] });
      qc.invalidateQueries({ queryKey: ['teams'] });
      qc.invalidateQueries({ queryKey: ['auction-by-league'] });
      refetch();
    },
    onError: (e: { response?: { data?: { message?: string } } }) =>
      setError(e?.response?.data?.message ?? 'Failed to add retention'),
  });

  const selectablePlayers = useMemo(
    () => availablePlayers.filter(p => p.status === 'AVAILABLE'),
    [availablePlayers]
  );

  function onPlayerChange(id: number | '') {
    setPlayerId(id);
    setError(null);
    if (id !== '' && price === '') {
      const p = availablePlayers.find(pl => pl.id === id);
      if (p) setPrice(String(p.basePrice ?? league.retentionCost));
    }
  }

  if (!team) {
    return (
      <Box sx={{ background: '#fff', border: '1px solid #e2e8f0', borderRadius: '14px', p: 4, textAlign: 'center' }}>
        <Typography sx={{ fontSize: '13px', color: '#94a3b8' }}>
          Select a team on the left to manage its retentions.
        </Typography>
      </Box>
    );
  }

  const dotColor = team.color || '#94a3b8';
  return (
    <Box sx={{ background: '#fff', border: '1px solid #e2e8f0', borderRadius: '14px', overflow: 'hidden' }}>
      <Box sx={{ px: 1.75, py: 1.25, background: `${dotColor}15`, borderBottom: `1px solid ${dotColor}33` }}>
        <Typography sx={{ fontSize: '13px', fontWeight: 800, color: '#1e293b' }}>
          {team.name} · Retentions
        </Typography>
        <Typography sx={{ fontSize: '11px', color: '#475569' }}>
          {usedSlots}/{league.maxRetentionsPerTeam} slots · {spent} CR spent · {remainingBudget} CR left
        </Typography>
      </Box>

      <Box sx={{ p: 1.75 }}>
        {retainedForTeam.length > 0 ? (
          <Box sx={{ border: '1px solid #e2e8f0', borderRadius: '10px', mb: 1.5, overflow: 'hidden' }}>
            <Box sx={{ display: 'grid', gridTemplateColumns: '50px 1fr 90px 90px', p: 1, background: '#f8fafc', fontSize: '10px', fontWeight: 800, color: '#475569', letterSpacing: '0.5px' }}>
              <div>#</div><div>PLAYER</div><div>CATEGORY</div><div>PRICE</div>
            </Box>
            {retainedForTeam.map(p => (
              <Box key={p.id} sx={{ display: 'grid', gridTemplateColumns: '50px 1fr 90px 90px', p: 1.2, alignItems: 'center', borderTop: '1px solid #f1f5f9' }}>
                <Typography sx={{ fontSize: '11px', color: '#94a3b8', fontFamily: 'monospace' }}>{p.playerNumber ? `#${p.playerNumber}` : '—'}</Typography>
                <Typography sx={{ fontSize: '13px', fontWeight: 700, color: '#1e293b' }}>{p.name}</Typography>
                <Box>
                  <Box sx={{ display: 'inline-block', px: 0.75, py: 0.2, borderRadius: '6px', background: '#dbeafe', color: '#1d4ed8', fontSize: '10px', fontWeight: 800 }}>
                    {p.category}
                  </Box>
                </Box>
                <Typography sx={{ fontSize: '13px', fontWeight: 800, color: '#b45309' }}>{p.soldPrice ?? '—'} CR</Typography>
              </Box>
            ))}
          </Box>
        ) : (
          <Typography sx={{ fontSize: '12px', color: '#94a3b8', mb: 1.5 }}>
            No retentions yet for this team.
          </Typography>
        )}

        <Box sx={{ background: '#f8fafc', border: '1.5px dashed #cbd5e1', borderRadius: '10px', p: 1.5 }}>
          <Typography sx={{ fontSize: '10px', fontWeight: 800, color: '#475569', letterSpacing: '1px', mb: 1 }}>
            + ADD RETENTION
          </Typography>
          <Box sx={{ display: 'grid', gridTemplateColumns: '1fr 120px 110px', gap: 1 }}>
            <TextField
              select
              size="small"
              SelectProps={{ native: true }}
              value={playerId}
              onChange={e => onPlayerChange(e.target.value === '' ? '' : Number(e.target.value))}
              sx={textFieldSx}
            >
              <option value="">— Choose player ({selectablePlayers.length} available) —</option>
              {selectablePlayers.slice(0, 500).map(p => (
                <option key={p.id} value={p.id}>
                  {p.playerNumber ? `#${p.playerNumber} ` : ''}{p.name} · base {p.basePrice} CR
                </option>
              ))}
            </TextField>
            <TextField
              size="small"
              type="number"
              placeholder="Price (CR)"
              value={price}
              onChange={e => setPrice(e.target.value)}
              sx={textFieldSx}
            />
            <Button
              variant="contained"
              disabled={!playerId || price === '' || addMut.isPending || usedSlots >= league.maxRetentionsPerTeam}
              onClick={() => addMut.mutate()}
              sx={{
                background: 'linear-gradient(135deg,#f59e0b,#d97706)',
                color: '#fff', fontWeight: 800, borderRadius: '10px',
                '&:hover': { background: 'linear-gradient(135deg,#fbbf24,#f59e0b)' },
                '&.Mui-disabled': { background: '#e2e8f0', color: '#94a3b8' },
              }}
            >
              {addMut.isPending ? 'Adding…' : 'Add'}
            </Button>
          </Box>
          <Typography sx={{ fontSize: '10px', color: '#94a3b8', mt: 0.75 }}>
            Base price pre-filled when player selected. Floor: {league.retentionCost} CR.
          </Typography>
          {error && <Alert severity="error" onClose={() => setError(null)} sx={{ mt: 1, borderRadius: '8px', fontSize: '12px' }}>{error}</Alert>}
        </Box>
      </Box>
    </Box>
  );
}

const textFieldSx = {
  '& .MuiOutlinedInput-root': {
    background: '#fff',
    borderRadius: '8px',
    fontSize: '12px',
    '&.Mui-focused fieldset': { borderColor: '#f59e0b' },
  },
};
