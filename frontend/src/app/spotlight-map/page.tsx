import type { Metadata } from 'next';

import { CONFIG } from 'src/global-config';
import { LegislatureMapView } from 'src/sections/legislature-map/view';

export const metadata: Metadata = { title: `District Spotlight Map - ${CONFIG.appName}` };

export default function Page() {
  return <LegislatureMapView />;
}