import type { Stage } from 'src/lib/hooks/useTimeline';

import Box from '@mui/material/Box';
import Chip from '@mui/material/Chip';

interface StageChipsProps {
  stages: Stage[];
  selectedStageId?: string;
  onStageSelect: (stageId: string) => void;
}

export function StageChips({ stages, selectedStageId, onStageSelect }: StageChipsProps) {
  return (
    <Box
      sx={{
        display: 'flex',
        gap: 1,
        flexWrap: 'wrap',
        mb: 3,
      }}
      role="group"
      aria-label="Budget stages"
    >
      {stages.map((stage) => (
        <Chip
          key={stage.id}
          label={stage.label}
          onClick={() => onStageSelect(stage.id)}
          variant={selectedStageId === stage.id ? 'filled' : 'outlined'}
          color={selectedStageId === stage.id ? 'primary' : 'default'}
          sx={{
            cursor: 'pointer',
            transition: 'all 0.2s ease',
            '&:hover': {
              bgcolor: selectedStageId === stage.id ? 'primary.dark' : 'action.hover',
            },
          }}
          aria-pressed={selectedStageId === stage.id}
          aria-label={`${stage.label} stage`}
        />
      ))}
    </Box>
  );
}

