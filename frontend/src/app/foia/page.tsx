import type { Metadata } from 'next';

import { CONFIG } from 'src/global-config';

import { FoiaView } from 'src/sections/foia/view';

export const metadata: Metadata = { title: `FOIA Toolkit - ${CONFIG.appName}` };

export default function Page() {
  return <FoiaView />;
}