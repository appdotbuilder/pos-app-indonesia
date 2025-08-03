
import { useState, useEffect, useCallback } from 'react';
import { trpc } from '@/utils/trpc';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { LoginScreen } from '@/components/LoginScreen';
import { POSTerminal } from '@/components/POSTerminal';
import { ProductManagement } from '@/components/ProductManagement';
import { CustomerManagement } from '@/components/CustomerManagement';
import { UserManagement } from '@/components/UserManagement';
import { TransactionHistory } from '@/components/TransactionHistory';
import { Reports } from '@/components/Reports';
import { ShiftManagement } from '@/components/ShiftManagement';
import { 
  ShoppingCart, 
  Package, 
  Users, 
  UserCheck, 
  History, 
  BarChart3, 
  Clock, 
  LogOut,
  AlertTriangle
} from 'lucide-react';
import type { User, ProductVariant } from '../../server/src/schema';

function App() {
  const [user, setUser] = useState<User | null>(null);
  const [lowStockVariants, setLowStockVariants] = useState<ProductVariant[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  const loadLowStockAlerts = useCallback(async () => {
    try {
      const variants = await trpc.getLowStockVariants.query();
      setLowStockVariants(variants);
    } catch (error) {
      console.error('Failed to load low stock alerts:', error);
    }
  }, []);

  useEffect(() => {
    const token = localStorage.getItem('pos_token');
    if (token) {
      trpc.getCurrentUser.query(token)
        .then((userData) => {
          if (userData) {
            setUser(userData);
            loadLowStockAlerts();
          }
        })
        .catch((error) => {
          console.error('Failed to get current user:', error);
          localStorage.removeItem('pos_token');
        })
        .finally(() => setIsLoading(false));
    } else {
      setIsLoading(false);
    }
  }, [loadLowStockAlerts]);

  const handleLogin = async (userData: User, token: string) => {
    setUser(userData);
    localStorage.setItem('pos_token', token);
    await loadLowStockAlerts();
  };

  const handleLogout = () => {
    setUser(null);
    localStorage.removeItem('pos_token');
    setLowStockVariants([]);
  };

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-blue-50 to-indigo-100">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-indigo-600 mx-auto"></div>
          <p className="mt-4 text-gray-600">Loading POS System...</p>
        </div>
      </div>
    );
  }

  if (!user) {
    return <LoginScreen onLogin={handleLogin} />;
  }

  const canAccess = (roles: string[]) => roles.includes(user.role);

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100">
      {/* Header */}
      <div className="bg-white shadow-sm border-b">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center py-4">
            <div className="flex items-center space-x-4">
              <div className="bg-indigo-600 text-white p-2 rounded-lg">
                <ShoppingCart className="h-6 w-6" />
              </div>
              <div>
                <h1 className="text-2xl font-bold text-gray-900">💰 SmartPOS</h1>
                <p className="text-sm text-gray-500">Point of Sale System</p>
              </div>
            </div>
            
            <div className="flex items-center space-x-4">
              {/* Low Stock Alert */}
              {lowStockVariants.length > 0 && (
                <Alert className="w-auto">
                  <AlertTriangle className="h-4 w-4" />
                  <AlertDescription className="flex items-center space-x-2">
                    <span>{lowStockVariants.length} items low in stock</span>
                    <Badge variant="destructive" className="ml-2">
                      {lowStockVariants.length}
                    </Badge>
                  </AlertDescription>
                </Alert>
              )}
              
              {/* User Info */}
              <div className="flex items-center space-x-3">
                <div className="text-right">
                  <p className="text-sm font-medium text-gray-900">{user.full_name}</p>
                  <p className="text-xs text-gray-500 capitalize">
                    {user.role === 'admin' ? '👑 Admin' : 
                     user.role === 'manager' ? '🎯 Manager' : 
                     '💼 Cashier'}
                  </p>
                </div>
                <Button variant="outline" size="sm" onClick={handleLogout}>
                  <LogOut className="h-4 w-4 mr-2" />
                  Logout
                </Button>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
        <Tabs defaultValue="pos" className="space-y-6">
          <TabsList className="grid w-full grid-cols-7 lg:w-auto lg:inline-grid bg-white p-1 rounded-lg shadow-sm">
            <TabsTrigger value="pos" className="flex items-center space-x-2">
              <ShoppingCart className="h-4 w-4" />
              <span className="hidden sm:inline">POS Terminal</span>
            </TabsTrigger>
            
            {canAccess(['admin', 'manager']) && (
              <TabsTrigger value="products" className="flex items-center space-x-2">
                <Package className="h-4 w-4" />
                <span className="hidden sm:inline">Products</span>
              </TabsTrigger>
            )}
            
            <TabsTrigger value="customers" className="flex items-center space-x-2">
              <Users className="h-4 w-4" />
              <span className="hidden sm:inline">Customers</span>
            </TabsTrigger>
            
            {canAccess(['admin']) && (
              <TabsTrigger value="users" className="flex items-center space-x-2">
                <UserCheck className="h-4 w-4" />
                <span className="hidden sm:inline">Staff</span>
              </TabsTrigger>
            )}
            
            <TabsTrigger value="transactions" className="flex items-center space-x-2">
              <History className="h-4 w-4" />
              <span className="hidden sm:inline">History</span>
            </TabsTrigger>
            
            {canAccess(['admin', 'manager']) && (
              <TabsTrigger value="reports" className="flex items-center space-x-2">
                <BarChart3 className="h-4 w-4" />
                <span className="hidden sm:inline">Reports</span>
              </TabsTrigger>
            )}
            
            <TabsTrigger value="shifts" className="flex items-center space-x-2">
              <Clock className="h-4 w-4" />
              <span className="hidden sm:inline">Shifts</span>
            </TabsTrigger>
          </TabsList>

          {/* POS Terminal */}
          <TabsContent value="pos" className="space-y-0">
            <POSTerminal currentUser={user} onStockUpdate={loadLowStockAlerts} />
          </TabsContent>

          {/* Product Management */}
          {canAccess(['admin', 'manager']) && (
            <TabsContent value="products" className="space-y-0">
              <ProductManagement onStockUpdate={loadLowStockAlerts} />
            </TabsContent>
          )}

          {/* Customer Management */}
          <TabsContent value="customers" className="space-y-0">
            <CustomerManagement />
          </TabsContent>

          {/* User Management */}
          {canAccess(['admin']) && (
            <TabsContent value="users" className="space-y-0">
              <UserManagement />
            </TabsContent>
          )}

          {/* Transaction History */}
          <TabsContent value="transactions" className="space-y-0">
            <TransactionHistory userRole={user.role} />
          </TabsContent>

          {/* Reports */}
          {canAccess(['admin', 'manager']) && (
            <TabsContent value="reports" className="space-y-0">
              <Reports />
            </TabsContent>
          )}

          {/* Shift Management */}
          <TabsContent value="shifts" className="space-y-0">
            <ShiftManagement currentUser={user} />
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
}

export default App;
