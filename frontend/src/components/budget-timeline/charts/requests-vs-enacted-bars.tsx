import type { CardProps } from '@mui/material/Card';
import type { ChartOptions } from 'src/components/chart';
import type { HacDashboardData } from 'src/data/hacDashboardData';

import Card from '@mui/material/Card';
import { useTheme } from '@mui/material/styles';
import CardHeader from '@mui/material/CardHeader';

import { Chart, useChart, ChartLegends } from 'src/components/chart';

// ----------------------------------------------------------------------

type Props = CardProps & {
  title?: string;
  subheader?: string;
  data: HacDashboardData;
};

export function RequestsVsEnactedBars({ title, subheader, data, sx, ...other }: Props) {
  const theme = useTheme();

  const chartColors = [
    theme.palette.info.main,
    theme.palette.success.main,
  ];

  // Use spending by function data
  const categories = data.introduced.gfByFunction.map((item) => item.label);
  
  // Calculate actual amounts from percentages
  const introducedAmounts = data.introduced.gfByFunction.map(
    (item) => (item.sharePercent / 100) * data.introduced.gfResources
  );
  
  const finalAmounts = data.final.gfByFunction.map(
    (item) => (item.sharePercent / 100) * data.final.gfResources
  );

  const chartOptions = useChart({
    chart: {
      toolbar: {
        show: true,
      },
    },
    colors: chartColors,
    xaxis: {
      categories,
      labels: {
        style: {
          fontSize: '11px',
        },
        rotate: -45,
        rotateAlways: true,
        hideOverlappingLabels: false,
        trim: true,
        maxHeight: 100,
      },
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
        columnWidth: '60%',
        dataLabels: {
          position: 'top',
        },
      },
    },
    dataLabels: {
      enabled: false,
    },
    legend: {
      show: false,
    },
  } as ChartOptions);

  const chartSeries = [
    {
      name: 'Introduced',
      data: introducedAmounts,
    },
    {
      name: 'Final Enacted',
      data: finalAmounts,
    },
  ];

  return (
    <Card sx={sx} {...other}>
      <CardHeader
        title={title || 'Introduced vs Enacted Budget'}
        subheader={subheader || 'Comparison by spending category'}
        sx={{ mb: 3 }}
      />

      <ChartLegends
        colors={chartOptions?.colors}
        labels={['Introduced Budget', 'Final Enacted']}
        values={[
          `$${data.introduced.gfResources.toFixed(1)}B Total`,
          `$${data.final.gfResources.toFixed(1)}B Total`,
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
          height: 380,
        }}
      />
    </Card>
  );
}

