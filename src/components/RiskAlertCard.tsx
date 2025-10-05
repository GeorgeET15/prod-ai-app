import { Card, CardContent } from "@/components/ui/card";
import { AlertTriangle, Info } from "lucide-react";
import { Button } from "@/components/ui/button";

interface RiskAlert {
  type: "critical" | "warning" | "info";
  title: string;
  description: string;
  confidence: number;
  impact: string;
}

interface RiskAlertCardProps {
  alert: RiskAlert;
  onSimulate?: () => void;
}

export function RiskAlertCard({ alert, onSimulate }: RiskAlertCardProps) {
  const getAlertColor = (type: string) => {
    switch(type) {
      case "critical": return "border-destructive/50 bg-destructive/5";
      case "warning": return "border-accent/50 bg-accent/5";
      default: return "border-secondary/50 bg-secondary/5";
    }
  };

  return (
    <Card className={`${getAlertColor(alert.type)} transition-all hover:shadow-accent-glow`}>
      <CardContent className="p-4">
        <div className="flex items-start gap-3">
          <div className={`p-2 rounded-lg ${
            alert.type === "critical" ? "bg-destructive/20" :
            alert.type === "warning" ? "bg-accent/20" :
            "bg-secondary/20"
          }`}>
            {alert.type === "info" ? (
              <Info className="h-5 w-5 text-secondary" />
            ) : (
              <AlertTriangle className={`h-5 w-5 ${
                alert.type === "critical" ? "text-destructive" : "text-accent"
              }`} />
            )}
          </div>
          
          <div className="flex-1">
            <div className="flex items-start justify-between mb-2">
              <h4 className="font-semibold text-foreground">{alert.title}</h4>
              <span className="text-xs px-2 py-1 rounded-full bg-muted text-muted-foreground">
                {alert.confidence}% confidence
              </span>
            </div>
            
            <p className="text-sm text-muted-foreground mb-2">{alert.description}</p>
            
            <div className="flex items-center justify-between">
              <span className="text-xs text-muted-foreground">Impact: {alert.impact}</span>
              {onSimulate && (
                <Button size="sm" variant="outline" onClick={onSimulate}>
                  Simulate Fix
                </Button>
              )}
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
