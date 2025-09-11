import type { Metadata } from 'next';

import { CONFIG } from 'src/global-config';
import { SpotlightMapView } from './view';

export const metadata: Metadata = { title: `District Spotlight Map - ${CONFIG.appName}` };

export default function Page() {
  return <SpotlightMapView />;
}