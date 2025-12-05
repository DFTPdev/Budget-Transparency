import type { Stage } from 'src/lib/hooks/useTimeline';

import { useMemo } from 'react';

import Box from '@mui/material/Box';
import Tooltip from '@mui/material/Tooltip';
import Typography from '@mui/material/Typography';
import { alpha, useTheme } from '@mui/material/styles';

interface TimelineAxisProps {
  stages: Stage[];
  startDate: string;
  endDate: string;
  highlightedStageId?: string;
}

export function TimelineAxis({
  stages,
  startDate,
  endDate,
  highlightedStageId,
}: TimelineAxisProps) {
  const theme = useTheme();
  const start = new Date(startDate);
  const end = new Date(endDate);
  const totalDays = Math.ceil((end.getTime() - start.getTime()) / (1000 * 60 * 60 * 24));

  const getPositionPercent = (dateStr: string): number => {
    const date = new Date(dateStr);
    const daysSinceStart = Math.ceil((date.getTime() - start.getTime()) / (1000 * 60 * 60 * 24));
    return (daysSinceStart / totalDays) * 100;
  };

  const stageElements = useMemo(
    () =>
      stages.map((stage) => {
        const startPercent = getPositionPercent(stage.window.start);
        const endPercent = getPositionPercent(stage.window.end);
        const width = endPercent - startPercent;
        const isHighlighted = stage.id === highlightedStageId;

        return (
          <Tooltip
            key={stage.id}
            title={
              <Box>
                <Typography variant="subtitle2">{stage.label}</Typography>
                <Typography variant="caption">
                  {new Date(stage.window.start).toLocaleDateString()} –{' '}
                  {new Date(stage.window.end).toLocaleDateString()}
                </Typography>
                <Typography variant="caption" sx={{ display: 'block', mt: 0.5 }}>
                  {stage.explainer}
                </Typography>
              </Box>
            }
          >
            <Box
              sx={{
                position: 'absolute',
                left: `${startPercent}%`,
                width: `${width}%`,
                height: '100%',
                bgcolor: isHighlighted ? 'primary.main' : alpha(theme.palette.primary.main, 0.3),
                border: isHighlighted ? '2px solid' : '1px solid',
                borderColor: isHighlighted ? 'primary.dark' : 'divider',
                transition: 'all 0.3s ease',
                cursor: 'pointer',
                '&:hover': {
                  bgcolor: isHighlighted ? 'primary.dark' : alpha(theme.palette.primary.main, 0.5),
                  borderColor: 'primary.main',
                },
              }}
              role="presentation"
              aria-label={`${stage.label}: ${stage.window.start} to ${stage.window.end}`}
            />
          </Tooltip>
        );
      }),
    [stages, highlightedStageId, theme.palette.primary.main, getPositionPercent]
  );

  return (
    <Box
      sx={{
        position: 'relative',
        width: '100%',
        height: 60,
        bgcolor: 'background.paper',
        border: '1px solid',
        borderColor: 'divider',
        borderRadius: 1,
        overflow: 'hidden',
      }}
    >
      {/* Background grid */}
      <Box
        sx={{
          position: 'absolute',
          width: '100%',
          height: '100%',
          display: 'flex',
          '& > div': {
            flex: 1,
            borderRight: '1px solid',
            borderColor: alpha(theme.palette.divider, 0.2),
            '&:last-child': {
              borderRight: 'none',
            },
          },
        }}
      >
        {Array.from({ length: 12 }).map((_, i) => (
          <div key={i} />
        ))}
      </Box>

      {/* Stage bars */}
      {stageElements}

      {/* Labels */}
      <Box
        sx={{
          position: 'absolute',
          bottom: -24,
          left: 0,
          right: 0,
          display: 'flex',
          justifyContent: 'space-between',
          px: 1,
          fontSize: '0.75rem',
          color: 'text.secondary',
        }}
      >
        <span>{new Date(startDate).toLocaleDateString()}</span>
        <span>{new Date(endDate).toLocaleDateString()}</span>
      </Box>
    </Box>
  );
}

