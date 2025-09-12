'use client';

// Removed _mock imports - using empty arrays for now

import { AccountBilling } from '../account-billing';

// ----------------------------------------------------------------------

export function AccountBillingView() {
  return (
    <AccountBilling
      plans={[]}
      cards={[]}
      invoices={[]}
      addressBook={[]}
    />
  );
}
