
import { useState, useEffect, useCallback } from 'react';
import { trpc } from '@/utils/trpc';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Separator } from '@/components/ui/separator';
import { 
  Clock, 
  Play, 
  Square, 
  DollarSign, 
  Receipt, 
  History,
  AlertCircle,
  TrendingUp,
  Calendar
} from 'lucide-react';
import type { 
  User, 
  Shift 
} from '../../../server/src/schema';

interface ShiftManagementProps {
  currentUser: User;
}

export function ShiftManagement({ currentUser }: ShiftManagementProps) {
  const [currentShift, setCurrentShift] = useState<Shift | null>(null);
  const [shiftHistory, setShiftHistory] = useState<Shift[]>([]);
  const [openingCash, setOpeningCash] = useState<number>(0);
  const [closingCash, setClosingCash] = useState<number>(0);
  const [isLoading, setIsLoading] = useState(false);
  const [showStartDialog, setShowStartDialog] = useState(false);
  const [showEndDialog, setShowEndDialog] = useState(false);

  const loadCurrentShift = useCallback(async () => {
    try {
      const shift = await trpc.getCurrentShift.query(currentUser.id);
      setCurrentShift(shift);
    } catch (error) {
      console.error('Failed to load current shift:', error);
    }
  }, [currentUser.id]);

  const loadShiftHistory = useCallback(async () => {
    try {
      const history = await trpc.getShiftHistory.query(currentUser.id);
      setShiftHistory(history);
    } catch (error) {
      console.error('Failed to load shift history:', error);
    }
  }, [currentUser.id]);

  useEffect(() => {
    loadCurrentShift();
    loadShiftHistory();
  }, [loadCurrentShift, loadShiftHistory]);

  const startShift = async () => {
    setIsLoading(true);
    try {
      const shift = await trpc.startShift.mutate({
        cashierId: currentUser.id,
        openingCash
      });
      setCurrentShift(shift);
      setOpeningCash(0);
      setShowStartDialog(false);
      await loadShiftHistory();
    } catch (error) {
      console.error('Failed to start shift:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const endShift = async () => {
    if (!currentShift) return;
    
    setIsLoading(true);
    try {
      await trpc.endShift.mutate({
        shiftId: currentShift.id,
        closingCash
      });
      setCurrentShift(null);
      setClosingCash(0);
      setShowEndDialog(false);
      await loadShiftHistory();
    } catch (error) {
      console.error('Failed to end shift:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const formatDuration = (startTime: Date, endTime?: Date) => {
    const end = endTime || new Date();
    const duration = end.getTime() - startTime.getTime();
    const hours = Math.floor(duration / (1000 * 60 * 60));
    const minutes = Math.floor((duration % (1000 * 60 * 60)) / (1000 * 60));
    return `${hours}h ${minutes}m`;
  };

  const calculateShiftSummary = () => {
    const completedShifts = shiftHistory.filter((s: Shift) => s.end_time);
    const totalShifts = completedShifts.length;
    const totalSales = completedShifts.reduce((sum: number, s: Shift) => sum + s.total_sales, 0);
    const totalTransactions = completedShifts.reduce((sum: number, s: Shift) => sum + s.transaction_count, 0);
    const averageSales = totalShifts > 0 ? totalSales / totalShifts : 0;

    return {
      totalShifts,
      totalSales,
      totalTransactions,
      averageSales
    };
  };

  const summary = calculateShiftSummary();

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex justify-between items-center">
        <div>
          <h2 className="text-2xl font-bold flex items-center space-x-2">
            <Clock className="h-6 w-6" />
            <span>Shift Management</span>
          </h2>
          <p className="text-gray-600">Track your work shifts and daily performance</p>
        </div>
        
        <div className="flex space-x-2">
          {!currentShift ? (
            <Dialog open={showStartDialog} onOpenChange={setShowStartDialog}>
              <DialogTrigger asChild>
                <Button>
                  <Play className="h-4 w-4 mr-2" />
                  Start Shift
                </Button>
              </DialogTrigger>
              <DialogContent>
                <DialogHeader>
                  <DialogTitle className="flex items-center space-x-2">
                    <Play className="h-5 w-5" />
                    <span>Start New Shift</span>
                  </DialogTitle>
                </DialogHeader>
                
                <div className="space-y-4">
                  <Alert>
                    <AlertCircle className="h-4 w-4" />
                    <AlertDescription>
                      Please count the cash in your register before starting your shift.
                    </AlertDescription>
                  </Alert>
                  
                  <div>
                    <label className="text-sm font-medium">Opening Cash Amount</label>
                    <Input
                      type="number"
                      value={openingCash}
                      onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
                        setOpeningCash(parseFloat(e.target.value) || 0)
                      }
                      placeholder="0.00"
                      min="0"
                      step="0.01"
                    />
                    <p className="text-xs text-gray-500 mt-1">
                      Enter the total cash amount in your register
                    </p>
                  </div>
                  
                  <div className="flex space-x-2">
                    <Button variant="outline" onClick={() => setShowStartDialog(false)}>
                      Cancel
                    </Button>
                    <Button onClick={startShift} disabled={isLoading}>
                      {isLoading ? 'Starting...' : 'Start Shift'}
                    </Button>
                  </div>
                </div>
              </DialogContent>
            </Dialog>
          ) : (
            <Dialog open={showEndDialog} onOpenChange={setShowEndDialog}>
              <DialogTrigger asChild>
                <Button variant="destructive">
                  <Square className="h-4 w-4 mr-2" />
                  End Shift
                </Button>
              </DialogTrigger>
              <DialogContent>
                <DialogHeader>
                  <DialogTitle className="flex items-center space-x-2">
                    <Square className="h-5 w-5" />
                    <span>End Current Shift</span>
                  </DialogTitle>
                </DialogHeader>
                
                <div className="space-y-4">
                  <Alert>
                    <AlertCircle className="h-4 w-4" />
                    <AlertDescription>
                      Please count the cash in your register before ending your shift.
                    </AlertDescription>
                  </Alert>
                  
                  <div>
                    <label className="text-sm font-medium">Closing Cash Amount</label>
                    <Input
                      type="number"
                      value={closingCash}
                      onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
                        setClosingCash(parseFloat(e.target.value) || 0)
                      }
                      placeholder="0.00"
                      min="0"
                      step="0.01"
                    />
                    <p className="text-xs text-gray-500 mt-1">
                      Enter the total cash amount in your register
                    </p>
                  </div>
                  
                  <div className="flex space-x-2">
                    <Button variant="outline" onClick={() => setShowEndDialog(false)}>
                      Cancel
                    </Button>
                    <Button onClick={endShift} disabled={isLoading} variant="destructive">
                      {isLoading ? 'Ending...' : 'End Shift'}
                    </Button>
                  </div>
                </div>
              </DialogContent>
            </Dialog>
          )}
        </div>
      </div>

      {/* Current Shift Status */}
      {currentShift ? (
        <Card className="border-green-200 bg-green-50">
          <CardHeader>
            <CardTitle className="flex items-center justify-between">
              <div className="flex items-center space-x-2">
                <Clock className="h-5 w-5 text-green-600" />
                <span>Current Shift - Active</span>
              </div>
              <Badge variant="default" className="bg-green-600">
                Active
              </Badge>
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
              <div>
                <p className="text-sm font-medium text-gray-700">Started At</p>
                <p className="text-lg font-bold">
                  {currentShift.start_time.toLocaleTimeString()}
                </p>
                <p className="text-xs text-gray-500">
                  {currentShift.start_time.toLocaleDateString()}
                </p>
              </div>
              
              <div>
                <p className="text-sm font-medium text-gray-700">Duration</p>
                <p className="text-lg font-bold">
                  {formatDuration(currentShift.start_time)}
                </p>
              </div>
              
              <div>
                <p className="text-sm font-medium text-gray-700">Sales Today</p>
                <p className="text-lg font-bold text-green-600">
                  ${currentShift.total_sales.toFixed(2)}
                </p>
              </div>
              
              <div>
                <p className="text-sm font-medium text-gray-700">Transactions</p>
                <p className="text-lg font-bold">
                  {currentShift.transaction_count}
                </p>
              </div>
            </div>
            
            <Separator className="my-4" />
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <p className="text-sm font-medium text-gray-700">Opening Cash</p>
                <p className="text-lg font-bold">${currentShift.opening_cash.toFixed(2)}</p>
              </div>
              
              <div>
                <p className="text-sm font-medium text-gray-700">Expected Cash</p>
                <p className="text-lg font-bold">
                  ${(currentShift.opening_cash + currentShift.total_sales).toFixed(2)}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      ) : (
        <Card className="border-gray-200">
          <CardContent className="p-8 text-center">
            <Clock className="h-12 w-12 text-gray-400 mx-auto mb-4" />
            <h3 className="text-lg font-medium text-gray-900 mb-2">No Active Shift</h3>
            <p className="text-gray-600 mb-4">Start a new shift to begin tracking your sales and transactions.</p>
          </CardContent>
        </Card>
      )}

      {/* Summary Statistics */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card>
          <CardContent className="p-6">
            <div className="flex items-center space-x-2">
              <Calendar className="h-8 w-8 text-blue-600" />
              <div>
                <p className="text-2xl font-bold">{summary.totalShifts}</p>
                <p className="text-sm text-gray-600">Total Shifts</p>
              </div>
            </div>
          </CardContent>
        </Card>
        
        <Card>
          <CardContent className="p-6">
            <div className="flex items-center space-x-2">
              <DollarSign className="h-8 w-8 text-green-600" />
              <div>
                <p className="text-2xl font-bold">${summary.totalSales.toFixed(2)}</p>
                <p className="text-sm text-gray-600">Total Sales</p>
              </div>
            </div>
          </CardContent>
        </Card>
        
        <Card>
          <CardContent className="p-6">
            <div className="flex items-center space-x-2">
              <Receipt className="h-8 w-8 text-purple-600" />
              <div>
                <p className="text-2xl font-bold">{summary.totalTransactions}</p>
                <p className="text-sm text-gray-600">Total Transactions</p>
              </div>
            </div>
          </CardContent>
        </Card>
        
        <Card>
          <CardContent className="p-6">
            <div className="flex items-center space-x-2">
              <TrendingUp className="h-8 w-8 text-orange-600" />
              <div>
                <p className="text-2xl font-bold">${summary.averageSales.toFixed(2)}</p>
                <p className="text-sm text-gray-600">Average per Shift</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Shift History */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center space-x-2">
            <History className="h-5 w-5" />
            <span>Shift History</span>
          </CardTitle>
        </CardHeader>
        <CardContent>
          {shiftHistory.length === 0 ? (
            <div className="text-center py-8">
              <Clock className="h-12 w-12 text-gray-400 mx-auto mb-4" />
              <p className="text-gray-600">No shift history available.</p>
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Date</TableHead>
                  <TableHead>Start Time</TableHead>
                  <TableHead>End Time</TableHead>
                  <TableHead>Duration</TableHead>
                  <TableHead>Sales</TableHead>
                  <TableHead>Transactions</TableHead>
                  <TableHead>Cash Status</TableHead>
                  <TableHead>Status</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {shiftHistory.map((shift: Shift) => (
                  <TableRow key={shift.id}>
                    <TableCell>
                      {shift.start_time.toLocaleDateString()}
                    </TableCell>
                    <TableCell>
                      {shift.start_time.toLocaleTimeString()}
                    </TableCell>
                    <TableCell>
                      {shift.end_time ? shift.end_time.toLocaleTimeString() : '-'}
                    </TableCell>
                    <TableCell>
                      {shift.end_time ? formatDuration(shift.start_time, shift.end_time) : formatDuration(shift.start_time)}
                    </TableCell>
                    <TableCell className="font-bold text-green-600">
                      ${shift.total_sales.toFixed(2)}
                    </TableCell>
                    <TableCell>{shift.transaction_count}</TableCell>
                    <TableCell>
                      {shift.closing_cash !== null ? (
                        <div className="text-xs">
                          <div>Open: ${shift.opening_cash.toFixed(2)}</div>
                          <div>Close: ${shift.closing_cash.toFixed(2)}</div>
                          <div className={
                            shift.closing_cash - shift.opening_cash === shift.total_sales 
                              ? 'text-green-600' 
                              : 'text-red-600'
                          }>
                            Diff: ${(shift.closing_cash - shift.opening_cash - shift.total_sales).toFixed(2)}
                          </div>
                        </div>
                      ) : (
                        <span className="text-gray-500">Active</span>
                      )}
                    </TableCell>
                    <TableCell>
                      <Badge variant={shift.end_time ? 'default' : 'secondary'}>
                        {shift.end_time ? 'Completed' : 'Active'}
                      </Badge>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
