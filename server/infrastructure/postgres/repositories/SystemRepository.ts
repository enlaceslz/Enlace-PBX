import { postgresClient } from '../client';

export class SystemRepository {
  public static async getSetting<T>(key: string, defaultValue?: T): Promise<T | null> {
    const res = await postgresClient.query('SELECT value FROM system_settings WHERE key = $1', [key]);
    if (res.rows.length > 0) {
      const val = res.rows[0].value;
      return typeof val === 'string' ? JSON.parse(val) : val;
    }
    return defaultValue ?? null;
  }

  public static async setSetting<T>(key: string, value: T, description?: string): Promise<T> {
    await postgresClient.query(
      `INSERT INTO system_settings (key, value, description, updated_at)
       VALUES ($1, $2, $3, CURRENT_TIMESTAMP)
       ON CONFLICT (key) DO UPDATE SET
         value = EXCLUDED.value,
         description = COALESCE(EXCLUDED.description, system_settings.description),
         updated_at = CURRENT_TIMESTAMP`,
      [key, JSON.stringify(value), description || null]
    );
    return value;
  }

  public static async deleteSetting(key: string): Promise<boolean> {
    const res = await postgresClient.query('DELETE FROM system_settings WHERE key = $1', [key]);
    return (res.rowCount ?? 0) > 0;
  }
}
