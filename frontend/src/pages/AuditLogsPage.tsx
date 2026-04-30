import { useState, useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Box, Typography, CircularProgress, Alert } from '@mui/material';
import SecurityIcon from '@mui/icons-material/Security';
import ChevronLeftIcon from '@mui/icons-material/ChevronLeft';
import ChevronRightIcon from '@mui/icons-material/ChevronRight';
import { getAuditLogs } from '../api/audit';
import type { AuditLog } from '../api/audit';
import type { PageResponse } from '../types';

const PAGE_SIZE = 25;

const ENTITY_TYPES: { label: string; value: string }[] = [
  { label: 'All', value: '' },
  { label: 'Auction', value: 'AUCTION' },
  { label: 'League', value: 'LEAGUE' },
  { label: 'Team', value: 'TEAM' },
  { label: 'Player', value: 'PLAYER' },
  { label: 'User', value: 'USER' },
];

function actionColor(action: string): string {
  if (action.includes('SOLD') && !action.includes('UNSOLD')) return '#4ade80';
  if (action.includes('UNSOLD')) return '#ef4444';
  if (action.includes('UNDONE')) return '#fbbf24';
  if (action.includes('PAUSED')) return '#94a3b8';
  if (action.includes('RESUMED')) return '#60a5fa';
  if (action.includes('STARTED') || action.includes('LIVE') || action.includes('COMPLETED')) return '#a78bfa';
  if (action.includes('BID')) return '#f59e0b';
  return '#475569';
}

function fmtTime(iso: string): string {
  const d = new Date(iso);
  const now = new Date();
  const diffMs = now.getTime() - d.getTime();
  const diffSec = Math.floor(diffMs / 1000);
  if (diffSec < 60) return `${diffSec}s ago`;
  if (diffSec < 3600) return `${Math.floor(diffSec / 60)}m ago`;
  if (diffSec < 86400) return `${Math.floor(diffSec / 3600)}h ago`;
  return d.toLocaleString();
}

function fmtDetails(details?: Record<string, unknown>): string {
  if (!details || Object.keys(details).length === 0) return '—';
  return Object.entries(details)
    .filter(([k]) => !['auctionId'].includes(k))
    .map(([k, v]) => {
      if (typeof v === 'object' && v !== null) return `${k}=${JSON.stringify(v)}`;
      return `${k}=${v}`;
    })
    .join(' · ');
}

function FilterPills({
  value, onChange,
}: { value: string; onChange: (v: string) => void }) {
  return (
    <Box
      sx={{
        display: 'flex',
        background: 'rgba(255,255,255,0.92)',
        border: '1px solid #e2e8f0',
        borderRadius: '14px',
        p: 0.5,
        gap: 0.4,
        flexWrap: 'wrap',
      }}
    >
      {ENTITY_TYPES.map(opt => {
        const active = value === opt.value;
        return (
          <Box
            key={opt.value || 'all'}
            onClick={() => onChange(opt.value)}
            sx={{
              px: 2,
              py: 0.9,
              borderRadius: '10px',
              cursor: 'pointer',
              fontSize: '13px',
              fontWeight: 700,
              userSelect: 'none',
              transition: 'all 0.2s ease',
              ...(active
                ? {
                    background: 'linear-gradient(135deg, rgba(167,139,250,0.25), rgba(139,92,246,0.12))',
                    border: '1px solid rgba(167,139,250,0.45)',
                    color: '#6d28d9',
                  }
                : {
                    color: '#64748b',
                    border: '1px solid transparent',
                    '&:hover': { color: '#94a3b8', background: '#f8fafc' },
                  }),
            }}
          >
            {opt.label}
          </Box>
        );
      })}
    </Box>
  );
}

export default function AuditLogsPage() {
  const [page, setPage] = useState(0);
  const [entityType, setEntityType] = useState<string>('');

  const { data, isLoading, error } = useQuery<PageResponse<AuditLog>>({
    queryKey: ['audit-logs', page, PAGE_SIZE, entityType],
    queryFn: () => getAuditLogs({
      page,
      size: PAGE_SIZE,
      ...(entityType ? { entityType } : {}),
    }),
    placeholderData: prev => prev,
  });

  const logs = data?.content ?? [];
  const totalElements = data?.totalElements ?? 0;
  const totalPages = data?.totalPages ?? 0;

  const start = totalElements === 0 ? 0 : page * PAGE_SIZE + 1;
  const end = Math.min((page + 1) * PAGE_SIZE, totalElements);

  const handleEntityChange = useMemo(
    () => (v: string) => { setEntityType(v); setPage(0); },
    [],
  );

  return (
    <Box sx={{ animation: 'fadeIn 0.45s ease', '@keyframes fadeIn': { from: { opacity: 0 }, to: { opacity: 1 } } }}>
      <Box sx={{ mb: 4, pb: 3, borderBottom: '1px solid #eef2f7' }}>
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5, mb: 0.75 }}>
          <Typography
            variant="h3"
            sx={{
              fontWeight: 900,
              background: 'linear-gradient(135deg, #a78bfa 0%, #818cf8 60%, #60a5fa 100%)',
              WebkitBackgroundClip: 'text',
              WebkitTextFillColor: 'transparent',
              backgroundClip: 'text',
              letterSpacing: '-1px',
              lineHeight: 1,
            }}
          >
            Audit Logs
          </Typography>
          <Box
            sx={{
              px: 1.5, py: 0.5, borderRadius: '10px',
              background: 'rgba(167,139,250,0.12)',
              border: '1px solid rgba(167,139,250,0.28)',
              fontSize: '11px', fontWeight: 800, color: '#6d28d9',
              letterSpacing: '0.8px', alignSelf: 'center',
              display: 'flex', alignItems: 'center', gap: 0.5,
            }}
          >
            <SecurityIcon sx={{ fontSize: 13 }} />
            ACTIVITY
          </Box>
        </Box>
        <Typography sx={{ color: '#64748b', fontSize: '14px', fontWeight: 500 }}>
          Every auction action with timestamp, actor, and details
        </Typography>
      </Box>

      <Box sx={{ display: 'flex', gap: 2, mb: 3, alignItems: 'center', flexWrap: 'wrap' }}>
        <FilterPills value={entityType} onChange={handleEntityChange} />
        <Box sx={{ ml: 'auto' }}>
          <Box
            sx={{
              px: 1.75, py: 0.75, borderRadius: '12px',
              background: 'rgba(167,139,250,0.1)',
              border: '1px solid rgba(167,139,250,0.28)',
            }}
          >
            <Typography sx={{ fontSize: '11px', fontWeight: 800, color: '#6d28d9', letterSpacing: '1px' }}>
              {totalElements} ENTRIES
            </Typography>
          </Box>
        </Box>
      </Box>

      {error && (
        <Alert severity="error" sx={{ borderRadius: '12px' }}>Failed to load audit logs</Alert>
      )}

      {isLoading && !data && (
        <Box sx={{ display: 'flex', justifyContent: 'center', py: 10 }}>
          <CircularProgress sx={{ color: '#6d28d9' }} size={36} />
        </Box>
      )}

      {data && (
        <>
          <Box
            sx={{
              background: 'rgba(255,255,255,0.92)',
              backdropFilter: 'blur(10px)',
              border: '1px solid #eef2f7',
              borderRadius: '16px',
              overflow: 'hidden',
            }}
          >
            <Box
              sx={{
                display: 'grid',
                gridTemplateColumns: '110px 200px 110px 1fr 110px',
                px: 2.5, py: 1.4,
                background: '#f8fafc',
                borderBottom: '1px solid #e2e8f0',
              }}
            >
              {['When', 'Action', 'Entity', 'Details', 'User'].map(c => (
                <Typography
                  key={c}
                  sx={{ fontSize: '10px', fontWeight: 800, color: '#475569', letterSpacing: '1px', textTransform: 'uppercase' }}
                >
                  {c}
                </Typography>
              ))}
            </Box>

            {logs.length === 0 ? (
              <Box sx={{ textAlign: 'center', py: 8, color: '#475569' }}>
                <SecurityIcon sx={{ fontSize: 44, mb: 1.5, opacity: 0.25 }} />
                <Typography sx={{ fontSize: '15px', fontWeight: 600 }}>No audit entries yet</Typography>
              </Box>
            ) : (
              logs.map((l, i) => (
                <Box
                  key={l.id}
                  sx={{
                    display: 'grid',
                    gridTemplateColumns: '110px 200px 110px 1fr 110px',
                    px: 2.5, py: 1.3, alignItems: 'center',
                    borderBottom: '1px solid #eef2f7',
                    background: i % 2 === 0 ? 'rgba(248,250,252,0.6)' : 'transparent',
                    '&:last-child': { borderBottom: 'none' },
                  }}
                >
                  <Typography sx={{ fontSize: '12px', color: '#64748b', fontWeight: 500 }} title={l.createdAt}>
                    {fmtTime(l.createdAt)}
                  </Typography>
                  <Box>
                    <Box
                      sx={{
                        display: 'inline-block',
                        px: 1.2, py: 0.4,
                        borderRadius: '6px',
                        fontSize: '11px',
                        fontWeight: 800,
                        letterSpacing: '0.4px',
                        color: actionColor(l.action),
                        background: `${actionColor(l.action)}14`,
                        border: `1px solid ${actionColor(l.action)}40`,
                      }}
                    >
                      {l.action}
                    </Box>
                  </Box>
                  <Typography sx={{ fontSize: '12px', color: '#94a3b8', fontWeight: 600 }}>
                    {l.entityType ? `${l.entityType}${l.entityId ? '#' + l.entityId : ''}` : '—'}
                  </Typography>
                  <Typography sx={{ fontSize: '12px', color: '#94a3b8' }} title={JSON.stringify(l.details ?? {})}>
                    {fmtDetails(l.details)}
                  </Typography>
                  <Typography sx={{ fontSize: '12px', color: '#475569', fontWeight: 600 }}>
                    {l.username ?? (l.userId ? `#${l.userId}` : 'system')}
                  </Typography>
                </Box>
              ))
            )}
          </Box>

          {/* Pagination */}
          <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', mt: 2.5, gap: 2, flexWrap: 'wrap' }}>
            <Typography sx={{ fontSize: '13px', color: '#475569', fontWeight: 500 }}>
              {totalElements === 0
                ? 'No entries'
                : `Showing ${start}–${end} of ${totalElements}`}
            </Typography>
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5 }}>
              <Box
                onClick={page === 0 ? undefined : () => setPage(p => Math.max(0, p - 1))}
                sx={{
                  display: 'flex', alignItems: 'center', gap: 0.5,
                  px: 2, py: 1, borderRadius: '10px',
                  border: '1px solid #e2e8f0',
                  background: 'rgba(255,255,255,0.92)',
                  cursor: page === 0 ? 'not-allowed' : 'pointer',
                  opacity: page === 0 ? 0.45 : 1,
                  color: '#94a3b8',
                  fontSize: '13px',
                  fontWeight: 700,
                  userSelect: 'none',
                  '&:hover': page === 0 ? {} : { background: '#eef2f7', color: '#eef2f7' },
                }}
              >
                <ChevronLeftIcon sx={{ fontSize: 16 }} />
                Prev
              </Box>
              <Box
                sx={{
                  px: 2, py: 1, borderRadius: '10px',
                  background: 'linear-gradient(135deg, rgba(167,139,250,0.2), rgba(139,92,246,0.1))',
                  border: '1px solid rgba(167,139,250,0.4)',
                  fontSize: '13px', fontWeight: 800, color: '#6d28d9',
                }}
              >
                Page {page + 1} of {Math.max(totalPages, 1)}
              </Box>
              <Box
                onClick={page >= totalPages - 1 ? undefined : () => setPage(p => Math.min(totalPages - 1, p + 1))}
                sx={{
                  display: 'flex', alignItems: 'center', gap: 0.5,
                  px: 2, py: 1, borderRadius: '10px',
                  border: '1px solid #e2e8f0',
                  background: 'rgba(255,255,255,0.92)',
                  cursor: page >= totalPages - 1 ? 'not-allowed' : 'pointer',
                  opacity: page >= totalPages - 1 ? 0.45 : 1,
                  color: '#94a3b8',
                  fontSize: '13px',
                  fontWeight: 700,
                  userSelect: 'none',
                  '&:hover': page >= totalPages - 1 ? {} : { background: '#eef2f7', color: '#eef2f7' },
                }}
              >
                Next
                <ChevronRightIcon sx={{ fontSize: 16 }} />
              </Box>
            </Box>
          </Box>
        </>
      )}
    </Box>
  );
}
