"use client";

import { useState, useEffect } from "react";
import { useDispatch } from "react-redux";
import { MapPin, Loader2 } from "lucide-react";

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

export function AddressEditDialog({ open, onOpenChange, currentAddress, onSuccess }) {
  const dispatch = useDispatch();

  const [addrInput, setAddrInput] = useState({
    line1: "",
    line2: "",
    city: "",
    state: "",
    postalCode: "",
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  useEffect(() => {
    if (currentAddress) {
      setAddrInput({
        line1: currentAddress.line1 || "",
        line2: currentAddress.line2 || "",
        city: currentAddress.city || "",
        state: currentAddress.state || "",
        postalCode: currentAddress.postalCode || "",
      });
    }
  }, [currentAddress, open]);

  const handleSubmit = async (e) => {
    if (e) e.preventDefault();
    if (!addrInput.line1.trim() || !addrInput.city.trim()) {
      setError("Please enter house/street line and city.");
      return;
    }
    setLoading(true);
    setError(null);

    try {
      const newAddress = {
        line1: addrInput.line1.trim(),
        line2: addrInput.line2.trim(),
        city: addrInput.city.trim(),
        state: addrInput.state.trim(),
        postalCode: addrInput.postalCode.trim(),
        country: "India",
      };

      const { error: apiErr } = await authClient.updateUser({
        addresses: [newAddress],
      });

      if (apiErr) {
        setError(apiErr.message || "Failed to save address.");
      } else {
        await dispatch(restoreCustomerSession());
        if (onSuccess) onSuccess("Delivery address saved successfully!");
        onOpenChange(false);
      }
    } catch (err) {
      setError(err.message || "Failed to save address.");
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
              <MapPin className="size-5" />
            </div>
            <div>
              <DialogTitle className="text-base font-bold">Add Primary Address</DialogTitle>
              <DialogDescription className="text-xs text-muted-foreground mt-0.5">
                Set your primary shipping address in India.
              </DialogDescription>
            </div>
          </div>
        </DialogHeader>

        {error && (
          <div className="rounded-xl border border-destructive/30 bg-destructive/10 p-3 text-xs text-destructive">
            {error}
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-3 pt-2">
          <div>
            <label className="block text-xs font-semibold text-foreground mb-1">
              House / Flat / Building / Street *
            </label>
            <Input
              placeholder="e.g. Flat 402, Sunshine Apartments"
              value={addrInput.line1}
              onChange={(e) => setAddrInput({ ...addrInput, line1: e.target.value })}
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-foreground mb-1">
              Landmark / Area (Optional)
            </label>
            <Input
              placeholder="e.g. Near Sony Signal, Koramangala"
              value={addrInput.line2}
              onChange={(e) => setAddrInput({ ...addrInput, line2: e.target.value })}
            />
          </div>

          <div className="grid grid-cols-3 gap-2">
            <div>
              <label className="block text-xs font-semibold text-foreground mb-1">
                City *
              </label>
              <Input
                placeholder="Bengaluru"
                value={addrInput.city}
                onChange={(e) => setAddrInput({ ...addrInput, city: e.target.value })}
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-foreground mb-1">
                State
              </label>
              <Input
                placeholder="Karnataka"
                value={addrInput.state}
                onChange={(e) => setAddrInput({ ...addrInput, state: e.target.value })}
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-foreground mb-1">
                PIN Code
              </label>
              <Input
                placeholder="560034"
                value={addrInput.postalCode}
                onChange={(e) => setAddrInput({ ...addrInput, postalCode: e.target.value })}
              />
            </div>
          </div>

          <div className="flex items-center justify-end gap-2 pt-3 border-t">
            <Button type="button" variant="outline" size="sm" onClick={() => onOpenChange(false)}>
              Cancel
            </Button>
            <Button type="submit" size="sm" disabled={loading}>
              {loading && <Loader2 className="size-3.5 animate-spin mr-1.5" />}
              Save Address
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
