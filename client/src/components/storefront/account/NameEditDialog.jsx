"use client";

import { useState, useEffect } from "react";
import { useDispatch } from "react-redux";
import { User, Loader2 } from "lucide-react";

import { authClient } from "@/lib/authClient";
import { restoreCustomerSession } from "@/redux/slices/customerAuthSlice";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";

export function NameEditDialog({ open, onOpenChange, currentName, onSuccess }) {
  const dispatch = useDispatch();

  const [nameInput, setNameInput] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  useEffect(() => {
    setNameInput(currentName || "");
  }, [currentName, open]);

  const handleSubmit = async (e) => {
    if (e) e.preventDefault();
    if (!nameInput.trim()) {
      setError("Please enter a valid full name.");
      return;
    }
    setLoading(true);
    setError(null);

    try {
      const { error: apiErr } = await authClient.updateUser({
        name: nameInput.trim(),
      });

      if (apiErr) {
        setError(apiErr.message || "Failed to update name.");
      } else {
        await dispatch(restoreCustomerSession());
        if (onSuccess) onSuccess("Name updated successfully!");
        onOpenChange(false);
      }
    } catch (err) {
      setError(err.message || "Failed to update name.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md p-6">
        <DialogHeader>
          <div className="flex items-center gap-2">
            <div className="flex size-9 items-center justify-center rounded-lg bg-primary/10 text-primary">
              <User className="size-5" />
            </div>
            <div>
              <DialogTitle className="text-base font-bold">Add / Edit Full Name</DialogTitle>
              <DialogDescription className="text-xs text-muted-foreground mt-0.5">
                Set your full name for billing and profile display.
              </DialogDescription>
            </div>
          </div>
        </DialogHeader>

        {error && (
          <div className="rounded-xl border border-destructive/30 bg-destructive/10 p-3 text-xs text-destructive">
            {error}
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4 pt-2">
          <div>
            <label htmlFor="edit-name" className="block text-xs font-semibold text-foreground mb-1.5">
              Full Name *
            </label>
            <Input
              id="edit-name"
              type="text"
              placeholder="e.g. Rahul Sharma"
              value={nameInput}
              onChange={(e) => setNameInput(e.target.value)}
              className="text-sm"
            />
          </div>

          <div className="flex items-center justify-end gap-2 pt-2">
            <Button type="button" variant="outline" size="sm" onClick={() => onOpenChange(false)}>
              Cancel
            </Button>
            <Button type="submit" size="sm" disabled={loading || !nameInput.trim()}>
              {loading && <Loader2 className="size-3.5 animate-spin mr-1.5" />}
              Save Name
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
