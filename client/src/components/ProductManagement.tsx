
import { useState, useEffect, useCallback } from 'react';
import { trpc } from '@/utils/trpc';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { 
  Package, 
  Plus, 
  Edit, 
  AlertTriangle, 
  TrendingUp, 
  Search,
  PackagePlus 
} from 'lucide-react';
import type { 
  Product, 
  ProductVariant, 
  CreateProductInput, 
  CreateProductVariantInput 
} from '../../../server/src/schema';

interface ProductManagementProps {
  onStockUpdate: () => void;
}

export function ProductManagement({ onStockUpdate }: ProductManagementProps) {
  const [products, setProducts] = useState<Product[]>([]);
  const [productVariants, setProductVariants] = useState<ProductVariant[]>([]);
  const [lowStockVariants, setLowStockVariants] = useState<ProductVariant[]>([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  // Product form state
  const [productForm, setProductForm] = useState<CreateProductInput>({
    name: '',
    description: null,
    category_id: null,
    base_price: 0
  });

  // Variant form state
  const [variantForm, setVariantForm] = useState<CreateProductVariantInput>({
    product_id: 0,
    variant_name: '',
    sku: '',
    price: 0,
    stock_quantity: 0,
    low_stock_threshold: 10,
    size: null,
    color: null,
    type: null
  });

  const [showProductDialog, setShowProductDialog] = useState(false);
  const [showVariantDialog, setShowVariantDialog] = useState(false);

  const loadData = useCallback(async () => {
    try {
      const [productsData, variantsData, lowStockData] = await Promise.all([
        trpc.getProducts.query(),
        trpc.getProductVariants.query(),
        trpc.getLowStockVariants.query()
      ]);
      
      setProducts(productsData);
      setProductVariants(variantsData);
      setLowStockVariants(lowStockData);
    } catch (error) {
      console.error('Failed to load product data:', error);
    }
  }, []);

  useEffect(() => {
    loadData();
  }, [loadData]);

  const createProduct = async () => {
    setIsLoading(true);
    try {
      const newProduct = await trpc.createProduct.mutate(productForm);
      setProducts((prev: Product[]) => [...prev, newProduct]);
      setProductForm({
        name: '',
        description: null,
        category_id: null,
        base_price: 0
      });
      setShowProductDialog(false);
    } catch (error) {
      console.error('Failed to create product:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const createProductVariant = async () => {
    setIsLoading(true);
    try {
      const newVariant = await trpc.createProductVariant.mutate(variantForm);
      setProductVariants((prev: ProductVariant[]) => [...prev, newVariant]);
      setVariantForm({
        product_id: 0,
        variant_name: '',
        sku: '',
        price: 0,
        stock_quantity: 0,
        low_stock_threshold: 10,
        size: null,
        color: null,
        type: null
      });
      setShowVariantDialog(false);
      onStockUpdate();
      await loadData();
    } catch (error) {
      console.error('Failed to create product variant:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const updateStock = async (variantId: number, quantity: number) => {
    try {
      await trpc.updateStock.mutate({ variantId, quantity });
      await loadData();
      onStockUpdate();
    } catch (error) {
      console.error('Failed to update stock:', error);
    }
  };

  const filteredVariants = productVariants.filter((variant: ProductVariant) =>
    variant.variant_name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    variant.sku.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const getProductName = (productId: number) => {
    const product = products.find((p: Product) => p.id === productId);
    return product?.name || 'Unknown Product';
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex justify-between items-center">
        <div>
          <h2 className="text-2xl font-bold flex items-center space-x-2">
            <Package className="h-6 w-6" />
            <span>Product Management</span>
          </h2>
          <p className="text-gray-600">Manage your products, variants, and inventory</p>
        </div>
        
        <div className="flex space-x-2">
          <Dialog open={showProductDialog} onOpenChange={setShowProductDialog}>
            <DialogTrigger asChild>
              <Button>
                <Plus className="h-4 w-4 mr-2" />
                Add Product
              </Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Create New Product</DialogTitle>
              </DialogHeader>
              <div className="space-y-4">
                <div>
                  <label className="text-sm font-medium">Product Name</label>
                  <Input
                    value={productForm.name}
                    onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
                      setProductForm((prev: CreateProductInput) => ({ ...prev, name: e.target.value }))
                    }
                    placeholder="Enter product name"
                    required
                  />
                </div>
                
                <div>
                  <label className="text-sm font-medium">Description</label>
                  <Input
                    value={productForm.description || ''}
                    onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
                      setProductForm((prev: CreateProductInput) => ({ 
                        ...prev, 
                        description: e.target.value || null 
                      }))
                    }
                    placeholder="Product description (optional)"
                  />
                </div>
                
                <div>
                  <label className="text-sm font-medium">Base Price</label>
                  <Input
                    type="number"
                    value={productForm.base_price}
                    onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
                      setProductForm((prev: CreateProductInput) => ({ 
                        ...prev, 
                        base_price: parseFloat(e.target.value) || 0 
                      }))
                    }
                    placeholder="0.00"
                    min="0"
                    step="0.01"
                    required
                  />
                </div>
                
                <div className="flex space-x-2">
                  <Button variant="outline" onClick={() => setShowProductDialog(false)}>
                    Cancel
                  </Button>
                  <Button onClick={createProduct} disabled={isLoading}>
                    {isLoading ? 'Creating...' : 'Create Product'}
                  </Button>
                </div>
              </div>
            </DialogContent>
          </Dialog>

          <Dialog open={showVariantDialog} onOpenChange={setShowVariantDialog}>
            <DialogTrigger asChild>
              <Button variant="outline">
                <PackagePlus className="h-4 w-4 mr-2" />
                Add Variant
              </Button>
            </DialogTrigger>
            <DialogContent className="max-w-md">
              <DialogHeader>
                <DialogTitle>Create Product Variant</DialogTitle>
              </DialogHeader>
              <div className="space-y-4">
                <div>
                  <label className="text-sm font-medium">Product</label>
                  <select
                    value={variantForm.product_id}
                    onChange={(e) =>
                      setVariantForm((prev: CreateProductVariantInput) => ({ 
                        ...prev, 
                        product_id: parseInt(e.target.value) 
                      }))
                    }
                    className="w-full p-2 border rounded-md"
                    required
                  >
                    <option value={0}>Select a product</option>
                    {products.map((product: Product) => (
                      <option key={product.id} value={product.id}>
                        {product.name}
                      </option>
                    ))}
                  </select>
                </div>
                
                <div>
                  <label className="text-sm font-medium">Variant Name</label>
                  <Input
                    value={variantForm.variant_name}
                    onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
                      setVariantForm((prev: CreateProductVariantInput) => ({ 
                        ...prev, 
                        variant_name: e.target.value 
                      }))
                    }
                    placeholder="e.g., Red T-Shirt Large"
                    required
                  />
                </div>
                
                <div>
                  <label className="text-sm font-medium">SKU</label>
                  <Input
                    value={variantForm.sku}
                    onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
                      setVariantForm((prev: CreateProductVariantInput) => ({ ...prev, sku: e.target.value }))
                    }
                    placeholder="Product SKU"
                    required
                  />
                </div>
                
                <div className="grid grid-cols-2 gap-2">
                  <div>
                    <label className="text-sm font-medium">Price</label>
                    <Input
                      type="number"
                      value={variantForm.price}
                      onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
                        setVariantForm((prev: CreateProductVariantInput) => ({ 
                          ...prev, 
                          price: parseFloat(e.target.value) || 0 
                        }))
                      }
                      min="0"
                      step="0.01"
                      required
                    />
                  </div>
                  
                  <div>
                    <label className="text-sm font-medium">Stock</label>
                    <Input
                      type="number"
                      value={variantForm.stock_quantity}
                      onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
                        setVariantForm((prev: CreateProductVariantInput) => ({ 
                          ...prev, 
                          stock_quantity: parseInt(e.target.value) || 0 
                        }))
                      }
                      min="0"
                      required
                    />
                  </div>
                </div>
                
                <div>
                  <label className="text-sm font-medium">Low Stock Threshold</label>
                  <Input
                    type="number"
                    value={variantForm.low_stock_threshold}
                    onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
                      setVariantForm((prev: CreateProductVariantInput) => ({ 
                        ...prev, 
                        low_stock_threshold: parseInt(e.target.value) || 0 
                      }))
                    }
                    min="0"
                  />
                </div>
                
                <div className="grid grid-cols-3 gap-2">
                  <div>
                    <label className="text-sm font-medium">Size</label>
                    <Input
                      value={variantForm.size || ''}
                      onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
                        setVariantForm((prev: CreateProductVariantInput) => ({ 
                          ...prev, 
                          size: e.target.value || null 
                        }))
                      }
                      placeholder="S, M, L..."
                    />
                  </div>
                  
                  <div>
                    <label className="text-sm font-medium">Color</label>
                    <Input
                      value={variantForm.color || ''}
                      onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
                        setVariantForm((prev: CreateProductVariantInput) => ({ 
                          ...prev, 
                          color: e.target.value || null 
                        }))
                      }
                      placeholder="Red, Blue..."
                    />
                  </div>
                  
                  <div>
                    <label className="text-sm font-medium">Type</label>
                    <Input
                      value={variantForm.type || ''}
                      onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
                        setVariantForm((prev: CreateProductVariantInput) => ({ 
                          ...prev, 
                          type: e.target.value || null 
                        }))
                      }
                      placeholder="Regular, Premium..."
                    />
                  </div>
                </div>
                
                <div className="flex space-x-2">
                  <Button variant="outline" onClick={() => setShowVariantDialog(false)}>
                    Cancel
                  </Button>
                  <Button onClick={createProductVariant} disabled={isLoading}>
                    {isLoading ? 'Creating...' : 'Create Variant'}
                  </Button>
                </div>
              </div>
            </DialogContent>
          </Dialog>
        </div>
      </div>

      {/* Overview Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card>
          <CardContent className="p-6">
            <div className="flex items-center space-x-2">
              <Package className="h-8 w-8 text-blue-600" />
              <div>
                <p className="text-2xl font-bold">{products.length}</p>
                <p className="text-sm text-gray-600">Total Products</p>
              </div>
            </div>
          </CardContent>
        </Card>
        
        <Card>
          <CardContent className="p-6">
            <div className="flex items-center space-x-2">
              <PackagePlus className="h-8 w-8 text-green-600" />
              <div>
                <p className="text-2xl font-bold">{productVariants.length}</p>
                <p className="text-sm text-gray-600">Product Variants</p>
              </div>
            </div>
          </CardContent>
        </Card>
        
        <Card>
          <CardContent className="p-6">
            <div className="flex items-center space-x-2">
              <AlertTriangle className="h-8 w-8 text-red-600" />
              <div>
                <p className="text-2xl font-bold">{lowStockVariants.length}</p>
                <p className="text-sm text-gray-600">Low Stock Items</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Low Stock Alert */}
      {lowStockVariants.length > 0 && (
        <Alert>
          <AlertTriangle className="h-4 w-4" />
          <AlertDescription>
            <strong>{lowStockVariants.length} items</strong> are running low on stock and need restocking.
          </AlertDescription>
        </Alert>
      )}

      {/* Main Content */}
      <Tabs defaultValue="variants" className="space-y-4">
        <TabsList>
          <TabsTrigger value="variants">Product Variants</TabsTrigger>
          <TabsTrigger value="products">Products</TabsTrigger>
          <TabsTrigger value="low-stock">Low Stock</TabsTrigger>
        </TabsList>

        {/* Product Variants Tab */}
        <TabsContent value="variants" className="space-y-4">
          <div className="flex items-center space-x-2">
            <Search className="h-4 w-4 text-gray-500" />
            <Input
              placeholder="Search variants by name or SKU..."
              value={searchTerm}
              onChange={(e: React.ChangeEvent<HTMLInputElement>) => setSearchTerm(e.target.value)}
              className="max-w-md"
            />
          </div>

          <Card>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Variant</TableHead>
                  <TableHead>Product</TableHead>
                  <TableHead>SKU</TableHead>
                  <TableHead>Price</TableHead>
                  <TableHead>Stock</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredVariants.map((variant: ProductVariant) => (
                  <TableRow key={variant.id}>
                    <TableCell>
                      <div>
                        <p className="font-medium">{variant.variant_name}</p>
                        <div className="flex space-x-1 mt-1">
                          {variant.size && (
                            <Badge variant="outline" className="text-xs">
                              {variant.size}
                            </Badge>
                          )}
                          {variant.color && (
                            <Badge variant="outline" className="text-xs">
                              {variant.color}
                            </Badge>
                          )}
                        </div>
                      </div>
                    </TableCell>
                    <TableCell>{getProductName(variant.product_id)}</TableCell>
                    <TableCell className="font-mono text-sm">{variant.sku}</TableCell>
                    <TableCell>${variant.price.toFixed(2)}</TableCell>
                    <TableCell>
                      <div className="flex items-center space-x-2">
                        <span>{variant.stock_quantity}</span>
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => {
                            const quantity = prompt('Enter new stock quantity:', variant.stock_quantity.toString());
                            if (quantity !== null) {
                              updateStock(variant.id, parseInt(quantity) || 0);
                            }
                          }}
                        >
                          <Edit className="h-3 w-3" />
                        </Button>
                      </div>
                    </TableCell>
                    <TableCell>
                      <Badge
                        variant={
                          variant.stock_quantity === 0
                            ? 'destructive'
                            : variant.stock_quantity <= variant.low_stock_threshold
                            ? 'secondary'
                            : 'default'
                        }
                      >
                        {variant.stock_quantity === 0
                          ? 'Out of Stock'
                          : variant.stock_quantity <= variant.low_stock_threshold
                          ? 'Low Stock'
                          : 'In Stock'}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => {
                          const quantity = prompt('Add stock quantity:', '0');
                          if (quantity !== null) {
                            updateStock(variant.id, variant.stock_quantity + (parseInt(quantity) || 0));
                          }
                        }}
                      >
                        <TrendingUp className="h-3 w-3" />
                      </Button>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </Card>
        </TabsContent>

        {/* Products Tab */}
        <TabsContent value="products">
          <Card>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Product Name</TableHead>
                  <TableHead>Description</TableHead>
                  <TableHead>Base Price</TableHead>
                  <TableHead>Variants</TableHead>
                  <TableHead>Created</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {products.map((product: Product) => (
                  <TableRow key={product.id}>
                    <TableCell className="font-medium">{product.name}</TableCell>
                    <TableCell>{product.description || 'No description'}</TableCell>
                    <TableCell>${product.base_price.toFixed(2)}</TableCell>
                    <TableCell>
                      <Badge>
                        {productVariants.filter((v: ProductVariant) => v.product_id === product.id).length} variants
                      </Badge>
                    </TableCell>
                    <TableCell>{product.created_at.toLocaleDateString()}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </Card>
        </TabsContent>

        {/* Low Stock Tab */}
        <TabsContent value="low-stock">
          {lowStockVariants.length === 0 ? (
            <Card>
              <CardContent className="p-8 text-center">
                <Package className="h-12 w-12 text-gray-400 mx-auto mb-4" />
                <p className="text-gray-600">No low stock items! All products are well stocked.</p>
              </CardContent>
            </Card>
          ) : (
            <Card>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Variant</TableHead>
                    <TableHead>Current Stock</TableHead>
                    <TableHead>Threshold</TableHead>
                    <TableHead>Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {lowStockVariants.map((variant: ProductVariant) => (
                    <TableRow key={variant.id}>
                      <TableCell>
                        <div>
                          <p className="font-medium">{variant.variant_name}</p>
                          <p className="text-sm text-gray-500">SKU: {variant.sku}</p>
                        </div>
                      </TableCell>
                      <TableCell>
                        <Badge variant="destructive">
                          {variant.stock_quantity}
                        </Badge>
                      </TableCell>
                      <TableCell>{variant.low_stock_threshold}</TableCell>
                      <TableCell>
                        <Button
                          size="sm"
                          onClick={() => {
                            const quantity = prompt('Add stock quantity:', '0');
                            if (quantity !== null) {
                              updateStock(variant.id, variant.stock_quantity + (parseInt(quantity) || 0));
                            }
                          }}
                        >
                          Restock
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </Card>
          )}
        </TabsContent>
      </Tabs>
    </div>
  );
}
