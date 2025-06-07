import type { LucideIcon } from 'lucide-react';
import { 
  ArrowDownCircle, ArrowUpCircle, Utensils, Car, HomeIcon as Home, ShoppingBag, HeartPulse, Film, BookOpen, Plane, MoreHorizontal, DollarSign, Briefcase, Repeat
} from 'lucide-react';
// TransactionNature type is now in src/types/index.ts

export interface TransactionCategoryConfig {
  value: string;
  label: string;
  icon: LucideIcon;
  // nature field removed
}

export const transactionCategories: TransactionCategoryConfig[] = [
  { value: 'salary', label: 'Salary', icon: Briefcase },
  { value: 'freelance', label: 'Freelance', icon: DollarSign },
  { value: 'investments', label: 'Investments', icon: ArrowUpCircle },
  { value: 'gifts', label: 'Gifts', icon: ArrowUpCircle }, // Can be given or received
  { value: 'food_dining', label: 'Food & Dining', icon: Utensils },
  { value: 'transportation', label: 'Transportation', icon: Car },
  { value: 'housing_utilities', label: 'Housing & Utilities', icon: Home },
  { value: 'shopping', label: 'Shopping', icon: ShoppingBag },
  { value: 'health_wellness', label: 'Health & Wellness', icon: HeartPulse },
  { value: 'entertainment', label: 'Entertainment', icon: Film },
  { value: 'education', label: 'Education', icon: BookOpen },
  { value: 'travel', label: 'Travel', icon: Plane },
  { value: 'fees_charges', label: 'Fees & Charges', icon: MoreHorizontal },
  { value: 'internal_transfer', label: 'Internal Transfer', icon: Repeat }, // A category for transfers
  { value: 'other', label: 'Other', icon: MoreHorizontal },
];


export const getCategoryDetails = (value: string): TransactionCategoryConfig | undefined => {
  return transactionCategories.find(cat => cat.value === value);
};

// Define transaction natures to be used in the form
export const transactionNatures = [
    { value: 'income', label: 'Income' },
    { value: 'expense', label: 'Expense' },
    { value: 'transfer', label: 'Transfer' },
] as const;
