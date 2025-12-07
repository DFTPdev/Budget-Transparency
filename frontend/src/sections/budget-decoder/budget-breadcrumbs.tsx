/**
 * Budget Breadcrumbs Component
 * Shows current drill-down path and allows navigation back up the hierarchy
 */

import React from 'react';
import Box from '@mui/material/Box';
import Breadcrumbs from '@mui/material/Breadcrumbs';
import Link from '@mui/material/Link';
import Typography from '@mui/material/Typography';
import NavigateNextIcon from '@mui/icons-material/NavigateNext';
import HomeIcon from '@mui/icons-material/Home';
import AccountBalanceIcon from '@mui/icons-material/AccountBalance';
import BusinessIcon from '@mui/icons-material/Business';
import FolderIcon from '@mui/icons-material/Folder';

import type { DrillDownPath } from 'src/lib/budgetDrillDown';
import { STORY_BUCKET_LABELS } from 'src/data/spendingStoryBuckets';

// ----------------------------------------------------------------------

type Props = {
  path: DrillDownPath;
  onNavigate: (path: DrillDownPath) => void;
};

export function BudgetBreadcrumbs({ path, onNavigate }: Props) {
  const breadcrumbs: Array<{ label: string; path: DrillDownPath; icon: React.ReactNode }> = [];

  // Always start with Categories
  breadcrumbs.push({
    label: 'Categories',
    path: { level: 'category' },
    icon: <HomeIcon sx={{ fontSize: 18, mr: 0.5 }} />,
  });

  // Add Category if viewing details
  if (path.storyBucketId && path.level === 'detail') {
    breadcrumbs.push({
      label: STORY_BUCKET_LABELS[path.storyBucketId],
      path: { level: 'detail', storyBucketId: path.storyBucketId },
      icon: <FolderIcon sx={{ fontSize: 18, mr: 0.5 }} />,
    });
  }

  return (
    <Breadcrumbs
      separator={<NavigateNextIcon fontSize="small" sx={{ color: 'text.primary' }} />}
      aria-label="budget navigation breadcrumb"
    >
      {breadcrumbs.map((crumb, index) => {
        const isLast = index === breadcrumbs.length - 1;

        if (isLast) {
          return (
            <Box
              key={index}
              sx={{
                display: 'flex',
                alignItems: 'center',
                color: 'text.primary',
                fontWeight: 600,
              }}
            >
              {crumb.icon}
              <Typography variant="body2" sx={{ fontWeight: 600, color: 'text.primary' }}>
                {crumb.label}
              </Typography>
            </Box>
          );
        }

        return (
          <Link
            key={index}
            component="button"
            variant="body2"
            onClick={() => onNavigate(crumb.path)}
            sx={{
              display: 'flex',
              alignItems: 'center',
              color: 'text.primary',
              textDecoration: 'none',
              cursor: 'pointer',
              '&:hover': {
                color: 'primary.main',
                textDecoration: 'underline',
              },
            }}
          >
            {crumb.icon}
            {crumb.label}
          </Link>
        );
      })}
    </Breadcrumbs>
  );
}

