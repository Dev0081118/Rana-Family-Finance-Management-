import React, { useState, useEffect } from 'react';
import { Plus, Eye, Edit2, Trash2, PiggyBank, ArrowUpRight, ArrowDownRight } from 'lucide-react';
import { useNavigate, useLocation } from 'react-router-dom';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, BarChart, Bar, PieChart, Pie, Cell } from 'recharts';
import Card from '../../components/common/Card';
import ChartCard from '../../components/charts/ChartCard';
import Button from '../../components/common/Button';
import Table from '../../components/common/Table';
import Modal from '../../components/common/Modal';
import ConfirmationDialog from '../../components/common/ConfirmationDialog';
import { savingsService } from '../../services/api';
import { authService } from '../../services/api';
import styles from './Savings.module.css';

interface SavingTransaction {
  _id: string;
  type: 'deposit' | 'withdraw';
  amount: number;
  date: string;
  note?: string;
  member: {
    _id: string;
    name: string;
    email: string;
  };
  createdAt: string;
  updatedAt: string;
}

interface GrowthData {
  date: string;
  balance: number;
}

interface DepositWithdrawData {
  name: string;
  value: number;
  color: string;
}

interface MemberContribution {
  memberName: string;
  amount: number;
  percentage: number;
  color: string;
}

const Savings: React.FC = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const [savings, setSavings] = useState<SavingTransaction[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const isMounted = React.useRef(true);
  const [shouldRefresh, setShouldRefresh] = useState(false);

  // Modal states
  const [viewModalOpen, setViewModalOpen] = useState(false);
  const [editModalOpen, setEditModalOpen] = useState(false);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [selectedSaving, setSelectedSaving] = useState<SavingTransaction | null>(null);
  const [actionLoading, setActionLoading] = useState(false);

  const currentUser = authService.getCurrentUser();

  const fetchSavings = async (retryCount = 0): Promise<boolean> => {
    if (!isMounted.current) return false;

    try {
      setLoading(true);
      const response = await savingsService.getAll();
      if (isMounted.current) {
        setSavings(response.data.data);
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
        return fetchSavings(retryCount + 1);
      }
      
      if (status !== 401) {
        setError(err.response?.data?.message || 'Failed to fetch savings data');
        console.error('Error fetching savings:', err);
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
      fetchSavings();
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
      fetchSavings().finally(() => {
        if (isMounted.current) {
          setShouldRefresh(false);
          window.history.replaceState({}, document.title);
        }
      });
    }
  }, [shouldRefresh]);

  const handleRetry = () => {
    fetchSavings();
  };

  const formatCurrency = (value: number): string => {
    return new Intl.NumberFormat('en-IN', {
      style: 'currency',
      currency: 'INR',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(value);
  };

  // Calculate total balance (deposits - withdrawals)
  const totalBalance = savings.reduce((sum, s) => {
    return s.type === 'deposit' ? sum + s.amount : sum - s.amount;
  }, 0);

  const totalDeposits = savings
    .filter(s => s.type === 'deposit')
    .reduce((sum, s) => sum + s.amount, 0);

  const totalWithdrawals = savings
    .filter(s => s.type === 'withdraw')
    .reduce((sum, s) => sum + s.amount, 0);

  // Process savings growth data (cumulative balance over time)
  const processSavingsGrowth = (): GrowthData[] => {
    const sortedSavings = [...savings].sort((a, b) =>
      new Date(a.date).getTime() - new Date(b.date).getTime()
    );

    const growthMap = new Map<string, number>();
    let runningBalance = 0;

    sortedSavings.forEach(saving => {
      const date = new Date(saving.date);
      const dateKey = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`;
      
      if (saving.type === 'deposit') {
        runningBalance += saving.amount;
      } else {
        runningBalance -= saving.amount;
      }
      
      growthMap.set(dateKey, runningBalance);
    });

    if (growthMap.size === 0) {
      return [];
    }

    const dates = Array.from(growthMap.keys()).sort();
    const filledData: GrowthData[] = [];
    let lastBalance = 0;

    dates.forEach(date => {
      const balance = growthMap.get(date) || lastBalance;
      filledData.push({ date, balance: balance });
      lastBalance = balance;
    });

    return filledData;
  };

  // Process deposit vs withdrawal data
  const processDepositVsWithdraw = (): DepositWithdrawData[] => {
    const deposits = totalDeposits;
    const withdrawals = totalWithdrawals;

    return [
      { name: 'Deposits', value: deposits, color: '#10b981' },
      { name: 'Withdrawals', value: withdrawals, color: '#ef4444' }
    ];
  };

  // Process member contributions
  const processMemberContributions = (): MemberContribution[] => {
    const memberMap = new Map<string, number>();
    let total = 0;

    savings.forEach(saving => {
      if (saving.type === 'deposit') {
        const memberName = saving.member?.name || 'Unknown';
        memberMap.set(memberName, (memberMap.get(memberName) || 0) + saving.amount);
        total += saving.amount;
      }
    });

    const colors = ['#0ea5e9', '#10b981', '#f59e0b', '#ef4444', '#8b5cf6', '#ec4899'];

    return Array.from(memberMap.entries())
      .map(([memberName, amount], index) => ({
        memberName,
        amount,
        percentage: total > 0 ? (amount / total) * 100 : 0,
        color: colors[index % colors.length]
      }))
      .sort((a, b) => b.amount - a.amount);
  };

  const savingsGrowth = processSavingsGrowth();
  const depositVsWithdraw = processDepositVsWithdraw();
  const memberContributions = processMemberContributions();

  // CRUD Action Handlers
  const handleView = (saving: SavingTransaction) => {
    setSelectedSaving(saving);
    setViewModalOpen(true);
  };

  const handleEdit = (saving: SavingTransaction) => {
    setSelectedSaving(saving);
    setEditModalOpen(true);
  };

  const handleDeleteClick = (saving: SavingTransaction) => {
    setSelectedSaving(saving);
    setDeleteDialogOpen(true);
  };

  const handleDeleteConfirm = async () => {
    if (!selectedSaving) return;

    try {
      setActionLoading(true);
      await savingsService.delete(selectedSaving._id);
      setDeleteDialogOpen(false);
      setSelectedSaving(null);
      await fetchSavings();
    } catch (err: any) {
      console.error('Error deleting saving:', err);
      setError(err.response?.data?.message || 'Failed to delete saving');
    } finally {
      setActionLoading(false);
    }
  };

  const handleEditSubmit = async (formData: { type: 'deposit' | 'withdraw'; amount: number; date: string; note?: string }) => {
    if (!selectedSaving) return;

    try {
      setActionLoading(true);
      await savingsService.update(selectedSaving._id, formData);
      setEditModalOpen(false);
      setSelectedSaving(null);
      await fetchSavings();
    } catch (err: any) {
      console.error('Error updating saving:', err);
      throw err;
    } finally {
      setActionLoading(false);
    }
  };

  const closeModals = () => {
    setViewModalOpen(false);
    setEditModalOpen(false);
    setDeleteDialogOpen(false);
    setSelectedSaving(null);
  };

  // Table columns with action buttons
  const columns = [
    { key: 'date', header: 'Date', sortable: true, render: (value: string) => new Date(value).toLocaleDateString() },
    { key: 'type', header: 'Type', sortable: true, render: (value: string) => (
      <span className={value === 'deposit' ? styles.amountPositive : styles.amountNegative}>
        {value === 'deposit' ? 'Deposit' : 'Withdraw'}
      </span>
    )},
    { key: 'amount', header: 'Amount', sortable: true, render: (value: number) => (
      <span className={styles.amountPositive}>+{formatCurrency(value)}</span>
    )},
    { key: 'note', header: 'Note', sortable: true, render: (value: string) => value || '-' },
    { key: 'member', header: 'Member', sortable: true, render: (value: any) => value?.name || 'N/A' },
    {
      key: 'actions',
      header: 'Actions',
      sortable: false,
      render: (_: any, row: SavingTransaction) => (
        <div className={styles.actionButtons}>
          <Button
            variant="ghost"
            size="small"
            onClick={(e) => { e.stopPropagation(); handleView(row); }}
            aria-label="View saving"
          >
            <Eye size={16} />
          </Button>
          <Button
            variant="ghost"
            size="small"
            onClick={(e) => { e.stopPropagation(); handleEdit(row); }}
            aria-label="Edit saving"
          >
            <Edit2 size={16} />
          </Button>
          <Button
            variant="ghost"
            size="small"
            onClick={(e) => { e.stopPropagation(); handleDeleteClick(row); }}
            aria-label="Delete saving"
          >
            <Trash2 size={16} />
          </Button>
        </div>
      ),
    },
  ];

  if (loading) {
    return (
      <div className={styles.savingsPage}>
        <div className={styles.pageHeader}>
          <h1 className={styles.pageTitle}>Savings</h1>
          <Button leftIcon={<PiggyBank size={16} />} onClick={() => navigate('/savings/add')}>
            Add Deposit
          </Button>
        </div>
        <Card>
          <div className={styles.loadingContainer}>
            <p>Loading savings data...</p>
          </div>
        </Card>
      </div>
    );
  }

  if (error) {
    return (
      <div className={styles.savingsPage}>
        <div className={styles.pageHeader}>
          <h1 className={styles.pageTitle}>Savings</h1>
          <Button leftIcon={<PiggyBank size={16} />} onClick={() => navigate('/savings/add')}>
            Add Deposit
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
    <div className={styles.savingsPage}>
      <div className={styles.pageHeader}>
        <h1 className={styles.pageTitle}>Savings</h1>
        <Button leftIcon={<PiggyBank size={16} />} onClick={() => navigate('/savings/add')}>
          Add Deposit
        </Button>
      </div>

      {/* Summary Cards */}
      <div className={styles.summaryGrid}>
        <Card variant="primary" className={styles.balanceCard}>
          <div className={styles.summaryCard}>
            <h3 className={styles.summaryCardTitle}>Total Balance</h3>
            <p className={styles.summaryCardValue}>{formatCurrency(totalBalance)}</p>
          </div>
        </Card>
        <Card variant="success">
          <div className={styles.summaryCard}>
            <h3 className={styles.summaryCardTitle}>Total Deposits</h3>
            <p className={styles.summaryCardValue}>{formatCurrency(totalDeposits)}</p>
          </div>
        </Card>
        <Card variant="danger">
          <div className={styles.summaryCard}>
            <h3 className={styles.summaryCardTitle}>Total Withdrawals</h3>
            <p className={styles.summaryCardValue}>{formatCurrency(totalWithdrawals)}</p>
          </div>
        </Card>
      </div>

      {/* Charts */}
      <div className={styles.chartsGrid}>
        <ChartCard title="Savings Growth Over Time" className={styles.chartFullWidth}>
          <div className={styles.chartContainer}>
            <ResponsiveContainer width="100%" height={250}>
              <LineChart data={savingsGrowth}>
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
                  formatter={(value: number) => [formatCurrency(value), 'Balance']}
                  cursor={{ stroke: 'var(--border-color)', strokeWidth: 1 }}
                />
                <Line type="monotone" dataKey="balance" stroke="#0ea5e9" strokeWidth={2} dot={{ fill: '#0ea5e9', r: 3 }} animationDuration={1000} />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </ChartCard>

        <ChartCard title="Deposit vs Withdrawal">
          <div className={styles.chartContainer}>
            <ResponsiveContainer width="100%" height={250}>
              <BarChart data={depositVsWithdraw}>
                <CartesianGrid strokeDasharray="3 3" stroke="var(--border-color)" />
                <XAxis dataKey="name" stroke="var(--text-tertiary)" fontSize={11} tickLine={false} axisLine={false} />
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
                <Bar dataKey="value" radius={[8, 8, 0, 0]}>
                  {depositVsWithdraw.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={entry.color} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>
        </ChartCard>

        <ChartCard title="Member Contributions">
          <div className={styles.chartContainer}>
            <ResponsiveContainer width="100%" height={250}>
              <PieChart>
                <Pie
                  data={memberContributions}
                  cx="50%"
                  cy="50%"
                  labelLine={false}
                  label={({ memberName, percentage }) => `${memberName} (${percentage}%)`}
                  outerRadius={80}
                  fill="#8884d8"
                  dataKey="amount"
                >
                  {memberContributions.map((entry, index) => (
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
      </div>

      {/* Data Table */}
      <Card title="Savings Transactions" subtitle={`${savings.length} transactions`}>
        <Table
          data={savings}
          columns={columns}
        />
      </Card>

      {/* View Modal */}
      <Modal
        isOpen={viewModalOpen}
        onClose={() => { setViewModalOpen(false); setSelectedSaving(null); }}
        title="Saving Details"
        size="md"
      >
        {selectedSaving && (
          <div className={styles.detailView}>
            <div className={styles.detailRow}>
              <strong>Type:</strong>
              <span>{selectedSaving.type === 'deposit' ? 'Deposit' : 'Withdrawal'}</span>
            </div>
            <div className={styles.detailRow}>
              <strong>Amount:</strong>
              <span>{formatCurrency(selectedSaving.amount)}</span>
            </div>
            <div className={styles.detailRow}>
              <strong>Date:</strong>
              <span>{new Date(selectedSaving.date).toLocaleDateString()}</span>
            </div>
            <div className={styles.detailRow}>
              <strong>Member:</strong>
              <span>{selectedSaving.member?.name || 'N/A'}</span>
            </div>
            {selectedSaving.note && (
              <div className={styles.detailRow}>
                <strong>Note:</strong>
                <span>{selectedSaving.note}</span>
              </div>
            )}
            <div className={styles.detailRow}>
              <strong>Created:</strong>
              <span>{new Date(selectedSaving.createdAt).toLocaleString()}</span>
            </div>
            <div className={styles.detailRow}>
              <strong>Last Updated:</strong>
              <span>{new Date(selectedSaving.updatedAt).toLocaleString()}</span>
            </div>
          </div>
        )}
      </Modal>

      {/* Edit Modal */}
      <Modal
        isOpen={editModalOpen}
        onClose={() => { setEditModalOpen(false); setSelectedSaving(null); }}
        title="Edit Saving"
        size="md"
      >
        {selectedSaving && (
          <EditSavingForm
            saving={selectedSaving}
            onSubmit={handleEditSubmit}
            onCancel={() => { setEditModalOpen(false); setSelectedSaving(null); }}
            loading={actionLoading}
          />
        )}
      </Modal>

      {/* Delete Confirmation Dialog */}
      <ConfirmationDialog
        isOpen={deleteDialogOpen}
        onClose={() => { setDeleteDialogOpen(false); setSelectedSaving(null); }}
        onConfirm={handleDeleteConfirm}
        title="Delete Transaction"
        message={`Are you sure you want to delete this ${selectedSaving?.type === 'deposit' ? 'deposit' : 'withdrawal'} entry? This action cannot be undone.`}
        confirmLabel="Delete"
        loading={actionLoading}
      />
    </div>
  );
};

// Edit Saving Form Component
interface EditSavingFormProps {
  saving: SavingTransaction;
  onSubmit: (data: { type: 'deposit' | 'withdraw'; amount: number; date: string; note?: string }) => Promise<void>;
  onCancel: () => void;
  loading: boolean;
}

const EditSavingForm: React.FC<EditSavingFormProps> = ({ saving, onSubmit, onCancel, loading }) => {
  const [type, setType] = useState<'deposit' | 'withdraw'>(saving.type);
  const [amount, setAmount] = useState(saving.amount.toString());
  const [date, setDate] = useState(saving.date.split('T')[0]);
  const [note, setNote] = useState(saving.note || '');
  const [errors, setErrors] = useState<Record<string, string>>({});

  const validate = (): boolean => {
    const newErrors: Record<string, string> = {};
    
    if (!type) {
      newErrors.type = 'Please select a type';
    }
    
    if (!amount || isNaN(Number(amount)) || Number(amount) <= 0) {
      newErrors.amount = 'Please enter a valid amount greater than 0';
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
        type,
        amount: parseFloat(amount),
        date: new Date(date).toISOString(),
        note: note || undefined,
      });
    } catch (err: any) {
      if (err.response?.data?.message) {
        setErrors({ general: err.response.data.message });
      }
    }
  };

  return (
    <form onSubmit={handleSubmit} className={styles.editForm}>
      {errors.general && (
        <div className={styles.errorMessage}>{errors.general}</div>
      )}
      
      <div className={styles.formGroup}>
        <label htmlFor="type">Type *</label>
        <select
          id="type"
          value={type}
          onChange={(e) => setType(e.target.value as 'deposit' | 'withdraw')}
          className={errors.type ? styles.inputError : ''}
          disabled={loading}
        >
          <option value="deposit">Deposit</option>
          <option value="withdraw">Withdrawal</option>
        </select>
        {errors.type && <span className={styles.fieldError}>{errors.type}</span>}
      </div>

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
        <label htmlFor="note">Note</label>
        <textarea
          id="note"
          value={note}
          onChange={(e) => setNote(e.target.value)}
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
          Update Transaction
        </Button>
      </div>
    </form>
  );
};

export default Savings;
