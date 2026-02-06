"use client";

import { useState } from "react";

import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { LogOut, X } from "lucide-react";


interface LogoutAlertProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onConfirm: () => Promise<void>;
  userName?: string;
  userId?: string; // Add userId for analytics
}

export function LogoutAlert({ 
  open, 
  onOpenChange, 
  onConfirm, 
  userName,
  userId 
}: LogoutAlertProps) {
  const [isLoggingOut, setIsLoggingOut] = useState(false);
  const [isCancelling, setIsCancelling] = useState(false);
  const [sessionStartTime] = useState(Date.now());



  const handleLogout = async () => {
    setIsLoggingOut(true);
    const logoutStartTime = Date.now();
    
    try {
     
     

      await onConfirm();
    } catch (error) {
      console.error('Logout error:', error);
      

      setIsLoggingOut(false);
    }
  };

  const handleCancel = (e?: React.MouseEvent) => {
    if (e) {
      e.preventDefault();
      e.stopPropagation();
    }
    if (!isLoggingOut && !isCancelling) {
      setIsCancelling(true);
      // Add 1 second delay before closing and refreshing
      setTimeout(() => {
        onOpenChange(false);
        setIsCancelling(false);
        window.location.reload();
      }, 1000);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <LogOut className="h-5 w-5 text-red-600" />
            Confirm Logout
          </DialogTitle>
        </DialogHeader>
        <div className="py-4">
          <p className="text-sm text-muted-foreground">
            {userName 
              ? `Are you sure you want to log out, ${userName}? You will need to sign in again to access your account.`
              : "Are you sure you want to log out? You will need to sign in again to access your account."
            }
          </p>
        </div>
        <DialogFooter>
          <Button
            variant="outline"
            className="cursor-pointer" 
            disabled={isLoggingOut || isCancelling}
            onClick={(e) => {
              e.preventDefault();
              e.stopPropagation();
              handleCancel(e);
            }}
          >
            {isCancelling ? (
              <>
                <div className="mr-2 h-4 w-4 animate-spin rounded-full border-2 border-gray-600 border-t-transparent" />
                Cancelling...
              </>
            ) : (
              <>
                <X className="mr-2 h-4 w-4" />
                Cancel
              </>
            )}
          </Button>
          <Button
            onClick={(e) => {
              e.preventDefault();
              e.stopPropagation();
              handleLogout();
            }}
            disabled={isLoggingOut}
            className="bg-red-600 cursor-pointer hover:bg-red-700 focus:ring-red-600"
          >
            {isLoggingOut ? (
              <>
                <div className="mr-2 h-4 w-4 animate-spin rounded-full border-2 border-white border-t-transparent" />
                Logging out...
              </>
            ) : (
              <>
                <LogOut className="mr-2 h-4 w-4" />
                Log out
              </>
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}