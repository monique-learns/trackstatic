
import type { AccountType } from '@/types';
import type { LucideIcon } from 'lucide-react';
import { Landmark, CreditCard, Wallet, TrendingUp } from 'lucide-react';

export interface AccountTypeConfig {
  value: AccountType;
  label: string;
  icon: LucideIcon;
}

export const accountTypes: AccountTypeConfig[] = [
  { value: 'bank', label: 'Bank Account', icon: Landmark },
  { value: 'credit_card', label: 'Credit Card', icon: CreditCard },
  { value: 'cash', label: 'Cash', icon: Wallet },
  { value: 'investment', label: 'Investment Account', icon: TrendingUp },
];

export const getAccountTypeDetails = (value: AccountType): AccountTypeConfig | undefined => {
  return accountTypes.find(accType => accType.value === value);
};
