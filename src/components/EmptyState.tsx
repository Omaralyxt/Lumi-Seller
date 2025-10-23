import { cn } from "@/lib/utils";
import { Package, PlusCircle } from "lucide-react";
import React from "react";
import { Link } from "react-router-dom";
import { Button } from "./ui/button";

interface EmptyStateProps {
  icon: React.ElementType;
  title: string;
  description: string;
  actionText?: string;
  actionLink?: string;
  className?: string;
}

const EmptyState: React.FC<EmptyStateProps> = ({
  icon: Icon,
  title,
  description,
  actionText,
  actionLink,
  className,
}) => {
  return (
    <div className={cn(
      "flex flex-col items-center justify-center p-10 text-center border-2 border-dashed border-muted-foreground/30 rounded-xl bg-muted/50",
      className
    )}>
      <Icon className="h-12 w-12 text-muted-foreground mb-4" />
      <h2 className="text-xl font-heading font-bold text-foreground mb-2">{title}</h2>
      <p className="text-sm text-muted-foreground mb-6 max-w-md">{description}</p>
      
      {actionLink && actionText && (
        <Link to={actionLink}>
          <Button className="font-heading">
            <PlusCircle className="h-4 w-4 mr-2" />
            {actionText}
          </Button>
        </Link>
      )}
    </div>
  );
};

export default EmptyState;