
import { useState, useEffect, useCallback } from 'react';
import { trpc } from '@/utils/trpc';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { 
  Users, 
  Plus, 
  Search, 
  Mail, 
  Phone, 
  MapPin,
  Eye,
  UserPlus
} from 'lucide-react';
import type { 
  Customer, 
  CreateCustomerInput, 
  Transaction 
} from '../../../server/src/schema';

export function CustomerManagement() {
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedCustomer, setSelectedCustomer] = useState<Customer | null>(null);
  const [customerHistory, setCustomerHistory] = useState<Transaction[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [showCreateDialog, setShowCreateDialog] = useState(false);
  const [showHistoryDialog, setShowHistoryDialog] = useState(false);

  const [customerForm, setCustomerForm] = useState<CreateCustomerInput>({
    name: '',
    email: null,
    phone: null,
    address: null
  });

  const loadCustomers = useCallback(async () => {
    try {
      const customersData = await trpc.getCustomers.query();
      setCustomers(customersData);
    } catch (error) {
      console.error('Failed to load customers:', error);
    }
  }, []);

  useEffect(() => {
    loadCustomers();
  }, [loadCustomers]);

  const createCustomer = async () => {
    setIsLoading(true);
    try {
      const newCustomer = await trpc.createCustomer.mutate(customerForm);
      setCustomers((prev: Customer[]) => [...prev, newCustomer]);
      
      setCustomerForm({
        name: '',
        email: null,
        phone: null,
        address: null
      });
      setShowCreateDialog(false);
    } catch (error) {
      console.error('Failed to create customer:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const viewCustomerHistory = async (customer: Customer) => {
    setSelectedCustomer(customer);
    setIsLoading(true);
    try {
      const history = await trpc.getCustomerPurchaseHistory.query(customer.id);
      setCustomerHistory(history);
      setShowHistoryDialog(true);
    } catch (error) {
      console.error('Failed to load customer history:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const filteredCustomers = customers.filter((customer: Customer) =>
    customer.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    (customer.email && customer.email.toLowerCase().includes(searchTerm.toLowerCase())) ||
    (customer.phone && customer.phone.includes(searchTerm))
  );

  const totalCustomers = customers.length;
  const customersWithEmail = customers.filter((c: Customer) => c.email).length;
  const customersWithPhone = customers.filter((c: Customer) => c.phone).length;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex justify-between items-center">
        <div>
          <h2 className="text-2xl font-bold flex items-center space-x-2">
            <Users className="h-6 w-6" />
            <span>Customer Management</span>
          </h2>
          <p className="text-gray-600">Manage customer information and purchase history</p>
        </div>
        
        <Dialog open={showCreateDialog} onOpenChange={setShowCreateDialog}>
          <DialogTrigger asChild>
            <Button>
              <Plus className="h-4 w-4 mr-2" />
              Add Customer
            </Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle className="flex items-center space-x-2">
                <UserPlus className="h-5 w-5" />
                <span>Add New Customer</span>
              </DialogTitle>
            </DialogHeader>
            
            <div className="space-y-4">
              <div>
                <label className="text-sm font-medium">Customer Name *</label>
                <Input
                  value={customerForm.name}
                  onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
                    setCustomerForm((prev: CreateCustomerInput) => ({ ...prev, name: e.target.value }))
                  }
                  placeholder="Enter customer name"
                  required
                />
              </div>
              
              <div>
                <label className="text-sm font-medium">Email Address</label>
                <Input
                  type="email"
                  value={customerForm.email || ''}
                  onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
                    setCustomerForm((prev: CreateCustomerInput) => ({ 
                      ...prev, 
                      email: e.target.value || null 
                    }))
                  }
                  placeholder="customer@example.com"
                />
              </div>
              
              <div>
                <label className="text-sm font-medium">Phone Number</label>
                <Input
                  value={customerForm.phone || ''}
                  onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
                    setCustomerForm((prev: CreateCustomerInput) => ({ 
                      ...prev, 
                      phone: e.target.value || null 
                    }))
                  }
                  placeholder="+1234567890"
                />
              </div>
              
              <div>
                <label className="text-sm font-medium">Address</label>
                <Input
                  value={customerForm.address || ''}
                  onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
                    setCustomerForm((prev: CreateCustomerInput) => ({ 
                      ...prev, 
                      address: e.target.value || null 
                    }))
                  }
                  placeholder="Customer address"
                />
              </div>
              
              <div className="flex space-x-2">
                <Button variant="outline" onClick={() => setShowCreateDialog(false)}>
                  Cancel
                </Button>
                <Button onClick={createCustomer} disabled={isLoading || !customerForm.name}>
                  {isLoading ? 'Creating...' : 'Create Customer'}
                </Button>
              </div>
            </div>
          </DialogContent>
        </Dialog>
      </div>

      {/* Statistics Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card>
          <CardContent className="p-6">
            <div className="flex items-center space-x-2">
              <Users className="h-8 w-8 text-blue-600" />
              <div>
                <p className="text-2xl font-bold">{totalCustomers}</p>
                <p className="text-sm text-gray-600">Total Customers</p>
              </div>
            </div>
          </CardContent>
        </Card>
        
        <Card>
          <CardContent className="p-6">
            <div className="flex items-center space-x-2">
              <Mail className="h-8 w-8 text-green-600" />
              <div>
                <p className="text-2xl font-bold">{customersWithEmail}</p>
                <p className="text-sm text-gray-600">With Email</p>
              </div>
            </div>
          </CardContent>
        </Card>
        
        <Card>
          <CardContent className="p-6">
            <div className="flex items-center space-x-2">
              <Phone className="h-8 w-8 text-purple-600" />
              <div>
                <p className="text-2xl font-bold">{customersWithPhone}</p>
                <p className="text-sm text-gray-600">With Phone</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Search */}
      <div className="flex items-center space-x-2">
        <Search className="h-4 w-4 text-gray-500" />
        <Input
          placeholder="Search customers by name, email, or phone..."
          value={searchTerm}
          onChange={(e: React.ChangeEvent<HTMLInputElement>) => setSearchTerm(e.target.value)}
          className="max-w-md"
        />
      </div>

      {/* Customer List */}
      <Card>
        <CardHeader>
          <CardTitle>Customer Directory</CardTitle>
        </CardHeader>
        <CardContent>
          {filteredCustomers.length === 0 ? (
            <div className="text-center py-8">
              <Users className="h-12 w-12 text-gray-400 mx-auto mb-4" />
              <p className="text-gray-600">
                {searchTerm ? 'No customers found matching your search.' : 'No customers yet. Add your first customer!'}
              </p>
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Name</TableHead>
                  <TableHead>Contact Information</TableHead>
                  <TableHead>Address</TableHead>
                  <TableHead>Member Since</TableHead>
                  <TableHead>Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredCustomers.map((customer: Customer) => (
                  <TableRow key={customer.id}>
                    <TableCell>
                      <div className="font-medium">{customer.name}</div>
                    </TableCell>
                    <TableCell>
                      <div className="space-y-1">
                        {customer.email && (
                          <div className="flex items-center space-x-1 text-sm text-gray-600">
                            <Mail className="h-3 w-3" />
                            <span>{customer.email}</span>
                          </div>
                        )}
                        {customer.phone && (
                          <div className="flex items-center space-x-1 text-sm text-gray-600">
                            <Phone className="h-3 w-3" />
                            <span>{customer.phone}</span>
                          </div>
                        )}
                        {!customer.email && !customer.phone && (
                          <span className="text-sm text-gray-400">No contact info</span>
                        )}
                      </div>
                    </TableCell>
                    <TableCell>
                      {customer.address ? (
                        <div className="flex items-center space-x-1 text-sm">
                          <MapPin className="h-3 w-3 text-gray-400" />
                          <span>{customer.address}</span>
                        </div>
                      ) : (
                        <span className="text-sm text-gray-400">No address</span>
                      )}
                    </TableCell>
                    <TableCell>
                      <span className="text-sm">
                        {customer.created_at.toLocaleDateString()}
                      </span>
                    </TableCell>
                    <TableCell>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => viewCustomerHistory(customer)}
                      >
                        <Eye className="h-3 w-3 mr-1" />
                        View History
                      </Button>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      {/* Customer History Dialog */}
      <Dialog open={showHistoryDialog} onOpenChange={setShowHistoryDialog}>
        <DialogContent className="max-w-4xl">
          <DialogHeader>
            <DialogTitle className="flex items-center space-x-2">
              <Users className="h-5 w-5" />
              <span>Purchase History - {selectedCustomer?.name}</span>
            </DialogTitle>
          </DialogHeader>
          
          <div className="space-y-4">
            {selectedCustomer && (
              <Card>
                <CardContent className="p-4">
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-sm">
                    <div>
                      <p className="font-medium">Customer Information</p>
                      <p className="text-gray-600">{selectedCustomer.name}</p>
                      {selectedCustomer.email && (
                        <p className="text-gray-600 flex items-center space-x-1">
                          <Mail className="h-3 w-3" />
                          <span>{selectedCustomer.email}</span>
                        </p>
                      )}
                      {selectedCustomer.phone && (
                        <p className="text-gray-600 flex items-center space-x-1">
                          <Phone className="h-3 w-3" />
                          <span>{selectedCustomer.phone}</span>
                        </p>
                      )}
                    </div>
                    
                    <div>
                      <p className="font-medium">Member Since</p>
                      <p className="text-gray-600">{selectedCustomer.created_at.toLocaleDateString()}</p>
                    </div>
                    
                    <div>
                      <p className="font-medium">Total Transactions</p>
                      <p className="text-gray-600">{customerHistory.length}</p>
                    </div>
                  </div>
                </CardContent>
              </Card>
            )}

            <div>
              <h3 className="font-medium mb-3">Transaction History</h3>
              {isLoading ? (
                <div className="text-center py-8">
                  <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto"></div>
                  <p className="mt-2 text-gray-600">Loading history...</p>
                </div>
              ) : customerHistory.length === 0 ? (
                <div className="text-center py-8">
                  <p className="text-gray-600">No purchase history yet.</p>
                </div>
              ) : (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Transaction #</TableHead>
                      <TableHead>Date</TableHead>
                      <TableHead>Total Amount</TableHead>
                      <TableHead>Payment Method</TableHead>
                      <TableHead>Status</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {customerHistory.map((transaction: Transaction) => (
                      <TableRow key={transaction.id}>
                        <TableCell className="font-mono text-sm">
                          {transaction.transaction_number}
                        </TableCell>
                        <TableCell>
                          {transaction.created_at.toLocaleDateString()}
                        </TableCell>
                        <TableCell className="font-medium">
                          ${transaction.total_amount.toFixed(2)}
                        </TableCell>
                        <TableCell className="capitalize">
                          {transaction.payment_method.replace('_', ' ')}
                        </TableCell>
                        <TableCell>
                          <Badge
                            variant={
                              transaction.status === 'completed' ? 'default' :
                              transaction.status === 'refunded' ? 'destructive' :
                              'secondary'
                            }
                          >
                            {transaction.status}
                          </Badge>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              )}
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
