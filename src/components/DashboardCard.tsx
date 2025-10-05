import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { LucideIcon } from "lucide-react";
import { ReactNode } from "react";

interface DashboardCardProps {
  title: string;
  icon: LucideIcon;
  children: ReactNode;
  className?: string;
}

export function DashboardCard({ title, icon: Icon, children, className = "" }: DashboardCardProps) {
  return (
    <Card className={`border-border bg-card transition-all hover:shadow-glow ${className}`}>
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-lg">
          <Icon className="h-5 w-5 text-primary" />
          {title}
        </CardTitle>
      </CardHeader>
      <CardContent>{children}</CardContent>
    </Card>
  );
}
