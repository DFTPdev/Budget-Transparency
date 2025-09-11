import type { Metadata } from 'next';

import { CONFIG } from 'src/global-config';

import { SimpleMapView } from './view';

export const metadata: Metadata = { title: `Simple District Map - ${CONFIG.appName}` };

export default function Page() {
  return <SimpleMapView />;
}
