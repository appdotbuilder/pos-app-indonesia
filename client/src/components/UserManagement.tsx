
import { useState, useEffect, useCallback } from 'react';
import { trpc } from '@/utils/trpc';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Switch } from '@/components/ui/switch';
import { 
  UserCheck, 
  Plus, 
  Search, 
  Crown, 
  Target, 
  Briefcase,
  Mail,
  Calendar
} from 'lucide-react';
import type { 
  User, 
  CreateUserInput,
  UserRole
} from '../../../server/src/schema';

export function UserManagement() {
  const [users, setUsers] = useState<User[]>([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [showCreateDialog, setShowCreateDialog] = useState(false);

  const [userForm, setUserForm] = useState<CreateUserInput>({
    username: '',
    email: '',
    password: '',
    full_name: '',
    role: 'cashier'
  });

  const loadUsers = useCallback(async () => {
    try {
      const usersData = await trpc.getUsers.query();
      setUsers(usersData);
    } catch (error) {
      console.error('Failed to load users:', error);
    }
  }, []);

  useEffect(() => {
    loadUsers();
  }, [loadUsers]);

  const createUser = async () => {
    setIsLoading(true);
    try {
      const newUser = await trpc.createUser.mutate(userForm);
      setUsers((prev: User[]) => [...prev, newUser]);
      
      setUserForm({
        username: '',
        email: '',
        password: '',
        full_name: '',
        role: 'cashier'
      });
      setShowCreateDialog(false);
    } catch (error) {
      console.error('Failed to create user:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const toggleUserStatus = async (userId: number, isActive: boolean) => {
    try {
      await trpc.updateUserStatus.mutate({ id: userId, isActive });
      setUsers((prev: User[]) =>
        prev.map((user: User) =>
          user.id === userId ? { ...user, is_active: isActive } : user
        )
      );
    } catch (error) {
      console.error('Failed to update user status:', error);
    }
  };

  const filteredUsers = users.filter((user: User) =>
    user.username.toLowerCase().includes(searchTerm.toLowerCase()) ||
    user.full_name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    user.email.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const getRoleIcon = (role: UserRole) => {
    switch (role) {
      case 'admin':
        return <Crown className="h-4 w-4 text-yellow-600" />;
      case 'manager':
        return <Target className="h-4 w-4 text-blue-600" />;
      case 'cashier':
        return <Briefcase className="h-4 w-4 text-green-600" />;
      default:
        return null;
    }
  };

  const getRoleBadgeVariant = (role: UserRole) => {
    switch (role) {
      case 'admin':
        return 'default';
      case 'manager':
        return 'secondary';
      case 'cashier':
        return 'outline';
      default:
        return 'outline';
    }
  };

  const roleStats = {
    admin: users.filter((u: User) => u.role === 'admin').length,
    manager: users.filter((u: User) => u.role === 'manager').length,
    cashier: users.filter((u: User) => u.role === 'cashier').length,
    active: users.filter((u: User) => u.is_active).length
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex justify-between items-center">
        <div>
          <h2 className="text-2xl font-bold flex items-center space-x-2">
            <UserCheck className="h-6 w-6" />
            <span>Staff Management</span>
          </h2>
          <p className="text-gray-600">Manage system users and their access levels</p>
        </div>
        
        <Dialog open={showCreateDialog} onOpenChange={setShowCreateDialog}>
          <DialogTrigger asChild>
            <Button>
              <Plus className="h-4 w-4 mr-2" />
              Add User
            </Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Create New User</DialogTitle>
            </DialogHeader>
            
            <div className="space-y-4">
              <div>
                <label className="text-sm font-medium">Username *</label>
                <Input
                  value={userForm.username}
                  onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
                    setUserForm((prev: CreateUserInput) => ({ ...prev, username: e.target.value }))
                  }
                  placeholder="Enter username"
                  required
                />
              </div>
              
              <div>
                <label className="text-sm font-medium">Full Name *</label>
                <Input
                  value={userForm.full_name}
                  onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
                    setUserForm((prev: CreateUserInput) => ({ ...prev, full_name: e.target.value }))
                  }
                  placeholder="Enter full name"
                  required
                />
              </div>
              
              <div>
                <label className="text-sm font-medium">Email Address *</label>
                <Input
                  type="email"
                  value={userForm.email}
                  onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
                    setUserForm((prev: CreateUserInput) => ({ ...prev, email: e.target.value }))
                  }
                  placeholder="user@example.com"
                  required
                />
              </div>
              
              <div>
                <label className="text-sm font-medium">Password *</label>
                <Input
                  type="password"
                  value={userForm.password}
                  onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
                    setUserForm((prev: CreateUserInput) => ({ ...prev, password: e.target.value }))
                  }
                  placeholder="Enter password (min 6 characters)"
                  required
                  minLength={6}
                />
              </div>
              
              <div>
                <label className="text-sm font-medium">Role *</label>
                <Select value={userForm.role || 'cashier'} onValueChange={(value: UserRole) => setUserForm((prev: CreateUserInput) => ({ ...prev, role: value }))}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="cashier">
                      <div className="flex items-center space-x-2">
                        <Briefcase className="h-4 w-4" />
                        <span>Cashier</span>
                      </div>
                    </SelectItem>
                    <SelectItem value="manager">
                      <div className="flex items-center space-x-2">
                        <Target className="h-4 w-4" />
                        <span>Manager</span>
                      </div>
                    </SelectItem>
                    <SelectItem value="admin">
                      <div className="flex items-center space-x-2">
                        <Crown className="h-4 w-4" />
                        <span>Admin</span>
                      </div>
                    </SelectItem>
                  </SelectContent>
                </Select>
              </div>
              
              <div className="flex space-x-2">
                <Button variant="outline" onClick={() => setShowCreateDialog(false)}>
                  Cancel
                </Button>
                <Button 
                  onClick={createUser} 
                  disabled={isLoading || !userForm.username || !userForm.email || !userForm.password || !userForm.full_name}
                >
                  {isLoading ? 'Creating...' : 'Create User'}
                </Button>
              </div>
            </div>
          </DialogContent>
        </Dialog>
      </div>

      {/* Statistics Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card>
          <CardContent className="p-6">
            <div className="flex items-center space-x-2">
              <Crown className="h-8 w-8 text-yellow-600" />
              <div>
                <p className="text-2xl font-bold">{roleStats.admin}</p>
                <p className="text-sm text-gray-600">Admins</p>
              </div>
            </div>
          </CardContent>
        </Card>
        
        <Card>
          <CardContent className="p-6">
            <div className="flex items-center space-x-2">
              <Target className="h-8 w-8 text-blue-600" />
              <div>
                <p className="text-2xl font-bold">{roleStats.manager}</p>
                <p className="text-sm text-gray-600">Managers</p>
              </div>
            </div>
          </CardContent>
        </Card>
        
        <Card>
          <CardContent className="p-6">
            <div className="flex items-center space-x-2">
              <Briefcase className="h-8 w-8 text-green-600" />
              <div>
                <p className="text-2xl font-bold">{roleStats.cashier}</p>
                <p className="text-sm text-gray-600">Cashiers</p>
              </div>
            </div>
          </CardContent>
        </Card>
        
        <Card>
          <CardContent className="p-6">
            <div className="flex items-center space-x-2">
              <UserCheck className="h-8 w-8 text-purple-600" />
              <div>
                <p className="text-2xl font-bold">{roleStats.active}</p>
                <p className="text-sm text-gray-600">Active Users</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Search */}
      <div className="flex items-center space-x-2">
        <Search className="h-4 w-4 text-gray-500" />
        <Input
          placeholder="Search users by name, username, or email..."
          value={searchTerm}
          onChange={(e: React.ChangeEvent<HTMLInputElement>) => setSearchTerm(e.target.value)}
          className="max-w-md"
        />
      </div>

      {/* Users Table */}
      <Card>
        <CardHeader>
          <CardTitle>System Users</CardTitle>
        </CardHeader>
        <CardContent>
          {filteredUsers.length === 0 ? (
            <div className="text-center py-8">
              <UserCheck className="h-12 w-12 text-gray-400 mx-auto mb-4" />
              <p className="text-gray-600">
                {searchTerm ? 'No users found matching your search.' : 'No users found.'}
              </p>
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>User</TableHead>
                  <TableHead>Contact</TableHead>
                  <TableHead>Role</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Created</TableHead>
                  <TableHead>Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredUsers.map((user: User) => (
                  <TableRow key={user.id}>
                    <TableCell>
                      <div>
                        <p className="font-medium">{user.full_name}</p>
                        <p className="text-sm text-gray-500">@{user.username}</p>
                      </div>
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center space-x-1 text-sm">
                        <Mail className="h-3 w-3 text-gray-400" />
                        <span>{user.email}</span>
                      </div>
                    </TableCell>
                    <TableCell>
                      <Badge variant={getRoleBadgeVariant(user.role)} className="flex items-center space-x-1 w-fit">
                        {getRoleIcon(user.role)}
                        <span className="capitalize">{user.role}</span>
                      </Badge>
                    </TableCell>
                    <TableCell>
                      <Badge variant={user.is_active ? 'default' : 'destructive'}>
                        {user.is_active ? 'Active' : 'Inactive'}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center space-x-1 text-sm">
                        <Calendar className="h-3 w-3 text-gray-400" />
                        <span>{user.created_at.toLocaleDateString()}</span>
                      </div>
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center space-x-2">
                        <Switch
                          checked={user.is_active}
                          onCheckedChange={(checked) => toggleUserStatus(user.id, checked)}
                        />
                        <span className="text-sm text-gray-500">
                          {user.is_active ? 'Active' : 'Inactive'}
                        </span>
                      </div>
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
