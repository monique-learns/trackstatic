
"use client";

import * as React from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import type { LucideIcon } from "lucide-react";
import { cn } from "@/lib/utils";

export interface SummaryCardProps {
  title: string;
  value: number | string;
  icon: LucideIcon; // Icon prop remains for type safety, but won't be rendered
  isCurrency?: boolean;
  valueColor?: string; // e.g., "text-destructive", "text-success"
}

export function SummaryCard({ title, value, icon, isCurrency = false, valueColor = "text-foreground" }: SummaryCardProps) {
  const displayValue = isCurrency && typeof value === 'number'
    ? value.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 }) // Basic currency formatting
    : value;

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between space-y-0 p-3 pb-2">
        <CardTitle className="text-sm font-medium">{title}</CardTitle>
      </CardHeader>
      <CardContent className="p-3 pt-0">
        <div className={cn("text-base md:text-lg font-bold", valueColor)}>{displayValue}</div>
      </CardContent>
    </Card>
  );
}
