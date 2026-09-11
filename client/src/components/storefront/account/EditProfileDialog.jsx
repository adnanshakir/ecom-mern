"use client";

import { useState, useEffect } from "react";
import { useDispatch } from "react-redux";
import { User, Mail, Phone, MapPin, Lock, Loader2 } from "lucide-react";

import { updateCustomerProfileRequest } from "@/services/storefront/customerAuth";
import { restoreCustomerSession, setCustomerAuthSession } from "@/redux/slices/customerAuthSlice";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";

export function EditProfileDialog({ open, onOpenChange, user, onSuccess }) {
  const dispatch = useDispatch();

  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [address, setAddress] = useState({
    line1: "",
    line2: "",
    city: "",
    state: "",
    postalCode: "",
  });

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  const phone = user?.phoneNumber || user?.phone || "";

  useEffect(() => {
    if (open && user) {
      // Helper check to avoid showing placeholder emails/names
      const isRealEmail = (e) => e && !e.endsWith("@customer.local") && !e.includes("customer.local");
      const isRealName = (n) => n && n !== phone && !/^\+?91?\d{10}$/.test(n.replace(/\s/g, ""));

      setName(isRealName(user.name) ? user.name : "");
      setEmail(isRealEmail(user.email) ? user.email : "");

      const primaryAddr = user.addresses?.[0] || {};
      setAddress({
        line1: primaryAddr.line1 || "",
        line2: primaryAddr.line2 || "",
        city: primaryAddr.city || "",
        state: primaryAddr.state || "",
        postalCode: primaryAddr.postalCode || "",
      });

      setError(null);
    }
  }, [open, user, phone]);

  const handleSubmit = async (e) => {
    if (e) e.preventDefault();
    setLoading(true);
    setError(null);

    try {
      const payload = {};

      if (name.trim()) {
        payload.name = name.trim();
      }

      if (email.trim() && email.trim().toLowerCase() !== (user?.email || "").toLowerCase()) {
        if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim().toLowerCase())) {
          setError("Please enter a valid email address.");
          setLoading(false);
          return;
        }
        payload.email = email.trim().toLowerCase();
      }

      if (address.line1.trim() || address.city.trim()) {
        if (!address.line1.trim() || !address.city.trim()) {
          setError("House/street line and City are required for delivery address.");
          setLoading(false);
          return;
        }
        payload.address = {
          line1: address.line1.trim(),
          line2: address.line2.trim(),
          city: address.city.trim(),
          state: address.state.trim(),
          postalCode: address.postalCode.trim(),
          country: "India",
        };
      }

      const res = await updateCustomerProfileRequest(payload);

      if (res.data?.success) {
        if (res.data?.data) {
          dispatch(setCustomerAuthSession({ ...(user || {}), ...res.data.data }));
        } else {
          await dispatch(restoreCustomerSession());
        }
        if (onSuccess) onSuccess("Profile details updated successfully!");
        onOpenChange(false);
      } else {
        setError(res.data?.message || "Failed to update profile.");
      }
    } catch (err) {
      setError(err.response?.data?.message || err.message || "Failed to update profile.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[90vh] w-[95vw] sm:max-w-2xl overflow-y-auto p-6 sm:p-8">
        <DialogHeader>
          <div className="flex items-center gap-3">
            <div className="flex size-10 items-center justify-center rounded-xl bg-primary/10 text-primary shrink-0">
              <User className="size-5" />
            </div>
            <div>
              <DialogTitle className="text-lg font-bold">Edit Profile</DialogTitle>
              <DialogDescription className="text-xs text-muted-foreground mt-0.5">
                Update your personal info, email address, and primary delivery address.
              </DialogDescription>
            </div>
          </div>
        </DialogHeader>

        {error && (
          <div className="rounded-xl border border-destructive/30 bg-destructive/10 p-3.5 text-xs text-destructive">
            {error}
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-6 pt-2">
          {/* Section 1: Contact Info */}
          <div className="space-y-4">
            <h3 className="text-xs font-bold uppercase tracking-wider text-muted-foreground flex items-center gap-1.5">
              <User className="size-3.5 text-primary" /> Personal Information
            </h3>

            <div className="grid gap-4 sm:grid-cols-2">
              <div>
                <label htmlFor="edit-name" className="block text-xs font-semibold text-foreground mb-1">
                  Full Name
                </label>
                <Input
                  id="edit-name"
                  type="text"
                  placeholder="e.g. Rahul Sharma"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  className="text-sm"
                />
              </div>

              <div>
                <label htmlFor="edit-email" className="block text-xs font-semibold text-foreground mb-1">
                  Email Address
                </label>
                <div className="relative">
                  <Input
                    id="edit-email"
                    type="email"
                    placeholder="e.g. rahul@example.com"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    className="text-sm pl-9"
                  />
                  <Mail className="size-4 text-muted-foreground absolute left-3 top-3" />
                </div>
              </div>
            </div>

            <div>
              <label htmlFor="edit-phone" className="block text-xs font-semibold text-foreground mb-1">
                Verified Mobile Number
              </label>
              <div className="relative">
                <Input
                  id="edit-phone"
                  type="text"
                  value={phone}
                  disabled
                  className="text-sm pl-9 bg-muted/60 text-muted-foreground cursor-not-allowed select-none font-medium"
                />
                <Phone className="size-4 text-muted-foreground absolute left-3 top-3" />
                <span className="absolute right-3 top-2.5 inline-flex items-center gap-1 text-[11px] font-medium text-emerald-600 dark:text-emerald-400 bg-emerald-500/10 px-2 py-0.5 rounded-md">
                  <Lock className="size-3" /> Verified
                </span>
              </div>
              <p className="mt-1 text-[11px] text-muted-foreground">
                Mobile number is verified and cannot be changed here.
              </p>
            </div>
          </div>

          {/* Section 2: Primary Address */}
          <div className="space-y-3.5 pt-3 border-t">
            <h3 className="text-xs font-bold uppercase tracking-wider text-muted-foreground flex items-center gap-1.5">
              <MapPin className="size-3.5 text-primary" /> Delivery Address
            </h3>

            <div>
              <label className="block text-xs font-semibold text-foreground mb-1">
                House / Flat / Building / Street
              </label>
              <Input
                placeholder="e.g. Flat 402, Sunshine Apartments"
                value={address.line1}
                onChange={(e) => setAddress({ ...address, line1: e.target.value })}
                className="text-sm"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-foreground mb-1">
                Landmark / Area (Optional)
              </label>
              <Input
                placeholder="e.g. Near Sony Signal, Koramangala"
                value={address.line2}
                onChange={(e) => setAddress({ ...address, line2: e.target.value })}
                className="text-sm"
              />
            </div>

            <div className="grid grid-cols-3 gap-2">
              <div>
                <label className="block text-xs font-semibold text-foreground mb-1">
                  City
                </label>
                <Input
                  placeholder="Bengaluru"
                  value={address.city}
                  onChange={(e) => setAddress({ ...address, city: e.target.value })}
                  className="text-sm"
                />
              </div>
              <div>
                <label className="block text-xs font-semibold text-foreground mb-1">
                  State
                </label>
                <Input
                  placeholder="Karnataka"
                  value={address.state}
                  onChange={(e) => setAddress({ ...address, state: e.target.value })}
                  className="text-sm"
                />
              </div>
              <div>
                <label className="block text-xs font-semibold text-foreground mb-1">
                  PIN Code
                </label>
                <Input
                  placeholder="560034"
                  value={address.postalCode}
                  onChange={(e) => setAddress({ ...address, postalCode: e.target.value })}
                  className="text-sm"
                />
              </div>
            </div>
          </div>

          <div className="flex items-center justify-end gap-2 pt-4 border-t">
            <Button type="button" variant="outline" size="sm" onClick={() => onOpenChange(false)}>
              Cancel
            </Button>
            <Button type="submit" size="sm" disabled={loading} className="font-semibold">
              {loading && <Loader2 className="size-3.5 animate-spin mr-1.5" />}
              Save Profile Changes
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
