"use client";

import { useEffect, useState } from "react";
import { useSelector } from "react-redux";
import { Loader2, ShieldAlert } from "lucide-react";
import { toast } from "sonner";

import { getAdminBanners, updateAdminBanner } from "@/services/admin/banners";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { ApiErrorSummary } from "@/components/shared/ApiErrorSummary";
import { HeroBannersTab } from "@/components/admin/banners/HeroBannersTab";
import { BottomBannerTab } from "@/components/admin/banners/BottomBannerTab";

const BANNER_CONFIGS = [
  { key: "hero", name: "Top Hero Carousel Banners" },
  { key: "bottom", name: "Bottom Banner" },
];

export default function AdminBannersPage() {
  const user = useSelector((state) => state.auth.user);
  const canWrite = ["super_admin", "admin"].includes(user?.role);

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [savedBanners, setSavedBanners] = useState({});
  const [banners, setBanners] = useState({});
  const [savingKey, setSavingKey] = useState(null);

  const fetchBanners = async () => {
    try {
      setLoading(true);
      setError(null);
      const { data } = await getAdminBanners();
      const loaded = data.data || {};
      setSavedBanners(loaded);
      setBanners(JSON.parse(JSON.stringify(loaded)));
    } catch (err) {
      setError(err.response?.data?.message || "Failed to load storefront banners");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchBanners();
  }, []);

  const handleUndo = (key) => {
    if (savedBanners[key]) {
      setBanners((prev) => ({
        ...prev,
        [key]: JSON.parse(JSON.stringify(savedBanners[key])),
      }));
      toast.info(`Undid unsaved changes for ${BAN_NAME(key)}`);
    }
  };

  const handleSave = async (key) => {
    if (!canWrite) {
      toast.error("Permission denied. Only Admins and Super Admins can update banners.");
      return;
    }

    try {
      setSavingKey(key);
      const bannerData = banners[key];
      const { data } = await updateAdminBanner(key, bannerData);

      const updatedBanner = data.data || bannerData;
      setSavedBanners((prev) => ({
        ...prev,
        [key]: updatedBanner,
      }));
      setBanners((prev) => ({
        ...prev,
        [key]: JSON.parse(JSON.stringify(updatedBanner)),
      }));

      toast.success(`${BAN_NAME(key)} updated successfully!`);
    } catch (err) {
      toast.error(err.response?.data?.message || `Failed to update ${BAN_NAME(key)}`);
    } finally {
      setSavingKey(null);
    }
  };

  const BAN_NAME = (key) => BANNER_CONFIGS.find((b) => b.key === key)?.name || key;

  const isDirty = (key) => {
    if (!banners[key] || !savedBanners[key]) return false;
    return JSON.stringify(banners[key]) !== JSON.stringify(savedBanners[key]);
  };

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center gap-3 py-32 text-muted-foreground">
        <Loader2 className="size-8 animate-spin text-primary" />
        <p className="text-sm font-medium">Loading banner configuration...</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Storefront Banners</h1>
          <p className="text-sm text-muted-foreground">
            Manage your Top Hero Carousel (up to 5 banners) and Bottom Promotional Banner.
          </p>
        </div>

        {!canWrite && (
          <div className="flex items-center gap-2 rounded-lg border border-amber-500/30 bg-amber-500/10 px-3 py-1.5 text-xs text-amber-600 dark:text-amber-400">
            <ShieldAlert className="size-4 shrink-0" />
            <span>Read-only Mode (Admin required for editing)</span>
          </div>
        )}
      </div>

      <ApiErrorSummary message={error} />

      <Tabs defaultValue="hero" className="w-full space-y-4">
        <div className="flex justify-center w-full">
          <TabsList className="inline-flex h-10 items-center justify-center rounded-md bg-muted/80 p-1 text-muted-foreground border border-border">
            {BANNER_CONFIGS.map((cfg) => (
              <TabsTrigger
                key={cfg.key}
                value={cfg.key}
                className="px-4 py-1.5 text-xs sm:text-sm font-semibold rounded-sm transition-all data-[state=active]:bg-background data-[state=active]:text-foreground data-[state=active]:shadow-sm"
              >
                <span>{cfg.name}</span>
                {isDirty(cfg.key) && (
                  <span className="ml-2 size-2 rounded-full bg-amber-500 inline-block shrink-0" />
                )}
              </TabsTrigger>
            ))}
          </TabsList>
        </div>


        <TabsContent value="hero">
          <HeroBannersTab
            banners={banners}
            savedBanners={savedBanners}
            canWrite={canWrite}
            savingKey={savingKey}
            setBanners={setBanners}
            onSave={handleSave}
            onUndo={handleUndo}
          />
        </TabsContent>

        <TabsContent value="bottom">
          <BottomBannerTab
            banners={banners}
            savedBanners={savedBanners}
            canWrite={canWrite}
            savingKey={savingKey}
            setBanners={setBanners}
            onSave={handleSave}
            onUndo={handleUndo}
          />
        </TabsContent>
      </Tabs>
    </div>
  );
}
