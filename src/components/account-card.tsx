
"use client";

import * as React from "react";
import { Pencil, Trash2, FileText } from "lucide-react";

import type { Account } from "@/types";
import { getAccountTypeDetails } from "@/config/account-types";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";

interface AccountCardProps {
  account: Account;
  onEditAccount: (account: Account) => void;
  onDeleteAccount: (accountId: string) => void;
  onViewStatement: (account: Account) => void;
}

export function AccountCard({ account, onEditAccount, onDeleteAccount, onViewStatement }: AccountCardProps) {
  const accountTypeDetails = getAccountTypeDetails(account.type);
  const Icon = accountTypeDetails?.icon || React.Fragment;

  const balanceColor = account.balance < 0 ? "text-destructive" : "text-success";

  return (
    <Card className="shadow-md hover:shadow-lg transition-shadow duration-200 flex flex-col">
      <CardHeader className="flex flex-row items-center justify-between space-y-0 p-4 pb-2">
        <CardTitle className="text-sm sm:text-base font-medium flex items-center gap-2">
          <Icon className="h-5 w-5 text-primary" />
          {account.name}
        </CardTitle>
        <div className="flex items-center space-x-1">
          <Button 
            variant="ghost" 
            size="icon" 
            onClick={() => onEditAccount(account)} 
            className="h-8 w-8"
            aria-label="Edit Account"
          >
            <Pencil className="h-4 w-4" />
          </Button>
          <Button 
            variant="ghost" 
            size="icon" 
            onClick={() => onDeleteAccount(account.id)} 
            className="h-8 w-8 text-destructive hover:text-destructive hover:bg-destructive/10"
            aria-label="Delete Account"
          >
            <Trash2 className="h-4 w-4" />
          </Button>
        </div>
      </CardHeader>
      <CardContent className="px-4 pt-1 pb-3 flex-grow">
        <div className={`text-xl font-bold ${balanceColor}`}>
          {account.balance.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
        </div>
        {account.notes && (
          <p className="text-xs text-muted-foreground mt-1 truncate" title={account.notes}>
            Notes: {account.notes}
          </p>
        )}
        {account.statementClosingDay && (
          <p className="text-xs text-muted-foreground mt-1">
            Statement Closes: Day {account.statementClosingDay}
          </p>
        )}
        {account.type === 'credit_card' && account.preferredPaymentDay && (
          <p className="text-xs text-muted-foreground mt-1">
            Pref. Payment Day: {account.preferredPaymentDay}
          </p>
        )}
      </CardContent>
      <CardFooter className="p-3 border-t">
         <Button 
            variant="outline" 
            size="sm" 
            onClick={() => onViewStatement(account)}
            className="w-full"
            disabled={!account.statementClosingDay}
          >
            <FileText className="mr-2 h-4 w-4" /> View Statements
          </Button>
      </CardFooter>
    </Card>
  );
}
