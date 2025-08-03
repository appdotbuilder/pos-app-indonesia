
import { useState, useEffect, useCallback } from 'react';
import { trpc } from '@/utils/trpc';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Separator } from '@/components/ui/separator';
import { 
  ShoppingCart, 
  Plus, 
  Minus, 
  Trash2, 
  CreditCard, 
  Banknote, 
  QrCode, 
  Smartphone,
  Receipt,
  Calculator
} from 'lucide-react';
import type { 
  User, 
  ProductVariant, 
  Customer, 
  CreateTransactionInput, 
  PaymentMethod,
  Transaction
} from '../../../server/src/schema';

interface CartItem {
  variant: ProductVariant;
  quantity: number;
  unitPrice: number;
  discountAmount: number;
}

interface POSTerminalProps {
  currentUser: User;
  onStockUpdate: () => void;
}

export function POSTerminal({ currentUser, onStockUpdate }: POSTerminalProps) {
  const [productVariants, setProductVariants] = useState<ProductVariant[]>([]);
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [cart, setCart] = useState<CartItem[]>([]);
  const [selectedCustomer, setSelectedCustomer] = useState<number | undefined>();
  const [paymentMethod, setPaymentMethod] = useState<PaymentMethod>('cash');
  const [paymentAmount, setPaymentAmount] = useState<number>(0);
  const [transactionDiscount, setTransactionDiscount] = useState<number>(0);
  const [notes, setNotes] = useState<string>('');
  const [isProcessing, setIsProcessing] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [showReceipt, setShowReceipt] = useState(false);
  const [lastTransaction, setLastTransaction] = useState<Transaction | null>(null);

  const loadData = useCallback(async () => {
    try {
      const [variantsData, customersData] = await Promise.all([
        trpc.getProductVariants.query(),
        trpc.getCustomers.query()
      ]);
      setProductVariants(variantsData);
      setCustomers(customersData);
    } catch (error) {
      console.error('Failed to load POS data:', error);
    }
  }, []);

  useEffect(() => {
    loadData();
  }, [loadData]);

  const filteredVariants = productVariants.filter((variant: ProductVariant) =>
    variant.variant_name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    variant.sku.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const addToCart = (variant: ProductVariant) => {
    const existingItem = cart.find((item: CartItem) => item.variant.id === variant.id);
    
    if (existingItem) {
      if (existingItem.quantity < variant.stock_quantity) {
        setCart((prev: CartItem[]) =>
          prev.map((item: CartItem) =>
            item.variant.id === variant.id
              ? { ...item, quantity: item.quantity + 1 }
              : item
          )
        );
      }
    } else {
      if (variant.stock_quantity > 0) {
        setCart((prev: CartItem[]) => [
          ...prev,
          {
            variant,
            quantity: 1,
            unitPrice: variant.price,
            discountAmount: 0
          }
        ]);
      }
    }
  };

  const updateCartItemQuantity = (variantId: number, newQuantity: number) => {
    if (newQuantity === 0) {
      removeFromCart(variantId);
      return;
    }

    const variant = productVariants.find((v: ProductVariant) => v.id === variantId);
    if (variant && newQuantity <= variant.stock_quantity) {
      setCart((prev: CartItem[]) =>
        prev.map((item: CartItem) =>
          item.variant.id === variantId
            ? { ...item, quantity: newQuantity }
            : item
        )
      );
    }
  };

  const removeFromCart = (variantId: number) => {
    setCart((prev: CartItem[]) => prev.filter((item: CartItem) => item.variant.id !== variantId));
  };

  const updateItemDiscount = (variantId: number, discount: number) => {
    setCart((prev: CartItem[]) =>
      prev.map((item: CartItem) =>
        item.variant.id === variantId
          ? { ...item, discountAmount: discount }
          : item
      )
    );
  };

  const clearCart = () => {
    setCart([]);
    setSelectedCustomer(undefined);
    setPaymentAmount(0);
    setTransactionDiscount(0);
    setNotes('');
  };

  // Calculations
  const subtotal = cart.reduce((sum: number, item: CartItem) => 
    sum + (item.unitPrice * item.quantity), 0
  );
  
  const itemDiscounts = cart.reduce((sum: number, item: CartItem) => 
    sum + item.discountAmount, 0
  );
  
  const totalAmount = subtotal - itemDiscounts - transactionDiscount;
  const changeAmount = paymentAmount - totalAmount;

  const processTransaction = async () => {
    if (cart.length === 0) return;
    if (paymentAmount < totalAmount) return;

    setIsProcessing(true);

    try {
      const transactionInput: CreateTransactionInput = {
        customer_id: selectedCustomer || null,
        cashier_id: currentUser.id,
        items: cart.map((item: CartItem) => ({
          product_variant_id: item.variant.id,
          quantity: item.quantity,
          unit_price: item.unitPrice,
          discount_amount: item.discountAmount
        })),
        payment_method: paymentMethod,
        payment_amount: paymentAmount,
        discount_amount: transactionDiscount,
        notes: notes || null
      };

      const transaction = await trpc.createTransaction.mutate(transactionInput);
      
      setLastTransaction(transaction);
      setShowReceipt(true);
      clearCart();
      onStockUpdate();
      await loadData(); // Refresh product variants to show updated stock
      
    } catch (error) {
      console.error('Failed to process transaction:', error);
    } finally {
      setIsProcessing(false);
    }
  };

  const paymentIcons = {
    cash: <Banknote className="h-4 w-4" />,
    card: <CreditCard className="h-4 w-4" />,
    qr_code: <QrCode className="h-4 w-4" />,
    e_wallet: <Smartphone className="h-4 w-4" />
  };

  return (
    <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
      {/* Product Selection */}
      <div className="lg:col-span-2 space-y-4">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center space-x-2">
              <ShoppingCart className="h-5 w-5" />
              <span>Product Selection</span>
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="mb-4">
              <Input
                placeholder="Search products by name or SKU..."
                value={searchTerm}
                onChange={(e: React.ChangeEvent<HTMLInputElement>) => setSearchTerm(e.target.value)}
                className="w-full"
              />
            </div>
            
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3 max-h-96 overflow-y-auto">
              {filteredVariants.map((variant: ProductVariant) => (
                <Card 
                  key={variant.id} 
                  className={`cursor-pointer transition-all hover:shadow-md ${
                    variant.stock_quantity === 0 ? 'opacity-50' : ''
                  }`}
                  onClick={() => addToCart(variant)}
                >
                  <CardContent className="p-4">
                    <div className="space-y-2">
                      <div className="flex justify-between items-start">
                        <h3 className="font-medium text-sm">{variant.variant_name}</h3>
                        <Badge variant={variant.stock_quantity <= variant.low_stock_threshold ? "destructive" : "secondary"}>
                          {variant.stock_quantity}
                        </Badge>
                      </div>
                      
                      <p className="text-xs text-gray-500">SKU: {variant.sku}</p>
                      
                      {variant.size && (
                        <Badge variant="outline" className="text-xs">
                          Size: {variant.size}
                        </Badge>
                      )}
                      
                      {variant.color && (
                        <Badge variant="outline" className="text-xs">
                          Color: {variant.color}
                        </Badge>
                      )}
                      
                      <div className="flex justify-between items-center">
                        <span className="font-bold text-green-600">
                          ${variant.price.toFixed(2)}
                        </span>
                        {variant.stock_quantity === 0 && (
                          <span className="text-xs text-red-500">Out of Stock</span>
                        )}
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Cart and Checkout */}
      <div className="space-y-4">
        {/* Cart */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center justify-between">
              <span>Cart ({cart.length})</span>
              {cart.length > 0 && (
                <Button variant="outline" size="sm" onClick={clearCart}>
                  <Trash2 className="h-4 w-4" />
                </Button>
              )}
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3 max-h-64 overflow-y-auto">
              {cart.length === 0 ? (
                <p className="text-gray-500 text-center py-8">Cart is empty</p>
              ) : (
                cart.map((item: CartItem) => (
                  <div key={item.variant.id} className="border rounded-lg p-3 space-y-2">
                    <div className="flex justify-between items-start">
                      <div className="flex-1">
                        <h4 className="font-medium text-sm">{item.variant.variant_name}</h4>
                        <p className="text-xs text-gray-500">${item.unitPrice.toFixed(2)} each</p>
                      </div>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => removeFromCart(item.variant.id)}
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                    
                    <div className="flex items-center justify-between">
                      <div className="flex items-center space-x-2">
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => updateCartItemQuantity(item.variant.id, item.quantity - 1)}
                        >
                          <Minus className="h-4 w-4" />
                        </Button>
                        <span className="w-8 text-center">{item.quantity}</span>
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => updateCartItemQuantity(item.variant.id, item.quantity + 1)}
                        >
                          <Plus className="h-4 w-4" />
                        </Button>
                      </div>
                      <span className="font-medium">
                        ${(item.unitPrice * item.quantity - item.discountAmount).toFixed(2)}
                      </span>
                    </div>

                    <div className="flex items-center space-x-2">
                      <Input
                        type="number"
                        placeholder="Item discount"
                        value={item.discountAmount}
                        onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
                          updateItemDiscount(item.variant.id, parseFloat(e.target.value) || 0)
                        }
                        className="text-xs"
                        min="0"
                        max={item.unitPrice * item.quantity}
                        step="0.01"
                      />
                    </div>
                  </div>
                ))
              )}
            </div>
          </CardContent>
        </Card>

        {/* Checkout */}
        {cart.length > 0 && (
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center space-x-2">
                <Calculator className="h-5 w-5" />
                <span>Checkout</span>
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              {/* Customer Selection */}
              <div>
                <label className="text-sm font-medium">Customer (Optional)</label>
                <Select value={selectedCustomer?.toString() || 'none'} onValueChange={(value) => setSelectedCustomer(value === 'none' ? undefined : parseInt(value))}>
                  <SelectTrigger>
                    <SelectValue placeholder="Select customer" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="none">No Customer</SelectItem>
                    {customers.map((customer: Customer) => (
                      <SelectItem key={customer.id} value={customer.id.toString()}>
                        {customer.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              {/* Transaction Discount */}
              <div>
                <label className="text-sm font-medium">Transaction Discount</label>
                <Input
                  type="number"
                  value={transactionDiscount}
                  onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
                    setTransactionDiscount(parseFloat(e.target.value) || 0)
                  }
                  min="0"
                  max={subtotal - itemDiscounts}
                  step="0.01"
                  placeholder="0.00"
                />
              </div>

              {/* Payment Method */}
              <div>
                <label className="text-sm font-medium">Payment Method</label>
                <Select value={paymentMethod} onValueChange={(value: PaymentMethod) => setPaymentMethod(value)}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="cash">
                      <div className="flex items-center space-x-2">
                        {paymentIcons.cash}
                        <span>Cash</span>
                      </div>
                    </SelectItem>
                    <SelectItem value="card">
                      <div className="flex items-center space-x-2">
                        {paymentIcons.card}
                        <span>Card</span>
                      </div>
                    </SelectItem>
                    <SelectItem value="qr_code">
                      <div className="flex items-center space-x-2">
                        {paymentIcons.qr_code}
                        <span>QR Code</span>
                      </div>
                    </SelectItem>
                
                    <SelectItem value="e_wallet">
                      <div className="flex items-center space-x-2">
                        {paymentIcons.e_wallet}
                        <span>E-Wallet</span>
                      </div>
                    </SelectItem>
                  </SelectContent>
                </Select>
              </div>

              {/* Payment Amount */}
              <div>
                <label className="text-sm font-medium">Payment Amount</label>
                <Input
                  type="number"
                  value={paymentAmount}
                  onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
                    setPaymentAmount(parseFloat(e.target.value) || 0)
                  }
                  min={totalAmount}
                  step="0.01"
                  placeholder={totalAmount.toFixed(2)}
                />
              </div>

              {/* Notes */}
              <div>
                <label className="text-sm font-medium">Notes (Optional)</label>
                <Input
                  value={notes}
                  onChange={(e: React.ChangeEvent<HTMLInputElement>) => setNotes(e.target.value)}
                  placeholder="Transaction notes..."
                />
              </div>

              <Separator />

              {/* Totals */}
              <div className="space-y-2 text-sm">
                <div className="flex justify-between">
                  <span>Subtotal:</span>
                  <span>${subtotal.toFixed(2)}</span>
                </div>
                <div className="flex justify-between">
                  <span>Item Discounts:</span>
                  <span>-${itemDiscounts.toFixed(2)}</span>
                </div>
                <div className="flex justify-between">
                  <span>Transaction Discount:</span>
                  <span>-${transactionDiscount.toFixed(2)}</span>
                </div>
                <Separator />
                <div className="flex justify-between font-bold text-lg">
                  <span>Total:</span>
                  <span>${totalAmount.toFixed(2)}</span>
                </div>
                {paymentAmount >= totalAmount && paymentAmount > 0 && (
                  <div className="flex justify-between text-green-600">
                    <span>Change:</span>
                    <span>${changeAmount.toFixed(2)}</span>
                  </div>
                )}
              </div>

              {/* Validation Alerts */}
              {paymentAmount > 0 && paymentAmount < totalAmount && (
                <Alert variant="destructive">
                  <AlertDescription>
                    Insufficient payment amount. Need ${(totalAmount - paymentAmount).toFixed(2)} more.
                  </AlertDescription>
                </Alert>
              )}

              {/* Process Transaction Button */}
              <Button
                onClick={processTransaction}
                disabled={isProcessing || cart.length === 0 || paymentAmount < totalAmount}
                className="w-full"
                size="lg"
              >
                {isProcessing ? 'Processing...' : `Process Payment ($${totalAmount.toFixed(2)})`}
              </Button>
            </CardContent>
          </Card>
        )}
      </div>

      {/* Receipt Dialog */}
      <Dialog open={showReceipt} onOpenChange={setShowReceipt}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center space-x-2">
              <Receipt className="h-5 w-5" />
              <span>Transaction Receipt</span>
            </DialogTitle>
          </DialogHeader>
          
          {lastTransaction && (
            <div className="space-y-4 text-sm">
              <div className="text-center border-b pb-4">
                <h2 className="font-bold text-lg">💰 SmartPOS</h2>
                <p className="text-gray-600">Receipt</p>
                <p className="text-xs text-gray-500">
                  {lastTransaction.created_at.toLocaleString()}
                </p>
              </div>
              
              <div className="space-y-2">
                <div className="flex justify-between">
                  <span>Transaction #:</span>
                  <span className="font-mono">{lastTransaction.transaction_number}</span>
                </div>
                <div className="flex justify-between">
                  <span>Cashier:</span>
                  <span>{currentUser.full_name}</span>
                </div>
                <div className="flex justify-between">
                  <span>Payment Method:</span>
                  <span className="capitalize">{lastTransaction.payment_method.replace('_', ' ')}</span>
                </div>
              </div>

              <Separator />
              
              <div className="space-y-2">
                <div className="flex justify-between">
                  <span>Subtotal:</span>
                  <span>${lastTransaction.subtotal.toFixed(2)}</span>
                </div>
                <div className="flex justify-between">
                  <span>Discount:</span>
                  <span>-${lastTransaction.discount_amount.toFixed(2)}</span>
                </div>
                <div className="flex justify-between font-bold">
                  <span>Total:</span>
                  <span>${lastTransaction.total_amount.toFixed(2)}</span>
                </div>
                <div className="flex justify-between">
                  <span>Payment:</span>
                  <span>${lastTransaction.payment_amount.toFixed(2)}</span>
                </div>
                <div className="flex justify-between">
                  <span>Change:</span>
                  <span>${lastTransaction.change_amount.toFixed(2)}</span>
                </div>
              </div>

              <div className="text-center pt-4 border-t">
                <p className="text-xs text-gray-500">Thank you for your business!</p>
              </div>
            </div>
          )}

          <div className="flex space-x-2">
            <Button variant="outline" onClick={() => setShowReceipt(false)} className="flex-1">
              Close
            </Button>
            <Button onClick={() => window.print()} className="flex-1">
              Print Receipt
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
