import React, { forwardRef } from 'react';
import styles from './FormInput.module.css';

interface FormInputProps extends React.InputHTMLAttributes<HTMLInputElement> {
  label: string;
  error?: string;
  required?: boolean;
}

interface FormSelectProps extends React.SelectHTMLAttributes<HTMLSelectElement> {
  label: string;
  error?: string;
  required?: boolean;
  children: React.ReactNode;
}

interface FormTextareaProps extends React.TextareaHTMLAttributes<HTMLTextAreaElement> {
  label: string;
  error?: string;
  required?: boolean;
}

export const FormInput = forwardRef<HTMLInputElement, FormInputProps>(({
  label,
  error,
  required = false,
  className = '',
  id,
  ...props
}, ref) => {
  const inputId = id || `input-${label.toLowerCase().replace(/\s/g, '-')}`;

  return (
    <div className={styles.inputGroup}>
      <label htmlFor={inputId} className={styles.inputLabel}>
        {label}
        {required && <span className={styles.required}>*</span>}
      </label>
      <input
        ref={ref}
        id={inputId}
        className={`${styles.inputField} ${error ? styles.error : ''} ${className}`}
        {...props}
      />
      {error && <span className={styles.errorMessage}>{error}</span>}
    </div>
  );
});

FormInput.displayName = 'FormInput';

export const FormSelect = forwardRef<HTMLSelectElement, FormSelectProps>(({
  label,
  error,
  required = false,
  children,
  className = '',
  id,
  ...props
}, ref) => {
  const selectId = id || `select-${label.toLowerCase().replace(/\s/g, '-')}`;

  return (
    <div className={styles.inputGroup}>
      <label htmlFor={selectId} className={styles.inputLabel}>
        {label}
        {required && <span className={styles.required}>*</span>}
      </label>
      <select
        ref={ref}
        id={selectId}
        className={`${styles.selectField} ${error ? styles.error : ''} ${className}`}
        {...props}
      >
        {children}
      </select>
      {error && <span className={styles.errorMessage}>{error}</span>}
    </div>
  );
});

FormSelect.displayName = 'FormSelect';

export const FormTextarea = forwardRef<HTMLTextAreaElement, FormTextareaProps>(({
  label,
  error,
  required = false,
  className = '',
  id,
  ...props
}, ref) => {
  const textareaId = id || `textarea-${label.toLowerCase().replace(/\s/g, '-')}`;

  return (
    <div className={styles.inputGroup}>
      <label htmlFor={textareaId} className={styles.inputLabel}>
        {label}
        {required && <span className={styles.required}>*</span>}
      </label>
      <textarea
        ref={ref}
        id={textareaId}
        className={`${styles.textareaField} ${error ? styles.error : ''} ${className}`}
        {...props}
      />
      {error && <span className={styles.errorMessage}>{error}</span>}
    </div>
  );
});

FormTextarea.displayName = 'FormTextarea';
