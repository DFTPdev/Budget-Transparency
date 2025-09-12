import type { Metadata } from 'next';

import { HomeView } from 'src/sections/home/view';

// ----------------------------------------------------------------------

export const metadata: Metadata = {
  title: 'DFTP - Don\'t Fuck The People',
  description:
    'Civic platform for accessing, understanding, and acting on Virginia\'s public budget.',
};

export default function Page() {
  return <HomeView />;
}
