import React, { useState, useEffect } from 'react';
import { Plus, Eye, Edit2, Trash2 } from 'lucide-react';
import { useNavigate, useLocation } from 'react-router-dom';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, PieChart, Pie, Cell, LineChart, Line } from 'recharts';
import Card from '../../components/common/Card';
import ChartCard from '../../components/charts/ChartCard';
import Button from '../../components/common/Button';
import FilterBar from '../../components/common/FilterBar';
import Table from '../../components/common/Table';
import Modal from '../../components/common/Modal';
import ConfirmationDialog from '../../components/common/ConfirmationDialog';
import { incomeService } from '../../services/api';
import { authService } from '../../services/api';
import styles from './Income.module.css';

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

const Income: React.FC = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const [incomes, setIncomes] = useState<IncomeTransaction[]>([]);
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
  const [selectedIncome, setSelectedIncome] = useState<IncomeTransaction | null>(null);
  const [actionLoading, setActionLoading] = useState(false);

  const currentUser = authService.getCurrentUser();

  const fetchIncomes = async (retryCount = 0): Promise<boolean> => {
    if (!isMounted.current) return false;

    try {
      setLoading(true);
      const response = await incomeService.getAll();
      if (isMounted.current) {
        setIncomes(response.data.data);
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
        return fetchIncomes(retryCount + 1);
      }
      
      if (status !== 401) {
        setError(err.response?.data?.message || 'Failed to fetch income data');
        console.error('Error fetching incomes:', err);
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
      fetchIncomes();
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
      fetchIncomes().finally(() => {
        if (isMounted.current) {
          setShouldRefresh(false);
          window.history.replaceState({}, document.title);
        }
      });
    }
  }, [shouldRefresh]);

  const handleRetry = () => {
    fetchIncomes();
  };

  const formatCurrency = (value: number): string => {
    return new Intl.NumberFormat('en-IN', {
      style: 'currency',
      currency: 'INR',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(value);
  };

  // Utility: Get unique months from incomes
  const getMonthOptions = (): Array<{ value: string; label: string }> => {
    const monthsSet = new Set<string>();
    incomes.forEach(income => {
      const date = new Date(income.date);
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

  // Utility: Get unique members from incomes
  const getMemberOptions = (): Array<{ value: string; label: string }> => {
    const membersSet = new Set<string>();
    incomes.forEach(income => {
      if (income.member?.name) {
        membersSet.add(income.member.name);
      }
    });
    
    const sortedMembers = Array.from(membersSet).sort();
    
    return [
      { value: 'all', label: 'All Members' },
      ...sortedMembers.map(name => ({ value: name, label: name }))
    ];
  };

  // Get filtered incomes based on selected filters
  const getFilteredIncomes = (): IncomeTransaction[] => {
    return incomes.filter(income => {
      let monthMatch = true;
      let memberMatch = true;

      if (selectedMonth !== 'all') {
        const date = new Date(income.date);
        const monthYear = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;
        monthMatch = monthYear === selectedMonth;
      }

      if (selectedMember !== 'all') {
        memberMatch = income.member?.name === selectedMember;
      }

      return monthMatch && memberMatch;
    });
  };

  const filteredIncomes = getFilteredIncomes();

  // Process data for charts using filtered data
  const processMonthlyData = (): MonthlyData[] => {
    const monthlyMap = new Map<string, number>();
    
    filteredIncomes.forEach(income => {
      const date = new Date(income.date);
      const monthYear = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;
      monthlyMap.set(monthYear, (monthlyMap.get(monthYear) || 0) + income.amount);
    });

    return Array.from(monthlyMap.entries())
      .map(([date, value]) => ({ date, value }))
      .sort((a, b) => a.date.localeCompare(b.date));
  };

  const processCategoryData = (): CategoryData[] => {
    const categoryMap = new Map<string, number>();
    let total = 0;
    
    filteredIncomes.forEach(income => {
      categoryMap.set(income.category, (categoryMap.get(income.category) || 0) + income.amount);
      total += income.amount;
    });

    const colors = ['#10b981', '#0ea5e9', '#f59e0b', '#ef4444', '#8b5cf6', '#ec4899', '#6b7280'];

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
    const colors = ['#10b981', '#0ea5e9', '#f59e0b', '#ef4444', '#8b5cf6', '#ec4899'];
    
    filteredIncomes.forEach(income => {
      const memberName = income.member?.name || 'Unknown';
      memberMap.set(memberName, (memberMap.get(memberName) || 0) + income.amount);
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

  const monthlyIncomeData = processMonthlyData();
  const incomeByCategory = processCategoryData();
  const incomeByMember = processMemberData();

  const totalIncome = filteredIncomes.reduce((sum, t) => sum + t.amount, 0);
  const highestCategory = incomeByCategory[0] || { category: 'N/A', amount: 0 };
  const topContributor = incomeByMember[0] || { memberName: 'N/A', amount: 0 };

  // CRUD Action Handlers
  const handleView = (income: IncomeTransaction) => {
    setSelectedIncome(income);
    setViewModalOpen(true);
  };

  const handleEdit = (income: IncomeTransaction) => {
    setSelectedIncome(income);
    setEditModalOpen(true);
  };

  const handleDeleteClick = (income: IncomeTransaction) => {
    setSelectedIncome(income);
    setDeleteDialogOpen(true);
  };

  const handleDeleteConfirm = async () => {
    if (!selectedIncome) return;

    try {
      setActionLoading(true);
      await incomeService.delete(selectedIncome._id);
      setDeleteDialogOpen(false);
      setSelectedIncome(null);
      await fetchIncomes();
    } catch (err: any) {
      console.error('Error deleting income:', err);
      setError(err.response?.data?.message || 'Failed to delete income');
    } finally {
      setActionLoading(false);
    }
  };

  const handleEditSubmit = async (formData: { amount: number; category: string; date: string; description?: string }) => {
    if (!selectedIncome) return;

    try {
      setActionLoading(true);
      await incomeService.update(selectedIncome._id, formData);
      setEditModalOpen(false);
      setSelectedIncome(null);
      await fetchIncomes();
    } catch (err: any) {
      console.error('Error updating income:', err);
      throw err;
    } finally {
      setActionLoading(false);
    }
  };

  const closeModals = () => {
    setViewModalOpen(false);
    setEditModalOpen(false);
    setDeleteDialogOpen(false);
    setSelectedIncome(null);
  };

  // Table columns with action buttons
  const columns = [
    { key: 'date', header: 'Date', sortable: true, render: (value: string) => new Date(value).toLocaleDateString() },
    { key: 'description', header: 'Description', sortable: true },
    { key: 'category', header: 'Category', sortable: true },
    { key: 'member', header: 'Member', sortable: true, render: (value: any) => value?.name || 'N/A' },
    { key: 'amount', header: 'Amount', sortable: true, render: (value: number) => <span className={styles.amountPositive}>+{formatCurrency(value)}</span> },
    {
      key: 'actions',
      header: 'Actions',
      sortable: false,
      render: (_: any, row: IncomeTransaction) => (
        <div className={styles.actionButtons}>
          <Button
            variant="ghost"
            size="small"
            onClick={(e) => { e.stopPropagation(); handleView(row); }}
            aria-label="View income"
          >
            <Eye size={16} />
          </Button>
          <Button
            variant="ghost"
            size="small"
            onClick={(e) => { e.stopPropagation(); handleEdit(row); }}
            aria-label="Edit income"
          >
            <Edit2 size={16} />
          </Button>
          <Button
            variant="ghost"
            size="small"
            onClick={(e) => { e.stopPropagation(); handleDeleteClick(row); }}
            aria-label="Delete income"
          >
            <Trash2 size={16} />
          </Button>
        </div>
      ),
    },
  ];

  if (loading) {
    return (
      <div className={styles.incomePage}>
        <div className={styles.pageHeader}>
          <h1 className={styles.pageTitle}>Income</h1>
          <Button leftIcon={<Plus size={16} />} onClick={() => navigate('/income/add')}>
            Add Income
          </Button>
        </div>
        <Card>
          <div className={styles.loadingContainer}>
            <p>Loading income data...</p>
          </div>
        </Card>
      </div>
    );
  }

  if (error) {
    return (
      <div className={styles.incomePage}>
        <div className={styles.pageHeader}>
          <h1 className={styles.pageTitle}>Income</h1>
          <Button leftIcon={<Plus size={16} />} onClick={() => navigate('/income/add')}>
            Add Income
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
    <div className={styles.incomePage}>
      <div className={styles.pageHeader}>
        <h1 className={styles.pageTitle}>Income</h1>
        <Button leftIcon={<Plus size={16} />} onClick={() => navigate('/income/add')}>
          Add Income
        </Button>
      </div>

      {/* Summary Cards */}
      <div className={styles.summaryGrid}>
        <Card variant="success">
          <div className={styles.summaryCard}>
            <h3 className={styles.summaryCardTitle}>Total Income</h3>
            <p className={styles.summaryCardValue}>{formatCurrency(totalIncome)}</p>
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
            <h3 className={styles.summaryCardTitle}>Top Contributor</h3>
            <p className={styles.summaryCardValue}>{topContributor.memberName}</p>
            <p className={styles.summaryCardSubtext}>{formatCurrency(topContributor.amount)}</p>
          </div>
        </Card>
      </div>

      {/* Filters */}
      <FilterBar
        searchPlaceholder="Search income transactions..."
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
        <ChartCard title="Monthly Income Trend">
          <div className={styles.chartContainer}>
            <ResponsiveContainer width="100%" height={250}>
              <LineChart data={monthlyIncomeData}>
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
                  formatter={(value: number) => [formatCurrency(value), 'Income']}
                  cursor={{ stroke: 'var(--border-color)', strokeWidth: 1 }}
                />
                <Line type="monotone" dataKey="value" stroke="#10b981" strokeWidth={2} dot={{ fill: '#10b981', r: 3 }} animationDuration={1000} />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </ChartCard>

        <ChartCard title="Income by Category">
          <div className={styles.chartContainer}>
            <ResponsiveContainer width="100%" height={250}>
              <PieChart>
                <Pie
                  data={incomeByCategory}
                  cx="50%"
                  cy="50%"
                  labelLine={false}
                  label={({ category, percentage }) => `${category} (${percentage}%)`}
                  outerRadius={80}
                  fill="#8884d8"
                  dataKey="amount"
                >
                  {incomeByCategory.map((entry, index) => (
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

        <ChartCard title="Income by Member">
          <div className={styles.chartContainer}>
            <ResponsiveContainer width="100%" height={250}>
              <BarChart data={incomeByMember}>
                <CartesianGrid strokeDasharray="3 3" stroke="var(--border-color)" />
                <XAxis dataKey="memberName" stroke="var(--text-tertiary)" fontSize={11} tickLine={false} axisLine={false} />
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
                  cursor={{ fill: 'var(--bg-hover)' }}
                />
                <Bar dataKey="amount" radius={[8, 8, 0, 0]}>
                  {incomeByMember.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={entry.color} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>
        </ChartCard>
      </div>

      {/* Data Table */}
      <Card title="Income Transactions" subtitle={`${filteredIncomes.length} transactions`}>
        <Table
          data={filteredIncomes}
          columns={columns}
        />
      </Card>

      {/* View Modal */}
      <Modal
        isOpen={viewModalOpen}
        onClose={() => { setViewModalOpen(false); setSelectedIncome(null); }}
        title="Income Details"
        size="md"
      >
        {selectedIncome && (
          <div className={styles.detailView}>
            <div className={styles.detailRow}>
              <strong>Amount:</strong>
              <span>{formatCurrency(selectedIncome.amount)}</span>
            </div>
            <div className={styles.detailRow}>
              <strong>Category:</strong>
              <span>{selectedIncome.category}</span>
            </div>
            <div className={styles.detailRow}>
              <strong>Date:</strong>
              <span>{new Date(selectedIncome.date).toLocaleDateString()}</span>
            </div>
            <div className={styles.detailRow}>
              <strong>Member:</strong>
              <span>{selectedIncome.member?.name || 'N/A'}</span>
            </div>
            {selectedIncome.description && (
              <div className={styles.detailRow}>
                <strong>Description:</strong>
                <span>{selectedIncome.description}</span>
              </div>
            )}
            <div className={styles.detailRow}>
              <strong>Created:</strong>
              <span>{new Date(selectedIncome.createdAt).toLocaleString()}</span>
            </div>
            <div className={styles.detailRow}>
              <strong>Last Updated:</strong>
              <span>{new Date(selectedIncome.updatedAt).toLocaleString()}</span>
            </div>
          </div>
        )}
      </Modal>

      {/* Edit Modal */}
      <Modal
        isOpen={editModalOpen}
        onClose={() => { setEditModalOpen(false); setSelectedIncome(null); }}
        title="Edit Income"
        size="md"
      >
        {selectedIncome && (
          <EditIncomeForm
            income={selectedIncome}
            onSubmit={handleEditSubmit}
            onCancel={() => { setEditModalOpen(false); setSelectedIncome(null); }}
            loading={actionLoading}
          />
        )}
      </Modal>

      {/* Delete Confirmation Dialog */}
      <ConfirmationDialog
        isOpen={deleteDialogOpen}
        onClose={() => { setDeleteDialogOpen(false); setSelectedIncome(null); }}
        onConfirm={handleDeleteConfirm}
        title="Delete Income"
        message={`Are you sure you want to delete this income entry? This action cannot be undone.`}
        confirmLabel="Delete"
        loading={actionLoading}
      />
    </div>
  );
};

// Edit Income Form Component
interface EditIncomeFormProps {
  income: IncomeTransaction;
  onSubmit: (data: { amount: number; category: string; date: string; description?: string }) => Promise<void>;
  onCancel: () => void;
  loading: boolean;
}

const EditIncomeForm: React.FC<EditIncomeFormProps> = ({ income, onSubmit, onCancel, loading }) => {
  const [amount, setAmount] = useState(income.amount.toString());
  const [category, setCategory] = useState(income.category);
  const [date, setDate] = useState(income.date.split('T')[0]);
  const [description, setDescription] = useState(income.description || '');
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
      // Error is handled by parent component
      if (err.response?.data?.message) {
        setErrors({ general: err.response.data.message });
      }
    }
  };

  const categories = [
    'Salary',
    'Freelance',
    'Business',
    'Investment Returns',
    'Rental Income',
    'Gift',
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
          Update Income
        </Button>
      </div>
    </form>
  );
};

export default Income;
