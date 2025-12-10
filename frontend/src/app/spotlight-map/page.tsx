import type { Metadata } from 'next';

import { CONFIG } from 'src/global-config';
import { LegislatureMapView } from 'src/sections/legislature-map/view';

export const metadata: Metadata = { title: `Legislator Spotlight - ${CONFIG.appName}` };

export default function Page() {
  return <LegislatureMapView />;
}