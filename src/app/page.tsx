"use client";

import * as React from "react";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  TransactionForm,
  type TransactionFormValues,
} from "@/components/transaction-form";
import { TransactionHistory } from "@/components/transaction-history";
import type {
  Transaction,
  TransactionNature,
  Account,
  AccountType,
  PlannedTransaction,
  RecurrenceType,
  Budget,
  Statement,
} from "@/types";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Button, buttonVariants } from "@/components/ui/button";
import { useToast } from "@/hooks/use-toast";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { Calendar } from "@/components/ui/calendar";
import {
  format,
  isValid,
  getYear,
  getMonth,
  addYears,
  isAfter,
  isEqual,
  isBefore,
  startOfMonth,
  endOfMonth,
  isWithinInterval,
} from "date-fns";
import {
  CalendarIcon,
  FilterIcon,
  PlusCircle,
  XCircle,
  Target,
  Landmark,
  SlidersHorizontal,
  FileSpreadsheet,
  RefreshCw,
  LayoutDashboard,
  ClipboardCheck,
  Wallet,
  TrendingUp,
  TrendingDown,
  Scale,
  Banknote,
  ArrowRightLeft,
  AlertCircle,
  CreditCard,
} from "lucide-react";
import {
  transactionCategories,
  transactionNatures,
  getCategoryDetails as getTransactionCategoryDetails,
} from "@/config/transaction-types";
import { Separator } from "@/components/ui/separator";
import { Label } from "@/components/ui/label";
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";
import { AccountForm, type AccountFormValues } from "@/components/account-form";
import { AccountCard } from "@/components/account-card";
import { ScrollArea } from "@/components/ui/scroll-area";
import { cn } from "@/lib/utils";
import {
  BottomNavigationBar,
  type AppView,
} from "@/components/bottom-navigation-bar";
import {
  PlannedTransactionForm,
  type PlannedTransactionFormValues,
} from "@/components/planned-transaction-form";
import { PlannedTransactionHistory } from "@/components/planned-transaction-history";
import { BudgetForm, type BudgetFormValues } from "@/components/budget-form";
import { BudgetList } from "@/components/budget-list";
import { BudgetBreakdownDialog } from "@/components/budget-breakdown-dialog";
import { AccountStatementDialog } from "@/components/account-statement-dialog";
import { StatementDetailView } from "@/components/statement-detail-view";
import { getAccountTypeDetails } from "@/config/account-types";
import {
  generateStatementDataForPage,
  autoGenerateStatementsForAccount,
  calculateStatementPeriod,
} from "@/lib/statement-utils";
import {
  SummaryCard,
  type SummaryCardProps,
} from "@/components/dashboard/summary-card";
import { calculateDashboardData } from "@/lib/dashboard-utils";
import { addAccountToSheet } from "@/lib/google-sheet-utils";

// Inline SVG for a simple, geometric logo
const AppLogo = () => (
  <svg
    width="20"
    height="20"
    viewBox="0 0 100 100"
    fill="currentColor"
    aria-hidden="true"
  >
    <rect width="100" height="100" rx="20" />
    <path
      d="M30 70 Q30 50 50 50 Q70 50 70 70"
      stroke="hsl(var(--background))"
      fill="transparent"
      strokeWidth="10"
      strokeLinecap="round"
    />
    <path
      d="M30 30 L70 30"
      stroke="hsl(var(--background))"
      strokeWidth="10"
      strokeLinecap="round"
    />
    <path
      d="M50 30 L50 50"
      stroke="hsl(var(--background))"
      strokeWidth="10"
      strokeLinecap="round"
    />
  </svg>
);

const initialFilterState = {
  description: "",
  nature: "all",
  category: "all",
  startDate: null as Date | null,
  endDate: null as Date | null,
  minAmount: "",
  maxAmount: "",
};

interface ParsingErrors {
  transactions: boolean;
  accounts: boolean;
  plannedTransactions: boolean;
  budgets: boolean;
  savedStatements: boolean;
  appStartDate: boolean;
}

const initialParsingErrors: ParsingErrors = {
  transactions: false,
  accounts: false,
  plannedTransactions: false,
  budgets: false,
  savedStatements: false,
  appStartDate: false,
};

const APP_INITIALIZED_KEY = "trackstatic_app_initialized";
const APP_START_DATE_KEY = "trackstatic_app_start_date";
const LAST_STATEMENT_CHECK_KEY = "trackstatic_last_statement_check";
const STATEMENT_CHECK_INTERVAL = 24 * 60 * 60 * 1000; // 24 hours in milliseconds

export default function HomePage() {
  const [transactions, setTransactions] = React.useState<Transaction[]>([]);
  const [accounts, setAccounts] = React.useState<Account[]>([]);
  const [plannedTransactions, setPlannedTransactions] = React.useState<
    PlannedTransaction[]
  >([]);
  const [budgets, setBudgets] = React.useState<Budget[]>([]);
  const [savedStatements, setSavedStatements] = React.useState<Statement[]>([]);
  const [currentYear, setCurrentYear] = React.useState<string>("");
  const [appStartDate, setAppStartDate] = React.useState<Date | null>(null);

  const [isAddTransactionDialogOpen, setIsAddTransactionDialogOpen] =
    React.useState(false);
  const [transactionFormInitialData, setTransactionFormInitialData] =
    React.useState<TransactionFormValues | null>(null);
  const [editingTransaction, setEditingTransaction] =
    React.useState<Transaction | null>(null);
  const [isTransactionEditDialogOpen, setIsTransactionEditDialogOpen] =
    React.useState(false);

  const [editingAccount, setEditingAccount] = React.useState<Account | null>(
    null
  );
  const [isAccountFormDialogOpen, setIsAccountFormDialogOpen] =
    React.useState(false);

  const [isPlannedTransactionFormOpen, setIsPlannedTransactionFormOpen] =
    React.useState(false);
  const [editingPlannedTransaction, setEditingPlannedTransaction] =
    React.useState<PlannedTransaction | null>(null);

  const [isBudgetFormOpen, setIsBudgetFormOpen] = React.useState(false);
  const [editingBudget, setEditingBudget] = React.useState<Budget | null>(null);
  const [selectedBudgetForBreakdown, setSelectedBudgetForBreakdown] =
    React.useState<Budget | null>(null);
  const [isBudgetBreakdownDialogOpen, setIsBudgetBreakdownDialogOpen] =
    React.useState(false);

  const [selectedAccountForStatement, setSelectedAccountForStatement] =
    React.useState<Account | null>(null);
  const [isStatementDialogOpen, setIsStatementDialogOpen] =
    React.useState(false);

  const [parsingErrors, setParsingErrors] =
    React.useState<ParsingErrors>(initialParsingErrors);
  const [pendingToastMessages, setPendingToastMessages] = React.useState<
    string[]
  >([]);
  const [lastStatementCheckTimestamp, setLastStatementCheckTimestamp] =
    React.useState<number | null>(null);

  const { toast } = useToast();

  const [filterDescription, setFilterDescription] = React.useState(
    initialFilterState.description
  );
  const [filterNature, setFilterNature] = React.useState<
    TransactionNature | "all"
  >(initialFilterState.nature as TransactionNature | "all");
  const [filterCategory, setFilterCategory] = React.useState(
    initialFilterState.category
  );
  const [filterStartDate, setFilterStartDate] = React.useState<Date | null>(
    initialFilterState.startDate
  );
  const [filterEndDate, setFilterEndDate] = React.useState<Date | null>(
    initialFilterState.endDate
  );
  const [filterMinAmount, setFilterMinAmount] = React.useState(
    initialFilterState.minAmount
  );
  const [filterMaxAmount, setFilterMaxAmount] = React.useState(
    initialFilterState.maxAmount
  );

  const [activeView, setActiveView] = React.useState<AppView>("dashboard");

  // Delete dialog states
  const [deletingTransactionId, setDeletingTransactionId] = React.useState<
    string | null
  >(null);
  const [isDeleteTransactionDialogOpen, setIsDeleteTransactionDialogOpen] =
    React.useState(false);
  const [deletingAccountId, setDeletingAccountId] = React.useState<
    string | null
  >(null);
  const [isDeleteAccountDialogOpen, setIsDeleteAccountDialogOpen] =
    React.useState(false);
  const [deletingPlannedTransactionId, setDeletingPlannedTransactionId] =
    React.useState<string | null>(null);
  const [
    isDeletePlannedTransactionDialogOpen,
    setIsDeletePlannedTransactionDialogOpen,
  ] = React.useState(false);
  const [deletingBudgetId, setDeletingBudgetId] = React.useState<string | null>(
    null
  );
  const [isDeleteBudgetDialogOpen, setIsDeleteBudgetDialogOpen] =
    React.useState(false);
  const [deletingStatementId, setDeletingStatementId] = React.useState<
    string | null
  >(null);
  const [isDeleteStatementDialogOpen, setIsDeleteStatementDialogOpen] =
    React.useState(false);

  // State for Statements View
  const [
    selectedAccountForStatementsView,
    setSelectedAccountForStatementsView,
  ] = React.useState<string | null>(null);
  const [
    selectedStatementIdForStatementsView,
    setSelectedStatementIdForStatementsView,
  ] = React.useState<string | null>(null);

  React.useEffect(() => {
    setCurrentYear(new Date().getFullYear().toString());

    const appWasInitialized =
      localStorage.getItem(APP_INITIALIZED_KEY) === "true";
    const newParsingErrors: ParsingErrors = { ...initialParsingErrors };

    const storedAppStartDateStr = localStorage.getItem(APP_START_DATE_KEY);
    if (storedAppStartDateStr) {
      try {
        const parsedDate = new Date(storedAppStartDateStr);
        if (isValid(parsedDate)) {
          setAppStartDate(parsedDate);
        } else {
          console.error(
            "Invalid app start date found in local storage. Clearing it."
          );
          localStorage.removeItem(APP_START_DATE_KEY);
        }
      } catch (error) {
        console.error(
          "Error parsing app start date from local storage. Clearing it.",
          error
        );
        localStorage.removeItem(APP_START_DATE_KEY);
      }
    }

    const storedTimestamp = localStorage.getItem(LAST_STATEMENT_CHECK_KEY);
    if (storedTimestamp) {
      setLastStatementCheckTimestamp(parseInt(storedTimestamp, 10));
    } else {
      setLastStatementCheckTimestamp(0);
    }

    const storedTransactions = localStorage.getItem("transactions");
    if (storedTransactions && storedTransactions !== "null") {
      try {
        const parsedTransactions = JSON.parse(storedTransactions).map(
          (t: any) => ({
            ...t,
            date: new Date(t.date),
            nature: t.nature || "expense",
            notes: t.notes || undefined,
            accountId: t.accountId,
            fromAccountId: t.fromAccountId,
            toAccountId: t.toAccountId,
            linkedStatementId: t.linkedStatementId || undefined,
          })
        );
        setTransactions(parsedTransactions);
      } catch (error) {
        console.error(
          "Failed to parse transactions from local storage:",
          error
        );
        newParsingErrors.transactions = true;
      }
    } else if (
      appWasInitialized &&
      (!storedTransactions || storedTransactions === "null")
    ) {
      console.warn(
        "Transactions missing from localStorage after app initialization. Potential data loss averted for transactions."
      );
      newParsingErrors.transactions = true;
    }

    const storedAccounts = localStorage.getItem("accounts");
    if (storedAccounts && storedAccounts !== "null") {
      try {
        const parsedAccounts = JSON.parse(storedAccounts).map((acc: any) => ({
          ...acc,
          statementClosingDay:
            acc.statementClosingDay === null
              ? undefined
              : acc.statementClosingDay,
          preferredPaymentDay:
            acc.preferredPaymentDay === null
              ? undefined
              : acc.preferredPaymentDay,
        }));
        setAccounts(parsedAccounts);
      } catch (error) {
        console.error("Failed to parse accounts from local storage:", error);
        newParsingErrors.accounts = true;
      }
    } else if (
      appWasInitialized &&
      (!storedAccounts || storedAccounts === "null")
    ) {
      console.warn(
        "Accounts missing from localStorage after app initialization. Potential data loss averted for accounts."
      );
      newParsingErrors.accounts = true;
    }

    const storedPlannedTransactions = localStorage.getItem(
      "plannedTransactions"
    );
    if (storedPlannedTransactions && storedPlannedTransactions !== "null") {
      try {
        const parsedPlanned = JSON.parse(storedPlannedTransactions).map(
          (pt: any) => ({
            ...pt,
            dueDate: new Date(pt.dueDate),
            recurrenceEndDate: pt.recurrenceEndDate
              ? new Date(pt.recurrenceEndDate)
              : undefined,
            recurrenceDaysOfWeek: pt.recurrenceDaysOfWeek || undefined,
            recurrenceEnds:
              pt.recurrenceEnds ||
              (pt.recurrenceType !== "one-time" ? "never" : undefined),
            accountId: pt.accountId,
            fromAccountId: pt.fromAccountId,
            toAccountId: pt.toAccountId,
          })
        );
        setPlannedTransactions(parsedPlanned);
      } catch (error) {
        console.error(
          "Failed to parse planned transactions from local storage:",
          error
        );
        newParsingErrors.plannedTransactions = true;
      }
    } else if (
      appWasInitialized &&
      (!storedPlannedTransactions || storedPlannedTransactions === "null")
    ) {
      console.warn(
        "Planned transactions missing from localStorage after app initialization. Potential data loss averted for planned transactions."
      );
      newParsingErrors.plannedTransactions = true;
    }

    const storedBudgets = localStorage.getItem("budgets");
    if (storedBudgets && storedBudgets !== "null") {
      try {
        const parsedBudgets = JSON.parse(storedBudgets).map((b: any) => ({
          ...b,
          startDate: new Date(b.startDate),
          endDate: new Date(b.endDate),
        }));
        setBudgets(parsedBudgets);
      } catch (error) {
        console.error("Failed to parse budgets from local storage:", error);
        newParsingErrors.budgets = true;
      }
    } else if (
      appWasInitialized &&
      (!storedBudgets || storedBudgets === "null")
    ) {
      console.warn(
        "Budgets missing from localStorage after app initialization. Potential data loss averted for budgets."
      );
      newParsingErrors.budgets = true;
    }

    const storedStatements = localStorage.getItem("savedStatements");
    if (storedStatements && storedStatements !== "null") {
      try {
        const parsedStatements = JSON.parse(storedStatements).map((s: any) => ({
          ...s,
          id:
            s.id ||
            `${s.accountId}-${getYear(new Date(s.startDate))}-${String(
              getMonth(new Date(s.startDate))
            ).padStart(2, "0")}`,
          startDate: new Date(s.startDate),
          endDate: new Date(s.endDate),
          transactions: (s.transactions || []).map((tx: any) => ({
            ...tx,
            date: new Date(tx.date),
          })),
          totalLinkedPaymentsAmount: s.totalLinkedPaymentsAmount || 0,
        }));
        const uniqueParsedStatements = parsedStatements.filter(
          (stmt, index, self) =>
            index === self.findIndex((s) => s.id === stmt.id)
        );
        setSavedStatements(
          uniqueParsedStatements.sort(
            (a, b) =>
              new Date(b.endDate).getTime() - new Date(a.endDate).getTime()
          )
        );
      } catch (error) {
        console.error(
          "Failed to parse saved statements from local storage:",
          error
        );
        newParsingErrors.savedStatements = true;
      }
    } else if (
      appWasInitialized &&
      (!storedStatements || storedStatements === "null")
    ) {
      console.warn(
        "Saved statements missing from localStorage after app initialization. Potential data loss averted for saved statements."
      );
      newParsingErrors.savedStatements = true;
    }

    setParsingErrors(newParsingErrors);
    if (
      !appWasInitialized &&
      !newParsingErrors.transactions &&
      !newParsingErrors.accounts &&
      !newParsingErrors.plannedTransactions &&
      !newParsingErrors.budgets &&
      !newParsingErrors.savedStatements &&
      !newParsingErrors.appStartDate
    ) {
      localStorage.setItem(APP_INITIALIZED_KEY, "true");
    }
  }, []);

  React.useEffect(() => {
    if ("serviceWorker" in navigator) {
      window.addEventListener("load", () => {
        navigator.serviceWorker
          .register("/service-worker.js")
          .then((reg) => {
            console.log("Service worker registered.", reg);
          })
          .catch((err) => {
            console.error("Service worker registration failed:", err);
          });
      });
    }
  }, []);

  React.useEffect(() => {
    if (appStartDate) {
      try {
        localStorage.setItem(APP_START_DATE_KEY, appStartDate.toISOString());
      } catch (error) {
        console.error("Failed to save app start date to local storage:", error);
      }
    } else {
      localStorage.removeItem(APP_START_DATE_KEY);
    }
  }, [appStartDate]);

  React.useEffect(() => {
    if (!parsingErrors.transactions) {
      try {
        localStorage.setItem("transactions", JSON.stringify(transactions));
      } catch (error) {
        console.error("Failed to save transactions to local storage:", error);
      }
    } else {
      console.warn(
        "Skipping save for transactions due to previous parsing/loading error."
      );
    }
  }, [transactions, parsingErrors.transactions]);

  React.useEffect(() => {
    if (!parsingErrors.accounts) {
      try {
        localStorage.setItem("accounts", JSON.stringify(accounts));
      } catch (error) {
        console.error("Failed to save accounts to local storage:", error);
      }
    } else {
      console.warn(
        "Skipping save for accounts due to previous parsing/loading error."
      );
    }
  }, [accounts, parsingErrors.accounts]);

  React.useEffect(() => {
    if (!parsingErrors.plannedTransactions) {
      try {
        localStorage.setItem(
          "plannedTransactions",
          JSON.stringify(plannedTransactions)
        );
      } catch (error) {
        console.error(
          "Failed to save planned transactions to local storage:",
          error
        );
      }
    } else {
      console.warn(
        "Skipping save for planned transactions due to previous parsing/loading error."
      );
    }
  }, [plannedTransactions, parsingErrors.plannedTransactions]);

  React.useEffect(() => {
    if (!parsingErrors.budgets) {
      try {
        localStorage.setItem("budgets", JSON.stringify(budgets));
      } catch (error) {
        console.error("Failed to save budgets to local storage:", error);
      }
    } else {
      console.warn(
        "Skipping save for budgets due to previous parsing/loading error."
      );
    }
  }, [budgets, parsingErrors.budgets]);

  React.useEffect(() => {
    if (!parsingErrors.savedStatements) {
      try {
        localStorage.setItem(
          "savedStatements",
          JSON.stringify(savedStatements)
        );
      } catch (error) {
        console.error("Failed to save statements to local storage:", error);
      }
    } else {
      console.warn(
        "Skipping save for saved statements due to previous parsing/loading error."
      );
    }
  }, [savedStatements, parsingErrors.savedStatements]);

  React.useEffect(() => {
    if (pendingToastMessages.length > 0) {
      pendingToastMessages.forEach((message) => {
        toast({
          title: "Statement Auto-Updated",
          description: message,
          duration: 4000,
        });
      });
      setPendingToastMessages([]);
    }
  }, [pendingToastMessages, toast]);

  const regenerateAffectedStatements = React.useCallback(
    (
      changedTransaction: Transaction,
      involvedAccountIds: string[],
      currentTransactions: Transaction[],
      currentAccounts: Account[],
      currentSavedStatements: Statement[]
    ): { updatedStatements: Statement[]; messages: string[] } => {
      let updatedStatements = [...currentSavedStatements];
      const messages: string[] = [];
      let statementsWereActuallyUpdated = false;

      for (let i = 0; i < updatedStatements.length; i++) {
        const stmt = updatedStatements[i];
        const stmtStartDate = new Date(stmt.startDate);
        const stmtEndDate = new Date(stmt.endDate);
        const txDate = new Date(changedTransaction.date);

        const isAccountInvolved = involvedAccountIds.includes(stmt.accountId);
        let isRelevantForDisplayOrImpact = false;

        const isWithinPeriod =
          (isAfter(txDate, stmtStartDate) || isEqual(txDate, stmtStartDate)) &&
          (isBefore(txDate, stmtEndDate) || isEqual(txDate, stmtEndDate));

        if (isWithinPeriod) {
          isRelevantForDisplayOrImpact = true;
        } else if (
          changedTransaction.nature === "transfer" &&
          changedTransaction.toAccountId === stmt.accountId &&
          currentAccounts.find((a) => a.id === stmt.accountId)?.type ===
            "credit_card" &&
          changedTransaction.linkedStatementId === stmt.id
        ) {
          isRelevantForDisplayOrImpact = true;
        }

        if (isAccountInvolved && isRelevantForDisplayOrImpact) {
          const accountForStatement = currentAccounts.find(
            (acc) => acc.id === stmt.accountId
          );
          if (accountForStatement) {
            const regeneratedCoreData = generateStatementDataForPage(
              accountForStatement,
              currentTransactions,
              stmtStartDate,
              stmtEndDate,
              stmt.id
            );

            if (regeneratedCoreData) {
              const oldStmtDataForCompare = {
                openingBalance: stmt.openingBalance,
                closingBalance: stmt.closingBalance,
                totalDebits: stmt.totalDebits,
                totalCredits: stmt.totalCredits,
                totalLinkedPaymentsAmount: stmt.totalLinkedPaymentsAmount,
                transactionsCount: stmt.transactions.length,
              };
              const newStmtDataForCompare = {
                openingBalance: regeneratedCoreData.openingBalance,
                closingBalance: regeneratedCoreData.closingBalance,
                totalDebits: regeneratedCoreData.totalDebits,
                totalCredits: regeneratedCoreData.totalCredits,
                totalLinkedPaymentsAmount:
                  regeneratedCoreData.totalLinkedPaymentsAmount,
                transactionsCount:
                  regeneratedCoreData.statementTransactions.length,
              };

              if (
                JSON.stringify(oldStmtDataForCompare) !==
                JSON.stringify(newStmtDataForCompare)
              ) {
                const newStatement: Statement = {
                  id: stmt.id,
                  accountId: stmt.accountId,
                  startDate: stmtStartDate,
                  endDate: stmtEndDate,
                  openingBalance: regeneratedCoreData.openingBalance,
                  closingBalance: regeneratedCoreData.closingBalance,
                  transactions: regeneratedCoreData.statementTransactions,
                  totalDebits: regeneratedCoreData.totalDebits,
                  totalCredits: regeneratedCoreData.totalCredits,
                  totalLinkedPaymentsAmount:
                    regeneratedCoreData.totalLinkedPaymentsAmount,
                };
                updatedStatements[i] = newStatement;
                statementsWereActuallyUpdated = true;
                messages.push(
                  `Statement for ${accountForStatement.name} (${format(
                    stmtStartDate,
                    "MMM d, yy"
                  )}-${format(stmtEndDate, "MMM d, yy")}) was updated.`
                );
              }
            }
          }
        }
      }
      return {
        updatedStatements: statementsWereActuallyUpdated
          ? updatedStatements
          : currentSavedStatements,
        messages,
      };
    },
    []
  );

  const updateAccountBalance = (
    accountId: string,
    amount: number,
    isCredit: boolean
  ) => {
    setAccounts((prevAccounts) =>
      prevAccounts.map((acc) =>
        acc.id === accountId
          ? { ...acc, balance: acc.balance + (isCredit ? amount : -amount) }
          : acc
      )
    );
  };

  const addTransaction = (newTransactionData: Omit<Transaction, "id">) => {
    const newTransaction: Transaction = {
      ...newTransactionData,
      id: crypto.randomUUID(),
    };

    const updatedFullTransactionsList = [...transactions, newTransaction];
    setTransactions(updatedFullTransactionsList);

    if (newTransaction.nature === "income" && newTransaction.accountId) {
      updateAccountBalance(
        newTransaction.accountId,
        newTransaction.amount,
        true
      );
    } else if (
      newTransaction.nature === "expense" &&
      newTransaction.accountId
    ) {
      updateAccountBalance(
        newTransaction.accountId,
        newTransaction.amount,
        false
      );
    } else if (
      newTransaction.nature === "transfer" &&
      newTransaction.fromAccountId &&
      newTransaction.toAccountId
    ) {
      updateAccountBalance(
        newTransaction.fromAccountId,
        newTransaction.amount,
        false
      );
      updateAccountBalance(
        newTransaction.toAccountId,
        newTransaction.amount,
        true
      );
    }

    const involvedAccountIds: string[] = [];
    if (newTransaction.accountId)
      involvedAccountIds.push(newTransaction.accountId);
    if (newTransaction.fromAccountId)
      involvedAccountIds.push(newTransaction.fromAccountId);
    if (newTransaction.toAccountId)
      involvedAccountIds.push(newTransaction.toAccountId);

    setSavedStatements((prevSavedStatements) => {
      const { updatedStatements, messages } = regenerateAffectedStatements(
        newTransaction,
        Array.from(new Set(involvedAccountIds)),
        updatedFullTransactionsList,
        accounts,
        prevSavedStatements
      );
      if (messages.length > 0) {
        setPendingToastMessages((prev) => [...prev, ...messages]);
      }
      return updatedStatements;
    });
    setIsAddTransactionDialogOpen(false);
  };

  const handleOpenTransactionEditDialog = (transaction: Transaction) => {
    setEditingTransaction(transaction);
    setIsTransactionEditDialogOpen(true);
  };

  const handleCloseTransactionEditDialog = () => {
    setEditingTransaction(null);
    setIsTransactionEditDialogOpen(false);
  };

  const handleUpdateTransaction = (updatedData: Omit<Transaction, "id">) => {
    if (!editingTransaction) return;

    const originalTransaction = transactions.find(
      (t) => t.id === editingTransaction.id
    );
    if (!originalTransaction) return;

    if (
      originalTransaction.nature === "income" &&
      originalTransaction.accountId
    ) {
      updateAccountBalance(
        originalTransaction.accountId,
        originalTransaction.amount,
        false
      );
    } else if (
      originalTransaction.nature === "expense" &&
      originalTransaction.accountId
    ) {
      updateAccountBalance(
        originalTransaction.accountId,
        originalTransaction.amount,
        true
      );
    } else if (
      originalTransaction.nature === "transfer" &&
      originalTransaction.fromAccountId &&
      originalTransaction.toAccountId
    ) {
      updateAccountBalance(
        originalTransaction.fromAccountId,
        originalTransaction.amount,
        true
      );
      updateAccountBalance(
        originalTransaction.toAccountId,
        originalTransaction.amount,
        false
      );
    }

    const updatedTransaction: Transaction = {
      ...editingTransaction,
      ...updatedData,
    };

    if (
      updatedTransaction.nature === "income" &&
      updatedTransaction.accountId
    ) {
      updateAccountBalance(
        updatedTransaction.accountId,
        updatedTransaction.amount,
        true
      );
    } else if (
      updatedTransaction.nature === "expense" &&
      updatedTransaction.accountId
    ) {
      updateAccountBalance(
        updatedTransaction.accountId,
        updatedTransaction.amount,
        false
      );
    } else if (
      updatedTransaction.nature === "transfer" &&
      updatedTransaction.fromAccountId &&
      updatedTransaction.toAccountId
    ) {
      updateAccountBalance(
        updatedTransaction.fromAccountId,
        updatedTransaction.amount,
        false
      );
      updateAccountBalance(
        updatedTransaction.toAccountId,
        updatedTransaction.amount,
        true
      );
    }

    const updatedFullTransactionsList = transactions.map((t) =>
      t.id === editingTransaction.id ? updatedTransaction : t
    );
    setTransactions(updatedFullTransactionsList);

    const involvedAccountIds: string[] = [];
    if (originalTransaction.accountId)
      involvedAccountIds.push(originalTransaction.accountId);
    if (originalTransaction.fromAccountId)
      involvedAccountIds.push(originalTransaction.fromAccountId);
    if (originalTransaction.toAccountId)
      involvedAccountIds.push(originalTransaction.toAccountId);
    if (updatedTransaction.accountId)
      involvedAccountIds.push(updatedTransaction.accountId);
    if (updatedTransaction.fromAccountId)
      involvedAccountIds.push(updatedTransaction.fromAccountId);
    if (updatedTransaction.toAccountId)
      involvedAccountIds.push(updatedTransaction.toAccountId);

    setSavedStatements((prevSavedStatements) => {
      const { updatedStatements, messages } = regenerateAffectedStatements(
        updatedTransaction,
        Array.from(new Set(involvedAccountIds)),
        updatedFullTransactionsList,
        accounts,
        prevSavedStatements
      );
      if (messages.length > 0) {
        setPendingToastMessages((prev) => [...prev, ...messages]);
      }
      return updatedStatements;
    });

    toast({
      title: "Transaction Updated",
      description: `Successfully updated "${updatedTransaction.description}".`,
    });
    handleCloseTransactionEditDialog();
  };

  const addAccount = async (
    newAccountData: Omit<Account, "id" | "currency" | "balance">
  ) => {
    const newAccount: Account = {
      ...newAccountData,
      id: crypto.randomUUID(),
      balance: 0,
      currency: "", // Default currency, can be configured
      statementClosingDay:
        newAccountData.statementClosingDay === null
          ? undefined
          : newAccountData.statementClosingDay,
      preferredPaymentDay:
        newAccountData.preferredPaymentDay === null
          ? undefined
          : newAccountData.preferredPaymentDay,
    };
    const updatedAccounts = [...accounts, newAccount].sort((a, b) =>
      a.name.localeCompare(b.name)
    );
    setAccounts(updatedAccounts); // Save to localStorage via state update

    setIsAccountFormDialogOpen(false); // Close dialog immediately for better UX

    // Prepare payload for Google Sheet - keys must match HEADERS_ACCOUNTS in Code.gs
    const sheetPayload = {
      ID: newAccount.id,
      Name: newAccount.name,
      Type: newAccount.type,
      Balance: newAccount.balance,
      Currency: newAccount.currency,
      StatementClosingDay: newAccount.statementClosingDay,
      PreferredPaymentDay: newAccount.preferredPaymentDay,
      Notes: newAccount.notes,
    };

    try {
      const sheetResponse = await addAccountToSheet(sheetPayload);
      if (sheetResponse && sheetResponse.success) {
        toast({
          title: "Account Synced",
          description: `Account "${newAccount.name}" also saved to Google Sheet.`,
          duration: 3000,
        });
      } else {
        toast({
          title: "Account Saved Locally",
          description: `Account "${
            newAccount.name
          }" saved. Failed to sync to Google Sheet: ${
            sheetResponse?.error || sheetResponse?.message || "Unknown error"
          }`,
          variant: "default",
          duration: 5000,
        });
        console.warn(
          "Failed to save account to Google Sheet or response was not successful:",
          sheetResponse
        );
      }
    } catch (error: any) {
      console.error("Error saving account to Google Sheet:", error);
      toast({
        title: "Account Saved Locally",
        description: `Account "${newAccount.name}" saved. Could not connect to sync to Google Sheet. Error: ${error.message}`,
        variant: "default",
        duration: 7000,
      });
    }

    // Existing logic after local save and sheet attempt
    if (newAccount.statementClosingDay && appStartDate) {
      triggerAutomaticStatementGeneration(
        updatedAccounts,
        transactions,
        savedStatements,
        appStartDate
      );
    }
  };

  const handleOpenAccountEditDialog = (account: Account) => {
    setEditingAccount(account);
    setIsAccountFormDialogOpen(true);
  };

  const handleUpdateAccount = (
    updatedData: Omit<Account, "id" | "currency" | "balance">
  ) => {
    if (!editingAccount) return;
    const oldStatementClosingDay = editingAccount.statementClosingDay;
    const updatedAccount: Account = {
      ...editingAccount,
      ...updatedData,
      statementClosingDay:
        updatedData.statementClosingDay === null
          ? undefined
          : updatedData.statementClosingDay,
      preferredPaymentDay:
        updatedData.preferredPaymentDay === null
          ? undefined
          : updatedData.preferredPaymentDay,
    };
    const updatedAccounts = accounts
      .map((acc) => (acc.id === editingAccount.id ? updatedAccount : acc))
      .sort((a, b) => a.name.localeCompare(b.name));
    setAccounts(updatedAccounts);

    if (
      appStartDate &&
      ((updatedAccount.statementClosingDay &&
        oldStatementClosingDay !== updatedAccount.statementClosingDay) ||
        (updatedAccount.statementClosingDay && !oldStatementClosingDay))
    ) {
      triggerAutomaticStatementGeneration(
        updatedAccounts,
        transactions,
        savedStatements,
        appStartDate
      );
    }
    toast({
      title: "Account Updated",
      description: `Successfully updated account "${updatedAccount.name}".`,
    });
    setIsAccountFormDialogOpen(false);
    setEditingAccount(null);
  };

  const handleAccountFormSubmit = (data: AccountFormValues) => {
    if (editingAccount) {
      handleUpdateAccount(data);
    } else {
      addAccount(data); // This is now async but we don't await it here
    }
  };

  const addPlannedTransaction = (data: Omit<PlannedTransaction, "id">) => {
    const newPlannedTransaction: PlannedTransaction = {
      ...data,
      id: crypto.randomUUID(),
      isActive: data.isActive === undefined ? true : data.isActive,
    };
    setPlannedTransactions((prev) =>
      [...prev, newPlannedTransaction].sort(
        (a, b) => new Date(a.dueDate).getTime() - new Date(b.dueDate).getTime()
      )
    );
    setIsPlannedTransactionFormOpen(false);
    toast({
      title: "Planned Transaction Added",
      description: `"${data.description}" scheduled.`,
    });
  };

  const handleOpenPlannedTransactionEditDialog = (pt: PlannedTransaction) => {
    setEditingPlannedTransaction(pt);
    setIsPlannedTransactionFormOpen(true);
  };

  const handleUpdatePlannedTransaction = (
    updatedData: Omit<PlannedTransaction, "id">
  ) => {
    if (!editingPlannedTransaction) return;
    const updatedPlannedTransaction: PlannedTransaction = {
      ...editingPlannedTransaction,
      ...updatedData,
    };
    setPlannedTransactions((prev) =>
      prev
        .map((pt) =>
          pt.id === editingPlannedTransaction.id
            ? updatedPlannedTransaction
            : pt
        )
        .sort(
          (a, b) =>
            new Date(a.dueDate).getTime() - new Date(b.dueDate).getTime()
        )
    );
    setIsPlannedTransactionFormOpen(false);
    setEditingPlannedTransaction(null);
    toast({
      title: "Planned Transaction Updated",
      description: `Changes to "${updatedData.description}" saved.`,
    });
  };

  const handlePlannedTransactionFormSubmit = (
    data: Omit<PlannedTransaction, "id">
  ) => {
    if (editingPlannedTransaction) {
      handleUpdatePlannedTransaction(data);
    } else {
      addPlannedTransaction(data);
    }
  };

  const handleRecordPlannedAsActual = (plannedTx: PlannedTransaction) => {
    const initialValuesForDialog: TransactionFormValues = {
      description: plannedTx.description,
      amount: plannedTx.amount,
      date: new Date(plannedTx.dueDate),
      nature: plannedTx.nature,
      categoryValue: plannedTx.categoryValue,
      notes: plannedTx.notes,
      accountId: plannedTx.accountId,
      fromAccountId: plannedTx.fromAccountId,
      toAccountId: plannedTx.toAccountId,
      linkedStatementId: undefined,
    };
    setTransactionFormInitialData(initialValuesForDialog);
    setIsAddTransactionDialogOpen(true);
  };

  const addBudget = (values: BudgetFormValues) => {
    const newBudget: Budget = {
      ...values,
      id: crypto.randomUUID(),
    };
    setBudgets((prev) =>
      [...prev, newBudget].sort(
        (a, b) =>
          new Date(a.startDate).getTime() - new Date(b.startDate).getTime()
      )
    );
    setIsBudgetFormOpen(false);
  };

  const handleOpenBudgetEditDialog = (budget: Budget) => {
    setEditingBudget(budget);
    setIsBudgetFormOpen(true);
  };

  const handleUpdateBudget = (values: BudgetFormValues) => {
    if (!editingBudget) return;
    const updatedBudget: Budget = { ...editingBudget, ...values };
    setBudgets((prev) =>
      prev
        .map((b) => (b.id === editingBudget.id ? updatedBudget : b))
        .sort(
          (a, b) =>
            new Date(a.startDate).getTime() - new Date(b.startDate).getTime()
        )
    );
    setIsBudgetFormOpen(false);
    setEditingBudget(null);
    toast({
      title: "Budget Updated",
      description: `Changes to "${values.name}" saved.`,
    });
  };

  const handleBudgetFormSubmit = (values: BudgetFormValues) => {
    if (editingBudget) {
      handleUpdateBudget(values);
    } else {
      addBudget(values);
    }
  };

  const handleOpenBudgetBreakdownDialog = (budget: Budget) => {
    setSelectedBudgetForBreakdown(budget);
    setIsBudgetBreakdownDialogOpen(true);
  };

  const handleOpenStatementDialog = (account: Account) => {
    setSelectedAccountForStatement(account);
    setIsStatementDialogOpen(true);
  };

  const handleSaveStatement = React.useCallback(
    (statementToSave: Statement) => {
      setSavedStatements((prev) => {
        const existingIndex = prev.findIndex(
          (s) => s.id === statementToSave.id
        );
        let newStatementsArray;
        if (existingIndex > -1) {
          if (
            JSON.stringify(prev[existingIndex]) ===
            JSON.stringify(statementToSave)
          ) {
            return prev;
          }
          newStatementsArray = [...prev];
          newStatementsArray[existingIndex] = statementToSave;
        } else {
          newStatementsArray = [...prev, statementToSave];
        }
        const uniqueById = newStatementsArray.filter(
          (stmt, index, self) =>
            index === self.findIndex((s) => s.id === stmt.id)
        );
        return uniqueById.sort(
          (a, b) =>
            new Date(b.endDate).getTime() - new Date(a.endDate).getTime()
        );
      });
    },
    []
  );

  const handleNavigateToStatementInView = (
    accountId: string,
    statementId: string
  ) => {
    setActiveView("statements");
    setSelectedAccountForStatementsView(accountId);
    setSelectedStatementIdForStatementsView(statementId);
    setIsStatementDialogOpen(false);
  };

  const handleCloseDeleteDialogs = () => {
    setIsDeleteTransactionDialogOpen(false);
    setDeletingTransactionId(null);
    setIsDeleteAccountDialogOpen(false);
    setDeletingAccountId(null);
    setIsDeletePlannedTransactionDialogOpen(false);
    setDeletingPlannedTransactionId(null);
    setIsDeleteBudgetDialogOpen(false);
    setDeletingBudgetId(null);
    setIsDeleteStatementDialogOpen(false);
    setDeletingStatementId(null);
  };

  const handleOpenDeleteTransactionDialog = (id: string) => {
    setDeletingTransactionId(id);
    setIsDeleteTransactionDialogOpen(true);
  };

  const handleConfirmDeleteTransaction = () => {
    if (!deletingTransactionId) return;
    const transactionToDelete = transactions.find(
      (t) => t.id === deletingTransactionId
    );
    if (!transactionToDelete) return;

    if (
      transactionToDelete.nature === "income" &&
      transactionToDelete.accountId
    ) {
      updateAccountBalance(
        transactionToDelete.accountId,
        transactionToDelete.amount,
        false
      );
    } else if (
      transactionToDelete.nature === "expense" &&
      transactionToDelete.accountId
    ) {
      updateAccountBalance(
        transactionToDelete.accountId,
        transactionToDelete.amount,
        true
      );
    } else if (
      transactionToDelete.nature === "transfer" &&
      transactionToDelete.fromAccountId &&
      transactionToDelete.toAccountId
    ) {
      updateAccountBalance(
        transactionToDelete.fromAccountId,
        transactionToDelete.amount,
        true
      );
      updateAccountBalance(
        transactionToDelete.toAccountId,
        transactionToDelete.amount,
        false
      );
    }

    const updatedFullTransactionsList = transactions.filter(
      (t) => t.id !== deletingTransactionId
    );
    setTransactions(updatedFullTransactionsList);

    const involvedAccountIds: string[] = [];
    if (transactionToDelete.accountId)
      involvedAccountIds.push(transactionToDelete.accountId);
    if (transactionToDelete.fromAccountId)
      involvedAccountIds.push(transactionToDelete.fromAccountId);
    if (transactionToDelete.toAccountId)
      involvedAccountIds.push(transactionToDelete.toAccountId);

    setSavedStatements((prevSavedStatements) => {
      const { updatedStatements, messages } = regenerateAffectedStatements(
        transactionToDelete,
        Array.from(new Set(involvedAccountIds)),
        updatedFullTransactionsList,
        accounts,
        prevSavedStatements
      );
      if (messages.length > 0) {
        setPendingToastMessages((prev) => [...prev, ...messages]);
      }
      return updatedStatements;
    });

    toast({
      title: "Transaction Deleted",
      description: `"${transactionToDelete.description}" has been removed.`,
    });
    handleCloseDeleteDialogs();
  };

  const handleOpenDeleteAccountDialog = (id: string) => {
    setDeletingAccountId(id);
    setIsDeleteAccountDialogOpen(true);
  };

  const handleConfirmDeleteAccount = () => {
    if (!deletingAccountId) return;
    const accountToDelete = accounts.find(
      (acc) => acc.id === deletingAccountId
    );
    if (!accountToDelete) return;

    setAccounts((prev) => prev.filter((acc) => acc.id !== deletingAccountId));
    setSavedStatements((prev) =>
      prev.filter((stmt) => stmt.accountId !== deletingAccountId)
    );
    toast({
      title: "Account Deleted",
      description: `Account "${accountToDelete.name}" and its statements have been removed.`,
    });
    handleCloseDeleteDialogs();
  };

  const handleOpenDeletePlannedTransactionDialog = (id: string) => {
    setDeletingPlannedTransactionId(id);
    setIsDeletePlannedTransactionDialogOpen(true);
  };

  const handleConfirmDeletePlannedTransaction = () => {
    if (!deletingPlannedTransactionId) return;
    const ptToDelete = plannedTransactions.find(
      (pt) => pt.id === deletingPlannedTransactionId
    );
    if (!ptToDelete) return;

    setPlannedTransactions((prev) =>
      prev.filter((pt) => pt.id !== deletingPlannedTransactionId)
    );
    toast({
      title: "Planned Transaction Deleted",
      description: `"${ptToDelete.description}" has been removed.`,
    });
    handleCloseDeleteDialogs();
  };

  const handleOpenDeleteBudgetDialog = (id: string) => {
    setDeletingBudgetId(id);
    setIsDeleteBudgetDialogOpen(true);
  };

  const handleConfirmDeleteBudget = () => {
    if (!deletingBudgetId) return;
    const budgetToDelete = budgets.find((b) => b.id === deletingBudgetId);
    if (!budgetToDelete) return;

    setBudgets((prev) => prev.filter((b) => b.id !== deletingBudgetId));
    toast({
      title: "Budget Deleted",
      description: `Budget "${budgetToDelete.name}" has been removed.`,
    });
    handleCloseDeleteDialogs();
  };

  const handleOpenDeleteStatementDialog = (statementId: string) => {
    setDeletingStatementId(statementId);
    setIsDeleteStatementDialogOpen(true);
  };

  const handleConfirmDeleteStatement = () => {
    if (!deletingStatementId) return;
    const statementToDelete = savedStatements.find(
      (stmt) => stmt.id === deletingStatementId
    );
    if (!statementToDelete) return;

    setSavedStatements((prev) =>
      prev.filter((stmt) => stmt.id !== deletingStatementId)
    );
    toast({
      title: "Statement Deleted",
      description: `Statement for period ${format(
        new Date(statementToDelete.startDate),
        "PP"
      )} - ${format(
        new Date(statementToDelete.endDate),
        "PP"
      )} has been removed.`,
    });
    handleCloseDeleteDialogs();
  };

  const resetFilters = () => {
    setFilterDescription(initialFilterState.description);
    setFilterNature(initialFilterState.nature as TransactionNature | "all");
    setFilterCategory(initialFilterState.category);
    setFilterStartDate(initialFilterState.startDate);
    setFilterEndDate(initialFilterState.endDate);
    setFilterMinAmount(initialFilterState.minAmount);
    setFilterMaxAmount(initialFilterState.maxAmount);
  };

  const filteredAndSortedTransactions = React.useMemo(() => {
    let tempTransactions = [...transactions];
    if (filterDescription)
      tempTransactions = tempTransactions.filter((t) =>
        t.description.toLowerCase().includes(filterDescription.toLowerCase())
      );
    if (filterNature !== "all")
      tempTransactions = tempTransactions.filter(
        (t) => t.nature === filterNature
      );
    if (filterCategory !== "all")
      tempTransactions = tempTransactions.filter(
        (t) => t.categoryValue === filterCategory
      );
    if (filterStartDate) {
      const start = new Date(filterStartDate);
      start.setHours(0, 0, 0, 0);
      tempTransactions = tempTransactions.filter(
        (t) => new Date(t.date) >= start
      );
    }
    if (filterEndDate) {
      const end = new Date(filterEndDate);
      end.setHours(23, 59, 59, 999);
      tempTransactions = tempTransactions.filter(
        (t) => new Date(t.date) <= end
      );
    }
    const minAmount = parseFloat(filterMinAmount);
    if (!isNaN(minAmount))
      tempTransactions = tempTransactions.filter((t) => t.amount >= minAmount);
    const maxAmount = parseFloat(filterMaxAmount);
    if (!isNaN(maxAmount))
      tempTransactions = tempTransactions.filter((t) => t.amount <= maxAmount);
    return tempTransactions.sort(
      (a, b) => new Date(b.date).getTime() - new Date(a.date).getTime()
    );
  }, [
    transactions,
    filterDescription,
    filterNature,
    filterCategory,
    filterStartDate,
    filterEndDate,
    filterMinAmount,
    filterMaxAmount,
  ]);

  const isAnyFilterActive = () =>
    filterDescription !== initialFilterState.description ||
    filterNature !== initialFilterState.nature ||
    filterCategory !== initialFilterState.category ||
    filterStartDate !== initialFilterState.startDate ||
    filterEndDate !== initialFilterState.endDate ||
    filterMinAmount !== initialFilterState.minAmount ||
    filterMaxAmount !== initialFilterState.maxAmount;

  const accountListScrollHeight = accounts.length > 2 ? "h-[15rem]" : "h-auto";

  const handleNavigate = (view: AppView) => {
    if (view !== "statements" && view !== "settings") {
      setSelectedAccountForStatementsView(null);
      setSelectedStatementIdForStatementsView(null);
    }
    setActiveView(view);
  };

  const accountsWithStatementDay = React.useMemo(() => {
    return accounts.filter((acc) => acc.statementClosingDay);
  }, [accounts]);

  const statementsForSelectedAccountView = React.useMemo(() => {
    if (!selectedAccountForStatementsView) return [];
    return savedStatements
      .filter((stmt) => stmt.accountId === selectedAccountForStatementsView)
      .sort(
        (a, b) => new Date(b.endDate).getTime() - new Date(a.endDate).getTime()
      );
  }, [savedStatements, selectedAccountForStatementsView]);

  const accountToDisplay = React.useMemo(() => {
    if (!selectedAccountForStatementsView) return null;
    return (
      accounts.find((acc) => acc.id === selectedAccountForStatementsView) ||
      null
    );
  }, [accounts, selectedAccountForStatementsView]);

  const statementToDisplay = React.useMemo(() => {
    if (!selectedStatementIdForStatementsView) return null;
    return (
      savedStatements.find(
        (stmt) => stmt.id === selectedStatementIdForStatementsView
      ) || null
    );
  }, [savedStatements, selectedStatementIdForStatementsView]);

  const calculateAndSetNewStatements = React.useCallback(
    (
      currentAccounts: Account[],
      currentTransactions: Transaction[],
      currentSavedStatements: Statement[],
      currentAppStartDate: Date | null
    ): Statement[] => {
      if (!currentAppStartDate || currentAccounts.length === 0) return [];

      let allNewlyGeneratedAccumulated: Statement[] = [];
      const now = new Date();

      currentAccounts.forEach((acc) => {
        if (acc.statementClosingDay) {
          const generatedForAccount = autoGenerateStatementsForAccount(
            acc,
            currentTransactions,
            currentSavedStatements,
            currentAppStartDate,
            now
          );
          allNewlyGeneratedAccumulated.push(...generatedForAccount);
        }
      });

      const uniqueInThisPass = allNewlyGeneratedAccumulated.filter(
        (stmt, index, self) => index === self.findIndex((s) => s.id === stmt.id)
      );

      const trulyNewStatements = uniqueInThisPass.filter(
        (newStmt) =>
          !currentSavedStatements.find((existing) => existing.id === newStmt.id)
      );
      return trulyNewStatements;
    },
    []
  );

  const triggerAutomaticStatementGeneration = React.useCallback(
    (
      currentAccounts: Account[],
      currentTransactions: Transaction[],
      currentSavedStatements: Statement[],
      currentAppStartDate: Date | null
    ) => {
      const uniqueNewStatements = calculateAndSetNewStatements(
        currentAccounts,
        currentTransactions,
        currentSavedStatements,
        currentAppStartDate
      );

      if (uniqueNewStatements.length > 0) {
        console.log(`Auto-generated ${uniqueNewStatements.length} statements.`);
        setSavedStatements((prev) => {
          const combined = [...prev, ...uniqueNewStatements];
          const uniqueById = combined.filter(
            (stmt, index, self) =>
              index === self.findIndex((s) => s.id === stmt.id)
          );
          return uniqueById.sort(
            (a, b) =>
              new Date(b.endDate).getTime() - new Date(a.endDate).getTime()
          );
        });
        toast({
          title: "Statements Processed",
          description: `${uniqueNewStatements.length} new statement(s) were automatically generated.`,
        });
      }
      localStorage.setItem(
        LAST_STATEMENT_CHECK_KEY,
        new Date().getTime().toString()
      );
      setLastStatementCheckTimestamp(new Date().getTime());
    },
    [calculateAndSetNewStatements, toast]
  );

  React.useEffect(() => {
    const now = new Date().getTime();
    if (
      appStartDate &&
      lastStatementCheckTimestamp !== null &&
      now - lastStatementCheckTimestamp > STATEMENT_CHECK_INTERVAL
    ) {
      console.log("Running scheduled statement check...");
      triggerAutomaticStatementGeneration(
        accounts,
        transactions,
        savedStatements,
        appStartDate
      );
    }
  }, [
    appStartDate,
    lastStatementCheckTimestamp,
    accounts,
    transactions,
    savedStatements,
    triggerAutomaticStatementGeneration,
  ]);

  React.useEffect(() => {
    if (appStartDate && accounts.some((acc) => acc.statementClosingDay)) {
      console.log(
        "App start date or accounts changed, ensuring statement coverage..."
      );
      triggerAutomaticStatementGeneration(
        accounts,
        transactions,
        savedStatements,
        appStartDate
      );
    }
  }, [appStartDate, accounts, triggerAutomaticStatementGeneration]);

  const handleManualStatementCheck = () => {
    if (!appStartDate) {
      toast({
        title: "App Start Date Not Set",
        description: "Please set the App Start Date in Settings first.",
        variant: "destructive",
      });
      return;
    }
    if (!accounts.some((acc) => acc.statementClosingDay)) {
      toast({
        title: "No Accounts for Statements",
        description: "No accounts have a statement closing day configured.",
        variant: "destructive",
      });
      return;
    }

    const uniqueNewStatements = calculateAndSetNewStatements(
      accounts,
      transactions,
      savedStatements,
      appStartDate
    );

    if (uniqueNewStatements.length > 0) {
      setSavedStatements((prev) => {
        const combined = [...prev, ...uniqueNewStatements];
        const uniqueById = combined.filter(
          (stmt, index, self) =>
            index === self.findIndex((s) => s.id === stmt.id)
        );
        return uniqueById.sort(
          (a, b) =>
            new Date(b.endDate).getTime() - new Date(a.endDate).getTime()
        );
      });
      toast({
        title: "Manual Check Complete",
        description: `Successfully generated ${uniqueNewStatements.length} new statement(s).`,
      });
    } else {
      toast({
        title: "Manual Check Complete",
        description: "No new statements needed. All up to date.",
      });
    }
    localStorage.setItem(
      LAST_STATEMENT_CHECK_KEY,
      new Date().getTime().toString()
    );
    setLastStatementCheckTimestamp(new Date().getTime());
  };

  const dashboardData = React.useMemo(() => {
    return calculateDashboardData(transactions, accounts);
  }, [transactions, accounts]);

  return (
    <div className="flex flex-col items-center min-h-screen p-4 pt-0 md:p-8 md:pt-0 bg-background">
      <div className="w-full max-w-4xl pb-20">
        <header className="flex items-center justify-between p-2 mb-8 w-full text-primary">
          <div className="flex flex-row items-center gap-2">
            <AppLogo />
            <h1 className="text-lg md:text-xl font-headline font-bold">
              TrackStatic
            </h1>
          </div>
          <Button
            variant="ghost"
            size="icon"
            onClick={() => handleNavigate("settings")}
            className="text-primary"
            aria-label="Open Settings"
          >
            <SlidersHorizontal className="h-5 w-5" />
          </Button>
        </header>

        {activeView === "dashboard" && (
          <div className="mb-8 space-y-6">
            <div className="flex flex-col items-start gap-4 md:flex-row md:items-center md:justify-between">
              <div>
                <h2 className="text-2xl font-semibold leading-tight tracking-tight">
                  Dashboard & Analytics
                </h2>
                <p className="text-base text-muted-foreground mt-1">
                  Overview of your financial health.
                </p>
              </div>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <SummaryCard
                title="Total Available Funds"
                value={dashboardData.totalAvailableFunds}
                icon={Wallet}
                isCurrency
              />
              <SummaryCard
                title="Total Credit Card Debt"
                value={dashboardData.totalCreditCardDebt}
                icon={CreditCard}
                isCurrency
                valueColor="text-destructive"
              />
            </div>
          </div>
        )}

        {activeView === "transactions" && (
          <div className="mb-8">
            <div className="flex flex-col items-start gap-4 md:flex-row md:items-center md:justify-between mb-6 px-1">
              <div>
                <h2 className="text-2xl font-semibold leading-tight tracking-tight">
                  My Transactions
                </h2>
                <p className="text-base text-muted-foreground mt-1">
                  View, filter, and manage your financial transactions.
                </p>
              </div>
              <Button
                onClick={() => {
                  setTransactionFormInitialData(null);
                  setIsAddTransactionDialogOpen(true);
                }}
                className="w-full md:w-auto"
              >
                <PlusCircle className="mr-2 h-4 w-4" /> Add Transaction
              </Button>
            </div>
            <div className="space-y-6">
              <Accordion type="single" collapsible className="w-full">
                <AccordionItem value="filters">
                  <AccordionTrigger className="text-base font-medium hover:no-underline px-1 py-3">
                    <div className="flex items-center gap-2">
                      <FilterIcon className="h-5 w-5" />
                      <span>Filter Transactions</span>
                      {isAnyFilterActive() && (
                        <div className="h-2 w-2 rounded-full bg-accent animate-pulse"></div>
                      )}
                    </div>
                  </AccordionTrigger>
                  <AccordionContent className="pt-4">
                    <div className="space-y-4 p-4 border rounded-lg shadow-sm bg-muted/30">
                      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                        <div>
                          <Label htmlFor="filterDesc">Description</Label>
                          <Input
                            id="filterDesc"
                            placeholder="Search by description..."
                            value={filterDescription}
                            onChange={(e) =>
                              setFilterDescription(e.target.value)
                            }
                            className="mt-1 bg-background"
                          />
                        </div>
                        <div>
                          <Label htmlFor="filterNature">Type</Label>
                          <Select
                            value={filterNature}
                            onValueChange={(value) =>
                              setFilterNature(
                                value as TransactionNature | "all"
                              )
                            }
                          >
                            <SelectTrigger
                              id="filterNature"
                              className="mt-1 bg-background"
                            >
                              <SelectValue placeholder="All Types" />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="all">All Types</SelectItem>
                              {transactionNatures.map((nature) => (
                                <SelectItem
                                  key={nature.value}
                                  value={nature.value}
                                >
                                  {nature.label}
                                </SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                        </div>
                        <div>
                          <Label htmlFor="filterCategory">Category</Label>
                          <Select
                            value={filterCategory}
                            onValueChange={(value) => setFilterCategory(value)}
                          >
                            <SelectTrigger
                              id="filterCategory"
                              className="mt-1 bg-background"
                            >
                              <SelectValue placeholder="All Categories" />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="all">
                                All Categories
                              </SelectItem>
                              {transactionCategories.map((cat) => (
                                <SelectItem key={cat.value} value={cat.value}>
                                  <div className="flex items-center gap-2">
                                    <cat.icon className="h-4 w-4 text-muted-foreground" />
                                    <span>{cat.label}</span>
                                  </div>
                                </SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                        </div>
                        <div>
                          <Label htmlFor="filterStartDate">Start Date</Label>
                          <Popover>
                            <PopoverTrigger asChild>
                              <Button
                                id="filterStartDate"
                                variant={"outline"}
                                className="w-full justify-start text-left font-normal mt-1 bg-background"
                              >
                                <CalendarIcon className="mr-2 h-4 w-4" />
                                {filterStartDate ? (
                                  format(filterStartDate, "PPP")
                                ) : (
                                  <span>Pick a date</span>
                                )}
                              </Button>
                            </PopoverTrigger>
                            <PopoverContent className="w-auto p-0">
                              <Calendar
                                mode="single"
                                selected={filterStartDate}
                                onSelect={setFilterStartDate}
                                initialFocus
                              />
                            </PopoverContent>
                          </Popover>
                        </div>
                        <div>
                          <Label htmlFor="filterEndDate">End Date</Label>
                          <Popover>
                            <PopoverTrigger asChild>
                              <Button
                                id="filterEndDate"
                                variant={"outline"}
                                className="w-full justify-start text-left font-normal mt-1 bg-background"
                              >
                                <CalendarIcon className="mr-2 h-4 w-4" />
                                {filterEndDate ? (
                                  format(filterEndDate, "PPP")
                                ) : (
                                  <span>Pick a date</span>
                                )}
                              </Button>
                            </PopoverTrigger>
                            <PopoverContent className="w-auto p-0">
                              <Calendar
                                mode="single"
                                selected={filterEndDate}
                                onSelect={setFilterEndDate}
                                initialFocus
                                disabled={
                                  filterStartDate
                                    ? { before: filterStartDate }
                                    : undefined
                                }
                              />
                            </PopoverContent>
                          </Popover>
                        </div>
                        <div>
                          <Label htmlFor="filterMinAmount">Min Amount</Label>
                          <Input
                            id="filterMinAmount"
                            type="number"
                            placeholder="e.g., 10"
                            value={filterMinAmount}
                            onChange={(e) => setFilterMinAmount(e.target.value)}
                            className="mt-1 bg-background"
                          />
                        </div>
                        <div>
                          <Label htmlFor="filterMaxAmount">Max Amount</Label>
                          <Input
                            id="filterMaxAmount"
                            type="number"
                            placeholder="e.g., 100"
                            value={filterMaxAmount}
                            onChange={(e) => setFilterMaxAmount(e.target.value)}
                            className="mt-1 bg-background"
                          />
                        </div>
                      </div>
                      {isAnyFilterActive() && (
                        <Button
                          onClick={resetFilters}
                          variant="outline"
                          className="mt-4 w-full md:w-auto bg-background hover:bg-accent"
                        >
                          <XCircle className="mr-2 h-4 w-4" /> Reset Filters
                        </Button>
                      )}
                    </div>
                  </AccordionContent>
                </AccordionItem>
              </Accordion>
              <Separator />
              <TransactionHistory
                transactions={filteredAndSortedTransactions}
                onEditTransaction={handleOpenTransactionEditDialog}
                onDeleteTransaction={handleOpenDeleteTransactionDialog}
                originalTransactionCount={transactions.length}
                isFiltered={isAnyFilterActive()}
                accounts={accounts}
                savedStatements={savedStatements}
              />
            </div>
          </div>
        )}

        {activeView === "accounts" && (
          <div className="mb-8">
            <div className="flex flex-col items-start gap-4 md:flex-row md:items-center md:justify-between mb-6 px-1">
              <div>
                <h2 className="text-2xl font-semibold leading-tight tracking-tight">
                  My Accounts
                </h2>
                <p className="text-base text-muted-foreground mt-1">
                  Manage your bank accounts, credit cards, cash, and
                  investments.
                </p>
              </div>
              <Button
                onClick={() => {
                  setEditingAccount(null);
                  setIsAccountFormDialogOpen(true);
                }}
                className="w-full md:w-auto"
              >
                <PlusCircle className="mr-2 h-4 w-4" /> Add Account
              </Button>
            </div>
            <div>
              {accounts.length === 0 ? (
                <div className="text-center py-10 border rounded-lg bg-muted/30">
                  <p className="text-muted-foreground">
                    No accounts added yet.
                  </p>
                  <p className="text-sm text-muted-foreground">
                    Click "Add Account" to get started.
                  </p>
                </div>
              ) : (
                <ScrollArea className={cn("pr-4", accountListScrollHeight)}>
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                    {accounts.map((account) => (
                      <AccountCard
                        key={account.id}
                        account={account}
                        onEditAccount={handleOpenAccountEditDialog}
                        onDeleteAccount={handleOpenDeleteAccountDialog}
                        onViewStatement={handleOpenStatementDialog}
                      />
                    ))}
                  </div>
                </ScrollArea>
              )}
            </div>
          </div>
        )}

        {activeView === "planned" && (
          <div className="mb-8">
            <div className="flex flex-col items-start gap-4 md:flex-row md:items-center md:justify-between mb-6 px-1">
              <div>
                <h2 className="text-2xl font-semibold leading-tight tracking-tight">
                  Planned Transactions
                </h2>
                <p className="text-base text-muted-foreground mt-1">
                  Manage your upcoming and recurring transactions.
                </p>
              </div>
              <Button
                onClick={() => {
                  setEditingPlannedTransaction(null);
                  setIsPlannedTransactionFormOpen(true);
                }}
                className="w-full md:w-auto"
              >
                <PlusCircle className="mr-2 h-4 w-4" /> Add Planned Transaction
              </Button>
            </div>
            <div>
              <PlannedTransactionHistory
                plannedTransactions={plannedTransactions}
                onEditPlannedTransaction={
                  handleOpenPlannedTransactionEditDialog
                }
                onDeletePlannedTransaction={
                  handleOpenDeletePlannedTransactionDialog
                }
                onRecordAsActual={handleRecordPlannedAsActual}
                accounts={accounts}
              />
            </div>
          </div>
        )}

        {activeView === "budgets" && (
          <div className="mb-8">
            <div className="flex flex-col items-start gap-4 md:flex-row md:items-center md:justify-between mb-6 px-1">
              <div>
                <h2 className="text-2xl font-semibold leading-tight tracking-tight">
                  My Budgets
                </h2>
                <p className="text-base text-muted-foreground mt-1">
                  Create and track your financial budgets based on planned
                  transactions.
                </p>
              </div>
              <Button
                onClick={() => {
                  setEditingBudget(null);
                  setIsBudgetFormOpen(true);
                }}
                className="w-full md:w-auto"
              >
                <Target className="mr-2 h-4 w-4" /> Add Budget
              </Button>
            </div>
            <div>
              <BudgetList
                budgets={budgets}
                plannedTransactions={plannedTransactions}
                accounts={accounts}
                savedStatements={savedStatements}
                onEditBudget={handleOpenBudgetEditDialog}
                onDeleteBudget={handleOpenDeleteBudgetDialog}
                onViewBreakdown={handleOpenBudgetBreakdownDialog}
              />
            </div>
          </div>
        )}

        {activeView === "statements" && (
          <div className="mb-8">
            <div className="flex flex-col items-start gap-4 md:flex-row md:items-center md:justify-between mb-6 px-1">
              <div>
                <h2 className="text-2xl font-semibold leading-tight tracking-tight">
                  View Statements
                </h2>
                <p className="text-base text-muted-foreground mt-1">
                  Select an account and then a statement period to view its
                  details.
                </p>
              </div>
            </div>
            <div className="space-y-6 p-6 rounded-lg border bg-card text-card-foreground shadow-sm">
              <div>
                <Label htmlFor="statements-account-select">Account</Label>
                <Select
                  value={selectedAccountForStatementsView || ""}
                  onValueChange={(value) => {
                    setSelectedAccountForStatementsView(value);
                    setSelectedStatementIdForStatementsView(null);
                  }}
                >
                  <SelectTrigger id="statements-account-select">
                    <SelectValue placeholder="Select an account..." />
                  </SelectTrigger>
                  <SelectContent>
                    {accountsWithStatementDay.length === 0 && (
                      <SelectItem value="no-accounts" disabled>
                        No accounts eligible for statements
                      </SelectItem>
                    )}
                    {accountsWithStatementDay.map((account) => {
                      const Icon =
                        getAccountTypeDetails(account.type)?.icon || Landmark;
                      return (
                        <SelectItem key={account.id} value={account.id}>
                          <div className="flex items-center gap-2">
                            <Icon className="h-4 w-4 text-muted-foreground" />
                            <span>{account.name}</span>
                          </div>
                        </SelectItem>
                      );
                    })}
                  </SelectContent>
                </Select>
              </div>

              {selectedAccountForStatementsView && (
                <div>
                  <Label htmlFor="statements-period-select">
                    Statement Period
                  </Label>
                  <Select
                    value={selectedStatementIdForStatementsView || ""}
                    onValueChange={setSelectedStatementIdForStatementsView}
                    disabled={statementsForSelectedAccountView.length === 0}
                  >
                    <SelectTrigger id="statements-period-select">
                      <SelectValue
                        placeholder={
                          statementsForSelectedAccountView.length === 0
                            ? "No saved statements for this account"
                            : "Select a statement period..."
                        }
                      />
                    </SelectTrigger>
                    <SelectContent>
                      {statementsForSelectedAccountView.map((stmt) => (
                        <SelectItem key={stmt.id} value={stmt.id}>
                          {format(new Date(stmt.startDate), "MMM dd, yyyy")} -{" "}
                          {format(new Date(stmt.endDate), "MMM dd, yyyy")}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              )}

              <StatementDetailView
                account={accountToDisplay}
                statement={statementToDisplay}
              />
            </div>
          </div>
        )}

        {activeView === "settings" && (
          <div className="mb-8">
            <div className="flex flex-col items-start gap-4 md:flex-row md:items-center md:justify-between mb-6 px-1">
              <div>
                <h2 className="text-2xl font-semibold leading-tight tracking-tight">
                  App Settings
                </h2>
                <p className="text-base text-muted-foreground mt-1">
                  Configure application-wide settings.
                </p>
              </div>
            </div>
            <div className="space-y-6 p-6 rounded-lg border bg-card text-card-foreground shadow-sm">
              <div className="space-y-2">
                <Label htmlFor="app-start-date">App Start Date</Label>
                <Popover>
                  <PopoverTrigger asChild>
                    <Button
                      id="app-start-date"
                      variant={"outline"}
                      className={cn(
                        "w-full justify-start text-left font-normal",
                        !appStartDate && "text-muted-foreground"
                      )}
                    >
                      <CalendarIcon className="mr-2 h-4 w-4" />
                      {appStartDate ? (
                        format(appStartDate, "PPP")
                      ) : (
                        <span>Pick a date</span>
                      )}
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent className="w-auto p-0" align="start">
                    <Calendar
                      mode="single"
                      selected={appStartDate}
                      onSelect={(date) => setAppStartDate(date || null)}
                      initialFocus
                    />
                  </PopoverContent>
                </Popover>
                <p className="text-xs text-muted-foreground">
                  Set a start date for your financial tracking. This will be
                  used to auto-generate historical statements.
                </p>
              </div>
              <Separator />
              <div className="space-y-2">
                <Label>Statement Management</Label>
                <Button
                  onClick={handleManualStatementCheck}
                  disabled={
                    !appStartDate ||
                    !accounts.some((acc) => acc.statementClosingDay)
                  }
                  variant="outline"
                  className="w-full"
                >
                  <RefreshCw className="mr-2 h-4 w-4" />
                  Check & Generate Missing Statements
                </Button>
                <p className="text-xs text-muted-foreground">
                  Manually check for and generate any missing statements up to
                  one year in the future from the current date, based on your
                  App Start Date and account configurations.
                </p>
              </div>
            </div>
          </div>
        )}

        <Dialog
          open={isAddTransactionDialogOpen}
          onOpenChange={(isOpen) => {
            setIsAddTransactionDialogOpen(isOpen);
            if (!isOpen) {
              setTransactionFormInitialData(null);
            }
          }}
        >
          <DialogContent className="w-[calc(100vw-2rem)] sm:max-w-md max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>Add New Transaction</DialogTitle>
              <DialogDescription>
                Enter the details of your transaction.
              </DialogDescription>
            </DialogHeader>
            <TransactionForm
              onSubmit={addTransaction}
              initialData={transactionFormInitialData || undefined}
              mode="add"
              accounts={accounts}
              savedStatements={savedStatements}
            />
          </DialogContent>
        </Dialog>

        {editingTransaction && (
          <Dialog
            open={isTransactionEditDialogOpen}
            onOpenChange={setIsTransactionEditDialogOpen}
          >
            <DialogContent className="w-[calc(100vw-2rem)] sm:max-w-md max-h-[90vh] overflow-y-auto">
              <DialogHeader>
                <DialogTitle>Edit Transaction</DialogTitle>
                <DialogDescription>
                  Make changes to your transaction here. Click update when
                  you're done.
                </DialogDescription>
              </DialogHeader>
              <TransactionForm
                onSubmit={handleUpdateTransaction}
                initialData={{
                  description: editingTransaction.description,
                  amount: editingTransaction.amount,
                  date: new Date(editingTransaction.date),
                  nature: editingTransaction.nature,
                  categoryValue: editingTransaction.categoryValue,
                  notes: editingTransaction.notes,
                  accountId: editingTransaction.accountId,
                  fromAccountId: editingTransaction.fromAccountId,
                  toAccountId: editingTransaction.toAccountId,
                  linkedStatementId: editingTransaction.linkedStatementId,
                }}
                mode="edit"
                accounts={accounts}
                savedStatements={savedStatements}
              />
            </DialogContent>
          </Dialog>
        )}

        <Dialog
          open={isAccountFormDialogOpen}
          onOpenChange={(isOpen) => {
            setIsAccountFormDialogOpen(isOpen);
            if (!isOpen) setEditingAccount(null);
          }}
        >
          <DialogContent className="w-[calc(100vw-2rem)] sm:max-w-md max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>
                {editingAccount ? "Edit Account" : "Add New Account"}
              </DialogTitle>
              <DialogDescription>
                {editingAccount
                  ? "Make changes to your account."
                  : "Enter the details of your new account."}
              </DialogDescription>
            </DialogHeader>
            <AccountForm
              onSubmit={handleAccountFormSubmit}
              initialData={
                editingAccount
                  ? {
                      name: editingAccount.name,
                      type: editingAccount.type,
                      notes: editingAccount.notes,
                      statementClosingDay: editingAccount.statementClosingDay,
                      preferredPaymentDay: editingAccount.preferredPaymentDay,
                    }
                  : undefined
              }
              mode={editingAccount ? "edit" : "add"}
            />
          </DialogContent>
        </Dialog>

        <Dialog
          open={isPlannedTransactionFormOpen}
          onOpenChange={(isOpen) => {
            setIsPlannedTransactionFormOpen(isOpen);
            if (!isOpen) setEditingPlannedTransaction(null);
          }}
        >
          <DialogContent className="w-[calc(100vw-2rem)] sm:max-w-lg max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>
                {editingPlannedTransaction
                  ? "Edit Planned Transaction"
                  : "Add New Planned Transaction"}
              </DialogTitle>
              <DialogDescription>
                {editingPlannedTransaction
                  ? "Modify your scheduled transaction."
                  : "Set up a new recurring or future transaction."}
              </DialogDescription>
            </DialogHeader>
            <PlannedTransactionForm
              onSubmit={handlePlannedTransactionFormSubmit}
              initialData={
                editingPlannedTransaction
                  ? {
                      description: editingPlannedTransaction.description,
                      amount: editingPlannedTransaction.amount,
                      nature: editingPlannedTransaction.nature,
                      categoryValue: editingPlannedTransaction.categoryValue,
                      dueDate: new Date(editingPlannedTransaction.dueDate),
                      recurrenceType: editingPlannedTransaction.recurrenceType,
                      recurrenceInterval:
                        editingPlannedTransaction.recurrenceInterval,
                      notes: editingPlannedTransaction.notes,
                      isActive: editingPlannedTransaction.isActive,
                      accountId: editingPlannedTransaction.accountId,
                      fromAccountId: editingPlannedTransaction.fromAccountId,
                      toAccountId: editingPlannedTransaction.toAccountId,
                      recurrenceDaysOfWeek:
                        editingPlannedTransaction.recurrenceDaysOfWeek,
                      recurrenceEnds: editingPlannedTransaction.recurrenceEnds,
                      recurrenceEndDate:
                        editingPlannedTransaction.recurrenceEndDate
                          ? new Date(
                              editingPlannedTransaction.recurrenceEndDate
                            )
                          : undefined,
                      recurrenceEndAfterOccurrences:
                        editingPlannedTransaction.recurrenceEndAfterOccurrences,
                    }
                  : undefined
              }
              mode={editingPlannedTransaction ? "edit" : "add"}
              accounts={accounts}
            />
          </DialogContent>
        </Dialog>

        <Dialog
          open={isBudgetFormOpen}
          onOpenChange={(isOpen) => {
            setIsBudgetFormOpen(isOpen);
            if (!isOpen) setEditingBudget(null);
          }}
        >
          <DialogContent className="w-[calc(100vw-2rem)] sm:max-w-md max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>
                {editingBudget ? "Edit Budget" : "Create New Budget"}
              </DialogTitle>
              <DialogDescription>
                {editingBudget
                  ? "Make changes to your budget."
                  : "Define the name and date range for your new budget."}
              </DialogDescription>
            </DialogHeader>
            <BudgetForm
              onSubmit={handleBudgetFormSubmit}
              initialData={editingBudget || undefined}
              mode={editingBudget ? "edit" : "add"}
            />
          </DialogContent>
        </Dialog>

        <BudgetBreakdownDialog
          budget={selectedBudgetForBreakdown}
          allPlannedTransactions={plannedTransactions}
          accounts={accounts}
          savedStatements={savedStatements}
          isOpen={isBudgetBreakdownDialogOpen}
          onOpenChange={setIsBudgetBreakdownDialogOpen}
        />

        <AccountStatementDialog
          account={selectedAccountForStatement}
          allTransactions={transactions}
          savedStatements={savedStatements}
          onSaveStatement={handleSaveStatement}
          onNavigateToStatementView={handleNavigateToStatementInView}
          onOpenDeleteStatementDialog={handleOpenDeleteStatementDialog}
          isOpen={isStatementDialogOpen}
          onOpenChange={setIsStatementDialogOpen}
        />

        <AlertDialog
          open={isDeleteTransactionDialogOpen}
          onOpenChange={setIsDeleteTransactionDialogOpen}
        >
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>
                Are you sure you want to delete this transaction?
              </AlertDialogTitle>
              <AlertDialogDescription>
                This action cannot be undone. This will permanently delete the
                transaction "
                {transactions.find((t) => t.id === deletingTransactionId)
                  ?.description || "selected transaction"}
                " and adjust account balances accordingly.
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel onClick={handleCloseDeleteDialogs}>
                Cancel
              </AlertDialogCancel>
              <AlertDialogAction
                onClick={handleConfirmDeleteTransaction}
                className={cn(buttonVariants({ variant: "destructive" }))}
              >
                Delete
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>

        <AlertDialog
          open={isDeleteAccountDialogOpen}
          onOpenChange={setIsDeleteAccountDialogOpen}
        >
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>
                Are you sure you want to delete this account?
              </AlertDialogTitle>
              <AlertDialogDescription>
                This action cannot be undone. This will permanently delete the
                account "
                {accounts.find((acc) => acc.id === deletingAccountId)?.name ||
                  "selected account"}
                ". Any transactions or planned transactions linked to this
                account will remain but may appear unlinked or show "N/A" for
                the account name. Associated auto-generated statements will also
                be removed.
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel onClick={handleCloseDeleteDialogs}>
                Cancel
              </AlertDialogCancel>
              <AlertDialogAction
                onClick={handleConfirmDeleteAccount}
                className={cn(buttonVariants({ variant: "destructive" }))}
              >
                Delete
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>

        <AlertDialog
          open={isDeletePlannedTransactionDialogOpen}
          onOpenChange={setIsDeletePlannedTransactionDialogOpen}
        >
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>
                Are you sure you want to delete this planned transaction?
              </AlertDialogTitle>
              <AlertDialogDescription>
                This action cannot be undone. This will permanently delete the
                planned transaction "
                {plannedTransactions.find(
                  (pt) => pt.id === deletingPlannedTransactionId
                )?.description || "selected planned transaction"}
                ".
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel onClick={handleCloseDeleteDialogs}>
                Cancel
              </AlertDialogCancel>
              <AlertDialogAction
                onClick={handleConfirmDeletePlannedTransaction}
                className={cn(buttonVariants({ variant: "destructive" }))}
              >
                Delete
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>

        <AlertDialog
          open={isDeleteBudgetDialogOpen}
          onOpenChange={setIsDeleteBudgetDialogOpen}
        >
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>
                Are you sure you want to delete this budget?
              </AlertDialogTitle>
              <AlertDialogDescription>
                This action cannot be undone. This will permanently delete the
                budget "
                {budgets.find((b) => b.id === deletingBudgetId)?.name ||
                  "selected budget"}
                ".
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel onClick={handleCloseDeleteDialogs}>
                Cancel
              </AlertDialogCancel>
              <AlertDialogAction
                onClick={handleConfirmDeleteBudget}
                className={cn(buttonVariants({ variant: "destructive" }))}
              >
                Delete
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>

        <AlertDialog
          open={isDeleteStatementDialogOpen}
          onOpenChange={setIsDeleteStatementDialogOpen}
        >
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>
                Are you sure you want to delete this statement?
              </AlertDialogTitle>
              <AlertDialogDescription>
                This action cannot be undone. This will permanently delete the
                statement for period:
                {" " +
                  (savedStatements.find((s) => s.id === deletingStatementId)
                    ? `${format(
                        new Date(
                          savedStatements.find(
                            (s) => s.id === deletingStatementId
                          )!.startDate
                        ),
                        "PP"
                      )} - ${format(
                        new Date(
                          savedStatements.find(
                            (s) => s.id === deletingStatementId
                          )!.endDate
                        ),
                        "PP"
                      )}`
                    : "selected statement")}
                .
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel onClick={handleCloseDeleteDialogs}>
                Cancel
              </AlertDialogCancel>
              <AlertDialogAction
                onClick={handleConfirmDeleteStatement}
                className={cn(buttonVariants({ variant: "destructive" }))}
              >
                Delete
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>

        <footer className="mt-12 text-center text-sm text-muted-foreground">
          {/* Copyright notice removed */}
        </footer>
      </div>
      <BottomNavigationBar
        activeView={activeView}
        onNavigate={handleNavigate}
      />
    </div>
  );
}
