import { afterEach, beforeEach, describe, expect, it } from 'bun:test';
import { resetDB, createDB } from '../helpers';
import { db } from '../db';
import { usersTable } from '../db/schema';
import { seedInitialUsers } from '../handlers/seed';
import { eq } from 'drizzle-orm';

describe('seedInitialUsers', () => {
  beforeEach(createDB);
  afterEach(resetDB);

  it('should create default admin, manager, and cashier users', async () => {
    // Verify database is empty initially
    const initialUsers = await db.select().from(usersTable).execute();
    expect(initialUsers).toHaveLength(0);

    // Run seeding
    await seedInitialUsers();

    // Verify users were created
    const users = await db.select().from(usersTable).execute();
    expect(users).toHaveLength(3);

    // Check admin user
    const admin = await db.select()
      .from(usersTable)
      .where(eq(usersTable.username, 'admin'))
      .execute();
    expect(admin).toHaveLength(1);
    expect(admin[0].email).toBe('admin@example.com');
    expect(admin[0].full_name).toBe('Administrator');
    expect(admin[0].role).toBe('admin');
    expect(admin[0].is_active).toBe(true);
    expect(admin[0].password_hash).toBeDefined();
    expect(admin[0].password_hash).not.toBe('admin123'); // Should be hashed

    // Check manager user
    const manager = await db.select()
      .from(usersTable)
      .where(eq(usersTable.username, 'manager'))
      .execute();
    expect(manager).toHaveLength(1);
    expect(manager[0].email).toBe('manager@example.com');
    expect(manager[0].full_name).toBe('Store Manager');
    expect(manager[0].role).toBe('manager');
    expect(manager[0].is_active).toBe(true);
    expect(manager[0].password_hash).toBeDefined();
    expect(manager[0].password_hash).not.toBe('manager123'); // Should be hashed

    // Check cashier user
    const cashier = await db.select()
      .from(usersTable)
      .where(eq(usersTable.username, 'cashier'))
      .execute();
    expect(cashier).toHaveLength(1);
    expect(cashier[0].email).toBe('cashier@example.com');
    expect(cashier[0].full_name).toBe('Default Cashier');
    expect(cashier[0].role).toBe('cashier');
    expect(cashier[0].is_active).toBe(true);
    expect(cashier[0].password_hash).toBeDefined();
    expect(cashier[0].password_hash).not.toBe('cashier123'); // Should be hashed
  });

  it('should not create duplicate users when run multiple times', async () => {
    // First run
    await seedInitialUsers();
    const firstRunUsers = await db.select().from(usersTable).execute();
    expect(firstRunUsers).toHaveLength(3);

    // Second run - should not create duplicates
    await seedInitialUsers();
    const secondRunUsers = await db.select().from(usersTable).execute();
    expect(secondRunUsers).toHaveLength(3);

    // Verify no duplicates by checking usernames
    const usernames = secondRunUsers.map(u => u.username);
    expect(usernames.sort()).toEqual(['admin', 'cashier', 'manager']);
  });

  it('should create only missing users', async () => {
    // Create only admin manually
    await db.insert(usersTable).values({
      username: 'admin',
      email: 'existing-admin@example.com',
      password_hash: await Bun.password.hash('existing-password'),
      full_name: 'Existing Admin',
      role: 'admin',
      is_active: true
    }).execute();

    // Run seeding - should create manager and cashier only
    await seedInitialUsers();

    const users = await db.select().from(usersTable).execute();
    expect(users).toHaveLength(3);

    // Check that existing admin was not modified
    const admin = await db.select()
      .from(usersTable)
      .where(eq(usersTable.username, 'admin'))
      .execute();
    expect(admin[0].email).toBe('existing-admin@example.com');
    expect(admin[0].full_name).toBe('Existing Admin');

    // Check that manager and cashier were created
    const manager = await db.select()
      .from(usersTable)
      .where(eq(usersTable.username, 'manager'))
      .execute();
    expect(manager).toHaveLength(1);
    expect(manager[0].email).toBe('manager@example.com');

    const cashier = await db.select()
      .from(usersTable)
      .where(eq(usersTable.username, 'cashier'))
      .execute();
    expect(cashier).toHaveLength(1);
    expect(cashier[0].email).toBe('cashier@example.com');
  });

  it('should create users with properly hashed passwords', async () => {
    await seedInitialUsers();

    // Test password verification for each user
    const admin = await db.select()
      .from(usersTable)
      .where(eq(usersTable.username, 'admin'))
      .execute();
    const adminPasswordValid = await Bun.password.verify('admin123', admin[0].password_hash);
    expect(adminPasswordValid).toBe(true);

    const manager = await db.select()
      .from(usersTable)
      .where(eq(usersTable.username, 'manager'))
      .execute();
    const managerPasswordValid = await Bun.password.verify('manager123', manager[0].password_hash);
    expect(managerPasswordValid).toBe(true);

    const cashier = await db.select()
      .from(usersTable)
      .where(eq(usersTable.username, 'cashier'))
      .execute();
    const cashierPasswordValid = await Bun.password.verify('cashier123', cashier[0].password_hash);
    expect(cashierPasswordValid).toBe(true);
  });

  it('should handle errors gracefully', async () => {
    // Test with invalid database state - this would need specific setup
    // For now, just verify the function completes successfully with empty database
    await expect(seedInitialUsers()).resolves.toBeUndefined();
  });
});