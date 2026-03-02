import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowLeft, Calculator } from 'lucide-react';
import Button from '../../components/common/Button';
import { FormInput, FormSelect, FormTextarea } from '../../components/common/FormInput';
import { loanService } from '../../services/api';
import { authService } from '../../services/api';
import styles from './AddLoan.module.css';

interface FormData {
  name: string;
  lender: string;
  loanAmount: string;
  interestRate: string;
  term: string;
  startDate: string;
  endDate: string;
  purpose: string;
  collateral: string;
}

interface FormErrors {
  name?: string;
  lender?: string;
  loanAmount?: string;
  interestRate?: string;
  term?: string;
  startDate?: string;
  endDate?: string;
  purpose?: string;
}

const AddLoan: React.FC = () => {
  const navigate = useNavigate();
  const [formData, setFormData] = useState<FormData>({
    name: '',
    lender: '',
    loanAmount: '',
    interestRate: '',
    term: '',
    startDate: new Date().toISOString().split('T')[0],
    endDate: '',
    purpose: '',
    collateral: '',
  });
  const [errors, setErrors] = useState<FormErrors>({});
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState('');
  const [error, setError] = useState('');
  const [calculatedInstallment, setCalculatedInstallment] = useState<number | null>(null);

  const currentUser = authService.getCurrentUser();

  const purposes = [
    'Home Purchase',
    'Home Construction',
    'Vehicle Purchase',
    'Business',
    'Education',
    'Personal',
    'Medical',
    'Wedding',
    'Travel',
    'Debt Consolidation',
    'Other'
  ];

  useEffect(() => {
    if (!currentUser) {
      navigate('/login');
    }
  }, [currentUser, navigate]);

  // Calculate EMI automatically
  useEffect(() => {
    const principal = Number(formData.loanAmount);
    const annualRate = Number(formData.interestRate);
    const months = Number(formData.term);

    if (principal > 0 && annualRate > 0 && months > 0) {
      const monthlyRate = annualRate / 100 / 12;
      const emi = (principal * monthlyRate * Math.pow(1 + monthlyRate, months)) / (Math.pow(1 + monthlyRate, months) - 1);
      setCalculatedInstallment(emi);
    } else {
      setCalculatedInstallment(null);
    }
  }, [formData.loanAmount, formData.interestRate, formData.term]);

  // Auto-calculate end date based on start date and term
  useEffect(() => {
    if (formData.startDate && formData.term) {
      const start = new Date(formData.startDate);
      const end = new Date(start);
      end.setMonth(end.getMonth() + Number(formData.term));
      setFormData(prev => ({
        ...prev,
        endDate: end.toISOString().split('T')[0],
      }));
    }
  }, [formData.startDate, formData.term]);

  const validateForm = (): boolean => {
    const newErrors: FormErrors = {};

    if (!formData.name.trim()) {
      newErrors.name = 'Loan name is required';
    }

    if (!formData.lender.trim()) {
      newErrors.lender = 'Lender name is required';
    }

    if (!formData.loanAmount.trim()) {
      newErrors.loanAmount = 'Loan amount is required';
    } else if (isNaN(Number(formData.loanAmount)) || Number(formData.loanAmount) <= 0) {
      newErrors.loanAmount = 'Loan amount must be a positive number';
    }

    if (!formData.interestRate.trim()) {
      newErrors.interestRate = 'Interest rate is required';
    } else if (isNaN(Number(formData.interestRate)) || Number(formData.interestRate) < 0 || Number(formData.interestRate) > 100) {
      newErrors.interestRate = 'Interest rate must be between 0 and 100';
    }

    if (!formData.term.trim()) {
      newErrors.term = 'Loan term is required';
    } else if (isNaN(Number(formData.term)) || Number(formData.term) <= 0) {
      newErrors.term = 'Term must be a positive number of months';
    }

    if (!formData.startDate) {
      newErrors.startDate = 'Start date is required';
    }

    if (!formData.purpose) {
      newErrors.purpose = 'Purpose is required';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
    if (errors[name as keyof FormErrors]) {
      setErrors(prev => ({ ...prev, [name]: undefined }));
    }
    setError('');
    setSuccess('');
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setSuccess('');

    if (!validateForm()) {
      return;
    }

    setLoading(true);

    try {
      const loanData = {
        name: formData.name.trim(),
        lender: formData.lender.trim(),
        loanAmount: Number(formData.loanAmount),
        interestRate: Number(formData.interestRate),
        term: Number(formData.term),
        startDate: formData.startDate,
        endDate: formData.endDate,
        purpose: formData.purpose,
        collateral: formData.collateral.trim() || undefined,
        memberId: currentUser?.id,
      };

      await loanService.create(loanData);

      setSuccess('Loan added successfully!');
      setFormData({
        name: '',
        lender: '',
        loanAmount: '',
        interestRate: '',
        term: '',
        startDate: new Date().toISOString().split('T')[0],
        endDate: '',
        purpose: '',
        collateral: '',
      });

      setTimeout(() => {
        navigate('/loans', { state: { refresh: true } });
      }, 1500);
    } catch (err: any) {
      setError(err.response?.data?.message || 'Failed to add loan. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  if (!currentUser) {
    return null;
  }

  return (
    <div className={styles.addLoanPage}>
      <div className={styles.pageHeader}>
        <button className={styles.backButton} onClick={() => navigate('/loans')}>
          <ArrowLeft size={20} />
        </button>
        <h1 className={styles.formTitle}>Add New Loan</h1>
      </div>

      {success && <div className={styles.successMessage}>{success}</div>}
      {error && <div className={styles.errorMessage}>{error}</div>}

      <form className={styles.formCard} onSubmit={handleSubmit}>
        <div className={styles.formGrid}>
          <FormInput
            label="Loan Name *"
            name="name"
            value={formData.name}
            onChange={handleChange}
            error={errors.name}
            placeholder="e.g., Home Loan, Car Loan"
            required
          />

          <FormInput
            label="Lender *"
            name="lender"
            value={formData.lender}
            onChange={handleChange}
            error={errors.lender}
            placeholder="e.g., HDFC Bank, SBI"
            required
          />

          <FormInput
            label="Loan Amount (₹) *"
            name="loanAmount"
            type="number"
            value={formData.loanAmount}
            onChange={handleChange}
            error={errors.loanAmount}
            placeholder="Enter loan amount"
            required
          />

          <FormInput
            label="Interest Rate (%) *"
            name="interestRate"
            type="number"
            step="0.01"
            value={formData.interestRate}
            onChange={handleChange}
            error={errors.interestRate}
            placeholder="e.g., 8.5"
            required
          />

          <FormInput
            label="Term (months) *"
            name="term"
            type="number"
            value={formData.term}
            onChange={handleChange}
            error={errors.term}
            placeholder="e.g., 240 for 20 years"
            required
          />

          <FormInput
            label="Start Date *"
            name="startDate"
            type="date"
            value={formData.startDate}
            onChange={handleChange}
            error={errors.startDate}
            required
          />

          <FormInput
            label="End Date (auto-calculated)"
            name="endDate"
            type="date"
            value={formData.endDate}
            disabled
            className={styles.disabledInput}
          />

          <FormSelect
            label="Purpose *"
            name="purpose"
            value={formData.purpose}
            onChange={handleChange}
            error={errors.purpose}
            required
          >
            <option value="">Select purpose</option>
            {purposes.map(purpose => (
              <option key={purpose} value={purpose}>{purpose}</option>
            ))}
          </FormSelect>

          <FormTextarea
            label="Collateral (optional)"
            name="collateral"
            value={formData.collateral}
            onChange={handleChange}
            placeholder="Describe any collateral if applicable"
            rows={3}
          />
        </div>

        {calculatedInstallment && (
          <div className={styles.calculationBox}>
            <div className={styles.calculationIcon}>
              <Calculator size={24} />
            </div>
            <div className={styles.calculationDetails}>
              <h4>Estimated Monthly Installment</h4>
              <p className={styles.emiAmount}>
                ₹{calculatedInstallment.toLocaleString('en-IN', { maximumFractionDigits: 0 })}
              </p>
              <p className={styles.emiSubtext}>
                Principal: ₹{Number(formData.loanAmount).toLocaleString('en-IN', { maximumFractionDigits: 0 })} | 
                Interest: {formData.interestRate}% p.a. | 
                Term: {formData.term} months
              </p>
            </div>
          </div>
        )}

        <div className={styles.formActions}>
          <Button
            type="button"
            variant="secondary"
            onClick={() => navigate('/loans')}
          >
            Cancel
          </Button>
          <Button
            type="submit"
            variant="primary"
            loading={loading}
            disabled={loading}
          >
            Add Loan
          </Button>
        </div>
      </form>
    </div>
  );
};

export default AddLoan;
