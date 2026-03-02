import React, { useState, useEffect, useCallback } from 'react';
import { useErrorHandler } from '../../hooks/useErrorHandler';
import { analyticsService, loanService } from '../../services/api';
import LoadingSpinner from '../../components/common/LoadingSpinner';
import FilterBar from '../../components/common/FilterBar';
import SummaryCards from './components/SummaryCards';
import IncomeExpenseChart from './components/IncomeExpenseChart';
import TrendChart from './components/TrendChart';
import ExpenseBreakdownChart from './components/ExpenseBreakdownChart';
import styles from './Dashboard.module.css';

interface DashboardData {
  summary: {
    totalIncome: number;
    totalExpenses: number;
    totalInvestments: number;
    totalDeposits: number;
    netBalance: number;
    savingsRate: number;
  };
  charts: {
    expenseBreakdown: Array<{ category: string; amount: number }>;
    trendData: Array<{ date: string; income: number; expenses: number }>;
  };
}

interface LoanSummary {
  totalLoans: number;
  totalLoanAmount: number;
  totalRemainingBalance: number;
  totalMonthlyPayments: number;
  totalInterestPayable: number;
  overdueLoans: number;
}

type FilterType = 'today' | 'month' | 'all';

const Dashboard: React.FC = () => {
  const [filter, setFilter] = useState<FilterType>('all');
  const [data, setData] = useState<DashboardData | null>(null);
  const [loanSummary, setLoanSummary] = useState<LoanSummary | null>(null);
  const [loading, setLoading] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const { error, handleError, clearError } = useErrorHandler();

  const fetchDashboardData = useCallback(async (currentFilter: FilterType, isRefresh = false) => {
    try {
      if (isRefresh) {
        setRefreshing(true);
      } else {
        setLoading(true);
      }
      clearError();

      const [dashboardResponse, loanResponse] = await Promise.all([
        analyticsService.getDashboard(currentFilter),
        loanService.getSummary()
      ]);
      
      if (dashboardResponse.data.success) {
        setData(dashboardResponse.data.data);
      } else {
        throw new Error(dashboardResponse.data.message || 'Failed to fetch dashboard data');
      }

      if (loanResponse.data.success) {
        setLoanSummary(loanResponse.data.data);
      }
    } catch (err) {
      handleError(err as Error);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [clearError, handleError]);

  useEffect(() => {
    fetchDashboardData(filter);
  }, [filter, fetchDashboardData]);

  const handleFilterChange = (newFilter: string) => {
    setFilter(newFilter as FilterType);
  };

  const handleRefresh = () => {
    fetchDashboardData(filter, true);
  };

  if (loading && !data) {
    return (
      <div className={styles.dashboardLoading}>
        <LoadingSpinner size="large" />
        <p>Loading dashboard...</p>
      </div>
    );
  }

  return (
    <div className={styles.dashboard}>
      <div className={styles.header}>
        <h1 className={styles.title}>Financial Dashboard</h1>
        <div className={styles.headerActions}>
          <FilterBar
            options={[
              { value: 'today', label: 'Today' },
              { value: 'month', label: 'This Month' },
              { value: 'all', label: 'All Time' }
            ]}
            selected={filter}
            onChange={handleFilterChange}
          />
          <button
            className={styles.refreshButton}
            onClick={handleRefresh}
            disabled={refreshing || loading}
          >
            {refreshing ? (
              <LoadingSpinner size="small" />
            ) : (
              'Refresh'
            )}
          </button>
        </div>
      </div>

      {error && (
        <div className={styles.errorBanner}>
          <p>{error.message}</p>
          <button onClick={handleRefresh} className={styles.retryButton}>
            Retry
          </button>
        </div>
      )}

      {data && (
        <>
          <SummaryCards summary={data.summary} loanSummary={loanSummary} />

          <div className={styles.chartsGrid}>
            <div className={styles.chartFullWidth}>
              <IncomeExpenseChart 
                income={data.summary.totalIncome}
                expenses={data.summary.totalExpenses}
              />
            </div>

            <div className={styles.chartHalfWidth}>
              <TrendChart trendData={data.charts.trendData} />
            </div>

            <div className={styles.chartHalfWidth}>
              <ExpenseBreakdownChart 
                breakdown={data.charts.expenseBreakdown}
                totalExpenses={data.summary.totalExpenses}
              />
            </div>
          </div>
        </>
      )}

      {!data && !loading && !error && (
        <div className={styles.emptyState}>
          <p>No data available for the selected filter.</p>
        </div>
      )}
    </div>
  );
};

export default Dashboard;
