import type { Metadata } from 'next';

import { CONFIG } from 'src/global-config';

import { WhistleblowerView } from 'src/sections/whistleblower/view';

export const metadata: Metadata = { title: `Whistleblower Portal - ${CONFIG.appName}` };

export default function Page() {
  return <WhistleblowerView />;
}