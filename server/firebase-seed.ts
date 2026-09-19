import { initialSeedData as db } from './infrastructure/postgres/seedData.js';
import { adminDb } from './firebase-admin.js';

export async function syncInitialDataToFirestore() {
  try {
    const tenantsRef = adminDb.collection('tenants');
    const snapshot = await tenantsRef.limit(1).get();
    
    if (snapshot.empty) {
      console.log('[Firebase Seeder] Firestore is empty. Migrating initial data...');
      
      const batch = adminDb.batch();
      
      // Migrate tenants
      for (const tenant of db.tenants) {
        const ref = adminDb.collection('tenants').doc(tenant.id);
        batch.set(ref, tenant);
      }
      
      // Migrate users
      for (const user of db.users) {
        const ref = adminDb.collection('users').doc(user.id);
        batch.set(ref, user);
      }
      
      await batch.commit();
      console.log('[Firebase Seeder] Initial migration completed successfully.');
    } else {
      console.log('[Firebase Seeder] Data already exists in Firestore.');
    }
  } catch (error) {
    console.error('[Firebase Seeder] Failed to migrate initial data:', error);
  }
}
