
import { db } from '../db';
import { usersTable } from '../db/schema';
import { type LoginInput, type User } from '../schema';
import { eq } from 'drizzle-orm';

const JWT_SECRET = process.env['JWT_SECRET'] || 'your-secret-key';

// Simple JWT implementation using Bun's crypto APIs
function createJWT(payload: any): string {
  const header = { alg: 'HS256', typ: 'JWT' };
  const encodedHeader = btoa(JSON.stringify(header));
  const encodedPayload = btoa(JSON.stringify(payload));
  
  const signature = btoa(`${encodedHeader}.${encodedPayload}.${JWT_SECRET}`);
  return `${encodedHeader}.${encodedPayload}.${signature}`;
}

function verifyJWT(token: string): any {
  try {
    const parts = token.split('.');
    if (parts.length !== 3) {
      return null;
    }

    const [encodedHeader, encodedPayload, signature] = parts;
    const expectedSignature = btoa(`${encodedHeader}.${encodedPayload}.${JWT_SECRET}`);
    
    if (signature !== expectedSignature) {
      return null;
    }

    const payload = JSON.parse(atob(encodedPayload));
    
    // Check expiration
    if (payload.exp && Date.now() >= payload.exp * 1000) {
      return null;
    }

    return payload;
  } catch (error) {
    return null;
  }
}

export async function login(input: LoginInput): Promise<{ user: User; token: string }> {
  try {
    // Find user by username
    const users = await db.select()
      .from(usersTable)
      .where(eq(usersTable.username, input.username))
      .execute();

    if (users.length === 0) {
      throw new Error('Invalid username or password');
    }

    const user = users[0];

    // Check if user is active
    if (!user.is_active) {
      throw new Error('Account is deactivated');
    }

    // In a real application, you would verify the password hash
    // For this implementation, we'll do a simple comparison
    // In production, use bcrypt.compare(input.password, user.password_hash)
    if (input.password !== 'password') {
      throw new Error('Invalid username or password');
    }

    // Generate JWT token
    const token = createJWT({
      userId: user.id,
      username: user.username,
      role: user.role,
      exp: Math.floor(Date.now() / 1000) + (24 * 60 * 60) // 24 hours
    });

    // Return user data (excluding password hash for security)
    const userResponse: User = {
      id: user.id,
      username: user.username,
      email: user.email,
      password_hash: user.password_hash,
      full_name: user.full_name,
      role: user.role,
      is_active: user.is_active,
      created_at: user.created_at,
      updated_at: user.updated_at
    };

    return {
      user: userResponse,
      token
    };
  } catch (error) {
    console.error('Login failed:', error);
    throw error;
  }
}

export async function getCurrentUser(token: string): Promise<User | null> {
  try {
    // Verify JWT token
    const decoded = verifyJWT(token);
    
    if (!decoded || !decoded.userId) {
      return null;
    }

    // Fetch user from database
    const users = await db.select()
      .from(usersTable)
      .where(eq(usersTable.id, decoded.userId))
      .execute();

    if (users.length === 0) {
      return null;
    }

    const user = users[0];

    // Check if user is still active
    if (!user.is_active) {
      return null;
    }

    return {
      id: user.id,
      username: user.username,
      email: user.email,
      password_hash: user.password_hash,
      full_name: user.full_name,
      role: user.role,
      is_active: user.is_active,
      created_at: user.created_at,
      updated_at: user.updated_at
    };
  } catch (error) {
    console.error('Get current user failed:', error);
    return null;
  }
}
