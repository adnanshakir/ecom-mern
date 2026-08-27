"use client";

import { useState, useEffect } from "react";
import { useSelector, useDispatch } from "react-redux";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  User,
  Mail,
  Phone,
  MapPin,
  Package,
  Heart,
  Save,
  CheckCircle2,
  LogOut,
  AlertCircle,
  Pencil,
  X,
  Building,
} from "lucide-react";
import { Button, buttonVariants } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { customerLogout, updateCustomerProfile } from "@/redux/slices/customerAuthSlice";
import { resetCart } from "@/redux/slices/cartSlice";
import { resetWishlist } from "@/redux/slices/wishlistSlice";

export function ProfileView() {
  const dispatch = useDispatch();
  const router = useRouter();
  const { user, status } = useSelector((state) => state.customerAuth);
  const isAuthenticated = status === "authenticated" || !!user;

  const [isEditing, setIsEditing] = useState(false);
  const [saving, setSaving] = useState(false);
  const [saveSuccess, setSaveSuccess] = useState(false);
  const [saveError, setSaveError] = useState("");

  const defaultAddr = user?.addresses && user.addresses.length > 0 ? user.addresses[0] : null;

  // Form state holding Personal Info & Address
  const [formData, setFormData] = useState({
    name: user?.name || "",
    email: user?.email || "",
    phone: user?.phone || "",
    line1: defaultAddr?.line1 || "",
    line2: defaultAddr?.line2 || "",
    city: defaultAddr?.city || "",
    state: defaultAddr?.state || "",
    postalCode: defaultAddr?.postalCode || "",
  });

  useEffect(() => {
    if (user) {
      const primaryAddr = user.addresses && user.addresses.length > 0 ? user.addresses[0] : null;
      setFormData({
        name: user.name || "",
        email: user.email || "",
        phone: user.phone || "",
        line1: primaryAddr?.line1 || "",
        line2: primaryAddr?.line2 || "",
        city: primaryAddr?.city || "",
        state: primaryAddr?.state || "",
        postalCode: primaryAddr?.postalCode || "",
      });
    }
  }, [user]);

  const hasSavedAddress = Boolean(formData.line1 && formData.city && formData.postalCode);

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
  };

  const handleCancelEdit = () => {
    setIsEditing(false);
    setSaveError("");
    // Reset form to current user values
    if (user) {
      const primaryAddr = user.addresses && user.addresses.length > 0 ? user.addresses[0] : null;
      setFormData({
        name: user.name || "",
        email: user.email || "",
        phone: user.phone || "",
        line1: primaryAddr?.line1 || "",
        line2: primaryAddr?.line2 || "",
        city: primaryAddr?.city || "",
        state: primaryAddr?.state || "",
        postalCode: primaryAddr?.postalCode || "",
      });
    }
  };

  const handleSave = async (e) => {
    e.preventDefault();
    setSaving(true);
    setSaveError("");
    setSaveSuccess(false);

    try {
      const addressesPayload = formData.line1.trim()
        ? [
            {
              label: "Primary",
              line1: formData.line1.trim(),
              line2: formData.line2.trim(),
              city: formData.city.trim(),
              state: formData.state.trim(),
              postalCode: formData.postalCode.trim(),
              country: "India",
              phone: formData.phone.trim(),
              isDefault: true,
            },
          ]
        : [];

      if (isAuthenticated) {
        await dispatch(
          updateCustomerProfile({
            name: formData.name,
            phone: formData.phone,
            addresses: addressesPayload,
          })
        ).unwrap();
      }

      setSaveSuccess(true);
      setIsEditing(false);
      setTimeout(() => setSaveSuccess(false), 4000);
    } catch (err) {
      setSaveError(typeof err === "string" ? err : "Failed to update profile");
    } finally {
      setSaving(false);
    }
  };

  const handleLogout = async () => {
    await dispatch(customerLogout());
    dispatch(resetCart());
    dispatch(resetWishlist());
    router.push("/");
  };

  return (
    <div className="min-h-[85vh] bg-muted/20 py-8 sm:py-12">
      <div className="mx-auto max-w-4xl px-4 sm:px-6 lg:px-8">
        {/* Simple Clean Header — NO Cover Image */}
        <div className="rounded-2xl border bg-card p-6 shadow-sm flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
          <div className="flex items-center gap-4">
            <div className="flex size-16 items-center justify-center rounded-2xl bg-primary text-xl font-bold text-primary-foreground shadow-sm shrink-0">
              {formData.name ? formData.name.charAt(0).toUpperCase() : "U"}
            </div>
            <div>
              <h1 className="text-xl sm:text-2xl font-bold text-foreground leading-tight">
                {formData.name || "Customer Profile"}
              </h1>
              <p className="text-xs text-muted-foreground flex items-center gap-1.5 mt-0.5">
                <Mail className="size-3.5 shrink-0" /> {formData.email || "No email logged in"}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2 w-full sm:w-auto">
            <Link
              href="/account/orders"
              className={buttonVariants({ variant: "outline", size: "sm", className: "inline-flex items-center justify-center gap-2" })}
            >
              <Package className="size-4 shrink-0" />
              <span>My Orders</span>
            </Link>

            {isAuthenticated && (
              <Button variant="destructive" size="sm" onClick={handleLogout} className="inline-flex items-center justify-center gap-2">
                <LogOut className="size-4 shrink-0" />
                <span>Logout</span>
              </Button>
            )}
          </div>
        </div>

        {/* Quick Stats Grid — 3 items */}
        <div className="mt-6 grid grid-cols-1 sm:grid-cols-3 gap-4">
          <Link href="/account/orders" className="rounded-xl border bg-card p-4 shadow-sm transition-all hover:border-primary/40 hover:shadow-md flex items-center justify-between">
            <div>
              <span className="text-xs text-muted-foreground font-medium block">Total Orders</span>
              <p className="mt-1 text-2xl font-bold text-foreground">0</p>
            </div>
            <div className="flex size-10 items-center justify-center rounded-lg bg-primary/10 text-primary shrink-0">
              <Package className="size-5 shrink-0" />
            </div>
          </Link>

          <Link href="/wishlist" className="rounded-xl border bg-card p-4 shadow-sm transition-all hover:border-primary/40 hover:shadow-md flex items-center justify-between">
            <div>
              <span className="text-xs text-muted-foreground font-medium block">Wishlist Items</span>
              <p className="mt-1 text-2xl font-bold text-foreground">0</p>
            </div>
            <div className="flex size-10 items-center justify-center rounded-lg bg-rose-500/10 text-rose-500 shrink-0">
              <Heart className="size-5 shrink-0" />
            </div>
          </Link>

          <div className="rounded-xl border bg-card p-4 shadow-sm flex items-center justify-between">
            <div>
              <span className="text-xs text-muted-foreground font-medium block">Saved Addresses</span>
              <p className="mt-1 text-2xl font-bold text-foreground">{hasSavedAddress ? 1 : 0}</p>
            </div>
            <div className="flex size-10 items-center justify-center rounded-lg bg-emerald-500/10 text-emerald-500 shrink-0">
              <MapPin className="size-5 shrink-0" />
            </div>
          </div>
        </div>

        {/* Unified Personal Information & Address Card */}
        <div className="mt-8 rounded-2xl border bg-card p-6 shadow-sm sm:p-8">
          <div className="flex items-center justify-between pb-4 border-b">
            <div className="flex items-center gap-3">
              <div className="flex size-10 items-center justify-center rounded-full bg-primary/10 text-primary shrink-0">
                <User className="size-5 shrink-0" />
              </div>
              <div>
                <h2 className="text-lg font-bold text-foreground">Personal Information & Address</h2>
                <p className="text-xs text-muted-foreground">Your personal contact details and primary delivery address.</p>
              </div>
            </div>

            {/* Toggle Edit Button */}
            {!isEditing ? (
              <Button
                variant="outline"
                size="sm"
                onClick={() => setIsEditing(true)}
                className="inline-flex items-center justify-center gap-2"
              >
                <Pencil className="size-4 shrink-0" />
                <span>Edit Profile</span>
              </Button>
            ) : (
              <Button
                variant="ghost"
                size="sm"
                onClick={handleCancelEdit}
                className="inline-flex items-center justify-center gap-1 text-muted-foreground hover:text-foreground"
              >
                <X className="size-4 shrink-0" />
                <span>Cancel</span>
              </Button>
            )}
          </div>

          {saveSuccess && (
            <div className="mt-4 flex items-center gap-2 rounded-xl border border-emerald-500/30 bg-emerald-500/10 p-3.5 text-xs text-emerald-700 dark:text-emerald-300">
              <CheckCircle2 className="size-4 shrink-0 text-emerald-600" />
              <span>Profile & address saved successfully!</span>
            </div>
          )}

          {saveError && (
            <div className="mt-4 flex items-center gap-2 rounded-xl border border-destructive/30 bg-destructive/10 p-3.5 text-xs text-destructive">
              <AlertCircle className="size-4 shrink-0" />
              <span>{saveError}</span>
            </div>
          )}

          {/* VIEW MODE */}
          {!isEditing ? (
            <div className="mt-6 space-y-6">
              {/* Personal Details Display */}
              <div>
                <h3 className="text-xs font-bold uppercase tracking-wider text-muted-foreground mb-3">
                  Contact Information
                </h3>
                <div className="grid gap-4 sm:grid-cols-3 rounded-xl border bg-muted/30 p-4">
                  <div>
                    <span className="text-[11px] font-medium text-muted-foreground block">Full Name</span>
                    <span className="text-sm font-semibold text-foreground">{formData.name || "—"}</span>
                  </div>

                  <div>
                    <span className="text-[11px] font-medium text-muted-foreground block">Email Address</span>
                    <span className="text-sm font-semibold text-foreground">{formData.email || "—"}</span>
                  </div>

                  <div>
                    <span className="text-[11px] font-medium text-muted-foreground block">Phone Number</span>
                    <span className="text-sm font-semibold text-foreground">{formData.phone || "Not provided"}</span>
                  </div>
                </div>
              </div>

              {/* Address Display */}
              <div className="pt-2 border-t">
                <h3 className="text-xs font-bold uppercase tracking-wider text-muted-foreground mb-3">
                  Primary Delivery Address
                </h3>
                {hasSavedAddress ? (
                  <div className="rounded-xl border bg-primary/5 p-4 relative flex items-start gap-3">
                    <div className="flex size-9 items-center justify-center rounded-lg bg-primary/10 text-primary shrink-0">
                      <MapPin className="size-5 shrink-0" />
                    </div>
                    <div>
                      <p className="font-bold text-sm text-foreground">{formData.name}</p>
                      <p className="mt-1 text-xs text-foreground leading-relaxed">
                        {formData.line1}
                        {formData.line2 ? `, ${formData.line2}` : ""}
                      </p>
                      <p className="text-xs text-foreground font-medium">
                        {formData.city}, {formData.state} - {formData.postalCode}, India
                      </p>
                      {formData.phone && (
                        <p className="mt-2 text-[11px] text-muted-foreground">Phone: {formData.phone}</p>
                      )}
                    </div>
                  </div>
                ) : (
                  <div className="rounded-xl border border-amber-500/30 bg-amber-500/10 p-4 text-xs text-amber-900 dark:text-amber-200 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
                    <div className="flex items-center gap-2">
                      <AlertCircle className="size-4 shrink-0 text-amber-600 dark:text-amber-400" />
                      <span>You haven&apos;t saved a primary delivery address yet.</span>
                    </div>
                    <Button size="sm" variant="outline" onClick={() => setIsEditing(true)} className="shrink-0 gap-1.5">
                      <Pencil className="size-3.5 shrink-0" /> Add Address
                    </Button>
                  </div>
                )}
              </div>
            </div>
          ) : (
            /* EDIT MODE FORM */
            <form onSubmit={handleSave} className="mt-6 space-y-6">
              {/* Section 1: Personal Details */}
              <div>
                <h3 className="text-xs font-bold uppercase tracking-wider text-muted-foreground mb-4">
                  Personal Contact Information
                </h3>
                <div className="grid gap-4 sm:grid-cols-2">
                  <div>
                    <label className="mb-1.5 block text-xs font-semibold text-foreground">Full Name *</label>
                    <Input
                      name="name"
                      required
                      value={formData.name}
                      onChange={handleChange}
                      placeholder="e.g. Rahul Sharma"
                    />
                  </div>

                  <div>
                    <label className="mb-1.5 block text-xs font-semibold text-foreground">Email Address *</label>
                    <Input
                      name="email"
                      type="email"
                      disabled
                      value={formData.email}
                      className="bg-muted text-muted-foreground cursor-not-allowed"
                      placeholder="e.g. rahul@example.com"
                    />
                  </div>

                  <div>
                    <label className="mb-1.5 block text-xs font-semibold text-foreground">Phone Number</label>
                    <Input
                      name="phone"
                      value={formData.phone}
                      onChange={handleChange}
                      placeholder="e.g. +91 98765 43210"
                    />
                  </div>
                </div>
              </div>

              {/* Section 2: Indian Address Details */}
              <div className="pt-4 border-t">
                <h3 className="text-xs font-bold uppercase tracking-wider text-muted-foreground mb-4">
                  Primary Shipping Address (India)
                </h3>
                <div className="grid gap-4 sm:grid-cols-2">
                  <div className="sm:col-span-2">
                    <label className="mb-1.5 block text-xs font-semibold text-foreground">House / Flat No., Building, Street</label>
                    <Input
                      name="line1"
                      value={formData.line1}
                      onChange={handleChange}
                      placeholder="e.g. Flat 402, Sunshine Apartments, MG Road"
                    />
                  </div>

                  <div className="sm:col-span-2">
                    <label className="mb-1.5 block text-xs font-semibold text-foreground">Landmark / Area (Optional)</label>
                    <Input
                      name="line2"
                      value={formData.line2}
                      onChange={handleChange}
                      placeholder="e.g. Near Sony Signal, Koramangala 4th Block"
                    />
                  </div>

                  <div>
                    <label className="mb-1.5 block text-xs font-semibold text-foreground">City</label>
                    <Input
                      name="city"
                      value={formData.city}
                      onChange={handleChange}
                      placeholder="e.g. Bengaluru"
                    />
                  </div>

                  <div>
                    <label className="mb-1.5 block text-xs font-semibold text-foreground">State</label>
                    <Input
                      name="state"
                      value={formData.state}
                      onChange={handleChange}
                      placeholder="e.g. Karnataka"
                    />
                  </div>

                  <div>
                    <label className="mb-1.5 block text-xs font-semibold text-foreground">PIN Code</label>
                    <Input
                      name="postalCode"
                      value={formData.postalCode}
                      onChange={handleChange}
                      placeholder="e.g. 560034"
                    />
                  </div>
                </div>
              </div>

              <div className="pt-4 border-t flex items-center justify-end gap-3">
                <Button type="button" variant="outline" onClick={handleCancelEdit} disabled={saving}>
                  Cancel
                </Button>
                <Button type="submit" disabled={saving} className="inline-flex items-center justify-center gap-2 px-6">
                  <Save className="size-4 shrink-0" />
                  <span>{saving ? "Saving Changes..." : "Save Profile & Address"}</span>
                </Button>
              </div>
            </form>
          )}
        </div>
      </div>
    </div>
  );
}
