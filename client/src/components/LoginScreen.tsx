
import { useState } from 'react';
import { trpc } from '@/utils/trpc';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { ShoppingCart, AlertCircle } from 'lucide-react';
import type { User, LoginInput } from '../../../server/src/schema';

interface LoginScreenProps {
  onLogin: (user: User, token: string) => void;
}

export function LoginScreen({ onLogin }: LoginScreenProps) {
  const [formData, setFormData] = useState<LoginInput>({
    username: '',
    password: ''
  });
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    setError(null);

    try {
      const result = await trpc.login.mutate(formData);
      onLogin(result.user, result.token);
    } catch (error) {
      console.error('Login failed:', error);
      setError('Invalid username or password');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-blue-50 to-indigo-100">
      <div className="w-full max-w-md space-y-8">
        {/* Logo and Title */}
        <div className="text-center">
          <div className="mx-auto w-16 h-16 bg-indigo-600 rounded-xl flex items-center justify-center mb-4">
            <ShoppingCart className="h-8 w-8 text-white" />
          </div>
          <h1 className="text-3xl font-bold text-gray-900">💰 SmartPOS</h1>
          <p className="text-gray-600 mt-2">Point of Sale System</p>
        </div>

        {/* Login Form */}
        <Card className="shadow-lg">
          <CardHeader className="text-center">
            <CardTitle>Welcome Back</CardTitle>
            <CardDescription>
              Sign in to access your POS system
            </CardDescription>
          </CardHeader>
          
          <CardContent>
            <form onSubmit={handleSubmit} className="space-y-4">
              {error && (
                <Alert variant="destructive">
                  <AlertCircle className="h-4 w-4" />
                  <AlertDescription>{error}</AlertDescription>
                </Alert>
              )}

              <div className="space-y-2">
                <label htmlFor="username" className="text-sm font-medium">
                  Username
                </label>
                <Input
                  id="username"
                  type="text"
                  placeholder="Enter your username"
                  value={formData.username}
                  onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
                    setFormData((prev: LoginInput) => ({ ...prev, username: e.target.value }))
                  }
                  required
                  disabled={isLoading}
                />
              </div>

              <div className="space-y-2">
                <label htmlFor="password" className="text-sm font-medium">
                  Password
                </label>
                <Input
                  id="password"
                  type="password"
                  placeholder="Enter your password"
                  value={formData.password}
                  onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
                    setFormData((prev: LoginInput) => ({ ...prev, password: e.target.value }))
                  }
                  required
                  disabled={isLoading}
                />
              </div>

              <Button 
                type="submit" 
                className="w-full" 
                disabled={isLoading}
              >
                {isLoading ? 'Signing in...' : 'Sign In'}
              </Button>
            </form>

            {/* Demo Credentials */}
            <div className="mt-6 p-4 bg-gray-50 rounded-lg">
              <p className="text-sm font-medium text-gray-700 mb-2">Demo Credentials:</p>
              <div className="text-xs text-gray-600 space-y-1">
                <div className="flex justify-between">
                  <span>👑 Admin:</span>
                  <span>admin / admin123</span>
                </div>
                <div className="flex justify-between">
                  <span>🎯 Manager:</span>
                  <span>manager / manager123</span>
                </div>
                <div className="flex justify-between">
                  <span>💼 Cashier:</span>
                  <span>cashier / cashier123</span>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Footer */}
        <div className="text-center text-sm text-gray-500">
          <p>© 2024 SmartPOS. All rights reserved.</p>
        </div>
      </div>
    </div>
  );
}
