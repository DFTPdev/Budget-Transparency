import type { NavMainProps } from './main/nav/types';

import { Iconify } from 'src/components/iconify';

// ----------------------------------------------------------------------

export const navData: NavMainProps['data'] = [
  {
    title: 'Home',
    path: '/',
    icon: <Iconify width={22} icon="solar:home-angle-bold-duotone" />
  },
  {
    title: 'Budget Decoder',
    path: '/budget-decoder',
    icon: <Iconify width={22} icon="solar:chart-bold-duotone" />
  },
  {
    title: 'Budget Overview',
    path: '/budget-overview',
    icon: <Iconify width={22} icon="solar:calendar-mark-bold-duotone" />
  },
  {
    title: 'Spotlight Map',
    path: '/spotlight-map',
    icon: <Iconify width={22} icon="solar:map-point-bold-duotone" />
  },
  {
    title: 'FOIA Toolkit',
    path: '/foia',
    icon: <Iconify width={22} icon="solar:document-text-bold-duotone" />
  },
  {
    title: 'Whistleblower Portal',
    path: '/whistleblower',
    icon: <Iconify width={22} icon="solar:shield-check-bold-duotone" />
  },
];
