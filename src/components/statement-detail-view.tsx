
"use client";

import * as React from "react";
import type { Account, Statement, Transaction } from "@/types";
import { format } from "date-fns";
import { Landmark, CreditCard } from "lucide-react"; // Added CreditCard for explicit check
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Separator } from "@/components/ui/separator";
import { cn } from "@/lib/utils";
import { getAccountTypeDetails } from "@/config/account-types";

interface StatementDetailViewProps {
  account: Account | null;
  statement: Statement | null;
}

export function StatementDetailView({ account, statement }: StatementDetailViewProps) {
  if (!account || !statement) {
    return (
      <div className="py-8 text-center text-muted-foreground">
        <p>Select an account and a statement period to view details.</p>
      </div>
    );
  }

  const AccountIcon = getAccountTypeDetails(account.type)?.icon || Landmark;

  const { paymentsForOtherStatements, otherTransactionsToDisplay } = React.useMemo(() => {
    if (!statement?.transactions || !account) {
      return { paymentsForOtherStatements: [], otherTransactionsToDisplay: [] };
    }

    const allWithinPeriodTransactions = statement.transactions || []; // These are now strictly within-period
    const pForOtherStmts: Transaction[] = [];
    const others: Transaction[] = [];

    if (account.type === 'credit_card') {
      allWithinPeriodTransactions.forEach(tx => {
        if (
          tx.nature === 'transfer' &&
          tx.toAccountId === account.id &&
          tx.linkedStatementId && // Has a linked statement ID
          statement.id && // Current statement has an ID
          tx.linkedStatementId !== statement.id // And it's NOT for the current statement
        ) {
          pForOtherStmts.push(tx);
        } else {
          others.push(tx);
        }
      });
    } else {
      // For non-credit card accounts, all transactions are "other"
      others.push(...allWithinPeriodTransactions);
    }
    return { paymentsForOtherStatements: pForOtherStmts, otherTransactionsToDisplay: others };
  }, [statement, account]);

  const renderTransactionRow = (tx: Transaction, isPaymentForOtherSection: boolean = false) => {
    let amountDisplay = tx.amount.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 });
    let amountColor = "text-foreground";

    if (isPaymentForOtherSection) { // This section always represents credits to the CC account
        amountColor = "text-success";
        amountDisplay = `+${amountDisplay}`;
    } else {
      // Logic for main "Other Transactions" list (statement's perspective)
      if (tx.nature === 'income' && tx.accountId === account?.id) {
          amountColor = "text-success";
          amountDisplay = `+${amountDisplay}`;
      } else if (tx.nature === 'expense' && tx.accountId === account?.id) {
          amountColor = "text-destructive";
          amountDisplay = `-${amountDisplay}`;
      } else if (tx.nature === 'transfer') {
          if (tx.fromAccountId === account?.id) { // Transferring out of this account
              amountColor = "text-destructive";
              amountDisplay = `-${amountDisplay}`;
          } else if (tx.toAccountId === account?.id) { // Transferring into this account
              // (Payments for *this* statement or unlinked payments to this CC fall here now)
              amountColor = "text-success";
              amountDisplay = `+${amountDisplay}`;
          }
      }
    }
    return (
      <TableRow key={tx.id + '-' + (isPaymentForOtherSection ? 'payment-other' : 'other') + '-' + tx.date.toString()}>
        <TableCell>{format(new Date(tx.date), "MMM dd, yyyy")}</TableCell>
        <TableCell>{tx.description}</TableCell>
        <TableCell className={cn("text-right font-medium", amountColor)}>{amountDisplay}</TableCell>
      </TableRow>
    );
  };
  
  const remainingStatementBalance = account.type === 'credit_card' 
    ? statement.closingBalance + statement.totalLinkedPaymentsAmount 
    : statement.closingBalance;


  return (
    <Card className="shadow-lg mt-6">
      <CardHeader className="border-b">
        <div className="flex items-center gap-2 mb-1">
          <AccountIcon className="h-6 w-6 text-primary" />
          <CardTitle className="text-xl sm:text-2xl">Statement: {account.name}</CardTitle>
        </div>
        <CardDescription className="text-sm sm:text-base">
          Period: {format(new Date(statement.startDate), "PP")} - {format(new Date(statement.endDate), "PP")}
        </CardDescription>
      </CardHeader>
      <CardContent className="p-4 md:p-6">
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-3 text-sm">
          <div className="p-3 bg-muted/50 rounded-md">
            <p className="text-xs text-muted-foreground">Opening Balance</p>
            <p className="font-semibold">{statement.openingBalance.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</p>
          </div>
          <div className="p-3 bg-muted/50 rounded-md">
            <p className="text-xs text-muted-foreground">Total Credits (Period)</p>
            <p className="font-semibold text-success">{statement.totalCredits.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</p>
          </div>
          <div className="p-3 bg-muted/50 rounded-md">
            <p className="text-xs text-muted-foreground">Total Debits (Period)</p>
            <p className="font-semibold text-destructive">{statement.totalDebits.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</p>
          </div>
          <div className="p-3 bg-muted/50 rounded-md">
            <p className="text-xs text-muted-foreground">Closing Balance</p>
            <p className="font-semibold">{statement.closingBalance.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</p>
          </div>
        </div>

        {account.type === 'credit_card' && (
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6 text-sm">
                <div className="p-3 bg-accent/10 rounded-md md:col-start-3">
                    <p className="text-xs text-accent-foreground/80">Total Payments Linked</p>
                    <p className="font-semibold text-success">
                        {statement.totalLinkedPaymentsAmount.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                    </p>
                </div>
                <div className="p-3 bg-accent/20 rounded-md">
                    <p className="text-xs text-accent-foreground/80">Remaining on Stmt.</p>
                    <p className={cn("font-bold", remainingStatementBalance >= 0 ? "text-success" : "text-destructive")}>
                        {remainingStatementBalance.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                    </p>
                </div>
            </div>
        )}


        {account.type === 'credit_card' && paymentsForOtherStatements.length > 0 && (
          <>
            <Separator className="my-6" />
            <h3 className="text-lg font-semibold mb-3">Payments for Other Statements ({paymentsForOtherStatements.length})</h3>
            <ScrollArea className="h-[150px] md:h-[200px] border rounded-md">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="w-[120px]">Date</TableHead>
                    <TableHead>Description</TableHead>
                    <TableHead className="text-right w-[150px]">Amount</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {paymentsForOtherStatements.map(tx => renderTransactionRow(tx, true))}
                </TableBody>
              </Table>
            </ScrollArea>
          </>
        )}

        <Separator className="my-6" />

        <h3 className="text-lg font-semibold mb-3">
          Other Transactions ({otherTransactionsToDisplay.length})
        </h3>
        {otherTransactionsToDisplay.length > 0 ? (
          <ScrollArea className="h-[200px] md:h-[300px] border rounded-md">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="w-[120px]">Date</TableHead>
                  <TableHead>Description</TableHead>
                  <TableHead className="text-right w-[150px]">Amount</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {otherTransactionsToDisplay.map(tx => renderTransactionRow(tx, false))}
              </TableBody>
            </Table>
          </ScrollArea>
        ) : (
          <p className="text-muted-foreground text-center py-8">No other transactions in this statement period.</p>
        )}
      </CardContent>
    </Card>
  );
}
