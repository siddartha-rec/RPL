import { useNavigate } from 'react-router-dom';
import { Box, Typography, Button } from '@mui/material';
import CheckCircleIcon from '@mui/icons-material/CheckCircle';
import type { AuctionControlContext } from './types';

interface CompletePanelProps {
  ctx: AuctionControlContext;
}

export default function CompletePanel({ ctx }: CompletePanelProps) {
  const navigate = useNavigate();
  const sold = ctx.availablePlayers.filter(p => p.status === 'SOLD');
  const totalSpend = sold.reduce((s, p) => s + (p.soldPrice ?? 0), 0);
  const topBuy = sold.reduce<typeof sold[number] | null>(
    (best, p) => (!best || (p.soldPrice ?? 0) > (best.soldPrice ?? 0)) ? p : best,
    null,
  );

  return (
    <Box sx={{ background: '#fff', border: '1px solid #e2e8f0', borderRadius: '16px', p: 3.5, textAlign: 'center' }}>
      <CheckCircleIcon sx={{ fontSize: 64, color: '#4ade80', mb: 1.5 }} />
      <Typography sx={{ fontSize: '22px', fontWeight: 900, color: '#1e293b', mb: 0.5 }}>
        Auction Completed
      </Typography>
      <Typography sx={{ fontSize: '13px', color: '#64748b', mb: 3 }}>
        {ctx.league.name} · {ctx.league.seasonDisplayName || ctx.league.season}
      </Typography>

      <Box sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr', sm: 'repeat(3,1fr)' }, gap: 2, mb: 3 }}>
        <Box>
          <Typography sx={{ fontSize: '10px', color: '#475569', fontWeight: 800, letterSpacing: '1px' }}>PLAYERS SOLD</Typography>
          <Typography sx={{ fontSize: '24px', fontWeight: 900, color: '#1e293b' }}>{sold.length}</Typography>
        </Box>
        <Box>
          <Typography sx={{ fontSize: '10px', color: '#475569', fontWeight: 800, letterSpacing: '1px' }}>TOTAL SPEND</Typography>
          <Typography sx={{ fontSize: '24px', fontWeight: 900, color: '#b45309' }}>{totalSpend} CR</Typography>
        </Box>
        <Box>
          <Typography sx={{ fontSize: '10px', color: '#475569', fontWeight: 800, letterSpacing: '1px' }}>TOP BUY</Typography>
          <Typography sx={{ fontSize: '16px', fontWeight: 900, color: '#16a34a' }}>
            {topBuy ? `${topBuy.name} (${topBuy.soldPrice} CR)` : '—'}
          </Typography>
        </Box>
      </Box>

      <Button
        variant="contained"
        onClick={() => navigate('/results')}
        sx={{
          background: 'linear-gradient(135deg,#4ade80,#16a34a)',
          fontWeight: 800,
          borderRadius: '10px',
          '&:hover': { background: 'linear-gradient(135deg,#86efac,#22c55e)' },
        }}
      >
        View Results →
      </Button>
    </Box>
  );
}
