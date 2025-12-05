import type { CardProps } from '@mui/material/Card';
import type { ChartOptions } from 'src/components/chart';
import type { HacDashboardData } from 'src/data/hacDashboardData';

import Card from '@mui/material/Card';
import { useTheme } from '@mui/material/styles';
import CardHeader from '@mui/material/CardHeader';

import { fCurrency } from 'src/utils/format-number';

import { Chart, useChart, ChartLegends } from 'src/components/chart';

// ----------------------------------------------------------------------

type Props = CardProps & {
  title?: string;
  subheader?: string;
  data: HacDashboardData;
};

export function OperatingStackedGFNGF({ title, subheader, data, sx, ...other }: Props) {
  const theme = useTheme();

  const chartColors = [
    theme.palette.primary.main,
    theme.palette.warning.main,
  ];

  // Calculate NGF from total - GF
  const introducedNGF = data.introduced.totalAllFunds - data.introduced.gfResources;
  const finalNGF = data.final.totalAllFunds - data.final.gfResources;

  const chartOptions = useChart({
    chart: {
      stacked: true,
      toolbar: {
        show: true,
      },
    },
    colors: chartColors,
    xaxis: {
      categories: ['Introduced Budget', 'Final Budget'],
    },
    yaxis: {
      labels: {
        formatter: (value: number) => `$${value.toFixed(1)}B`,
      },
    },
    tooltip: {
      y: {
        formatter: (value: number) => `$${value.toFixed(2)} Billion`,
      },
    },
    plotOptions: {
      bar: {
        borderRadius: 4,
        columnWidth: '50%',
      },
    },
    dataLabels: {
      enabled: true,
      formatter: (value: number) => `$${value.toFixed(1)}B`,
      style: {
        fontSize: '11px',
        fontWeight: 600,
      },
    },
    legend: {
      show: false,
    },
  } as ChartOptions);

  const chartSeries = [
    {
      name: 'General Fund',
      data: [data.introduced.gfResources, data.final.gfResources],
    },
    {
      name: 'Non-General Fund',
      data: [introducedNGF, finalNGF],
    },
  ];

  return (
    <Card sx={sx} {...other}>
      <CardHeader
        title={title || 'Operating Budget: GF vs NGF'}
        subheader={subheader || 'General Fund and Non-General Fund comparison'}
        sx={{ mb: 3 }}
      />

      <ChartLegends
        colors={chartOptions?.colors}
        labels={['General Fund', 'Non-General Fund']}
        values={[
          `$${data.final.gfResources.toFixed(1)}B`,
          `$${finalNGF.toFixed(1)}B`,
        ]}
        sx={{ px: 3, gap: 3, mb: 2 }}
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
          height: 360,
        }}
      />
    </Card>
  );
}

