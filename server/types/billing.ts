export interface BillingInvoiceItem {
  description: string;
  category: string;
  qty: string | number;
  unitPrice: number;
  total: number;
}

export interface BillingInvoice {
  id: string;
  date: string;
  dueDate: string;
  amount: number;
  status: 'paid' | 'pending' | 'overdue';
  paymentMethod?: string;
  paidAt?: string;
  items?: BillingInvoiceItem[];
}

export interface BillingTransaction {
  id: string;
  date: string;
  description: string;
  category: 'telephony' | 'ai_tokens' | 'omnichannel' | 'licenses' | 'recharge';
  type: 'debit' | 'credit';
  amount: number;
  balanceAfter: number;
}

export interface TenantBilling {
  tenantId: string;
  plan: 'prepaid' | 'postpaid';
  balance: number;
  currency: string;
  currentMonthCosts: {
    telephony: number;
    aiTokens: number;
    omnichannel: number;
    licenses: number;
  };
  recentInvoices: BillingInvoice[];
  transactions?: BillingTransaction[];
}
