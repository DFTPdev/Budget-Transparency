import type { CardProps } from '@mui/material/Card';
import type { ChartOptions } from 'src/components/chart';
import type { AgencyBudgetData } from 'src/lib/hooks/useBudgetData';

import Card from '@mui/material/Card';
import { useTheme } from '@mui/material/styles';
import CardHeader from '@mui/material/CardHeader';

import { fCurrency, fShortenNumber } from 'src/utils/format-number';

import { Chart, useChart } from 'src/components/chart';

// ----------------------------------------------------------------------

type Props = CardProps & {
  title?: string;
  subheader?: string;
  data: AgencyBudgetData[];
};

export function TopAgenciesBar({ title, subheader, data, sx, ...other }: Props) {
  const theme = useTheme();

  // Take top 10 agencies
  const topAgencies = data.slice(0, 10);

  const chartOptions = useChart({
    colors: [theme.palette.primary.main],
    xaxis: {
      categories: topAgencies.map((item) => item.agency),
      labels: {
        style: {
          fontSize: '11px',
        },
        rotate: -45,
        rotateAlways: true,
        hideOverlappingLabels: false,
        trim: true,
        maxHeight: 120,
      },
    },
    yaxis: {
      labels: {
        formatter: (value: number) => fShortenNumber(value),
      },
    },
    tooltip: {
      y: {
        formatter: (value: number) => fCurrency(value),
        title: {
          formatter: () => 'Total Budget: ',
        },
      },
    },
    plotOptions: {
      bar: {
        borderRadius: 4,
        columnWidth: '60%',
        distributed: false,
        dataLabels: {
          position: 'top',
        },
      },
    },
    dataLabels: {
      enabled: false,
    },
  } as ChartOptions);

  const chartSeries = [
    {
      name: 'Budget Amount',
      data: topAgencies.map((item) => item.total_amount),
    },
  ];

  return (
    <Card sx={sx} {...other}>
      <CardHeader
        title={title || 'Top Agencies by Budget'}
        subheader={subheader || 'Largest budget allocations by agency'}
        sx={{ mb: 3 }}
      />

      <Chart
        type="bar"
        series={chartSeries}
        options={chartOptions}
        slotProps={{ loading: { p: 2.5 } }}
        sx={{
          pl: 1,
          py: 2.5,
          pr: 2.5,
          height: 400,
        }}
      />
    </Card>
  );
}

