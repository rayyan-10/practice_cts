import { Badge } from '@/components/ui/badge';
import { RiskLevel } from '@/types/database';
import { AlertCircle, AlertTriangle, CheckCircle, XCircle } from 'lucide-react';

interface RiskBadgeProps {
  level: RiskLevel;
  showIcon?: boolean;
}

export default function RiskBadge({ level, showIcon = true }: RiskBadgeProps) {
  const config = {
    LOW: {
      variant: 'success' as const,
      label: 'Low Risk',
      icon: CheckCircle,
    },
    MEDIUM: {
      variant: 'warning' as const,
      label: 'Medium Risk',
      icon: AlertCircle,
    },
    HIGH: {
      variant: 'danger' as const,
      label: 'High Risk',
      icon: AlertTriangle,
    },
    CRITICAL: {
      variant: 'destructive' as const,
      label: 'Critical Risk',
      icon: XCircle,
    },
  };

  const { variant, label, icon: Icon } = config[level];

  return (
    <Badge variant={variant} className="flex items-center gap-1">
      {showIcon && <Icon className="h-3 w-3" />}
      {label}
    </Badge>
  );
}
