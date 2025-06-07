
"use client";

import * as React from "react";
import { ListChecks, WalletCards, CalendarClock, Target, FileSpreadsheet, LayoutDashboard } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

export type AppView = "dashboard" | "transactions" | "accounts" | "planned" | "budgets" | "statements" | "settings";

interface BottomNavigationBarProps {
  activeView: AppView;
  onNavigate: (view: AppView) => void;
  className?: string;
}

const navItems = [
  { view: "dashboard" as AppView, label: "Dashboard", icon: LayoutDashboard },
  { view: "transactions" as AppView, label: "Transactions", icon: ListChecks },
  { view: "accounts" as AppView, label: "Accounts", icon: WalletCards },
  { view: "planned" as AppView, label: "Planned", icon: CalendarClock },
  { view: "budgets" as AppView, label: "Budgets", icon: Target },
  { view: "statements" as AppView, label: "Statements", icon: FileSpreadsheet },
];

export function BottomNavigationBar({ activeView, onNavigate, className }: BottomNavigationBarProps) {
  return (
    <nav className={cn(
      "fixed bottom-0 left-0 right-0 z-50 h-16 border-t bg-background",
      className
    )}>
      <div className="mx-auto flex h-full max-w-md items-center justify-around">
        {navItems.map((item) => {
          const Icon = item.icon;
          const isActive = activeView === item.view;
          return (
            <Button
              key={item.view}
              variant="ghost"
              className={cn(
                "flex h-full flex-1 flex-col items-center justify-center rounded-none px-2 py-1 hover:bg-muted/50",
                isActive ? "text-primary" : "text-muted-foreground"
              )}
              onClick={() => onNavigate(item.view)}
              aria-label={item.label}
            >
              <Icon className={cn("h-6 w-6 sm:h-7 sm:w-7", isActive ? "text-primary" : "")} />
            </Button>
          );
        })}
      </div>
    </nav>
  );
}
