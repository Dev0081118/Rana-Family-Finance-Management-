const Income = require('../models/Income');
const Expense = require('../models/Expense');
const Investment = require('../models/Investment');
const Savings = require('../models/Savings');
const asyncHandler = require('../middleware/asyncHandler');

// Helper function to get date filter based on filter parameter
const getDateFilter = (filter) => {
  const now = new Date();
  
  switch (filter) {
    case 'today':
      const startOfDay = new Date(now.getFullYear(), now.getMonth(), now.getDate());
      return { $gte: startOfDay, $lte: now };
    
    case 'month':
      const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
      return { $gte: startOfMonth, $lte: now };
    
    case 'all':
    default:
      return null;
  }
};

// Main dashboard analytics endpoint
const getDashboardAnalytics = asyncHandler(async (req, res, next) => {
  const { filter = 'all' } = req.query;
  
  // Members and admin can view all data
  // No member filter applied
  
  // Add date filter if not 'all'
  const dateFilter = getDateFilter(filter);
  
  // ========== AGGREGATION PIPELINES ==========
  
  // 1. Total Income
  const incomeQuery = dateFilter
    ? { date: dateFilter }
    : {};
  
  const totalIncome = await Income.aggregate([
    { $match: incomeQuery },
    { $group: { _id: null, total: { $sum: '$amount' } } }
  ]);
  
  // 2. Total Expenses
  const expenseQuery = dateFilter
    ? { date: dateFilter }
    : {};
  
  const totalExpenses = await Expense.aggregate([
    { $match: expenseQuery },
    { $group: { _id: null, total: { $sum: '$amount' } } }
  ]);
  
  // 3. Total Investments (using investedAmount)
  const investmentQuery = dateFilter
    ? { purchaseDate: dateFilter }
    : {};
  
  const totalInvestments = await Investment.aggregate([
    { $match: investmentQuery },
    { $group: { _id: null, total: { $sum: '$investedAmount' } } }
  ]);
  
  // 4. Total Savings (deposits only - deposits are positive)
  const savingsQuery = dateFilter
    ? { date: dateFilter }
    : {};
  
  const totalSavings = await Savings.aggregate([
    { $match: savingsQuery },
    { $group: { _id: null, total: { $sum: '$amount' } } }
  ]);
  
  // 5. Net Balance = Income - Expenses - Investments
  const incomeTotal = totalIncome.length > 0 ? totalIncome[0].total : 0;
  const expenseTotal = totalExpenses.length > 0 ? totalExpenses[0].total : 0;
  const investmentTotal = totalInvestments.length > 0 ? totalInvestments[0].total : 0;
  const savingsTotal = totalSavings.length > 0 ? totalSavings[0].total : 0;
  
  const netBalance = incomeTotal - expenseTotal - investmentTotal;
  
  // 6. Savings Rate = (Income - Expenses) / Income * 100
  const savingsRate = incomeTotal > 0 
    ? ((incomeTotal - expenseTotal) / incomeTotal) * 100 
    : 0;
  
  // 7. Expense breakdown by category (for pie chart)
  const expenseBreakdown = await Expense.aggregate([
    { $match: expenseQuery },
    { $group: { _id: '$category', total: { $sum: '$amount' } } },
    { $sort: { total: -1 } }
  ]);
  
  // 8. Daily/Monthly trend data for line chart
  // Group by date (day or month based on filter)
  const trendGrouping = filter === 'month' 
    ? { 
        $dateToString: { 
          format: '%Y-%m-%d', 
          date: '$date' 
        } 
      }
    : { 
        $dateToString: { 
          format: '%Y-%m-%d', 
          date: '$date' 
        } 
      };
  
  const dailyIncomeTrend = await Income.aggregate([
    { $match: incomeQuery },
    { 
      $group: { 
        _id: trendGrouping,
        income: { $sum: '$amount' },
        expenses: { $sum: 0 } // placeholder
      } 
    },
    { $sort: { _id: 1 } }
  ]);
  
  const dailyExpenseTrend = await Expense.aggregate([
    { $match: expenseQuery },
    { 
      $group: { 
        _id: trendGrouping,
        income: { $sum: 0 }, // placeholder
        expenses: { $sum: '$amount' } 
      } 
    },
    { $sort: { _id: 1 } }
  ]);
  
  // Merge income and expense trends
  const trendMap = new Map();
  
  dailyIncomeTrend.forEach(item => {
    trendMap.set(item._id, { date: item._id, income: item.income, expenses: 0 });
  });
  
  dailyExpenseTrend.forEach(item => {
    if (trendMap.has(item._id)) {
      const existing = trendMap.get(item._id);
      trendMap.set(item._id, { ...existing, expenses: item.expenses });
    } else {
      trendMap.set(item._id, { date: item._id, income: 0, expenses: item.expenses });
    }
  });
  
  // Convert to array and sort by date
  const trendData = Array.from(trendMap.values())
    .sort((a, b) => new Date(a.date) - new Date(b.date));
  
  // Format response
  const response = {
    success: true,
    data: {
      summary: {
        totalIncome: parseFloat(incomeTotal.toFixed(2)),
        totalExpenses: parseFloat(expenseTotal.toFixed(2)),
        totalInvestments: parseFloat(investmentTotal.toFixed(2)),
        totalDeposits: parseFloat(savingsTotal.toFixed(2)),
        netBalance: parseFloat(netBalance.toFixed(2)),
        savingsRate: parseFloat(savingsRate.toFixed(2))
      },
      charts: {
        expenseBreakdown: expenseBreakdown.map(item => ({
          category: item._id,
          amount: parseFloat(item.total.toFixed(2))
        })),
        trendData: trendData.map(item => ({
          date: item.date,
          income: parseFloat(item.income.toFixed(2)),
          expenses: parseFloat(item.expenses.toFixed(2))
        }))
      }
    },
    filter,
    timestamp: new Date().toISOString()
  };
  
  res.status(200).json(response);
});

module.exports = {
  getDashboardAnalytics
};
