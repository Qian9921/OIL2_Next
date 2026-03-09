import React from 'react';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Button } from "@/components/ui/button";
import { Loader2 } from "lucide-react";
import { LoadingState } from "@/components/ui/loading-state";

/**
 * Custom component for AlertDialogDescription to avoid hydration errors
 */
export const SafeAlertDialogDescription = ({ children }: { children: React.ReactNode }) => {
  if (typeof children === 'string') {
    return <AlertDialogDescription>{children}</AlertDialogDescription>;
  }
  
  return (
    <AlertDialogDescription>
      <span className="inline-block">{children}</span>
    </AlertDialogDescription>
  );
};

/**
 * Component for displaying an evaluation loading state
 */
export const EvaluationLoadingState = ({
  text = "Evaluating your work... This might take a few moments.",
  size = "md",
}: {
  text?: string;
  size?: "sm" | "md" | "lg";
}) => (
  <div className="py-4">
    <LoadingState 
      size={size}
      text={text}
      fullHeight={false} 
      className="py-2"
    />
  </div>
);

/**
 * Component for a confirmation dialog
 */
export const ConfirmationDialog = ({
  open,
  onOpenChange,
  title,
  description,
  confirmText = "Confirm",
  cancelText = "Cancel",
  confirmVariant = "default",
  onConfirm,
  confirmDisabled = false,
  cancelDisabled = false,
  confirmIcon = null,
  isLoading = false,
  loadingText = "Processing...",
  children,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  title: string;
  description: React.ReactNode;
  confirmText?: string;
  cancelText?: string;
  confirmVariant?: "default" | "destructive" | "outline" | "secondary" | "ghost" | "link";
  onConfirm: () => void;
  confirmDisabled?: boolean;
  cancelDisabled?: boolean;
  confirmIcon?: React.ReactNode;
  isLoading?: boolean;
  loadingText?: string;
  children?: React.ReactNode;
}) => (
  <AlertDialog open={open} onOpenChange={onOpenChange}>
    <AlertDialogContent>
      <AlertDialogHeader>
        <AlertDialogTitle>{title}</AlertDialogTitle>
        <SafeAlertDialogDescription>
          {description}
        </SafeAlertDialogDescription>
      </AlertDialogHeader>
      
      {isLoading && <EvaluationLoadingState text={loadingText} />}
      
      {children}
      
      <AlertDialogFooter>
        <AlertDialogCancel disabled={cancelDisabled || isLoading}>{cancelText}</AlertDialogCancel>
        <AlertDialogAction 
          onClick={onConfirm}
          className={confirmVariant === "destructive" ? "bg-red-600 hover:bg-red-700 text-white" : 
                    confirmVariant === "default" ? "bg-blue-600 hover:bg-blue-700 text-white" : ""}
          disabled={confirmDisabled || isLoading}
        >
          {isLoading ? (
            <>
              <Loader2 className="w-4 h-4 mr-2 animate-spin" />
              {loadingText}
            </>
          ) : (
            <>
              {confirmIcon && <span className="mr-2">{confirmIcon}</span>}
              {confirmText}
            </>
          )}
        </AlertDialogAction>
      </AlertDialogFooter>
    </AlertDialogContent>
  </AlertDialog>
);

/**
 * Component for displaying checkpoint/requirement status in evaluations
 */
export const RequirementCheckpoint = ({
  status,
  requirement,
  details
}: {
  status: string;
  requirement: string;
  details: string;
}) => {
  const normalizedStatus = status.toLowerCase();
  const isCompleted = (normalizedStatus.includes('completed') || normalizedStatus.includes('pass')) && !normalizedStatus.includes('not');
  const isPartial = normalizedStatus.includes('partial');
  
  return (
    <div className="border rounded-md overflow-hidden">
      <div className={`p-3 font-medium text-sm ${
        isCompleted
          ? 'bg-green-50 text-green-700'
          : isPartial
            ? 'bg-amber-50 text-amber-700'
            : 'bg-red-50 text-red-700'
      }`}>
        {status}
      </div>
      <div className="p-3 border-t border-gray-200">
        <p className="text-sm font-medium mb-1">Requirement:</p>
        <p className="text-sm text-gray-700 mb-3">{requirement}</p>
        <p className="text-sm font-medium mb-1">Feedback:</p>
        <p className="text-sm text-gray-700">{details}</p>
      </div>
    </div>
  );
}; 