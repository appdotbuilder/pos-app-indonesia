
import { afterEach, beforeEach, describe, expect, it } from 'bun:test';
import { resetDB, createDB } from '../helpers';
import { db } from '../db';
import { usersTable } from '../db/schema';
import { type LoginInput, type CreateUserInput } from '../schema';
import { login, getCurrentUser } from '../handlers/auth';
import { eq } from 'drizzle-orm';

// Test user data
const testUser: CreateUserInput = {
  username: 'testuser',
  email: 'test@example.com',
  password: 'password',
  full_name: 'Test User',
  role: 'cashier'
};

const testLoginInput: LoginInput = {
  username: 'testuser',
  password: 'password'
};

describe('auth handlers', () => {
  beforeEach(createDB);
  afterEach(resetDB);

  describe('login', () => {
    it('should authenticate valid user credentials', async () => {
      // Create test user with properly hashed password
      const hashedPassword = await Bun.password.hash('password');
      await db.insert(usersTable).values({
        username: testUser.username,
        email: testUser.email,
        password_hash: hashedPassword,
        full_name: testUser.full_name,
        role: testUser.role,
        is_active: true
      }).execute();

      const result = await login(testLoginInput);

      // Verify response structure
      expect(result.user).toBeDefined();
      expect(result.token).toBeDefined();
      expect(typeof result.token).toBe('string');

      // Verify user data
      expect(result.user.username).toBe('testuser');
      expect(result.user.email).toBe('test@example.com');
      expect(result.user.full_name).toBe('Test User');
      expect(result.user.role).toBe('cashier');
      expect(result.user.is_active).toBe(true);
      expect(result.user.id).toBeDefined();
      expect(result.user.created_at).toBeInstanceOf(Date);
      expect(result.user.updated_at).toBeInstanceOf(Date);
    });

    it('should reject invalid username', async () => {
      // Create test user with properly hashed password
      const hashedPassword = await Bun.password.hash('password');
      await db.insert(usersTable).values({
        username: testUser.username,
        email: testUser.email,
        password_hash: hashedPassword,
        full_name: testUser.full_name,
        role: testUser.role,
        is_active: true
      }).execute();

      const invalidInput: LoginInput = {
        username: 'nonexistent',
        password: 'password'
      };

      await expect(login(invalidInput)).rejects.toThrow(/invalid username or password/i);
    });

    it('should reject invalid password', async () => {
      // Create test user with properly hashed password
      const hashedPassword = await Bun.password.hash('password');
      await db.insert(usersTable).values({
        username: testUser.username,
        email: testUser.email,
        password_hash: hashedPassword,
        full_name: testUser.full_name,
        role: testUser.role,
        is_active: true
      }).execute();

      const invalidInput: LoginInput = {
        username: 'testuser',
        password: 'wrongpassword'
      };

      await expect(login(invalidInput)).rejects.toThrow(/invalid username or password/i);
    });

    it('should reject deactivated user', async () => {
      // Create deactivated test user with properly hashed password (not that it matters for this test)
      const hashedPassword = await Bun.password.hash('password');
      await db.insert(usersTable).values({
        username: testUser.username,
        email: testUser.email,
        password_hash: hashedPassword,
        full_name: testUser.full_name,
        role: testUser.role,
        is_active: false
      }).execute();

      await expect(login(testLoginInput)).rejects.toThrow(/account is deactivated/i);
    });

    it('should generate valid JWT token', async () => {
      // Create test user with properly hashed password
      const hashedPassword = await Bun.password.hash('password');
      await db.insert(usersTable).values({
        username: testUser.username,
        email: testUser.email,
        password_hash: hashedPassword,
        full_name: testUser.full_name,
        role: testUser.role,
        is_active: true
      }).execute();

      const result = await login(testLoginInput);

      // Verify token format (JWT has 3 parts separated by dots)
      expect(result.token.split('.')).toHaveLength(3);
      expect(result.token).toMatch(/^[A-Za-z0-9-_+/=]+\.[A-Za-z0-9-_+/=]+\.[A-Za-z0-9-_+/=]+$/);
    });
  });

  describe('getCurrentUser', () => {
    it('should return user data for valid token', async () => {
      // Create test user with properly hashed password
      const hashedPassword = await Bun.password.hash('password');
      const userResult = await db.insert(usersTable).values({
        username: testUser.username,
        email: testUser.email,
        password_hash: hashedPassword,
        full_name: testUser.full_name,
        role: testUser.role,
        is_active: true
      }).returning().execute();

      const createdUser = userResult[0];

      // Login to get valid token
      const loginResult = await login(testLoginInput);

      // Get current user with token
      const currentUser = await getCurrentUser(loginResult.token);

      expect(currentUser).toBeDefined();
      expect(currentUser!.id).toBe(createdUser.id);
      expect(currentUser!.username).toBe('testuser');
      expect(currentUser!.email).toBe('test@example.com');
      expect(currentUser!.full_name).toBe('Test User');
      expect(currentUser!.role).toBe('cashier');
      expect(currentUser!.is_active).toBe(true);
      expect(currentUser!.created_at).toBeInstanceOf(Date);
      expect(currentUser!.updated_at).toBeInstanceOf(Date);
    });

    it('should return null for invalid token', async () => {
      const invalidToken = 'invalid.jwt.token';
      
      const result = await getCurrentUser(invalidToken);
      
      expect(result).toBeNull();
    });

    it('should return null for expired/malformed token', async () => {
      const malformedToken = 'not-a-jwt-token';
      
      const result = await getCurrentUser(malformedToken);
      
      expect(result).toBeNull();
    });

    it('should return null for deactivated user', async () => {
      // Create test user with properly hashed password
      const hashedPassword = await Bun.password.hash('password');
      await db.insert(usersTable).values({
        username: testUser.username,
        email: testUser.email,
        password_hash: hashedPassword,
        full_name: testUser.full_name,
        role: testUser.role,
        is_active: true
      }).execute();

      // Login to get valid token
      const loginResult = await login(testLoginInput);

      // Deactivate user
      await db.update(usersTable)
        .set({ is_active: false })
        .where(eq(usersTable.username, testUser.username))
        .execute();

      // Try to get current user - should return null
      const currentUser = await getCurrentUser(loginResult.token);
      
      expect(currentUser).toBeNull();
    });

    it('should return null for non-existent user', async () => {
      // Create test user with properly hashed password
      const hashedPassword = await Bun.password.hash('password');
      const userResult = await db.insert(usersTable).values({
        username: testUser.username,
        email: testUser.email,
        password_hash: hashedPassword,
        full_name: testUser.full_name,
        role: testUser.role,
        is_active: true
      }).returning().execute();

      // Login to get valid token
      const loginResult = await login(testLoginInput);

      // Delete user from database
      await db.delete(usersTable)
        .where(eq(usersTable.id, userResult[0].id))
        .execute();

      // Try to get current user - should return null
      const currentUser = await getCurrentUser(loginResult.token);
      
      expect(currentUser).toBeNull();
    });
  });
});
