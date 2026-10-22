import { postgresClient } from '../client.js';
import { toSafeIsoString } from '../dateUtils.js';
import { TenantBilling, BillingInvoice, BillingTransaction, BillingInvoiceItem } from '../../../types/billing.js';
import { TenantContext } from '../../auth/tenantContext.js';

export type { TenantBilling, BillingInvoice, BillingTransaction, BillingInvoiceItem };

export class BillingRepository {
  public static async getByTenant(contextOrTenantId: TenantContext | string): Promise<TenantBilling | null> {
    return this.getByTenantId(contextOrTenantId);
  }

  public static async save(billing: TenantBilling, contextOrTenant?: TenantContext | string): Promise<TenantBilling> {
    const target = contextOrTenant || billing.tenantId;
    return postgresClient.executeTenantScoped(target, async (client, ctx) => {
      try {
        await client.query(
          `INSERT INTO billing (tenant_id, plan, balance, currency, current_month_telephony, current_month_ai_tokens, current_month_omnichannel, current_month_licenses, updated_at)
           VALUES ($1, $2, $3, $4, $5, $6, $7, $8, CURRENT_TIMESTAMP)
           ON CONFLICT (tenant_id) DO UPDATE SET
             plan = EXCLUDED.plan,
             balance = EXCLUDED.balance,
             currency = EXCLUDED.currency,
             current_month_telephony = EXCLUDED.current_month_telephony,
             current_month_ai_tokens = EXCLUDED.current_month_ai_tokens,
             current_month_omnichannel = EXCLUDED.current_month_omnichannel,
             current_month_licenses = EXCLUDED.current_month_licenses,
             updated_at = CURRENT_TIMESTAMP`,
          [
            ctx.tenantId,
            billing.plan || 'prepaid',
            billing.balance || 0,
            billing.currency || 'BRL',
            billing.currentMonthCosts?.telephony || 0,
            billing.currentMonthCosts?.aiTokens || 0,
            billing.currentMonthCosts?.omnichannel || 0,
            billing.currentMonthCosts?.licenses || 0,
          ]
        );
        return billing;
      } catch (err: any) {
        console.error('[BillingRepository.save] Erro no PostgreSQL sob transação RLS:', err?.message || err);
        throw err;
      }
    });
  }

  public static async getByTenantId(contextOrTenantId: TenantContext | string): Promise<TenantBilling | null> {
    return postgresClient.executeTenantScoped(contextOrTenantId, async (client, ctx) => {
      try {
        const res = await client.query('SELECT * FROM billing WHERE tenant_id = $1', [ctx.tenantId]);
        if (res.rows.length === 0) {
          // Regra P0 CS-128: Ausência deve ser tratada como ausência. Proibido sintetizar faturamento padrão.
          return null;
        }
        const row = res.rows[0];

        // Fetch transactions no escopo isolado da transação
        let transactions: BillingTransaction[] = [];
        try {
          const txRes = await client.query(
            'SELECT * FROM billing_transactions WHERE tenant_id = $1 ORDER BY created_at DESC LIMIT 50',
            [ctx.tenantId]
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
          // Tabela vazia ou inicial
        }

        // Fetch invoices no escopo isolado da transação
        let recentInvoices: BillingInvoice[] = [];
        try {
          const invRes = await client.query(
            'SELECT * FROM billing_invoices WHERE tenant_id = $1 ORDER BY created_at DESC LIMIT 12',
            [ctx.tenantId]
          );
          recentInvoices = invRes.rows.map(inv => ({
            id: inv.id,
            date: inv.reference_month || new Date().toISOString().slice(0, 7),
            dueDate: inv.due_date,
            amount: parseFloat(inv.amount || '0'),
            status: inv.status as any,
            paidAt: toSafeIsoString(inv.paid_at),
            paymentMethod: inv.payment_method || undefined,
          }));
        } catch {
          // Tabela vazia ou inicial
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
      } catch (err: any) {
        console.error('[BillingRepository.getByTenantId] Erro no PostgreSQL sob transação RLS:', err?.message || err);
        throw err;
      }
    });
  }

  public static async recharge(
    contextOrTenantId: TenantContext | string,
    amount: number,
    paymentMethod: string
  ): Promise<{ balance: number; transaction: BillingTransaction }> {
    if (amount <= 0 || isNaN(amount)) {
      throw new Error('INVALID_AMOUNT: Valor da recarga deve ser estritamente positivo.');
    }

    return postgresClient.executeTenantScoped(contextOrTenantId, async (client, ctx) => {
      try {
        const curRes = await client.query('SELECT balance FROM billing WHERE tenant_id = $1 FOR UPDATE', [ctx.tenantId]);
        const currentBalance = curRes.rows.length > 0 ? parseFloat(curRes.rows[0].balance || '0') : 0;
        const newBalance = currentBalance + amount;

        const txId = `tx-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`;
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

        await client.query(
          `INSERT INTO billing (tenant_id, plan, balance, currency)
           VALUES ($1, 'prepaid', $2, 'BRL')
           ON CONFLICT (tenant_id) DO UPDATE SET
             balance = billing.balance + EXCLUDED.balance,
             updated_at = CURRENT_TIMESTAMP`,
          [ctx.tenantId, amount]
        );

        await client.query(
          `INSERT INTO billing_transactions (id, tenant_id, date, description, category, type, amount, balance_after)
           VALUES ($1, $2, $3, $4, $5, $6, $7, $8)`,
          [tx.id, ctx.tenantId, tx.date, tx.description, tx.category, tx.type, tx.amount, tx.balanceAfter]
        );

        return { balance: newBalance, transaction: tx };
      } catch (err: any) {
        console.error('[BillingRepository.recharge] Falha atômica durante recarga sob transação RLS:', err?.message || err);
        throw new Error(`BILLING_TRANSACTION_FAILED: Falha atômica ao registrar recarga: ${err?.message || err}`);
      }
    });
  }

  public static async payInvoice(
    contextOrTenantId: TenantContext | string,
    invoiceId: string,
    paymentMethod: string
  ): Promise<boolean> {
    if (!invoiceId || invoiceId.trim() === '') {
      throw new Error('INVOICE_REQUIRED: Identificador de fatura é obrigatório.');
    }

    return postgresClient.executeTenantScoped(contextOrTenantId, async (client, ctx) => {
      try {
        const checkRes = await client.query(
          'SELECT id, status, amount FROM billing_invoices WHERE tenant_id = $1 AND id = $2 FOR UPDATE',
          [ctx.tenantId, invoiceId]
        );

        if (checkRes.rows.length === 0 || checkRes.rows[0].status === 'paid') {
          return false;
        }

        const res = await client.query(
          `UPDATE billing_invoices
           SET status = 'paid', paid_at = CURRENT_TIMESTAMP, payment_method = $3
           WHERE tenant_id = $1 AND id = $2 AND status != 'paid'`,
          [ctx.tenantId, invoiceId, paymentMethod]
        );

        const invoiceAmount = parseFloat(checkRes.rows[0].amount || '0');
        const txId = `tx-pay-${Date.now()}`;
        await client.query(
          `INSERT INTO billing_transactions (id, tenant_id, date, description, category, type, amount, balance_after)
           VALUES ($1, $2, $3, $4, $5, $6, $7, $8)`,
          [txId, ctx.tenantId, new Date().toISOString().slice(0, 10), `Quitação fatura ${invoiceId}`, 'fee', 'debit', invoiceAmount, 0]
        );

        return (res.rowCount ?? 0) > 0;
      } catch (err: any) {
        console.error('[BillingRepository.payInvoice] Falha durante quitação de fatura sob transação RLS:', err?.message || err);
        throw err;
      }
    });
  }
}
