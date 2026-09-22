import { postgresClient } from '../client';

export interface BillingInvoiceItem {
  description: string;
  category: string;
  qty: string;
  unitPrice: number;
  total: number;
}

export interface BillingInvoice {
  id: string;
  date: string;
  dueDate: string;
  amount: number;
  status: 'pending' | 'paid' | 'overdue';
  paymentMethod?: string;
  paidAt?: string;
  items?: BillingInvoiceItem[];
}

export interface BillingTransaction {
  id: string;
  date: string;
  description: string;
  category: 'recharge' | 'call' | 'subscription' | 'ai_tokens';
  type: 'credit' | 'debit';
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

export class BillingRepository {
  public static async getByTenantId(tenantId: string): Promise<TenantBilling | null> {
    const res = await postgresClient.query('SELECT * FROM billing WHERE tenant_id = $1', [tenantId]);
    if (res.rows.length === 0) {
      return null;
    }
    const row = res.rows[0];

    // Fetch transactions
    let transactions: BillingTransaction[] = [];
    try {
      const txRes = await postgresClient.query(
        'SELECT * FROM billing_transactions WHERE tenant_id = $1 ORDER BY created_at DESC LIMIT 50',
        [tenantId]
      );
      transactions = txRes.rows.map(tx => ({
        id: tx.id,
        date: tx.date,
        description: tx.description,
        category: tx.category as any,
        type: tx.type as any,
        amount: parseFloat(tx.amount || '0'),
        balanceAfter: parseFloat(tx.balance_after || '0'),
      }));
    } catch {
      // If table not yet populated
    }

    // Fetch invoices
    let recentInvoices: BillingInvoice[] = [];
    try {
      const invRes = await postgresClient.query(
        'SELECT * FROM billing_invoices WHERE tenant_id = $1 ORDER BY created_at DESC LIMIT 12',
        [tenantId]
      );
      recentInvoices = invRes.rows.map(inv => ({
        id: inv.id,
        date: inv.reference_month || new Date().toISOString().slice(0, 7),
        dueDate: inv.due_date,
        amount: parseFloat(inv.amount || '0'),
        status: inv.status as any,
        paidAt: inv.paid_at ? inv.paid_at.toISOString() : undefined,
        paymentMethod: inv.payment_method || undefined,
      }));
    } catch {
      // If table not yet populated
    }

    return {
      tenantId: row.tenant_id,
      plan: row.plan || 'prepaid',
      balance: parseFloat(row.balance || '0'),
      currency: row.currency || 'BRL',
      currentMonthCosts: {
        telephony: parseFloat(row.current_month_telephony || '0'),
        aiTokens: parseFloat(row.current_month_ai_tokens || '0'),
        omnichannel: parseFloat(row.current_month_omnichannel || '0'),
        licenses: parseFloat(row.current_month_licenses || '0'),
      },
      recentInvoices,
      transactions,
    };
  }

  public static async recharge(tenantId: string, amount: number, paymentMethod: string): Promise<{ balance: number; transaction: BillingTransaction }> {
    const current = await this.getByTenantId(tenantId);
    const newBalance = (current ? current.balance : 0) + amount;

    await postgresClient.query(
      `INSERT INTO billing (tenant_id, plan, balance, currency)
       VALUES ($1, 'prepaid', $2, 'BRL')
       ON CONFLICT (tenant_id) DO UPDATE SET
         balance = billing.balance + EXCLUDED.balance,
         updated_at = CURRENT_TIMESTAMP`,
      [tenantId, amount]
    );

    const txId = `tx-${Date.now()}`;
    const txDate = new Date().toISOString().slice(0, 10);
    const tx: BillingTransaction = {
      id: txId,
      date: txDate,
      description: `Recarga de saldo pré-pago via ${paymentMethod}`,
      category: 'recharge',
      type: 'credit',
      amount,
      balanceAfter: newBalance,
    };

    try {
      await postgresClient.query(
        `INSERT INTO billing_transactions (id, tenant_id, date, description, category, type, amount, balance_after)
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8)`,
        [tx.id, tenantId, tx.date, tx.description, tx.category, tx.type, tx.amount, tx.balanceAfter]
      );
    } catch (e: any) {
      console.error('[BillingRepository] Erro ao registrar transação:', e.message);
    }

    return { balance: newBalance, transaction: tx };
  }

  public static async payInvoice(tenantId: string, invoiceId: string, paymentMethod: string): Promise<boolean> {
    const res = await postgresClient.query(
      `UPDATE billing_invoices
       SET status = 'paid', paid_at = CURRENT_TIMESTAMP, payment_method = $3
       WHERE tenant_id = $1 AND id = $2`,
      [tenantId, invoiceId, paymentMethod]
    );
    return (res.rowCount ?? 0) > 0;
  }
}
