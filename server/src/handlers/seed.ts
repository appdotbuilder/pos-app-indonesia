import { db } from '../db';
import { usersTable } from '../db/schema';
import { eq } from 'drizzle-orm';
import { type CreateUserInput } from '../schema';
import { createUser } from './users'; // Import the createUser function

export async function seedInitialUsers(): Promise<void> {
  try {
    const adminExists = await db.select().from(usersTable).where(eq(usersTable.username, 'admin')).execute();
    if (adminExists.length === 0) {
      console.log('Seeding default admin user...');
      await createUser({
        username: 'admin',
        email: 'admin@example.com',
        password: 'admin123',
        full_name: 'Administrator',
        role: 'admin',
      });
    }

    const managerExists = await db.select().from(usersTable).where(eq(usersTable.username, 'manager')).execute();
    if (managerExists.length === 0) {
      console.log('Seeding default manager user...');
      await createUser({
        username: 'manager',
        email: 'manager@example.com',
        password: 'manager123',
        full_name: 'Store Manager',
        role: 'manager',
      });
    }

    const cashierExists = await db.select().from(usersTable).where(eq(usersTable.username, 'cashier')).execute();
    if (cashierExists.length === 0) {
      console.log('Seeding default cashier user...');
      await createUser({
        username: 'cashier',
        email: 'cashier@example.com',
        password: 'cashier123',
        full_name: 'Default Cashier',
        role: 'cashier',
      });
    }
    console.log('Initial user seeding complete.');
  } catch (error) {
    console.error('Failed to seed initial users:', error);
    throw error;
  }
}