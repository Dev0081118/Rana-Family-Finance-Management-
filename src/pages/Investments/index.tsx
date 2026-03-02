import React, { useState, useEffect } from 'react';
import { Plus, Eye, Edit2, Trash2, Wallet } from 'lucide-react';
import { useNavigate, useLocation } from 'react-router-dom';
import { TrendingUp, TrendingDown } from 'lucide-react';
import { PieChart, Pie, Cell, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, LineChart, Line, BarChart, Bar } from 'recharts';
import Card from '../../components/common/Card';
import ChartCard from '../../components/charts/ChartCard';
import Button from '../../components/common/Button';
import Table from '../../components/common/Table';
import Modal from '../../components/common/Modal';
import ConfirmationDialog from '../../components/common/ConfirmationDialog';
import { investmentService } from '../../services/api';
import { authService } from '../../services/api';
import styles from './Investments.module.css';

interface Investment {
  _id: string;
  assetName: string;
  assetType: string;
  investedAmount: number;
  currentValue: number;
  purchaseDate: string;
  member: {
    _id: string;
    name: string;
    email: string;
  };
  createdAt: string;
  updatedAt: string;
  profitLoss?: number;
  roi?: number;
}

interface DistributionData {
  name: string;
  value: number;
  color: string;
}

interface NetWorthData {
  date: string;
  value: number;
}

const Investments: React.FC = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const [investments, setInvestments] = useState<Investment[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const isMounted = React.useRef(true);
  const [shouldRefresh, setShouldRefresh] = useState(false);

  // Modal states
  const [viewModalOpen, setViewModalOpen] = useState(false);
  const [editModalOpen, setEditModalOpen] = useState(false);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [selectedInvestment, setSelectedInvestment] = useState<Investment | null>(null);
  const [actionLoading, setActionLoading] = useState(false);

  const currentUser = authService.getCurrentUser();

  const fetchInvestments = async (retryCount = 0): Promise<boolean> => {
    if (!isMounted.current) return false;

    try {
      setLoading(true);
      const response = await investmentService.getAll();
      if (isMounted.current) {
        setInvestments(response.data.data);
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
        return fetchInvestments(retryCount + 1);
      }
      
      if (status !== 401) {
        setError(err.response?.data?.message || 'Failed to fetch investment data');
        console.error('Error fetching investments:', err);
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
      fetchInvestments();
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
      fetchInvestments().finally(() => {
        if (isMounted.current) {
          setShouldRefresh(false);
          window.history.replaceState({}, document.title);
        }
      });
    }
  }, [shouldRefresh]);

  const handleRetry = () => {
    fetchInvestments();
  };

  const formatCurrency = (value: number): string => {
    return new Intl.NumberFormat('en-IN', {
      style: 'currency',
      currency: 'INR',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(value);
  };

  // Calculate totals
  const totalInvested = investments.reduce((sum, inv) => sum + inv.investedAmount, 0);
  const currentValue = investments.reduce((sum, inv) => sum + inv.currentValue, 0);
  const profitLoss = currentValue - totalInvested;
  const roi = totalInvested > 0 ? (profitLoss / totalInvested) * 100 : 0;

  // Process investment distribution by asset type
  const processInvestmentDistribution = (): DistributionData[] => {
    const typeMap = new Map<string, number>();
    const typeColors: Record<string, string> = {
      'Stocks': '#0ea5e9',
      'Bonds': '#10b981',
      'Mutual Funds': '#f59e0b',
      'Cryptocurrency': '#8b5cf6',
      'Real Estate': '#ef4444',
      'Gold': '#fbbf24',
      'Fixed Deposit': '#6b7280',
      'PPF': '#ec4899',
      'SIP': '#14b8a6',
      'Other': '#9ca3af'
    };

    investments.forEach(inv => {
      const currentVal = inv.currentValue;
      typeMap.set(inv.assetType, (typeMap.get(inv.assetType) || 0) + currentVal);
    });

    return Array.from(typeMap.entries())
      .map(([name, value]) => ({
        name,
        value,
        color: typeColors[name] || '#9ca3af'
      }))
      .sort((a, b) => b.value - a.value);
  };

  // Process asset type breakdown
  const processAssetTypeData = (): DistributionData[] => {
    const typeMap = new Map<string, number>();
    
    investments.forEach(inv => {
      const currentVal = inv.currentValue;
      typeMap.set(inv.assetType, (typeMap.get(inv.assetType) || 0) + currentVal);
    });

    const colors = ['#0ea5e9', '#10b981', '#f59e0b', '#ef4444', '#8b5cf6', '#ec4899', '#6b7280', '#14b8a6', '#fbbf24', '#9ca3af'];

    return Array.from(typeMap.entries())
      .map(([name, value], index) => ({
        name,
        value,
        color: colors[index % colors.length]
      }))
      .sort((a, b) => b.value - a.value);
  };

  // Process net worth growth over time
  const processNetWorthData = (): NetWorthData[] => {
    const monthlyMap = new Map<string, { invested: number; current: number }>();
    
    investments.forEach(inv => {
      const date = new Date(inv.purchaseDate);
      const monthYear = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;
      
      if (!monthlyMap.has(monthYear)) {
        monthlyMap.set(monthYear, { invested: 0, current: 0 });
      }
      
      const data = monthlyMap.get(monthYear)!;
      data.invested += inv.investedAmount;
      data.current += inv.currentValue;
    });

    return Array.from(monthlyMap.entries())
      .map(([date, data]) => ({ date, value: data.current }))
      .sort((a, b) => a.date.localeCompare(b.date));
  };

  const investmentDistribution = processInvestmentDistribution();
  const assetTypeData = processAssetTypeData();
  const netWorthData = processNetWorthData();

  // CRUD Action Handlers
  const handleView = (investment: Investment) => {
    setSelectedInvestment(investment);
    setViewModalOpen(true);
  };

  const handleEdit = (investment: Investment) => {
    setSelectedInvestment(investment);
    setEditModalOpen(true);
  };

  const handleDeleteClick = (investment: Investment) => {
    setSelectedInvestment(investment);
    setDeleteDialogOpen(true);
  };

  const handleDeleteConfirm = async () => {
    if (!selectedInvestment) return;

    try {
      setActionLoading(true);
      await investmentService.delete(selectedInvestment._id);
      setDeleteDialogOpen(false);
      setSelectedInvestment(null);
      await fetchInvestments();
    } catch (err: any) {
      console.error('Error deleting investment:', err);
      setError(err.response?.data?.message || 'Failed to delete investment');
    } finally {
      setActionLoading(false);
    }
  };

  const handleEditSubmit = async (formData: { 
    assetName: string; 
    assetType: string; 
    investedAmount: number; 
    currentValue: number; 
    purchaseDate: string 
  }) => {
    if (!selectedInvestment) return;

    try {
      setActionLoading(true);
      await investmentService.update(selectedInvestment._id, formData);
      setEditModalOpen(false);
      setSelectedInvestment(null);
      await fetchInvestments();
    } catch (err: any) {
      console.error('Error updating investment:', err);
      throw err;
    } finally {
      setActionLoading(false);
    }
  };

  const closeModals = () => {
    setViewModalOpen(false);
    setEditModalOpen(false);
    setDeleteDialogOpen(false);
    setSelectedInvestment(null);
  };

  // Table columns with action buttons
  const columns = [
    { key: 'assetName', header: 'Asset Name', sortable: true },
    { key: 'assetType', header: 'Asset Type', sortable: true },
    { key: 'investedAmount', header: 'Invested', sortable: true, render: (value: number) => formatCurrency(value) },
    { key: 'currentValue', header: 'Current Value', sortable: true, render: (value: number) => formatCurrency(value) },
    { key: 'purchaseDate', header: 'Purchase Date', sortable: true, render: (value: string) => new Date(value).toLocaleDateString() },
    {
      key: 'profitLoss',
      header: 'P&L',
      sortable: true,
      render: (value: number, row: Investment) => {
        const profit = row.currentValue - row.investedAmount;
        const isPositive = profit >= 0;
        return (
          <span className={isPositive ? styles.amountPositive : styles.amountNegative}>
            {isPositive ? '+' : ''}{formatCurrency(profit)}
          </span>
        );
      }
    },
    {
      key: 'roi',
      header: 'ROI %',
      sortable: true,
      render: (value: number, row: Investment) => {
        const profit = row.currentValue - row.investedAmount;
        const roi = row.investedAmount > 0 ? (profit / row.investedAmount) * 100 : 0;
        const isPositive = roi >= 0;
        return (
          <span className={isPositive ? styles.amountPositive : styles.amountNegative}>
            {isPositive ? '+' : ''}{roi.toFixed(1)}%
          </span>
        );
      }
    },
    {
      key: 'actions',
      header: 'Actions',
      sortable: false,
      render: (_: any, row: Investment) => (
        <div className={styles.actionButtons}>
          <Button
            variant="ghost"
            size="small"
            onClick={(e) => { e.stopPropagation(); handleView(row); }}
            aria-label="View investment"
          >
            <Eye size={16} />
          </Button>
          <Button
            variant="ghost"
            size="small"
            onClick={(e) => { e.stopPropagation(); handleEdit(row); }}
            aria-label="Edit investment"
          >
            <Edit2 size={16} />
          </Button>
          <Button
            variant="ghost"
            size="small"
            onClick={(e) => { e.stopPropagation(); handleDeleteClick(row); }}
            aria-label="Delete investment"
          >
            <Trash2 size={16} />
          </Button>
        </div>
      ),
    },
  ];

  if (loading) {
    return (
      <div className={styles.investmentsPage}>
        <div className={styles.pageHeader}>
          <h1 className={styles.pageTitle}>Investments</h1>
          <Button leftIcon={<Wallet size={16} />} onClick={() => navigate('/investments/add')}>
            Add Investment
          </Button>
        </div>
        <Card>
          <div className={styles.loadingContainer}>
            <p>Loading investment data...</p>
          </div>
        </Card>
      </div>
    );
  }

  if (error) {
    return (
      <div className={styles.investmentsPage}>
        <div className={styles.pageHeader}>
          <h1 className={styles.pageTitle}>Investments</h1>
          <Button leftIcon={<Wallet size={16} />} onClick={() => navigate('/investments/add')}>
            Add Investment
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
    <div className={styles.investmentsPage}>
      <div className={styles.pageHeader}>
        <h1 className={styles.pageTitle}>Investments</h1>
        <Button leftIcon={<Wallet size={16} />} onClick={() => navigate('/investments/add')}>
          Add Investment
        </Button>
      </div>

      {/* Summary Cards */}
      <div className={styles.summaryGrid}>
        <Card variant="primary">
          <div className={styles.summaryCard}>
            <h3 className={styles.summaryCardTitle}>Total Invested</h3>
            <p className={styles.summaryCardValue}>{formatCurrency(totalInvested)}</p>
          </div>
        </Card>
        <Card variant="success">
          <div className={styles.summaryCard}>
            <h3 className={styles.summaryCardTitle}>Current Value</h3>
            <p className={styles.summaryCardValue}>{formatCurrency(currentValue)}</p>
          </div>
        </Card>
        <Card variant={profitLoss >= 0 ? 'success' : 'danger'}>
          <div className={styles.summaryCard}>
            <h3 className={styles.summaryCardTitle}>Profit / Loss</h3>
            <p className={styles.summaryCardValue}>{formatCurrency(profitLoss)}</p>
            <div className={`${styles.summaryCardChange} ${profitLoss >= 0 ? 'positive' : 'negative'}`}>
              {profitLoss >= 0 ? <TrendingUp size={16} /> : <TrendingDown size={16} />}
              <span>{Math.abs(roi).toFixed(1)}% ROI</span>
            </div>
          </div>
        </Card>
        <Card variant="warning">
          <div className={styles.summaryCard}>
            <h3 className={styles.summaryCardTitle}>ROI %</h3>
            <p className={styles.summaryCardValue}>{roi.toFixed(1)}%</p>
          </div>
        </Card>
      </div>

      {/* Charts */}
      <div className={styles.chartsGrid}>
        <ChartCard title="Investment Distribution">
          <div className={styles.chartContainer}>
            <ResponsiveContainer width="100%" height={250}>
              <PieChart>
                <Pie
                  data={investmentDistribution}
                  cx="50%"
                  cy="50%"
                  labelLine={false}
                  label={({ name, percentage }) => `${name} (${percentage}%)`}
                  outerRadius={80}
                  fill="#8884d8"
                  dataKey="value"
                >
                  {investmentDistribution.map((entry, index) => (
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

        <ChartCard title="Asset Type Breakdown">
          <div className={styles.chartContainer}>
            <ResponsiveContainer width="100%" height={250}>
              <BarChart data={assetTypeData}>
                <CartesianGrid strokeDasharray="3 3" stroke="var(--border-color)" />
                <XAxis dataKey="name" stroke="var(--text-tertiary)" fontSize={11} tickLine={false} axisLine={false} />
                <YAxis stroke="var(--text-tertiary)" fontSize={11} tickLine={false} axisLine={false} tickFormatter={(value) => `₹${value / 1000}k`} width={40} />
                <Tooltip
                  contentStyle={{
                    backgroundColor: 'var(--bg-card)',
                    border: '1px solid var(--border-color)',
                    borderRadius: 'var(--radius-lg)',
                    boxShadow: 'var(--shadow-lg)',
                    padding: 'var(--space-3)',
                  }}
                  formatter={(value: number) => [formatCurrency(value), 'Value']}
                  cursor={{ fill: 'var(--bg-hover)' }}
                />
                <Bar dataKey="value" radius={[8, 8, 0, 0]}>
                  {assetTypeData.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={entry.color} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>
        </ChartCard>

        <ChartCard title="Net Worth Growth" className={styles.chartFullWidth}>
          <div className={styles.chartContainer}>
            <ResponsiveContainer width="100%" height={250}>
              <LineChart data={netWorthData}>
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
                  formatter={(value: number) => [formatCurrency(value), 'Net Worth']}
                  cursor={{ stroke: 'var(--border-color)', strokeWidth: 1 }}
                />
                <Line type="monotone" dataKey="value" stroke="#0ea5e9" strokeWidth={2} dot={{ fill: '#0ea5e9', r: 3 }} animationDuration={1000} />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </ChartCard>
      </div>

      {/* Data Table */}
      <Card title="Investment Portfolio" subtitle={`${investments.length} investments`}>
        <Table
          data={investments}
          columns={columns}
        />
      </Card>

      {/* View Modal */}
      <Modal
        isOpen={viewModalOpen}
        onClose={() => { setViewModalOpen(false); setSelectedInvestment(null); }}
        title="Investment Details"
        size="md"
      >
        {selectedInvestment && (
          <div className={styles.detailView}>
            <div className={styles.detailRow}>
              <strong>Asset Name:</strong>
              <span>{selectedInvestment.assetName}</span>
            </div>
            <div className={styles.detailRow}>
              <strong>Asset Type:</strong>
              <span>{selectedInvestment.assetType}</span>
            </div>
            <div className={styles.detailRow}>
              <strong>Invested Amount:</strong>
              <span>{formatCurrency(selectedInvestment.investedAmount)}</span>
            </div>
            <div className={styles.detailRow}>
              <strong>Current Value:</strong>
              <span>{formatCurrency(selectedInvestment.currentValue)}</span>
            </div>
            <div className={styles.detailRow}>
              <strong>Profit/Loss:</strong>
              <span className={selectedInvestment.currentValue - selectedInvestment.investedAmount >= 0 ? styles.amountPositive : styles.amountNegative}>
                {formatCurrency(selectedInvestment.currentValue - selectedInvestment.investedAmount)}
              </span>
            </div>
            <div className={styles.detailRow}>
              <strong>ROI:</strong>
              <span className={selectedInvestment.currentValue - selectedInvestment.investedAmount >= 0 ? styles.amountPositive : styles.amountNegative}>
                {selectedInvestment.investedAmount > 0 ? ((selectedInvestment.currentValue - selectedInvestment.investedAmount) / selectedInvestment.investedAmount * 100).toFixed(1) : '0.0'}%
              </span>
            </div>
            <div className={styles.detailRow}>
              <strong>Purchase Date:</strong>
              <span>{new Date(selectedInvestment.purchaseDate).toLocaleDateString()}</span>
            </div>
            <div className={styles.detailRow}>
              <strong>Member:</strong>
              <span>{selectedInvestment.member?.name || 'N/A'}</span>
            </div>
            <div className={styles.detailRow}>
              <strong>Created:</strong>
              <span>{new Date(selectedInvestment.createdAt).toLocaleString()}</span>
            </div>
            <div className={styles.detailRow}>
              <strong>Last Updated:</strong>
              <span>{new Date(selectedInvestment.updatedAt).toLocaleString()}</span>
            </div>
          </div>
        )}
      </Modal>

      {/* Edit Modal */}
      <Modal
        isOpen={editModalOpen}
        onClose={() => { setEditModalOpen(false); setSelectedInvestment(null); }}
        title="Edit Investment"
        size="md"
      >
        {selectedInvestment && (
          <EditInvestmentForm
            investment={selectedInvestment}
            onSubmit={handleEditSubmit}
            onCancel={() => { setEditModalOpen(false); setSelectedInvestment(null); }}
            loading={actionLoading}
          />
        )}
      </Modal>

      {/* Delete Confirmation Dialog */}
      <ConfirmationDialog
        isOpen={deleteDialogOpen}
        onClose={() => { setDeleteDialogOpen(false); setSelectedInvestment(null); }}
        onConfirm={handleDeleteConfirm}
        title="Delete Investment"
        message={`Are you sure you want to delete this investment? This action cannot be undone.`}
        confirmLabel="Delete"
        loading={actionLoading}
      />
    </div>
  );
};

// Edit Investment Form Component
interface EditInvestmentFormProps {
  investment: Investment;
  onSubmit: (data: { 
    assetName: string; 
    assetType: string; 
    investedAmount: number; 
    currentValue: number; 
    purchaseDate: string 
  }) => Promise<void>;
  onCancel: () => void;
  loading: boolean;
}

const EditInvestmentForm: React.FC<EditInvestmentFormProps> = ({ investment, onSubmit, onCancel, loading }) => {
  const [assetName, setAssetName] = useState(investment.assetName);
  const [assetType, setAssetType] = useState(investment.assetType);
  const [investedAmount, setInvestedAmount] = useState(investment.investedAmount.toString());
  const [currentValue, setCurrentValue] = useState(investment.currentValue.toString());
  const [purchaseDate, setPurchaseDate] = useState(investment.purchaseDate.split('T')[0]);
  const [errors, setErrors] = useState<Record<string, string>>({});

  const validate = (): boolean => {
    const newErrors: Record<string, string> = {};
    
    if (!assetName.trim()) {
      newErrors.assetName = 'Please enter an asset name';
    }
    
    if (!assetType) {
      newErrors.assetType = 'Please select an asset type';
    }
    
    if (!investedAmount || isNaN(Number(investedAmount)) || Number(investedAmount) <= 0) {
      newErrors.investedAmount = 'Please enter a valid invested amount';
    }
    
    if (!currentValue || isNaN(Number(currentValue)) || Number(currentValue) < 0) {
      newErrors.currentValue = 'Please enter a valid current value';
    }
    
    if (!purchaseDate) {
      newErrors.purchaseDate = 'Please select a purchase date';
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
        assetName: assetName.trim(),
        assetType,
        investedAmount: parseFloat(investedAmount),
        currentValue: parseFloat(currentValue),
        purchaseDate: new Date(purchaseDate).toISOString(),
      });
    } catch (err: any) {
      if (err.response?.data?.message) {
        setErrors({ general: err.response.data.message });
      }
    }
  };

  const assetTypes = [
    'Stocks',
    'Bonds',
    'Mutual Funds',
    'Cryptocurrency',
    'Real Estate',
    'Gold',
    'Fixed Deposit',
    'PPF',
    'SIP',
    'Other'
  ];

  return (
    <form onSubmit={handleSubmit} className={styles.editForm}>
      {errors.general && (
        <div className={styles.errorMessage}>{errors.general}</div>
      )}
      
      <div className={styles.formGroup}>
        <label htmlFor="assetName">Asset Name *</label>
        <input
          type="text"
          id="assetName"
          value={assetName}
          onChange={(e) => setAssetName(e.target.value)}
          className={errors.assetName ? styles.inputError : ''}
          disabled={loading}
        />
        {errors.assetName && <span className={styles.fieldError}>{errors.assetName}</span>}
      </div>

      <div className={styles.formGroup}>
        <label htmlFor="assetType">Asset Type *</label>
        <select
          id="assetType"
          value={assetType}
          onChange={(e) => setAssetType(e.target.value)}
          className={errors.assetType ? styles.inputError : ''}
          disabled={loading}
        >
          {assetTypes.map(type => (
            <option key={type} value={type}>{type}</option>
          ))}
        </select>
        {errors.assetType && <span className={styles.fieldError}>{errors.assetType}</span>}
      </div>

      <div className={styles.formGroup}>
        <label htmlFor="investedAmount">Invested Amount *</label>
        <input
          type="number"
          id="investedAmount"
          value={investedAmount}
          onChange={(e) => setInvestedAmount(e.target.value)}
          className={errors.investedAmount ? styles.inputError : ''}
          disabled={loading}
        />
        {errors.investedAmount && <span className={styles.fieldError}>{errors.investedAmount}</span>}
      </div>

      <div className={styles.formGroup}>
        <label htmlFor="currentValue">Current Value *</label>
        <input
          type="number"
          id="currentValue"
          value={currentValue}
          onChange={(e) => setCurrentValue(e.target.value)}
          className={errors.currentValue ? styles.inputError : ''}
          disabled={loading}
        />
        {errors.currentValue && <span className={styles.fieldError}>{errors.currentValue}</span>}
      </div>

      <div className={styles.formGroup}>
        <label htmlFor="purchaseDate">Purchase Date *</label>
        <input
          type="date"
          id="purchaseDate"
          value={purchaseDate}
          onChange={(e) => setPurchaseDate(e.target.value)}
          className={errors.purchaseDate ? styles.inputError : ''}
          disabled={loading}
        />
        {errors.purchaseDate && <span className={styles.fieldError}>{errors.purchaseDate}</span>}
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
          Update Investment
        </Button>
      </div>
    </form>
  );
};

export default Investments;
