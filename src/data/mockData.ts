// This file is intentionally left empty
// The application now uses real data from the backend API
// All mock data has been removed to allow you to add your own data

import { Transaction, Member, Category, SummaryCard, ChartData, TimeSeriesData, CategoryBreakdown, MemberContribution, Investment, SavingsAccount } from '../types';

export const members: Member[] = [];

export const categories: Category[] = [];

export const transactions: Transaction[] = [];

export const investments: Investment[] = [];

export const savingsAccounts: SavingsAccount[] = [];

export const getMonthlyIncomeData = (): TimeSeriesData[] => [];

export const getMonthlyExpenseData = (): TimeSeriesData[] => [];

export const getIncomeByCategory = (): CategoryBreakdown[] => [];

export const getExpenseByCategory = (): CategoryBreakdown[] => [];

export const getIncomeByMember = (): MemberContribution[] => [];

export const getExpenseByMember = (): MemberContribution[] => [];

export const getSavingsGrowthData = (): TimeSeriesData[] => [];

export const getDepositVsWithdrawData = (): ChartData[] => [];

export const getInvestmentDistribution = (): CategoryBreakdown[] => [];

export const getNetWorthData = (): TimeSeriesData[] => [];

export const getYearlyIncomeExpense = (): (TimeSeriesData & { income: number; expenses: number })[] => [];

export const getTopExpenseCategories = (): CategoryBreakdown[] => [];

export const getSummaryCards = (): SummaryCard[] => [];
