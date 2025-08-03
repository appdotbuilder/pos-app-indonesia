
import { afterEach, beforeEach, describe, expect, it } from 'bun:test';
import { resetDB, createDB } from '../helpers';
import { db } from '../db';
import { usersTable } from '../db/schema';
import { type CreateUserInput } from '../schema';
import { createUser, getUsers, getUserById, updateUserStatus } from '../handlers/users';
import { eq } from 'drizzle-orm';

// Test input data
const testUserInput: CreateUserInput = {
  username: 'testuser',
  email: 'test@example.com',
  password: 'password123',
  full_name: 'Test User',
  role: 'cashier'
};

const testAdminInput: CreateUserInput = {
  username: 'admin',
  email: 'admin@example.com',
  password: 'admin123',
  full_name: 'Admin User',
  role: 'admin'
};

describe('createUser', () => {
  beforeEach(createDB);
  afterEach(resetDB);

  it('should create a user with hashed password', async () => {
    const result = await createUser(testUserInput);

    expect(result.username).toEqual('testuser');
    expect(result.email).toEqual('test@example.com');
    expect(result.full_name).toEqual('Test User');
    expect(result.role).toEqual('cashier');
    expect(result.is_active).toBe(true);
    expect(result.id).toBeDefined();
    expect(result.created_at).toBeInstanceOf(Date);
    expect(result.updated_at).toBeInstanceOf(Date);
    expect(result.password_hash).not.toEqual('password123'); // Should be hashed
    expect(result.password_hash.length).toBeGreaterThan(0);
  });

  it('should save user to database', async () => {
    const result = await createUser(testUserInput);

    const users = await db.select()
      .from(usersTable)
      .where(eq(usersTable.id, result.id))
      .execute();

    expect(users).toHaveLength(1);
    expect(users[0].username).toEqual('testuser');
    expect(users[0].email).toEqual('test@example.com');
    expect(users[0].is_active).toBe(true);
  });

  it('should throw error for duplicate username', async () => {
    await createUser(testUserInput);

    const duplicateInput: CreateUserInput = {
      ...testUserInput,
      email: 'different@example.com'
    };

    await expect(createUser(duplicateInput)).rejects.toThrow();
  });

  it('should throw error for duplicate email', async () => {
    await createUser(testUserInput);

    const duplicateInput: CreateUserInput = {
      ...testUserInput,
      username: 'differentuser'
    };

    await expect(createUser(duplicateInput)).rejects.toThrow();
  });
});

describe('getUsers', () => {
  beforeEach(createDB);
  afterEach(resetDB);

  it('should return empty array when no users exist', async () => {
    const result = await getUsers();
    expect(result).toHaveLength(0);
  });

  it('should return all active users', async () => {
    const user1 = await createUser(testUserInput);
    const user2 = await createUser(testAdminInput);

    const result = await getUsers();

    expect(result).toHaveLength(2);
    expect(result.map(u => u.id)).toContain(user1.id);
    expect(result.map(u => u.id)).toContain(user2.id);
    expect(result.every(u => u.is_active)).toBe(true);
  });

  it('should not return inactive users', async () => {
    const user1 = await createUser(testUserInput);
    const user2 = await createUser(testAdminInput);

    // Deactivate one user
    await updateUserStatus(user2.id, false);

    const result = await getUsers();

    expect(result).toHaveLength(1);
    expect(result[0].id).toEqual(user1.id);
    expect(result[0].is_active).toBe(true);
  });
});

describe('getUserById', () => {
  beforeEach(createDB);
  afterEach(resetDB);

  it('should return null for non-existent user', async () => {
    const result = await getUserById(999);
    expect(result).toBeNull();
  });

  it('should return user by ID', async () => {
    const createdUser = await createUser(testUserInput);

    const result = await getUserById(createdUser.id);

    expect(result).not.toBeNull();
    expect(result!.id).toEqual(createdUser.id);
    expect(result!.username).toEqual('testuser');
    expect(result!.email).toEqual('test@example.com');
    expect(result!.role).toEqual('cashier');
  });

  it('should return inactive user by ID', async () => {
    const createdUser = await createUser(testUserInput);
    await updateUserStatus(createdUser.id, false);

    const result = await getUserById(createdUser.id);

    expect(result).not.toBeNull();
    expect(result!.id).toEqual(createdUser.id);
    expect(result!.is_active).toBe(false);
  });
});

describe('updateUserStatus', () => {
  beforeEach(createDB);
  afterEach(resetDB);

  it('should deactivate user', async () => {
    const createdUser = await createUser(testUserInput);
    expect(createdUser.is_active).toBe(true);

    const result = await updateUserStatus(createdUser.id, false);

    expect(result.id).toEqual(createdUser.id);
    expect(result.is_active).toBe(false);
    expect(result.updated_at).toBeInstanceOf(Date);
    expect(result.updated_at.getTime()).toBeGreaterThan(createdUser.updated_at.getTime());
  });

  it('should activate user', async () => {
    const createdUser = await createUser(testUserInput);
    await updateUserStatus(createdUser.id, false);

    const result = await updateUserStatus(createdUser.id, true);

    expect(result.id).toEqual(createdUser.id);
    expect(result.is_active).toBe(true);
    expect(result.updated_at).toBeInstanceOf(Date);
  });

  it('should update user status in database', async () => {
    const createdUser = await createUser(testUserInput);

    await updateUserStatus(createdUser.id, false);

    const dbUser = await db.select()
      .from(usersTable)
      .where(eq(usersTable.id, createdUser.id))
      .execute();

    expect(dbUser[0].is_active).toBe(false);
    expect(dbUser[0].updated_at.getTime()).toBeGreaterThan(createdUser.updated_at.getTime());
  });

  it('should throw error for non-existent user', async () => {
    await expect(updateUserStatus(999, false)).rejects.toThrow(/not found/i);
  });
});
