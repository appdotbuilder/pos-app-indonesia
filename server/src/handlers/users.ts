
import { db } from '../db';
import { usersTable } from '../db/schema';
import { type CreateUserInput, type User } from '../schema';
import { eq } from 'drizzle-orm';

export async function createUser(input: CreateUserInput): Promise<User> {
  try {
    // Hash the password (simple hash for demo - in production use bcrypt)
    const password_hash = await Bun.password.hash(input.password);

    // Insert user record
    const result = await db.insert(usersTable)
      .values({
        username: input.username,
        email: input.email,
        password_hash,
        full_name: input.full_name,
        role: input.role
      })
      .returning()
      .execute();

    return result[0];
  } catch (error) {
    console.error('User creation failed:', error);
    throw error;
  }
}

export async function getUsers(): Promise<User[]> {
  try {
    const results = await db.select()
      .from(usersTable)
      .where(eq(usersTable.is_active, true))
      .execute();

    return results;
  } catch (error) {
    console.error('Failed to fetch users:', error);
    throw error;
  }
}

export async function getUserById(id: number): Promise<User | null> {
  try {
    const results = await db.select()
      .from(usersTable)
      .where(eq(usersTable.id, id))
      .execute();

    return results.length > 0 ? results[0] : null;
  } catch (error) {
    console.error('Failed to fetch user by ID:', error);
    throw error;
  }
}

export async function updateUserStatus(id: number, isActive: boolean): Promise<User> {
  try {
    const result = await db.update(usersTable)
      .set({ 
        is_active: isActive,
        updated_at: new Date()
      })
      .where(eq(usersTable.id, id))
      .returning()
      .execute();

    if (result.length === 0) {
      throw new Error(`User with id ${id} not found`);
    }

    return result[0];
  } catch (error) {
    console.error('Failed to update user status:', error);
    throw error;
  }
}
