import type { Metadata } from 'next';

import { CONFIG } from 'src/global-config';
import { BudgetXView } from 'src/sections/budget-x/view';

export const metadata: Metadata = { 
  title: `Budget X - ${CONFIG.appName}`,
  description: 'Unified budget and expenditure explorer with data quality indicators'
};

export default function Page() {
  return <BudgetXView />;
}

