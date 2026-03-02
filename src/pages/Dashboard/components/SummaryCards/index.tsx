import React from 'react';
import { TrendingUp, TrendingDown, Wallet, PiggyBank, LineChart, Target } from 'lucide-react';
import styles from './SummaryCards.module.css';

interface SummaryCardsProps {
  summary: {
    totalIncome: number;
    totalExpenses: number;
    totalInvestments: number;
    totalDeposits: number;
    netBalance: number;
    savingsRate: number;
  };
}

const formatCurrency = (amount: number): string => {
  return new Intl.NumberFormat('en-IN', {
    style: 'currency',
    currency: 'INR',
    minimumFractionDigits: 2,
    maximumFractionDigits: 2
  }).format(amount);
};

const SummaryCards: React.FC<SummaryCardsProps> = ({ summary }) => {
  const cards = [
    {
      title: 'Total Income',
      value: formatCurrency(summary.totalIncome),
      icon: TrendingUp,
      color: 'var(--color-success)',
      bgColor: 'var(--bg-success-light)'
    },
    {
      title: 'Total Expenses',
      value: formatCurrency(summary.totalExpenses),
      icon: TrendingDown,
      color: 'var(--color-error)',
      bgColor: 'var(--bg-error-light)'
    },
    {
      title: 'Total Investments',
      value: formatCurrency(summary.totalInvestments),
      icon: LineChart,
      color: 'var(--color-primary)',
      bgColor: 'var(--bg-primary-light)'
    },
    {
      title: 'Total Deposits',
      value: formatCurrency(summary.totalDeposits),
      icon: PiggyBank,
      color: 'var(--color-warning)',
      bgColor: 'var(--bg-warning-light)'
    },
    {
      title: 'Net Balance',
      value: formatCurrency(summary.netBalance),
      icon: Wallet,
      color: summary.netBalance >= 0 ? 'var(--color-success)' : 'var(--color-error)',
      bgColor: summary.netBalance >= 0 ? 'var(--bg-success-light)' : 'var(--bg-error-light)'
    },
    {
      title: 'Savings Rate',
      value: `${summary.savingsRate.toFixed(1)}%`,
      icon: Target,
      color: summary.savingsRate >= 20 ? 'var(--color-success)' : 
             summary.savingsRate >= 10 ? 'var(--color-warning)' : 'var(--color-error)',
      bgColor: summary.savingsRate >= 20 ? 'var(--bg-success-light)' : 
               summary.savingsRate >= 10 ? 'var(--bg-warning-light)' : 'var(--bg-error-light)'
    }
  ];

  return (
    <div className={styles.summaryCards}>
      {cards.map((card, index) => (
        <div key={index} className={styles.card} style={{ borderLeftColor: card.color }}>
          <div className={styles.cardIcon} style={{ backgroundColor: card.bgColor, color: card.color }}>
            <card.icon size={24} />
          </div>
          <div className={styles.cardContent}>
            <h3 className={styles.cardTitle}>{card.title}</h3>
            <p className={styles.cardValue}>{card.value}</p>
          </div>
        </div>
      ))}
    </div>
  );
};

export default SummaryCards;
