import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { useNavigate, useParams } from 'react-router-dom';
import { Box, Typography, CircularProgress, Alert, Button } from '@mui/material';
import ArrowBackIcon from '@mui/icons-material/ArrowBack';
import SportsCricketIcon from '@mui/icons-material/SportsCricket';
import { getMatchDetail } from '../api/matches';
import type { MatchDetail, InningsDetail } from '../api/matches';

export default function MatchDetailPage() {
  const { tournamentId, leagueId, matchId } = useParams<{ tournamentId: string; leagueId: string; matchId: string }>();
  const mid = Number(matchId);
  const navigate = useNavigate();
  const [tab, setTab] = useState(0);

  const { data, isLoading, error } = useQuery<MatchDetail>({
    queryKey: ['match-detail', mid],
    queryFn: () => getMatchDetail(mid),
    enabled: !!mid,
  });

  if (isLoading) return <Box sx={{ display: 'flex', justifyContent: 'center', py: 6 }}><CircularProgress sx={{ color: '#60a5fa' }} /></Box>;
  if (error || !data) return <Alert severity="error" sx={{ borderRadius: '12px' }}>Failed to load match</Alert>;

  const dateLabel = data.scheduledAt
    ? new Date(data.scheduledAt).toLocaleString('en-IN', { day: '2-digit', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' })
    : '—';

  const sortedInnings = [...data.innings].sort((a, b) => a.inningsNumber - b.inningsNumber);
  const isLive = data.status === 'LIVE';
  const statusColor = isLive ? '#ef4444' : data.status === 'COMPLETED' ? '#16a34a' : '#f59e0b';

  return (
    <Box sx={{ animation: 'fadeIn 0.5s ease' }}>
      <Button
        startIcon={<ArrowBackIcon />}
        onClick={() => navigate(`/tournaments/${tournamentId}/leagues/${leagueId}`)}
        sx={{ mb: 2, color: '#64748b', borderRadius: '10px', '&:hover': { background: '#eef2f7' } }}
      >
        Back to matches
      </Button>

      {/* Hero */}
      <Box sx={{
        background: 'linear-gradient(135deg, rgba(96,165,250,0.10), rgba(167,139,250,0.05))',
        border: '1px solid rgba(96,165,250,0.25)',
        borderRadius: '20px', p: 3, mb: 3,
      }}>
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 1.5, flexWrap: 'wrap' }}>
          <Typography sx={{ fontSize: '11px', fontWeight: 700, color: '#94a3b8', textTransform: 'uppercase', letterSpacing: '1px' }}>
            {dateLabel}{data.format ? ` · ${data.format}` : ''}{data.overs ? ` · ${data.overs} ov` : ''}
          </Typography>
          <Box sx={{ display: 'inline-block', px: 1.2, py: 0.3, borderRadius: '20px',
            background: `${statusColor}15`, border: `1px solid ${statusColor}40`,
            fontSize: '11px', fontWeight: 700, color: statusColor, letterSpacing: '0.3px',
            display: 'flex', alignItems: 'center', gap: 0.5 }}>
            {isLive && <Box sx={{ width: 6, height: 6, borderRadius: '50%', bgcolor: statusColor, animation: 'pulse 1.2s infinite' }} />}
            {data.status}
          </Box>
        </Box>

        <Box sx={{ display: 'grid', gridTemplateColumns: '1fr auto 1fr', alignItems: 'center', gap: 3 }}>
          <TeamSummary
            name={data.teamAName}
            shortName={data.teamAShortName}
            logo={data.teamALogoUrl}
            innings={sortedInnings.find(i => i.battingTeamId === data.teamAId) || null}
            align="right"
          />
          <Box sx={{ px: 2, py: 0.85, borderRadius: '20px', background: '#f1f5f9',
            fontSize: '12px', fontWeight: 700, color: '#64748b' }}>VS</Box>
          <TeamSummary
            name={data.teamBName}
            shortName={data.teamBShortName}
            logo={data.teamBLogoUrl}
            innings={sortedInnings.find(i => i.battingTeamId === data.teamBId) || null}
            align="left"
          />
        </Box>

        {data.resultText && (
          <Typography sx={{ mt: 2.5, textAlign: 'center', fontSize: '14px', fontWeight: 700,
            color: data.status === 'COMPLETED' ? '#16a34a' : '#475569' }}>
            {data.resultText}
          </Typography>
        )}
        {data.venue && (
          <Typography sx={{ mt: 0.5, textAlign: 'center', fontSize: '12px', color: '#94a3b8' }}>
            {data.venue}
          </Typography>
        )}
      </Box>

      {/* Innings tabs */}
      {sortedInnings.length === 0 ? (
        <Box sx={{ textAlign: 'center', py: 6, color: '#64748b',
          background: '#fff', border: '1px dashed #e2e8f0', borderRadius: '14px' }}>
          <SportsCricketIcon sx={{ fontSize: 36, color: '#cbd5e1', mb: 0.75 }} />
          <Typography sx={{ fontSize: '13px' }}>No scorecard available yet</Typography>
        </Box>
      ) : (
        <>
          <Box sx={{
            display: 'flex', gap: 0.5, background: '#f1f5f9', border: '1px solid #e2e8f0',
            borderRadius: '12px', p: 0.6, mb: 2.5, flexWrap: 'wrap', maxWidth: 'fit-content',
          }}>
            {sortedInnings.map((i, idx) => {
              const active = tab === idx;
              return (
                <Box key={i.id} onClick={() => setTab(idx)}
                  sx={{
                    px: 2, py: 0.85, borderRadius: '9px', cursor: 'pointer',
                    fontSize: '13px', fontWeight: 700, transition: 'all 0.2s',
                    ...(active
                      ? { background: 'rgba(96,165,250,0.18)', border: '1px solid rgba(96,165,250,0.4)',
                          color: '#1d4ed8' }
                      : { color: '#64748b', border: '1px solid transparent',
                          '&:hover': { color: '#475569', background: '#e2e8f0' } }),
                  }}>
                  Innings {i.inningsNumber} · {i.battingTeamShortName || i.battingTeamName}
                </Box>
              );
            })}
          </Box>

          {sortedInnings[tab] && <InningsBlock innings={sortedInnings[tab]} />}
        </>
      )}
    </Box>
  );
}

function TeamSummary({ name, shortName, logo, innings, align }: {
  name: string; shortName?: string; logo?: string; innings: InningsDetail | null; align: 'left' | 'right';
}) {
  return (
    <Box sx={{ display: 'flex', flexDirection: 'column', alignItems: align === 'right' ? 'flex-end' : 'flex-start' }}>
      <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.25, mb: 0.5,
        flexDirection: align === 'right' ? 'row-reverse' : 'row' }}>
        <Box sx={{
          width: 44, height: 44, borderRadius: '12px',
          background: logo ? 'transparent' : 'linear-gradient(135deg, #60a5fa, #3b82f6)',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          color: '#fff', fontWeight: 800, fontSize: '14px', overflow: 'hidden',
          boxShadow: logo ? 'none' : '0 4px 12px rgba(96,165,250,0.3)',
        }}>
          {logo ? <img src={logo} alt={name} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
            : (shortName || name.substring(0, 3).toUpperCase())}
        </Box>
        <Box sx={{ textAlign: align }}>
          <Typography sx={{ fontSize: '15px', fontWeight: 700, color: '#1e293b', lineHeight: 1.2 }}>{name}</Typography>
          {shortName && (
            <Typography sx={{ fontSize: '11px', color: '#94a3b8', fontFamily: 'monospace' }}>{shortName}</Typography>
          )}
        </Box>
      </Box>
      {innings ? (
        <Box sx={{ textAlign: align }}>
          <Typography sx={{ fontSize: '24px', fontWeight: 800, color: '#0891b2', lineHeight: 1 }}>
            {innings.totalRuns}/{innings.wickets}
          </Typography>
          <Typography sx={{ fontSize: '11px', color: '#64748b', mt: 0.25 }}>
            {innings.overs ? `(${String(innings.overs).replace(/\.0$/, '')} ov)` : ''}
            {innings.extras ? ` · ${innings.extras} ext` : ''}
          </Typography>
        </Box>
      ) : (
        <Typography sx={{ fontSize: '13px', color: '#94a3b8', fontStyle: 'italic' }}>
          Yet to bat
        </Typography>
      )}
    </Box>
  );
}

function InningsBlock({ innings }: { innings: InningsDetail }) {
  return (
    <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2.5 }}>
      {/* Batting card */}
      <Box sx={{ background: '#fff', border: '1px solid #e2e8f0', borderRadius: '16px', overflow: 'hidden' }}>
        <Box sx={{ px: 2.5, py: 1.5, background: '#f8fafc', borderBottom: '1px solid #e2e8f0',
          display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <Typography sx={{ fontSize: '13px', fontWeight: 700, color: '#1e293b' }}>
            {innings.battingTeamName} batting
          </Typography>
          <Typography sx={{ fontSize: '13px', fontWeight: 700, color: '#0891b2' }}>
            {innings.totalRuns}/{innings.wickets}
            {innings.overs ? ` (${String(innings.overs).replace(/\.0$/, '')})` : ''}
          </Typography>
        </Box>
        <Box sx={{ display: 'grid', gridTemplateColumns: '2fr 60px 60px 50px 50px 70px',
          px: 2.5, py: 1.25, background: '#fafbfc', borderBottom: '1px solid #f1f5f9',
          fontSize: '10px', fontWeight: 700, color: '#475569', textTransform: 'uppercase', letterSpacing: '0.8px' }}>
          <Box>Batter</Box><Box>R</Box><Box>B</Box><Box>4s</Box><Box>6s</Box><Box sx={{ textAlign: 'right' }}>SR</Box>
        </Box>
        {innings.batting.length === 0 ? (
          <Box sx={{ textAlign: 'center', py: 4, color: '#94a3b8', fontSize: '13px' }}>No batting data</Box>
        ) : (
          innings.batting.map((b, i) => (
            <Box key={b.playerId + '-' + i} sx={{ px: 2.5, py: 1.5,
              borderBottom: i < innings.batting.length - 1 ? '1px solid #f1f5f9' : 'none' }}>
              <Box sx={{ display: 'grid', gridTemplateColumns: '2fr 60px 60px 50px 50px 70px', alignItems: 'center' }}>
                <Box>
                  <Typography sx={{ fontSize: '13px', fontWeight: 600, color: '#1e293b' }}>{b.playerName}</Typography>
                  {b.dismissalText && (
                    <Typography sx={{ fontSize: '11px', color: '#94a3b8', mt: 0.25 }}>{b.dismissalText}</Typography>
                  )}
                </Box>
                <Typography sx={{ fontSize: '13px', fontWeight: 700, color: '#1d4ed8' }}>{b.runs ?? 0}</Typography>
                <Typography sx={{ fontSize: '13px', color: '#475569' }}>{b.balls ?? 0}</Typography>
                <Typography sx={{ fontSize: '13px', color: '#475569' }}>{b.fours ?? 0}</Typography>
                <Typography sx={{ fontSize: '13px', color: '#475569' }}>{b.sixes ?? 0}</Typography>
                <Typography sx={{ fontSize: '13px', color: '#475569', textAlign: 'right' }}>
                  {b.strikeRate != null ? Number(b.strikeRate).toFixed(2) : '—'}
                </Typography>
              </Box>
            </Box>
          ))
        )}
      </Box>

      {/* Bowling card */}
      <Box sx={{ background: '#fff', border: '1px solid #e2e8f0', borderRadius: '16px', overflow: 'hidden' }}>
        <Box sx={{ px: 2.5, py: 1.5, background: '#f8fafc', borderBottom: '1px solid #e2e8f0' }}>
          <Typography sx={{ fontSize: '13px', fontWeight: 700, color: '#1e293b' }}>
            {innings.bowlingTeamName} bowling
          </Typography>
        </Box>
        <Box sx={{ display: 'grid', gridTemplateColumns: '2fr 60px 50px 60px 50px 70px',
          px: 2.5, py: 1.25, background: '#fafbfc', borderBottom: '1px solid #f1f5f9',
          fontSize: '10px', fontWeight: 700, color: '#475569', textTransform: 'uppercase', letterSpacing: '0.8px' }}>
          <Box>Bowler</Box><Box>O</Box><Box>M</Box><Box>R</Box><Box>W</Box><Box sx={{ textAlign: 'right' }}>Eco</Box>
        </Box>
        {innings.bowling.length === 0 ? (
          <Box sx={{ textAlign: 'center', py: 4, color: '#94a3b8', fontSize: '13px' }}>No bowling data</Box>
        ) : (
          innings.bowling.map((b, i) => (
            <Box key={b.playerId + '-' + i} sx={{
              display: 'grid', gridTemplateColumns: '2fr 60px 50px 60px 50px 70px',
              px: 2.5, py: 1.5, alignItems: 'center',
              borderBottom: i < innings.bowling.length - 1 ? '1px solid #f1f5f9' : 'none' }}>
              <Typography sx={{ fontSize: '13px', fontWeight: 600, color: '#1e293b' }}>{b.playerName}</Typography>
              <Typography sx={{ fontSize: '13px', color: '#475569' }}>
                {b.overs != null ? String(b.overs).replace(/\.0$/, '') : '—'}
              </Typography>
              <Typography sx={{ fontSize: '13px', color: '#475569' }}>{b.maidens ?? 0}</Typography>
              <Typography sx={{ fontSize: '13px', color: '#475569' }}>{b.runs ?? 0}</Typography>
              <Typography sx={{ fontSize: '13px', fontWeight: 700, color: '#dc2626' }}>{b.wickets ?? 0}</Typography>
              <Typography sx={{ fontSize: '13px', color: '#475569', textAlign: 'right' }}>
                {b.economy != null ? Number(b.economy).toFixed(2) : '—'}
              </Typography>
            </Box>
          ))
        )}
      </Box>
    </Box>
  );
}
