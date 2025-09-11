import type { Metadata } from 'next';

import { CONFIG } from 'src/global-config';

import { BudgetDecoderView } from 'src/sections/budget-decoder/view';

export const metadata: Metadata = { title: `Budget Decoder - ${CONFIG.appName}` };

export default function Page() {
  return <BudgetDecoderView />;
}