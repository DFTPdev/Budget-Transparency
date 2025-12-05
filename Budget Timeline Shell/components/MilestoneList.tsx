import type { Milestone } from 'src/lib/hooks/useTimeline';

import Box from '@mui/material/Box';
import List from '@mui/material/List';
import ListItem from '@mui/material/ListItem';
import Typography from '@mui/material/Typography';
import ListItemText from '@mui/material/ListItemText';
import { alpha, useTheme } from '@mui/material/styles';

interface MilestoneListProps {
  milestones: Milestone[];
  onMilestoneHover?: (milestoneDate?: string) => void;
}

export function MilestoneList({ milestones, onMilestoneHover }: MilestoneListProps) {
  const theme = useTheme();
  const sortedMilestones = [...milestones].sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());

  if (sortedMilestones.length === 0) {
    return (
      <Box sx={{ py: 3, textAlign: 'center' }}>
        <Typography color="text.secondary">No milestones for this stage</Typography>
      </Box>
    );
  }

  return (
    <List
      sx={{
        width: '100%',
        bgcolor: 'background.paper',
        borderRadius: 1,
        border: '1px solid',
        borderColor: 'divider',
      }}
    >
      {sortedMilestones.map((milestone, index) => (
        <ListItem
          key={`${milestone.date}-${index}`}
          onMouseEnter={() => onMilestoneHover?.(milestone.date)}
          onMouseLeave={() => onMilestoneHover?.()}
          onFocus={() => onMilestoneHover?.(milestone.date)}
          onBlur={() => onMilestoneHover?.()}
          tabIndex={0}
          sx={{
            py: 2,
            px: 2,
            borderBottom: index < sortedMilestones.length - 1 ? '1px solid' : 'none',
            borderColor: 'divider',
            transition: 'all 0.2s ease',
            bgcolor: 'transparent',
            '&:hover': {
              bgcolor: alpha(theme.palette.primary.main, 0.05),
            },
            '&:focus': {
              outline: '2px solid',
              outlineColor: 'primary.main',
              outlineOffset: -2,
            },
          }}
          role="listitem"
          aria-label={`${milestone.title} on ${new Date(milestone.date).toLocaleDateString()}`}
        >
          <ListItemText
            primary={
              <Box sx={{ display: 'flex', gap: 2, alignItems: 'flex-start' }}>
                <Typography
                  variant="caption"
                  sx={{
                    minWidth: 100,
                    fontWeight: 600,
                    color: 'primary.main',
                  }}
                >
                  {new Date(milestone.date).toLocaleDateString('en-US', {
                    month: 'short',
                    day: 'numeric',
                    year: 'numeric',
                  })}
                </Typography>
                <Typography variant="subtitle2" sx={{ flex: 1 }}>
                  {milestone.title}
                </Typography>
              </Box>
            }
            secondary={
              <Typography variant="body2" color="text.secondary" sx={{ mt: 0.5, ml: 12 }}>
                {milestone.why}
              </Typography>
            }
          />
        </ListItem>
      ))}
    </List>
  );
}

