
import { useState, useEffect, useCallback } from 'react';
import { trpc } from '@/utils/trpc';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Separator } from '@/components/ui/separator';
import { 
  History, 
  Eye, 
  RefreshCw, 
  Receipt, 
  CreditCard, 
  Banknote, 
  QrCode, 
  Smartphone,
  CheckCircle,
  XCircle,
  Clock,
  AlertTriangle
} from 'lucide-react';
import type { 
  Transaction, 
  TransactionItem,
  UserRole
} from '../../../server/src/schema';

interface TransactionHistoryProps {
  userRole: UserRole;
}

export function TransactionHistory({ userRole }: TransactionHistoryProps) {
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [selectedTransaction, setSelectedTransaction] = useState<Transaction | null>(null);
  const [transactionItems, setTransactionItems] = useState<TransactionItem[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [showDetailsDialog, setShowDetailsDialog] = useState(false);

  const loadTransactions = useCallback(async () => {
    
    try {
      const transactionsData = await trpc.getTransactions.query();
      setTransactions(transactionsData);
    } catch (error) {
      console.error('Failed to load transactions:', error);
    }
  }, []);

  useEffect(() => {
    loadTransactions();
  }, [loadTransactions]);

  const viewTransactionDetails = async (transaction: Transaction) => {
    setSelectedTransaction(transaction);
    setIsLoading(true);
    try {
      const items = await trpc.getTransactionItems.query(transaction.id);
      setTransactionItems(items);
      setShowDetailsDialog(true);
    } catch (error) {
      console.error('Failed to load transaction details:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const refundTransaction = async (transactionId: number) => {
    if (!confirm('Are you sure you want to refund this transaction?')) return;
    
    try {
      await trpc.refundTransaction.mutate(transactionId);
      await loadTransactions();
    } catch (error) {
      console.error('Failed to refund transaction:', error);
    }
  };

  const getPaymentMethodIcon = (method: string) => {
    switch (method) {
      case 'cash':
        return <Banknote className="h-4 w-4" />;
      case 'card':
        return <CreditCard className="h-4 w-4" />;
      case 'qr_code':
        return <QrCode className="h-4 w-4" />;
      case 'e_wallet':
        return <Smartphone className="h-4 w-4" />;
      default:
        return null;
    }
  };

  const getStatusIcon =  (status: string) => {
    switch (status) {
      case 'completed':
        return <CheckCircle className="h-4 w-4 text-green-600" />;
      case 'cancelled':
        return <XCircle className="h-4 w-4 text-red-600" />;
      case 'refunded':
        return <RefreshCw className="h-4 w-4 text-orange-600" />;
      case 'pending':
        return <Clock className="h-4 w-4 text-yellow-600" />;
      default:
        return null;
    }
  };

  const getStatusBadgeVariant = (status: string) => {
    switch (status) {
      case 'completed':
        return 'default';
      case 'cancelled':
        return 'destructive';
      case 'refunded':
        return 'secondary';
      case 'pending':
        return 'outline';
      default:
        return 'outline';
    }
  };

  const totalTransactions = transactions.length;
  const completedTransactions = transactions.filter((t: Transaction) => t.status === 'completed').length;
  const totalRevenue = transactions
    .filter((t: Transaction) => t.status === 'completed')
    .reduce((sum: number, t: Transaction) => sum + t.total_amount, 0);
  const refundedTransactions = transactions.filter((t: Transaction) => t.status === 'refunded').length;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex justify-between items-center">
        <div>
          <h2 className="text-2xl font-bold flex items-center space-x-2">
            <History className="h-6 w-6" />
            <span>Transaction History</span>
          </h2>
          <p className="text-gray-600">View and manage all sales transactions</p>
        </div>
        
        <Button onClick={loadTransactions} variant="outline">
          <RefreshCw className="h-4 w-4 mr-2" />
          Refresh
        </Button>
      </div>

      {/* Statistics Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card>
          <CardContent className="p-6">
            <div className="flex items-center space-x-2">
              <Receipt className="h-8 w-8 text-blue-600" />
              <div>
                <p className="text-2xl font-bold">{totalTransactions}</p>
                <p className="text-sm text-gray-600">Total Transactions</p>
              </div>
            </div>
          </CardContent>
        </Card>
        
        <Card>
          <CardContent className="p-6">
            <div className="flex items-center space-x-2">
              <CheckCircle className="h-8 w-8 text-green-600" />
              <div>
                <p className="text-2xl font-bold">{completedTransactions}</p>
                <p className="text-sm text-gray-600">Completed</p>
              </div>
            </div>
          </CardContent>
        </Card>
        
        <Card>
          <CardContent className="p-6">
            <div className="flex items-center space-x-2">
              <RefreshCw className="h-8 w-8 text-orange-600" />
              <div>
                <p className="text-2xl font-bold">{refundedTransactions}</p>
                <p className="text-sm text-gray-600">Refunded</p>
              </div>
            </div>
          </CardContent>
        </Card>
        
        <Card>
          <CardContent className="p-6">
            <div className="flex items-center space-x-2">
              <Banknote className="h-8 w-8 text-green-600" />
              <div>
                <p className="text-2xl font-bold">${totalRevenue.toFixed(2)}</p>
                <p className="text-sm text-gray-600">Total Revenue</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Transactions Table */}
      <Card>
        <CardHeader>
          <CardTitle>Recent Transactions</CardTitle>
        </CardHeader>
        <CardContent>
          {transactions.length === 0 ? (
            <div className="text-center py-8">
              <History className="h-12 w-12 text-gray-400 mx-auto mb-4" />
              <p className="text-gray-600">No transactions found.</p>
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Transaction #</TableHead>
                  <TableHead>Date & Time</TableHead>
                  <TableHead>Total Amount</TableHead>
                  <TableHead>Payment Method</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {transactions.map((transaction: Transaction) => (
                  <TableRow key={transaction.id}>
                    <TableCell className="font-mono text-sm">
                      {transaction.transaction_number}
                    </TableCell>
                    <TableCell>
                      <div>
                        <p className="font-medium">
                          {transaction.created_at.toLocaleDateString()}
                        </p>
                        <p className="text-sm text-gray-500">
                          {transaction.created_at.toLocaleTimeString()}
                        </p>
                      </div>
                    </TableCell>
                    <TableCell className="font-bold">
                      ${transaction.total_amount.toFixed(2)}
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center space-x-2">
                        {getPaymentMethodIcon(transaction.payment_method)}
                        <span className="capitalize">
                          {transaction.payment_method.replace('_', ' ')}
                        </span>
                      </div>
                    </TableCell>
                    <TableCell>
                      <Badge variant={getStatusBadgeVariant(transaction.status)} className="flex items-center space-x-1 w-fit">
                        {getStatusIcon(transaction.status)}
                        <span className="capitalize">{transaction.status}</span>
                      </Badge>
                    </TableCell>
                    <TableCell>
                      <div className="flex space-x-2">
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => viewTransactionDetails(transaction)}
                        >
                          <Eye className="h-3 w-3 mr-1" />
                          View
                        </Button>
                        
                        {(userRole === 'admin' || userRole === 'manager') && 
                         transaction.status === 'completed' && (
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => refundTransaction(transaction.id)}
                          >
                            <RefreshCw className="h-3 w-3 mr-1" />
                            Refund
                          </Button>
                        )}
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      {/* Transaction Details Dialog */}
      <Dialog open={showDetailsDialog} onOpenChange={setShowDetailsDialog}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle className="flex items-center space-x-2">
              <Receipt className="h-5 w-5" />
              <span>Transaction Details</span>
            </DialogTitle>
          </DialogHeader>
          
          {selectedTransaction && (
            <div className="space-y-6">
              {/* Transaction Info */}
              <Card>
                <CardContent className="p-4">
                  <div className="grid grid-cols-2 gap-4 text-sm">
                    <div>
                      <p className="font-medium">Transaction Number</p>
                      <p className="font-mono">{selectedTransaction.transaction_number}</p>
                    </div>
                    <div>
                      <p className="font-medium">Date & Time</p>
                      <p>{selectedTransaction.created_at.toLocaleString()}</p>
                    </div>
                    <div>
                      <p className="font-medium">Payment Method</p>
                      <div className="flex items-center space-x-2">
                        {getPaymentMethodIcon(selectedTransaction.payment_method)}
                        <span className="capitalize">
                          {selectedTransaction.payment_method.replace('_', ' ')}
                        </span>
                      </div>
                    </div>
                    <div>
                      <p className="font-medium">Status</p>
                      <Badge variant={getStatusBadgeVariant(selectedTransaction.status)} className="flex items-center space-x-1 w-fit">
                        {getStatusIcon(selectedTransaction.status)}
                        <span className="capitalize">{selectedTransaction.status}</span>
                      </Badge>
                    </div>
                  </div>
                </CardContent>
              </Card>

              {/* Transaction Items */}
              <div>
                <h3 className="font-medium mb-3">Items Purchased</h3>
                {isLoading ? (
                  <div className="text-center py-4">
                    <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-blue-600 mx-auto"></div>
                  </div>
                ) : (
                  <Card>
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead>Item</TableHead>
                          <TableHead>Quantity</TableHead>
                          <TableHead>Unit Price</TableHead>
                          <TableHead>Discount</TableHead>
                          <TableHead>Total</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {transactionItems.map((item: TransactionItem) => (
                          <TableRow key={item.id}>
                            <TableCell>Item #{item.product_variant_id}</TableCell>
                            <TableCell>{item.quantity}</TableCell>
                            <TableCell>${item.unit_price.toFixed(2)}</TableCell>
                            <TableCell>-${item.discount_amount.toFixed(2)}</TableCell>
                            <TableCell className="font-medium">
                              ${item.total_price.toFixed(2)}
                            </TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  </Card>
                )}
              </div>

              {/* Payment Summary */}
              <Card>
                <CardContent className="p-4 space-y-2">
                  <div className="flex justify-between text-sm">
                    <span>Subtotal:</span>
                    <span>${selectedTransaction.subtotal.toFixed(2)}</span>
                  </div>
                  <div className="flex justify-between text-sm">
                    <span>Discount:</span>
                    <span>-${selectedTransaction.discount_amount.toFixed(2)}</span>
                  </div>
                  <div className="flex justify-between text-sm">
                    <span>Tax:</span>
                    <span>${selectedTransaction.tax_amount.toFixed(2)}</span>
                  </div>
                  <Separator />
                  <div className="flex justify-between font-bold">
                    <span>Total:</span>
                    <span>${selectedTransaction.total_amount.toFixed(2)}</span>
                  </div>
                  <div className="flex justify-between text-sm">
                    <span>Payment Received:</span>
                    <span>${selectedTransaction.payment_amount.toFixed(2)}</span>
                  </div>
                  <div className="flex justify-between text-sm text-green-600">
                    <span>Change Given:</span>
                    <span>${selectedTransaction.change_amount.toFixed(2)}</span>
                  </div>
                </CardContent>
              </Card>

              {/* Notes */}
              {selectedTransaction.notes && (
                <div>
                  <h3 className="font-medium mb-2">Notes</h3>
                  <Alert>
                    <AlertTriangle className="h-4 w-4" />
                    <AlertDescription>
                      {selectedTransaction.notes}
                    </AlertDescription>
                  </Alert>
                </div>
              )}
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
