import React, { useState, useEffect } from 'react';
import { Plus, Eye, Edit2, Trash2 } from 'lucide-react';
import { useNavigate, useLocation } from 'react-router-dom';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, PieChart, Pie, Cell, LineChart, Line, ComposedChart, Area } from 'recharts';
import Card from '../../components/common/Card';
import ChartCard from '../../components/charts/ChartCard';
import Button from '../../components/common/Button';
import FilterBar from '../../components/common/FilterBar';
import Table from '../../components/common/Table';
import Modal from '../../components/common/Modal';
import ConfirmationDialog from '../../components/common/ConfirmationDialog';
import { expenseService, incomeService } from '../../services/api';
import { authService } from '../../services/api';
import styles from './Expenses.module.css';

interface ExpenseTransaction {
  _id: string;
  amount: number;
  category: string;
  date: string;
  description?: string;
  member: {
    _id: string;
    name: string;
    email: string;
  };
  createdAt: string;
  updatedAt: string;
}

interface IncomeTransaction {
  _id: string;
  amount: number;
  category: string;
  date: string;
  description?: string;
  member: {
    _id: string;
    name: string;
    email: string;
  };
  createdAt: string;
  updatedAt: string;
}

interface MonthlyData {
  date: string;
  value: number;
}

interface CategoryData {
  category: string;
  amount: number;
  percentage: number;
  color: string;
}

interface MemberData {
  memberName: string;
  amount: number;
  color: string;
}

const Expenses: React.FC = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const [expenses, setExpenses] = useState<ExpenseTransaction[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const isMounted = React.useRef(true);
  const [shouldRefresh, setShouldRefresh] = useState(false);
  const [selectedMonth, setSelectedMonth] = useState<string>('all');
  const [selectedMember, setSelectedMember] = useState<string>('all');

  // Modal states
  const [viewModalOpen, setViewModalOpen] = useState(false);
  const [editModalOpen, setEditModalOpen] = useState(false);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [selectedExpense, setSelectedExpense] = useState<ExpenseTransaction | null>(null);
  const [actionLoading, setActionLoading] = useState(false);

  const currentUser = authService.getCurrentUser();

  const fetchExpenses = async (retryCount = 0): Promise<boolean> => {
    if (!isMounted.current) return false;

    try {
      setLoading(true);
      const response = await expenseService.getAll();
      if (isMounted.current) {
        setExpenses(response.data.data);
        setError('');
      }
      return true;
    } catch (err: any) {
      if (!isMounted.current) return false;

      const status = err.response?.status;
      
      if (status === 429) {
        const delay = Math.min(1000 * Math.pow(2, retryCount), 30000);
        console.warn(`Rate limited. Retrying in ${delay}ms (attempt ${retryCount + 1})`);
        await new Promise(resolve => setTimeout(resolve, delay));
        return fetchExpenses(retryCount + 1);
      }
      
      if (status !== 401) {
        setError(err.response?.data?.message || 'Failed to fetch expense data');
        console.error('Error fetching expenses:', err);
      }
      return false;
    } finally {
      if (isMounted.current) {
        setLoading(false);
      }
    }
  };

  useEffect(() => {
    isMounted.current = true;
    if (currentUser) {
      fetchExpenses();
    }
    return () => {
      isMounted.current = false;
    };
  }, [currentUser?.id]);

  useEffect(() => {
    if (location.state?.refresh) {
      setShouldRefresh(true);
    }
  }, [location.state]);

  useEffect(() => {
    if (shouldRefresh && isMounted.current) {
      fetchExpenses().finally(() => {
        if (isMounted.current) {
          setShouldRefresh(false);
          window.history.replaceState({}, document.title);
        }
      });
    }
  }, [shouldRefresh]);

  const handleRetry = () => {
    fetchExpenses();
  };

  const formatCurrency = (value: number): string => {
    return new Intl.NumberFormat('en-IN', {
      style: 'currency',
      currency: 'INR',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(value);
  };

  // Utility: Get unique months from expenses
  const getMonthOptions = (): Array<{ value: string; label: string }> => {
    const monthsSet = new Set<string>();
    expenses.forEach(expense => {
      const date = new Date(expense.date);
      const monthYear = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;
      monthsSet.add(monthYear);
    });
    
    const sortedMonths = Array.from(monthsSet).sort((a, b) => b.localeCompare(a));
    
    return [
      { value: 'all', label: 'All Months' },
      ...sortedMonths.map(month => {
        const [year, m] = month.split('-');
        const monthNames = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'];
        return { value: month, label: `${monthNames[parseInt(m) - 1]} ${year}` };
      })
    ];
  };

  // Utility: Get unique members from expenses
  const getMemberOptions = (): Array<{ value: string; label: string }> => {
    const membersSet = new Set<string>();
    expenses.forEach(expense => {
      if (expense.member?.name) {
        membersSet.add(expense.member.name);
      }
    });
    
    const sortedMembers = Array.from(membersSet).sort();
    
    return [
      { value: 'all', label: 'All Members' },
      ...sortedMembers.map(name => ({ value: name, label: name }))
    ];
  };

  // Get filtered expenses based on selected filters
  const getFilteredExpenses = (): ExpenseTransaction[] => {
    return expenses.filter(expense => {
      let monthMatch = true;
      let memberMatch = true;

      if (selectedMonth !== 'all') {
        const date = new Date(expense.date);
        const monthYear = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;
        monthMatch = monthYear === selectedMonth;
      }

      if (selectedMember !== 'all') {
        memberMatch = expense.member?.name === selectedMember;
      }

      return monthMatch && memberMatch;
    });
  };

  const filteredExpenses = getFilteredExpenses();

  // Process data for charts using filtered data
  const processMonthlyData = (): MonthlyData[] => {
    const monthlyMap = new Map<string, number>();
    
    filteredExpenses.forEach(expense => {
      const date = new Date(expense.date);
      const monthYear = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;
      monthlyMap.set(monthYear, (monthlyMap.get(monthYear) || 0) + expense.amount);
    });

    return Array.from(monthlyMap.entries())
      .map(([date, value]) => ({ date, value }))
      .sort((a, b) => a.date.localeCompare(b.date));
  };

  const processCategoryData = (): CategoryData[] => {
    const categoryMap = new Map<string, number>();
    let total = 0;
    
    filteredExpenses.forEach(expense => {
      categoryMap.set(expense.category, (categoryMap.get(expense.category) || 0) + expense.amount);
      total += expense.amount;
    });

    const colors = ['#ef4444', '#f59e0b', '#0ea5e9', '#10b981', '#8b5cf6', '#ec4899', '#6b7280'];

    return Array.from(categoryMap.entries())
      .map(([category, amount], index) => ({
        category,
        amount,
        percentage: total > 0 ? (amount / total) * 100 : 0,
        color: colors[index % colors.length]
      }))
      .sort((a, b) => b.amount - a.amount);
  };

  const processMemberData = (): MemberData[] => {
    const memberMap = new Map<string, number>();
    const memberColors = new Map<string, string>();
    const colors = ['#ef4444', '#f59e0b', '#0ea5e9', '#10b981', '#8b5cf6', '#ec4899'];
    
    filteredExpenses.forEach(expense => {
      const memberName = expense.member?.name || 'Unknown';
      memberMap.set(memberName, (memberMap.get(memberName) || 0) + expense.amount);
      if (!memberColors.has(memberName)) {
        memberColors.set(memberName, colors[memberColors.size % colors.length]);
      }
    });

    return Array.from(memberMap.entries())
      .map(([memberName, amount]) => ({
        memberName,
        amount,
        color: memberColors.get(memberName) || '#6b7280'
      }))
      .sort((a, b) => b.amount - a.amount);
  };

  const monthlyExpenseData = processMonthlyData();
  const expenseByCategory = processCategoryData();
  const expenseByMember = processMemberData();

  const totalExpenses = filteredExpenses.reduce((sum, t) => sum + t.amount, 0);
  const highestCategory = expenseByCategory[0] || { category: 'N/A', amount: 0 };
  const topSpender = expenseByMember[0] || { memberName: 'N/A', amount: 0 };

  // For income vs expense comparison
  const [monthlyIncomeData, setMonthlyIncomeData] = useState<MonthlyData[]>([]);

  const fetchIncomeData = async (retryCount = 0): Promise<boolean> => {
    if (!isMounted.current) return false;

    try {
      const response = await incomeService.getAll();
      const incomeTransactions = response.data.data as IncomeTransaction[];
      
      const monthlyMap = new Map<string, number>();
      incomeTransactions.forEach(income => {
        const date = new Date(income.date);
        const monthYear = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;
        monthlyMap.set(monthYear, (monthlyMap.get(monthYear) || 0) + income.amount);
      });

      const processedData = Array.from(monthlyMap.entries())
        .map(([date, value]) => ({ date, value }))
        .sort((a, b) => a.date.localeCompare(b.date));

      if (isMounted.current) {
        setMonthlyIncomeData(processedData);
      }
      return true;
    } catch (err: any) {
      if (!isMounted.current) return false;

      const status = err.response?.status;
      
      if (status === 429) {
        const delay = Math.min(1000 * Math.pow(2, retryCount), 30000);
        console.warn(`Rate limited (income). Retrying in ${delay}ms (attempt ${retryCount + 1})`);
        await new Promise(resolve => setTimeout(resolve, delay));
        return fetchIncomeData(retryCount + 1);
      }
      
      console.error('Error fetching income data for comparison:', err);
      return false;
    }
  };

  useEffect(() => {
    if (!loading && isMounted.current) {
      fetchIncomeData();
    }
  }, [loading]);

  const comparisonData = monthlyIncomeData.map((income, index) => ({
    date: income.date,
    income: income.value,
    expenses: monthlyExpenseData[index]?.value || 0,
  }));

  // CRUD Action Handlers
  const handleView = (expense: ExpenseTransaction) => {
    setSelectedExpense(expense);
    setViewModalOpen(true);
  };

  const handleEdit = (expense: ExpenseTransaction) => {
    setSelectedExpense(expense);
    setEditModalOpen(true);
  };

  const handleDeleteClick = (expense: ExpenseTransaction) => {
    setSelectedExpense(expense);
    setDeleteDialogOpen(true);
  };

  const handleDeleteConfirm = async () => {
    if (!selectedExpense) return;

    try {
      setActionLoading(true);
      await expenseService.delete(selectedExpense._id);
      setDeleteDialogOpen(false);
      setSelectedExpense(null);
      await fetchExpenses();
    } catch (err: any) {
      console.error('Error deleting expense:', err);
      setError(err.response?.data?.message || 'Failed to delete expense');
    } finally {
      setActionLoading(false);
    }
  };

  const handleEditSubmit = async (formData: { amount: number; category: string; date: string; description?: string }) => {
    if (!selectedExpense) return;

    try {
      setActionLoading(true);
      await expenseService.update(selectedExpense._id, formData);
      setEditModalOpen(false);
      setSelectedExpense(null);
      await fetchExpenses();
    } catch (err: any) {
      console.error('Error updating expense:', err);
      throw err;
    } finally {
      setActionLoading(false);
    }
  };

  const closeModals = () => {
    setViewModalOpen(false);
    setEditModalOpen(false);
    setDeleteDialogOpen(false);
    setSelectedExpense(null);
  };

  // Table columns with action buttons
  const columns = [
    { key: 'date', header: 'Date', sortable: true, render: (value: string) => new Date(value).toLocaleDateString() },
    { key: 'description', header: 'Description', sortable: true },
    { key: 'category', header: 'Category', sortable: true },
    { key: 'member', header: 'Member', sortable: true, render: (value: any) => value?.name || 'N/A' },
    { key: 'amount', header: 'Amount', sortable: true, render: (value: number) => <span className={styles.amountNegative}>-{formatCurrency(value)}</span> },
    {
      key: 'actions',
      header: 'Actions',
      sortable: false,
      render: (_: any, row: ExpenseTransaction) => (
        <div className={styles.actionButtons}>
          <Button
            variant="ghost"
            size="small"
            onClick={(e) => { e.stopPropagation(); handleView(row); }}
            aria-label="View expense"
          >
            <Eye size={16} />
          </Button>
          <Button
            variant="ghost"
            size="small"
            onClick={(e) => { e.stopPropagation(); handleEdit(row); }}
            aria-label="Edit expense"
          >
            <Edit2 size={16} />
          </Button>
          <Button
            variant="ghost"
            size="small"
            onClick={(e) => { e.stopPropagation(); handleDeleteClick(row); }}
            aria-label="Delete expense"
          >
            <Trash2 size={16} />
          </Button>
        </div>
      ),
    },
  ];

  if (loading) {
    return (
      <div className={styles.expensesPage}>
        <div className={styles.pageHeader}>
          <h1 className={styles.pageTitle}>Expenses</h1>
          <Button leftIcon={<Plus size={16} />} variant="danger" onClick={() => navigate('/expenses/add')}>
            Add Expense
          </Button>
        </div>
        <Card>
          <div className={styles.loadingContainer}>
            <p>Loading expense data...</p>
          </div>
        </Card>
      </div>
    );
  }

  if (error) {
    return (
      <div className={styles.expensesPage}>
        <div className={styles.pageHeader}>
          <h1 className={styles.pageTitle}>Expenses</h1>
          <Button leftIcon={<Plus size={16} />} variant="danger" onClick={() => navigate('/expenses/add')}>
            Add Expense
          </Button>
        </div>
        <Card>
          <div className={styles.errorContainer}>
            <p className={styles.errorMessage}>{error}</p>
            <Button onClick={handleRetry}>Retry</Button>
          </div>
        </Card>
      </div>
    );
  }

  return (
    <div className={styles.expensesPage}>
      <div className={styles.pageHeader}>
        <h1 className={styles.pageTitle}>Expenses</h1>
        <Button leftIcon={<Plus size={16} />} variant="danger" onClick={() => navigate('/expenses/add')}>
          Add Expense
        </Button>
      </div>

      {/* Summary Cards */}
      <div className={styles.summaryGrid}>
        <Card variant="danger">
          <div className={styles.summaryCard}>
            <h3 className={styles.summaryCardTitle}>Total Expenses</h3>
            <p className={styles.summaryCardValue}>{formatCurrency(totalExpenses)}</p>
          </div>
        </Card>
        <Card variant="primary">
          <div className={styles.summaryCard}>
            <h3 className={styles.summaryCardTitle}>Highest Category</h3>
            <p className={styles.summaryCardValue}>{highestCategory.category}</p>
            <p className={styles.summaryCardSubtext}>{formatCurrency(highestCategory.amount)}</p>
          </div>
        </Card>
        <Card variant="warning">
          <div className={styles.summaryCard}>
            <h3 className={styles.summaryCardTitle}>Top Spender</h3>
            <p className={styles.summaryCardValue}>{topSpender.memberName}</p>
            <p className={styles.summaryCardSubtext}>{formatCurrency(topSpender.amount)}</p>
          </div>
        </Card>
      </div>

      {/* Filters */}
      <FilterBar
        searchPlaceholder="Search expense transactions..."
        actions={
          <>
            <select
              className={styles.filterSelect}
              value={selectedMonth}
              onChange={(e) => setSelectedMonth(e.target.value)}
            >
              {getMonthOptions().map(option => (
                <option key={option.value} value={option.value}>
                  {option.label}
                </option>
              ))}
            </select>
            <select
              className={styles.filterSelect}
              value={selectedMember}
              onChange={(e) => setSelectedMember(e.target.value)}
            >
              {getMemberOptions().map(option => (
                <option key={option.value} value={option.value}>
                  {option.label}
                </option>
              ))}
            </select>
          </>
        }
      />

      {/* Charts */}
      <div className={styles.chartsGrid}>
        <ChartCard title="Monthly Expense Trend">
          <div className={styles.chartContainer}>
            <ResponsiveContainer width="100%" height={250}>
              <LineChart data={monthlyExpenseData}>
                <CartesianGrid strokeDasharray="3 3" stroke="var(--border-color)" />
                <XAxis dataKey="date" stroke="var(--text-tertiary)" fontSize={11} tickLine={false} axisLine={false} />
                <YAxis stroke="var(--text-tertiary)" fontSize={11} tickLine={false} axisLine={false} tickFormatter={(value) => `₹${value / 1000}k`} width={40} />
                <Tooltip
                  contentStyle={{
                    backgroundColor: 'var(--bg-card)',
                    border: '1px solid var(--border-color)',
                    borderRadius: 'var(--radius-lg)',
                    boxShadow: 'var(--shadow-lg)',
                    padding: 'var(--space-3)',
                  }}
                  formatter={(value: number) => [formatCurrency(value), 'Expenses']}
                  cursor={{ stroke: 'var(--border-color)', strokeWidth: 1 }}
                />
                <Line type="monotone" dataKey="value" stroke="#ef4444" strokeWidth={2} dot={{ fill: '#ef4444', r: 3 }} animationDuration={1000} />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </ChartCard>

        <ChartCard title="Expense by Category">
          <div className={styles.chartContainer}>
            <ResponsiveContainer width="100%" height={250}>
              <PieChart>
                <Pie
                  data={expenseByCategory}
                  cx="50%"
                  cy="50%"
                  labelLine={false}
                  label={({ category, percentage }) => `${category} (${percentage}%)`}
                  outerRadius={80}
                  fill="#8884d8"
                  dataKey="amount"
                >
                  {expenseByCategory.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={entry.color} />
                  ))}
                </Pie>
                <Tooltip
                  contentStyle={{
                    backgroundColor: 'var(--bg-card)',
                    border: '1px solid var(--border-color)',
                    borderRadius: 'var(--radius-lg)',
                    boxShadow: 'var(--shadow-lg)',
                    padding: 'var(--space-3)',
                  }}
                  formatter={(value: number) => [formatCurrency(value), '']}
                />
              </PieChart>
            </ResponsiveContainer>
          </div>
        </ChartCard>

        <ChartCard title="Expense by Member">
          <div className={styles.chartContainer}>
            <ResponsiveContainer width="100%" height={250}>
              <BarChart data={expenseByMember}>
                <CartesianGrid strokeDasharray="3 3" stroke="var(--border-color)" />
                <XAxis dataKey="memberName" stroke="var(--text-tertiary)" fontSize={11} tickLine={false} axisLine={false} />
                <YAxis stroke="var(--text-tertiary}" fontSize={11} tickLine={false} axisLine={false} tickFormatter={(value) => `₹${value / 1000}k`} width={40} />
                <Tooltip
                  contentStyle={{
                    backgroundColor: 'var(--bg-card)',
                    border: '1px solid var(--border-color)',
                    borderRadius: 'var(--radius-lg)',
                    boxShadow: 'var(--shadow-lg)',
                    padding: 'var(--space-3)',
                  }}
                  formatter={(value: number) => [formatCurrency(value), '']}
                  cursor={{ fill: 'var(--bg-hover)' }}
                />
                <Bar dataKey="amount" radius={[8, 8, 0, 0]}>
                  {expenseByMember.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={entry.color} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>
        </ChartCard>

        <ChartCard title="Income vs Expense Comparison" className={styles.chartFullWidth}>
          <div className={styles.chartContainer}>
            <ResponsiveContainer width="100%" height={250}>
              <ComposedChart data={comparisonData}>
                <CartesianGrid strokeDasharray="3 3" stroke="var(--border-color)" />
                <XAxis dataKey="date" stroke="var(--text-tertiary)" fontSize={11} tickLine={false} axisLine={false} />
                <YAxis stroke="var(--text-tertiary)" fontSize={11} tickLine={false} axisLine={false} tickFormatter={(value) => `₹${value / 1000}k`} width={40} />
                <Tooltip
                  contentStyle={{
                    backgroundColor: 'var(--bg-card)',
                    border: '1px solid var(--border-color)',
                    borderRadius: 'var(--radius-lg)',
                    boxShadow: 'var(--shadow-lg)',
                    padding: 'var(--space-3)',
                  }}
                  formatter={(value: number) => [formatCurrency(value), '']}
                  cursor={{ stroke: 'var(--border-color)', strokeWidth: 1 }}
                />
                <Area type="monotone" dataKey="income" fill="#10b981" fillOpacity={0.3} stroke="#10b981" strokeWidth={2} name="Income" animationDuration={1000} />
                <Area type="monotone" dataKey="expenses" fill="#ef4444" fillOpacity={0.3} stroke="#ef4444" strokeWidth={2} name="Expenses" animationDuration={1000} />
              </ComposedChart>
            </ResponsiveContainer>
          </div>
        </ChartCard>
      </div>

      {/* Data Table */}
      <Card title="Expense Transactions" subtitle={`${filteredExpenses.length} transactions`}>
        <Table
          data={filteredExpenses}
          columns={columns}
        />
      </Card>

      {/* View Modal */}
      <Modal
        isOpen={viewModalOpen}
        onClose={() => { setViewModalOpen(false); setSelectedExpense(null); }}
        title="Expense Details"
        size="md"
      >
        {selectedExpense && (
          <div className={styles.detailView}>
            <div className={styles.detailRow}>
              <strong>Amount:</strong>
              <span>{formatCurrency(selectedExpense.amount)}</span>
            </div>
            <div className={styles.detailRow}>
              <strong>Category:</strong>
              <span>{selectedExpense.category}</span>
            </div>
            <div className={styles.detailRow}>
              <strong>Date:</strong>
              <span>{new Date(selectedExpense.date).toLocaleDateString()}</span>
            </div>
            <div className={styles.detailRow}>
              <strong>Member:</strong>
              <span>{selectedExpense.member?.name || 'N/A'}</span>
            </div>
            {selectedExpense.description && (
              <div className={styles.detailRow}>
                <strong>Description:</strong>
                <span>{selectedExpense.description}</span>
              </div>
            )}
            <div className={styles.detailRow}>
              <strong>Created:</strong>
              <span>{new Date(selectedExpense.createdAt).toLocaleString()}</span>
            </div>
            <div className={styles.detailRow}>
              <strong>Last Updated:</strong>
              <span>{new Date(selectedExpense.updatedAt).toLocaleString()}</span>
            </div>
          </div>
        )}
      </Modal>

      {/* Edit Modal */}
      <Modal
        isOpen={editModalOpen}
        onClose={() => { setEditModalOpen(false); setSelectedExpense(null); }}
        title="Edit Expense"
        size="md"
      >
        {selectedExpense && (
          <EditExpenseForm
            expense={selectedExpense}
            onSubmit={handleEditSubmit}
            onCancel={() => { setEditModalOpen(false); setSelectedExpense(null); }}
            loading={actionLoading}
          />
        )}
      </Modal>

      {/* Delete Confirmation Dialog */}
      <ConfirmationDialog
        isOpen={deleteDialogOpen}
        onClose={() => { setDeleteDialogOpen(false); setSelectedExpense(null); }}
        onConfirm={handleDeleteConfirm}
        title="Delete Expense"
        message={`Are you sure you want to delete this expense entry? This action cannot be undone.`}
        confirmLabel="Delete"
        loading={actionLoading}
      />
    </div>
  );
};

// Edit Expense Form Component
interface EditExpenseFormProps {
  expense: ExpenseTransaction;
  onSubmit: (data: { amount: number; category: string; date: string; description?: string }) => Promise<void>;
  onCancel: () => void;
  loading: boolean;
}

const EditExpenseForm: React.FC<EditExpenseFormProps> = ({ expense, onSubmit, onCancel, loading }) => {
  const [amount, setAmount] = useState(expense.amount.toString());
  const [category, setCategory] = useState(expense.category);
  const [date, setDate] = useState(expense.date.split('T')[0]);
  const [description, setDescription] = useState(expense.description || '');
  const [errors, setErrors] = useState<Record<string, string>>({});

  const validate = (): boolean => {
    const newErrors: Record<string, string> = {};
    
    if (!amount || isNaN(Number(amount)) || Number(amount) <= 0) {
      newErrors.amount = 'Please enter a valid amount greater than 0';
    }
    
    if (!category) {
      newErrors.category = 'Please select a category';
    }
    
    if (!date) {
      newErrors.date = 'Please select a date';
    }
    
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!validate()) {
      return;
    }

    try {
      await onSubmit({
        amount: parseFloat(amount),
        category,
        date: new Date(date).toISOString(),
        description: description || undefined,
      });
    } catch (err: any) {
      if (err.response?.data?.message) {
        setErrors({ general: err.response.data.message });
      }
    }
  };

  const categories = [
    'Food & Dining',
    'Transportation',
    'Shopping',
    'Entertainment',
    'Bills & Utilities',
    'Healthcare',
    'Education',
    'Travel',
    'Personal Care',
    'Other'
  ];

  return (
    <form onSubmit={handleSubmit} className={styles.editForm}>
      {errors.general && (
        <div className={styles.errorMessage}>{errors.general}</div>
      )}
      
      <div className={styles.formGroup}>
        <label htmlFor="amount">Amount *</label>
        <input
          type="number"
          id="amount"
          value={amount}
          onChange={(e) => setAmount(e.target.value)}
          className={errors.amount ? styles.inputError : ''}
          disabled={loading}
        />
        {errors.amount && <span className={styles.fieldError}>{errors.amount}</span>}
      </div>

      <div className={styles.formGroup}>
        <label htmlFor="category">Category *</label>
        <select
          id="category"
          value={category}
          onChange={(e) => setCategory(e.target.value)}
          className={errors.category ? styles.inputError : ''}
          disabled={loading}
        >
          {categories.map(cat => (
            <option key={cat} value={cat}>{cat}</option>
          ))}
        </select>
        {errors.category && <span className={styles.fieldError}>{errors.category}</span>}
      </div>

      <div className={styles.formGroup}>
        <label htmlFor="date">Date *</label>
        <input
          type="date"
          id="date"
          value={date}
          onChange={(e) => setDate(e.target.value)}
          className={errors.date ? styles.inputError : ''}
          disabled={loading}
        />
        {errors.date && <span className={styles.fieldError}>{errors.date}</span>}
      </div>

      <div className={styles.formGroup}>
        <label htmlFor="description">Description</label>
        <textarea
          id="description"
          value={description}
          onChange={(e) => setDescription(e.target.value)}
          rows={3}
          disabled={loading}
        />
      </div>

      <div className={styles.formActions}>
        <Button
          type="button"
          variant="secondary"
          onClick={onCancel}
          disabled={loading}
        >
          Cancel
        </Button>
        <Button
          type="submit"
          loading={loading}
        >
          Update Expense
        </Button>
      </div>
    </form>
  );
};

export default Expenses;
