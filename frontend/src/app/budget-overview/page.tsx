import type { Metadata } from 'next';

import { CONFIG } from 'src/global-config';

import { BudgetOverviewView } from 'src/sections/budget-overview/view';

export const metadata: Metadata = { title: `Budget Overview - ${CONFIG.appName}` };

export default function Page() {
  return <BudgetOverviewView />;
}

