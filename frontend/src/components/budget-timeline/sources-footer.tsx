import type { Source } from 'src/lib/hooks/useTimeline';

import Box from '@mui/material/Box';
import Link from '@mui/material/Link';
import Typography from '@mui/material/Typography';
import { alpha, useTheme } from '@mui/material/styles';

interface SourcesFooterProps {
  sources: Source[];
  lastRefreshed: string;
}

export function SourcesFooter({ sources, lastRefreshed }: SourcesFooterProps) {
  const theme = useTheme();
  const refreshDate = new Date(lastRefreshed);
  const formattedDate = refreshDate.toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });

  return (
    <Box
      sx={{
        py: 3,
        px: 2,
        bgcolor: alpha(theme.palette.background.default, 0.5),
        borderRadius: 1,
        border: '1px solid',
        borderColor: 'divider',
        mt: 4,
      }}
    >
      <Typography variant="caption" color="text.secondary" display="block" gutterBottom>
        <strong>Sources:</strong>
      </Typography>
      <Box sx={{ display: 'flex', gap: 2, flexWrap: 'wrap', mb: 2 }}>
        {sources.map((source, index) => (
          <Link
            key={index}
            href={source.url}
            target="_blank"
            rel="noopener noreferrer"
            variant="caption"
            sx={{
              color: 'primary.main',
              textDecoration: 'none',
              '&:hover': {
                textDecoration: 'underline',
              },
            }}
          >
            {source.label}
          </Link>
        ))}
      </Box>
      <Typography variant="caption" color="text.secondary">
        Last refreshed: {formattedDate}
      </Typography>
    </Box>
  );
}

