import { Loader2 } from "lucide-react";
import { cn } from "@/lib/utils";
import React from "react";

interface LoadingSpinnerProps {
  className?: string;
  size?: number;
}

const LoadingSpinner: React.FC<LoadingSpinnerProps> = ({ className, size = 24 }) => {
  return (
    <div className={cn("flex items-center justify-center", className)}>
      <Loader2 className="animate-spin text-primary" style={{ height: size, width: size }} />
    </div>
  );
};

export default LoadingSpinner;