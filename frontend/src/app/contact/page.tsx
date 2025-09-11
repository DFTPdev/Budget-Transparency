import type { Metadata } from 'next';

import { CONFIG } from 'src/global-config';

import { ContactView } from 'src/sections/contact/view';

export const metadata: Metadata = { title: `Contact Us - ${CONFIG.appName}` };

export default function Page() {
  return <ContactView />;
}