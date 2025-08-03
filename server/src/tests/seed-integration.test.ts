import { afterEach, beforeEach, describe, expect, it } from 'bun:test';
import { resetDB, createDB } from '../helpers';
import { seedInitialUsers } from '../handlers/seed';
import { login } from '../handlers/auth';

describe('seed integration tests', () => {
  beforeEach(createDB);
  afterEach(resetDB);

  it('should be able to login with seeded admin user', async () => {
    // Seed the database
    await seedInitialUsers();

    // Try to login with admin credentials
    const loginResult = await login({
      username: 'admin',
      password: 'admin123'
    });

    expect(loginResult.user).toBeDefined();
    expect(loginResult.token).toBeDefined();
    expect(loginResult.user.username).toBe('admin');
    expect(loginResult.user.email).toBe('admin@example.com');
    expect(loginResult.user.full_name).toBe('Administrator');
    expect(loginResult.user.role).toBe('admin');
    expect(loginResult.user.is_active).toBe(true);
  });

  it('should be able to login with seeded manager user', async () => {
    // Seed the database
    await seedInitialUsers();

    // Try to login with manager credentials
    const loginResult = await login({
      username: 'manager',
      password: 'manager123'
    });

    expect(loginResult.user).toBeDefined();
    expect(loginResult.token).toBeDefined();
    expect(loginResult.user.username).toBe('manager');
    expect(loginResult.user.email).toBe('manager@example.com');
    expect(loginResult.user.full_name).toBe('Store Manager');
    expect(loginResult.user.role).toBe('manager');
    expect(loginResult.user.is_active).toBe(true);
  });

  it('should be able to login with seeded cashier user', async () => {
    // Seed the database
    await seedInitialUsers();

    // Try to login with cashier credentials
    const loginResult = await login({
      username: 'cashier',
      password: 'cashier123'
    });

    expect(loginResult.user).toBeDefined();
    expect(loginResult.token).toBeDefined();
    expect(loginResult.user.username).toBe('cashier');
    expect(loginResult.user.email).toBe('cashier@example.com');
    expect(loginResult.user.full_name).toBe('Default Cashier');
    expect(loginResult.user.role).toBe('cashier');
    expect(loginResult.user.is_active).toBe(true);
  });

  it('should not be able to login with wrong passwords for seeded users', async () => {
    // Seed the database
    await seedInitialUsers();

    // Try to login with wrong password
    await expect(login({
      username: 'admin',
      password: 'wrongpassword'
    })).rejects.toThrow(/invalid username or password/i);

    await expect(login({
      username: 'manager',
      password: 'wrongpassword'
    })).rejects.toThrow(/invalid username or password/i);

    await expect(login({
      username: 'cashier',
      password: 'wrongpassword'
    })).rejects.toThrow(/invalid username or password/i);
  });

  it('should demonstrate all three user roles exist after seeding', async () => {
    // Seed the database
    await seedInitialUsers();

    // Login with each user and verify roles
    const adminLogin = await login({ username: 'admin', password: 'admin123' });
    const managerLogin = await login({ username: 'manager', password: 'manager123' });
    const cashierLogin = await login({ username: 'cashier', password: 'cashier123' });

    expect(adminLogin.user.role).toBe('admin');
    expect(managerLogin.user.role).toBe('manager');
    expect(cashierLogin.user.role).toBe('cashier');

    // Verify they are all different users
    expect(adminLogin.user.id).not.toBe(managerLogin.user.id);
    expect(adminLogin.user.id).not.toBe(cashierLogin.user.id);
    expect(managerLogin.user.id).not.toBe(cashierLogin.user.id);
  });
});