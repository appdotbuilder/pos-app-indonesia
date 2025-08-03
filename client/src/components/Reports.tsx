
import { useState, useEffect, useCallback } from 'react';
import { trpc } from '@/utils/trpc';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { 
  BarChart3, 
  TrendingUp, 
  DollarSign, 
  Calendar, 
  Download,
  Package,
  Trophy,
  AlertTriangle
} from 'lucide-react';

interface DashboardStats {
  totalRevenue?: number;
  totalTransactions?: number;
  totalProducts?: number;
  lowStockItems?: number;
}

interface SalesReport {
  totalRevenue?: number;
  totalTransactions?: number;
  averageTransaction?: number;
}

interface TopProduct {
  id?: number;
  name?: string;
  quantity_sold?: number;
  revenue?: number;
}

interface ProfitReport {
  grossRevenue?: number;
  totalDiscounts?: number;
  netRevenue?: number;
  profitMargin?: number;
}

interface InventoryItem {
  id: number;
  variant_name?: string;
  sku?: string;
  stock_quantity?: number;
  low_stock_threshold?: number;
  price?: number;
}

export function Reports() {
  const [dashboardStats, setDashboardStats] = useState<DashboardStats | null>(null);
  const [salesReport, setSalesReport] = useState<SalesReport | null>(null);
  const [topProducts, setTopProducts] = useState<TopProduct[]>([]);
  const [profitReport, setProfitReport] = useState<ProfitReport | null>(null);
  const [inventoryReport, setInventoryReport] = useState<InventoryItem[]>([]);
  const [isLoading, setIsLoading] = useState(false);

  // Date filters
  const [startDate, setStartDate] = useState(() => {
    const date = new Date();
    date.setDate(date.getDate() - 30); // Last 30 days
    return date.toISOString().split('T')[0];
  });
  
  const [endDate, setEndDate] = useState(() => {
    return new Date().toISOString().split('T')[0];
  });

  const loadDashboardStats = useCallback(async () => {
    try {
      const stats = await trpc.getDashboardStats.query();
      setDashboardStats(stats);
    } catch (error) {
      console.error('Failed to load dashboard stats:', error);
    }
  }, []);

  const loadSalesReport = useCallback(async () => {
    setIsLoading(true);
    try {
      const report = await trpc.getSalesReport.query({
        start_date: startDate,
        end_date: endDate
      });
      setSalesReport(report);
    } catch (error) {
      console.error('Failed to load sales report:', error);
    } finally {
      setIsLoading(false);
    }
  }, [startDate, endDate]);

  const loadTopProducts = useCallback(async () => {
    try {
      const products = await trpc.getTopSellingProducts.query(10);
      setTopProducts(products);
    } catch (error) {
      console.error('Failed to load top products:', error);
    }
  }, []);

  const loadProfitReport = useCallback(async () => {
    try {
      const report = await trpc.getProfitReport.query({
        startDate,
        endDate
      });
      setProfitReport(report);
    } catch (error) {
      console.error('Failed to load profit report:', error);
    }
  }, [startDate, endDate]);

  const loadInventoryReport = useCallback(async () => {
    try {
      const report = await trpc.getInventoryReport.query({
        low_stock_only: false
      });
      setInventoryReport(report);
    } catch (error) {
      console.error('Failed to load inventory report:', error);
    }
  }, []);

  useEffect(() => {
    loadDashboardStats();
    loadTopProducts();
    loadInventoryReport();
  }, [loadDashboardStats, loadTopProducts, loadInventoryReport]);

  useEffect(() => {
    loadSalesReport();
    loadProfitReport();
  }, [loadSalesReport, loadProfitReport]);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex justify-between items-center">
        <div>
          <h2 className="text-2xl font-bold flex items-center space-x-2">
            <BarChart3 className="h-6 w-6" />
            <span>Reports & Analytics</span>
          </h2>
          <p className="text-gray-600">Business insights and performance metrics</p>
        </div>
        
        <div className="flex items-center space-x-2">
          <Input
            type="date"
            value={startDate}
            onChange={(e: React.ChangeEvent<HTMLInputElement>) => setStartDate(e.target.value)}
            className="w-auto"
          />
          <span className="text-sm text-gray-500">to</span>
          <Input
            type="date"
            value={endDate}
            onChange={(e: React.ChangeEvent<HTMLInputElement>) => setEndDate(e.target.value)}
            className="w-auto"
          />
          <Button variant="outline">
            <Download className="h-4 w-4 mr-2" />
            Export
          </Button>
        </div>
      </div>

      {/* Dashboard Overview */}
      {dashboardStats && (
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <Card>
            <CardContent className="p-6">
              <div className="flex items-center space-x-2">
                <DollarSign className="h-8 w-8 text-green-600" />
                <div>
                  <p className="text-2xl font-bold">${dashboardStats.totalRevenue?.toFixed(2) || '0.00'}</p>
                  <p className="text-sm text-gray-600">Total Revenue</p>
                </div>
              </div>
            </CardContent>
          </Card>
          
          <Card>
            <CardContent className="p-6">
              <div className="flex items-center space-x-2">
                <TrendingUp className="h-8 w-8 text-blue-600" />
                <div>
                  <p className="text-2xl font-bold">{dashboardStats.totalTransactions || 0}</p>
                  <p className="text-sm text-gray-600">Total Sales</p>
                </div>
              </div>
            </CardContent>
          </Card>
          
          <Card>
            <CardContent className="p-6">
              <div className="flex items-center space-x-2">
                <Package className="h-8 w-8 text-purple-600" />
                <div>
                  <p className="text-2xl font-bold">{dashboardStats.totalProducts || 0}</p>
                  <p className="text-sm text-gray-600">Products</p>
                </div>
              </div>
            </CardContent>
          </Card>
          
          <Card>
            <CardContent className="p-6">
              <div className="flex items-center space-x-2">
                <AlertTriangle className="h-8 w-8 text-orange-600" />
                <div>
                  <p className="text-2xl font-bold">{dashboardStats.lowStockItems || 0}</p>
                  <p className="text-sm text-gray-600">Low Stock</p>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Reports Tabs */}
      <Tabs defaultValue="sales" className="space-y-4">
        <TabsList>
          <TabsTrigger value="sales">Sales Report</TabsTrigger>
          <TabsTrigger value="products">Top Products</TabsTrigger>
          <TabsTrigger value="profit">Profit Analysis</TabsTrigger>
          <TabsTrigger value="inventory">Inventory Report</TabsTrigger>
        </TabsList>

        {/* Sales Report */}
        <TabsContent value="sales" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center space-x-2">
                <Calendar className="h-5 w-5" />
                <span>Sales Report ({startDate} to {endDate})</span>
              </CardTitle>
            </CardHeader>
            <CardContent>
              {isLoading ? (
                <div className="text-center py-8">
                  <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto"></div>
                  <p className="mt-2 text-gray-600">Loading sales report...</p>
                </div>
              ) : salesReport ? (
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <div className="text-center p-4 bg-green-50 rounded-lg">
                    <p className="text-2xl font-bold text-green-600">
                      ${salesReport.totalRevenue?.toFixed(2) || '0.00'}
                    </p>
                    <p className="text-sm text-gray-600">Total Revenue</p>
                  </div>
                  <div className="text-center p-4 bg-blue-50 rounded-lg">
                    <p className="text-2xl font-bold text-blue-600">
                      {salesReport.totalTransactions || 0}
                    </p>
                    <p className="text-sm text-gray-600">Total Transactions</p>
                  </div>
                  <div className="text-center p-4 bg-purple-50 rounded-lg">
                    <p className="text-2xl font-bold text-purple-600">
                      ${salesReport.averageTransaction?.toFixed(2) || '0.00'}
                    </p>
                    <p className="text-sm text-gray-600">Average Transaction</p>
                  </div>
                </div>
              ) : (
                <p className="text-center text-gray-600 py-8">No sales data available for the selected period.</p>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* Top Products */}
        <TabsContent value="products" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center space-x-2">
                <Trophy className="h-5 w-5" />
                <span>Top Selling Products</span>
              </CardTitle>
            </CardHeader>
            <CardContent>
              {topProducts.length === 0 ? (
                <div className="text-center py-8">
                  <Trophy className="h-12 w-12 text-gray-400 mx-auto mb-4" />
                  <p className="text-gray-600">No product sales data available.</p>
                </div>
              ) : (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Rank</TableHead>
                      <TableHead>Product</TableHead>
                      <TableHead>Quantity Sold</TableHead>
                      <TableHead>Revenue</TableHead>
                      <TableHead>Performance</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {topProducts.map((product: TopProduct, index: number) => (
                      <TableRow key={product.id || index}>
                        <TableCell>
                          <div className="flex items-center space-x-2">
                            <Badge variant={index < 3 ? 'default' : 'secondary'}>
                              #{index + 1}
                            </Badge>
                            {index === 0 && <Trophy className="h-4 w-4 text-yellow-500" />}
                          </div>
                        </TableCell>
                        <TableCell className="font-medium">
                          {product.name || 'Product Name'}
                        </TableCell>
                        <TableCell>{product.quantity_sold || 0}</TableCell>
                        <TableCell className="font-bold">
                          ${product.revenue?.toFixed(2) || '0.00'}
                        </TableCell>
                        <TableCell>
                          <div className="w-full bg-gray-200 rounded-full h-2">
                            <div
                              className="bg-blue-600 h-2 rounded-full"
                              style={{
                                width: `${Math.min(100, (product.quantity_sold || 0) * 10)}%`
                              }}
                            ></div>
                          </div>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* Profit Analysis */}
        <TabsContent value="profit" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center space-x-2">
                <DollarSign className="h-5 w-5" />
                <span>Profit Analysis ({startDate} to {endDate})</span>
              </CardTitle>
            </CardHeader>
            <CardContent>
              {profitReport ? (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div className="space-y-4">
                    <div className="p-4 bg-green-50 rounded-lg">
                      <p className="text-lg font-semibold text-green-800">Gross Revenue</p>
                      <p className="text-2xl font-bold text-green-600">
                        ${profitReport.grossRevenue?.toFixed(2) || '0.00'}
                      </p>
                    </div>
                    
                    <div className="p-4 bg-red-50 rounded-lg">
                      <p className="text-lg font-semibold text-red-800">Total Discounts</p>
                      <p className="text-2xl font-bold text-red-600">
                        ${profitReport.totalDiscounts?.toFixed(2) || '0.00'}
                      </p>
                    </div>
                  </div>
                  
                  <div className="space-y-4">
                    <div className="p-4 bg-blue-50 rounded-lg">
                      <p className="text-lg font-semibold text-blue-800">Net Revenue</p>
                      <p className="text-2xl font-bold text-blue-600">
                        ${profitReport.netRevenue?.toFixed(2) || '0.00'}
                      </p>
                    </div>
                    
                    <div className="p-4 bg-purple-50 rounded-lg">
                      <p className="text-lg font-semibold text-purple-800">Profit Margin</p>
                      <p className="text-2xl font-bold text-purple-600">
                        {profitReport.profitMargin?.toFixed(1) || '0.0'}%
                      </p>
                    </div>
                  </div>
                </div>
              ) : (
                <p className="text-center text-gray-600 py-8">No profit data available for the selected period.</p>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* Inventory Report */}
        <TabsContent value="inventory" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center space-x-2">
                <Package className="h-5 w-5" />
                <span>Inventory Status</span>
              </CardTitle>
            </CardHeader>
            <CardContent>
              {inventoryReport.length === 0 ? (
                <div className="text-center py-8">
                  <Package className="h-12 w-12 text-gray-400 mx-auto mb-4" />
                  <p className="text-gray-600">No inventory data available.</p>
                </div>
              ) : (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Product</TableHead>
                      <TableHead>SKU</TableHead>
                      <TableHead>Current Stock</TableHead>
                      <TableHead>Low Stock Threshold</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead>Value</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {inventoryReport.map((item: InventoryItem) => (
                      <TableRow key={item.id}>
                        <TableCell className="font-medium">
                          {item.variant_name || 'Product Name'}
                        </TableCell>
                        <TableCell className="font-mono text-sm">
                          {item.sku || 'N/A'}
                        </TableCell>
                        <TableCell>{item.stock_quantity || 0}</TableCell>
                        <TableCell>{item.low_stock_threshold || 0}</TableCell>
                        <TableCell>
                          <Badge
                            variant={
                              (item.stock_quantity || 0) === 0
                                ? 'destructive'
                                : (item.stock_quantity || 0) <= (item.low_stock_threshold || 0)
                                ? 'secondary'
                                : 'default'
                            }
                          >
                            {(item.stock_quantity || 0) === 0
                              ? 'Out of Stock'
                              : (item.stock_quantity || 0) <= (item.low_stock_threshold || 0)
                              ? 'Low Stock'
                              : 'In Stock'}
                          </Badge>
                        </TableCell>
                        <TableCell className="font-medium">
                          ${((item.stock_quantity || 0) * (item.price || 0)).toFixed(2)}
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
