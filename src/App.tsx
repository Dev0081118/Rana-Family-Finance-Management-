import React, { useState } from 'react';
import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import { ThemeProvider } from './contexts/ThemeContext';
import MainLayout from './components/layout/MainLayout';
import Dashboard from './pages/Dashboard';
import Income from './pages/Income';
import Expenses from './pages/Expenses';
import Savings from './pages/Savings';
import Investments from './pages/Investments';
import Analytics from './pages/Analytics';
import Profile from './pages/Profile';
import Login from './pages/Profile/Login';
import AddIncome from './pages/Income/AddIncome';
import AddExpense from './pages/Expenses/AddExpense';
import AddSavings from './pages/Savings/AddSavings';
import AddInvestment from './pages/Investments/AddInvestment';
import './styles/global.css';

const App: React.FC = () => {
  const [currentMonth] = useState('January 2024');

  const handleMonthChange = () => {
    // TODO: Implement month selector modal
    console.log('Month change clicked');
  };

  return (
    <ThemeProvider>
      <Router future={{ v7_startTransition: true, v7_relativeSplatPath: true }}>
        <MainLayout currentMonth={currentMonth} onMonthChange={handleMonthChange}>
          <Routes>
            <Route path="/" element={<Dashboard />} />
            <Route path="/income" element={<Income />} />
            <Route path="/income/add" element={<AddIncome />} />
            <Route path="/expenses" element={<Expenses />} />
            <Route path="/expenses/add" element={<AddExpense />} />
            <Route path="/savings" element={<Savings />} />
            <Route path="/savings/add" element={<AddSavings />} />
            <Route path="/investments" element={<Investments />} />
            <Route path="/investments/add" element={<AddInvestment />} />
            <Route path="/analytics" element={<Analytics />} />
            <Route path="/profile" element={<Profile />} />
            <Route path="/login" element={<Login />} />
          </Routes>
        </MainLayout>
      </Router>
    </ThemeProvider>
  );
};

export default App;