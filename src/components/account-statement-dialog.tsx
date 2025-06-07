
"use client";

import * as React from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import type { Account, Transaction, Statement } from "@/types";
import { format, getMonth, getYear } from "date-fns";
import { cn } from "@/lib/utils";
import { Separator } from "@/components/ui/separator";
import { generateStatementDataForPage, calculateStatementPeriod } from "@/lib/statement-utils";
import { Trash2 } from "lucide-react";
import { ScrollArea } from "@/components/ui/scroll-area";
import { useToast } from "@/hooks/use-toast";


interface AccountStatementDialogProps {
  account: Account | null;
  allTransactions: Transaction[];
  savedStatements: Statement[];
  onSaveStatement: (statement: Statement) => void;
  onNavigateToStatementView: (accountId: string, statementId: string) => void;
  onOpenDeleteStatementDialog: (statementId: string) => void;
  isOpen: boolean;
  onOpenChange: (isOpen: boolean) => void;
}

const currentYear = new Date().getFullYear();
const years = Array.from({ length: 10 }, (_, i) => (currentYear - 5 + i).toString());
const months = Array.from({ length: 12 }, (_, i) => ({
  value: i.toString(), // 0-indexed for Date constructor consistency
  label: format(new Date(currentYear, i), "MMMM"),
}));

export function AccountStatementDialog({ 
  account, 
  allTransactions, 
  savedStatements, 
  onSaveStatement, 
  onNavigateToStatementView,
  onOpenDeleteStatementDialog,
  isOpen, 
  onOpenChange 
}: AccountStatementDialogProps) {
  const [selectedMonth, setSelectedMonth] = React.useState<string>(new Date().getMonth().toString());
  const [selectedYear, setSelectedYear] = React.useState<string>(currentYear.toString());
  const [isLoading, setIsLoading] = React.useState(false);
  const { toast } = useToast();


  const handleGenerateStatementForPeriod = React.useCallback(() => {
    if (!account || !account.statementClosingDay) {
      return;
    }
    setIsLoading(true);

    const targetMonth = parseInt(selectedMonth);
    const targetYear = parseInt(selectedYear);
    
    const period = calculateStatementPeriod(account.statementClosingDay, targetMonth, targetYear);
    if (!period) {
        setIsLoading(false);
        toast({ title: "Error", description: "Could not calculate statement period.", variant: "destructive" });
        return;
    }
    const { startDate, endDate } = period;
    
    const statementIdToGenerate = `${account.id}-${targetYear}-${String(targetMonth).padStart(2, '0')}`;

    const foundSavedStatement = (savedStatements || []).find(s => s.id === statementIdToGenerate);

    if (foundSavedStatement) {
      toast({ title: "Statement Exists", description: `Statement for ${format(new Date(foundSavedStatement.startDate), "MMM yyyy")} already exists.` });
      setIsLoading(false);
      return;
    }
    
    const statementCoreData = generateStatementDataForPage(
        account, 
        allTransactions, 
        startDate, 
        endDate,
        statementIdToGenerate 
    );

    if (statementCoreData) {
      const newStatementData: Statement = {
        id: statementIdToGenerate, 
        accountId: account.id,
        startDate,
        endDate,
        openingBalance: statementCoreData.openingBalance,
        closingBalance: statementCoreData.closingBalance,
        transactions: statementCoreData.statementTransactions,
        totalDebits: statementCoreData.totalDebits,
        totalCredits: statementCoreData.totalCredits,
        totalLinkedPaymentsAmount: statementCoreData.totalLinkedPaymentsAmount,
      };
      
      if (typeof onSaveStatement === 'function') {
        onSaveStatement(newStatementData);
        toast({ title: "Statement Generated", description: `Statement for ${format(startDate, "MMM yyyy")} has been generated and saved.` });
      }
    } else {
      toast({ title: "Generation Failed", description: "Could not generate statement data.", variant: "destructive" });
    }
    setIsLoading(false);
  }, [account, allTransactions, selectedMonth, selectedYear, savedStatements, onSaveStatement, toast]);
  
  const accountSavedStatements = React.useMemo(() => {
    if (!account || !Array.isArray(savedStatements)) {
        return [];
    }
    return savedStatements
        .filter(s => s.accountId === account.id)
        .sort((a, b) => new Date(b.endDate).getTime() - new Date(a.endDate).getTime());
  }, [account, savedStatements]);


  if (!account) return null;


  return (
    <Dialog open={isOpen} onOpenChange={onOpenChange}>
      <DialogContent className="w-[calc(100vw-2rem)] sm:max-w-lg max-h-[90vh] flex flex-col">
        <DialogHeader>
          <DialogTitle>Account Statements: {account.name}</DialogTitle>
          <DialogDescription>
            Select a period to generate a statement or view an existing one. Account closes on day {account.statementClosingDay || 'N/A'}.
          </DialogDescription>
        </DialogHeader>

        {!account.statementClosingDay ? (
          <div className="py-8 text-center text-muted-foreground">
            Please set a statement closing day for this account to generate statements.
          </div>
        ) : (
          <>
            <div className="flex flex-col sm:flex-row gap-4 my-4 items-center">
              <Select value={selectedMonth} onValueChange={setSelectedMonth}>
                <SelectTrigger className="w-full sm:w-[150px]">
                  <SelectValue placeholder="Select Month" />
                </SelectTrigger>
                <SelectContent>
                  {months.map(m => <SelectItem key={m.value} value={m.value}>{m.label}</SelectItem>)}
                </SelectContent>
              </Select>
              <Select value={selectedYear} onValueChange={setSelectedYear}>
                <SelectTrigger className="w-full sm:w-[120px]">
                  <SelectValue placeholder="Select Year" />
                </SelectTrigger>
                <SelectContent>
                  {years.map(y => <SelectItem key={y} value={y}>{y}</SelectItem>)}
                </SelectContent>
              </Select>
              <Button onClick={handleGenerateStatementForPeriod} disabled={isLoading} className="w-full sm:w-auto flex-grow sm:flex-grow-0">
                {isLoading ? "Processing..." : "Generate Statement"}
              </Button>
            </div>
            
            {accountSavedStatements.length > 0 && (
                <div className="my-4 flex-grow overflow-hidden">
                    <Separator />
                    <h4 className="text-md font-semibold my-3">Saved Statements for {account.name} ({accountSavedStatements.length})</h4>
                    <ScrollArea className="h-48 border rounded-md p-2">
                        <div className="flex flex-col space-y-1">
                            {accountSavedStatements.map(stmt => (
                                <div key={stmt.id} className="flex items-center justify-between hover:bg-muted/50 rounded-md pr-1">
                                    <Button
                                        variant="ghost"
                                        size="sm"
                                        className="flex-grow justify-start text-left h-auto py-1.5 px-2 text-xs sm:text-sm"
                                        onClick={() => onNavigateToStatementView(stmt.accountId, stmt.id)}
                                    >
                                        {format(new Date(stmt.startDate), "MMM dd, yyyy")} - {format(new Date(stmt.endDate), "MMM dd, yyyy")}
                                    </Button>
                                    <Button
                                      variant="ghost"
                                      size="icon"
                                      className="h-7 w-7 text-destructive hover:text-destructive hover:bg-destructive/10"
                                      onClick={(e) => {
                                        e.stopPropagation();
                                        onOpenDeleteStatementDialog(stmt.id);
                                      }}
                                      aria-label="Delete Statement"
                                    >
                                      <Trash2 className="h-3.5 w-3.5" />
                                    </Button>
                                </div>
                            ))}
                        </div>
                    </ScrollArea>
                     <Separator className="my-3" />
                </div>
            )}
            {accountSavedStatements.length === 0 && (
                 <p className="text-center text-muted-foreground py-6">No saved statements for this account yet. Select a period and click "Generate Statement".</p>
            )}
          </>
        )}
      </DialogContent>
    </Dialog>
  );
}
    
