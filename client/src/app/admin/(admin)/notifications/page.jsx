"use client";

import { useNotifications } from "@/hooks/admin/useNotifications";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import {
  Select,
  SelectTrigger,
  SelectValue,
  SelectContent,
  SelectItem,
} from "@/components/ui/select";
import {
  Table,
  TableHeader,
  TableBody,
  TableHead,
  TableRow,
  TableCell,
} from "@/components/ui/table";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import { ApiErrorSummary } from "@/components/shared/ApiErrorSummary";
import { ConfirmDialog } from "@/components/shared/ConfirmDialog";
import {
  Radio,
  Plus,
  Pencil,
  Trash2,
  Copy,
  Clock,
  Send,
  Loader2,
  Calendar,
  AlertCircle,
  ExternalLink,
  ChevronLeft,
  ChevronRight,
  StopCircle,
  XCircle,
  Search,
  Check,
  X,
  ImageIcon,
} from "lucide-react";
import { cn } from "@/lib/utils";

export default function NotificationsPage() {
  const {
    // Tabs
    activeTab,
    setActiveTab,

    // Confirm dialog
    confirmState,
    handleConfirm,
    handleCancel,

    // Send Form
    manualTemplates,
    selectedTemplateId,
    handleSelectTemplate,
    currentTemplateVarsList,
    templateVars,
    handleVarChange,
    title,
    setTitle,
    body,
    setBody,
    imageUrl,
    setImageUrl,
    openScreen,
    setOpenScreen,
    customLink,
    setCustomLink,
    productSearch,
    setProductSearch,
    productResults,
    productLoading,
    selectedProduct,
    setSelectedProduct,
    categorySearch,
    setCategorySearch,
    categoryResults,
    categoryLoading,
    selectedCategory,
    setSelectedCategory,
    computedLink,
    channel,
    setChannel,
    tickerDurationHours,
    setTickerDurationHours,
    sendMode,
    setSendMode,
    scheduledAt,
    setScheduledAt,
    minScheduledAt,
    placeholdersRemaining,
    isTitleTooLong,
    isBodyTooLong,
    isImageUrlInvalid,
    canSubmitSend,
    sendLoading,
    sendError,
    submitSend,

    // Templates Tab
    templates,
    templatesLoading,
    templatesError,
    templateDialogOpen,
    setTemplateDialogOpen,
    editingTemplate,
    templateFormData,
    setTemplateFormData,
    templateSubmitting,
    templateFormError,
    openCreateTemplateDialog,
    openEditTemplateDialog,
    closeTemplateDialog,
    submitTemplate,
    removeTemplate,

    // History Tab
    notifications,
    notificationsLoading,
    notificationsError,
    historyStatusFilter,
    setHistoryStatusFilter,
    historyPage,
    setHistoryPage,
    historyPagination,
    cancelScheduledNotification,
    endTickerNotification,
    reuseNotification,
  } = useNotifications();

  return (
    <div className="grid gap-6">
      {/* Header */}
      <div className="flex flex-col gap-1">
        <h1 className="text-2xl font-bold tracking-tight">Notification Center</h1>
        <p className="text-sm text-muted-foreground">
          Broadcast push notifications to the mobile app, manage website ticker bar messages, create reusable templates, and schedule broadcasts.
        </p>
      </div>

      {/* Tabs */}
      <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
        <TabsList className="grid w-full max-w-md grid-cols-3">
          <TabsTrigger value="send" className="flex items-center gap-2">
            <Send className="size-4" />
            Send
          </TabsTrigger>
          <TabsTrigger value="templates" className="flex items-center gap-2">
            <Radio className="size-4" />
            Templates
          </TabsTrigger>
          <TabsTrigger value="history" className="flex items-center gap-2">
            <Clock className="size-4" />
            History
          </TabsTrigger>
        </TabsList>

        {/* ======================================================== */}
        {/* TAB 1: SEND NOTIFICATION */}
        {/* ======================================================== */}
        <TabsContent value="send" className="mt-6">
          <div className="grid grid-cols-1 gap-6 lg:grid-cols-12">
            {/* Form Column (Left) */}
            <div className="lg:col-span-7">
              <Card>
                <CardHeader>
                  <CardTitle className="text-lg">Compose Notification</CardTitle>
                  <CardDescription>
                    Select an existing template or create a custom broadcast. Placeholders must be filled before sending.
                  </CardDescription>
                </CardHeader>
                <CardContent className="grid gap-5">
                  {sendError && <ApiErrorSummary message={sendError} />}

                  {/* Template selector */}
                  <div className="grid gap-2">
                    <Label htmlFor="template-select">Template</Label>
                    <Select
                      value={selectedTemplateId}
                      onValueChange={handleSelectTemplate}
                    >
                      <SelectTrigger id="template-select" className="w-full">
                        <SelectValue placeholder="Choose a template..." />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="custom">Custom (blank)</SelectItem>
                        {manualTemplates.map((t) => (
                          <SelectItem key={t._id} value={t._id}>
                            {t.name}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>

                  {/* Variables Inputs (if template has placeholders) */}
                  {currentTemplateVarsList.length > 0 && (
                    <div className="rounded-lg border bg-muted/40 p-4">
                      <p className="mb-3 text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                        Template Variables
                      </p>
                      <div className="grid gap-3 sm:grid-cols-2">
                        {currentTemplateVarsList.map((v) => (
                          <div key={v} className="grid gap-1.5">
                            <Label htmlFor={`var-${v}`} className="text-xs font-medium capitalize">
                              {v}
                            </Label>
                            <Input
                              id={`var-${v}`}
                              placeholder={`Enter ${v}`}
                              value={templateVars[v] || ""}
                              onChange={(e) => handleVarChange(v, e.target.value)}
                              className="h-8 bg-background text-sm"
                            />
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Title Input */}
                  <div className="grid gap-1.5">
                    <div className="flex items-center justify-between">
                      <Label htmlFor="notification-title" className="flex items-center gap-1">
                        Title <span className="text-destructive">*</span>
                      </Label>
                      <span
                        className={cn(
                          "text-xs",
                          title.length > 65
                            ? "font-semibold text-destructive"
                            : "text-muted-foreground"
                        )}
                      >
                        {title.length}/65
                      </span>
                    </div>
                    <Input
                      id="notification-title"
                      placeholder="e.g. Flash Sale: 20% off"
                      value={title}
                      onChange={(e) => setTitle(e.target.value)}
                      maxLength={75}
                    />
                    {isTitleTooLong && (
                      <p className="text-xs text-destructive">
                        Title must be 65 characters or less.
                      </p>
                    )}
                  </div>

                  {/* Body Input */}
                  <div className="grid gap-1.5">
                    <div className="flex items-center justify-between">
                      <Label htmlFor="notification-body">Body (optional)</Label>
                      <span
                        className={cn(
                          "text-xs",
                          body.length > 240
                            ? "font-semibold text-destructive"
                            : "text-muted-foreground"
                        )}
                      >
                        {body.length}/240
                      </span>
                    </div>
                    <Textarea
                      id="notification-body"
                      placeholder="e.g. Only for the next 24 hours. Don't miss out!"
                      value={body}
                      onChange={(e) => setBody(e.target.value)}
                      maxLength={260}
                      rows={3}
                    />
                    <div className="flex items-center justify-between text-xs text-muted-foreground">
                      <span>Title only is fine</span>
                      {isBodyTooLong && (
                        <span className="text-destructive">Max 240 characters</span>
                      )}
                    </div>
                  </div>

                  {/* Image URL Input */}
                  <div className="grid gap-1.5">
                    <Label htmlFor="notification-image">Image URL (optional)</Label>
                    <Input
                      id="notification-image"
                      placeholder="https://example.com/banner.jpg"
                      value={imageUrl}
                      onChange={(e) => setImageUrl(e.target.value)}
                    />
                    <div className="flex items-center justify-between text-xs text-muted-foreground">
                      <span>https only, 2:1 ratio, under 1 MB</span>
                      {isImageUrlInvalid && (
                        <span className="text-destructive font-medium">
                          Must start with https://
                        </span>
                      )}
                    </div>
                  </div>

                  {/* Open Screen Select & Pickers */}
                  <div className="grid gap-2">
                    <Label htmlFor="open-screen-select">Open screen</Label>
                    <Select
                      value={openScreen}
                      onValueChange={(val) => {
                        setOpenScreen(val);
                      }}
                    >
                      <SelectTrigger id="open-screen-select" className="w-full">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="home">Home</SelectItem>
                        <SelectItem value="product">Product</SelectItem>
                        <SelectItem value="category">Category</SelectItem>
                        <SelectItem value="orders">My Orders</SelectItem>
                        <SelectItem value="custom">Custom link</SelectItem>
                      </SelectContent>
                    </Select>

                    {/* Product Picker */}
                    {openScreen === "product" && (
                      <div className="mt-2 rounded-lg border bg-muted/20 p-3">
                        <Label className="mb-1.5 block text-xs font-medium">Select Product</Label>
                        {selectedProduct ? (
                          <div className="flex items-center justify-between rounded-md border bg-background p-2.5">
                            <div className="truncate">
                              <p className="text-sm font-semibold truncate">{selectedProduct.name}</p>
                              <p className="text-xs text-muted-foreground font-mono">
                                /product/{selectedProduct.slug}
                              </p>
                            </div>
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => setSelectedProduct(null)}
                              className="h-7 text-xs text-muted-foreground hover:text-foreground"
                            >
                              <X className="mr-1 size-3" />
                              Change
                            </Button>
                          </div>
                        ) : (
                          <div className="grid gap-2">
                            <div className="relative">
                              <Search className="absolute left-2.5 top-2.5 size-4 text-muted-foreground" />
                              <Input
                                placeholder="Search product by name..."
                                value={productSearch}
                                onChange={(e) => setProductSearch(e.target.value)}
                                className="pl-9 bg-background"
                              />
                            </div>
                            <div className="max-h-44 overflow-y-auto rounded-md border bg-background p-1 shadow-xs">
                              {productLoading ? (
                                <div className="flex items-center justify-center p-3 text-xs text-muted-foreground">
                                  <Loader2 className="mr-2 size-3 animate-spin" />
                                  Searching products...
                                </div>
                              ) : productResults.length === 0 ? (
                                <p className="p-3 text-center text-xs text-muted-foreground">
                                  No products found.
                                </p>
                              ) : (
                                productResults.map((p) => (
                                  <div
                                    key={p._id}
                                    onClick={() => setSelectedProduct({ _id: p._id, name: p.name, slug: p.slug })}
                                    className="flex cursor-pointer items-center justify-between rounded-sm p-2 text-sm hover:bg-accent"
                                  >
                                    <span className="truncate font-medium">{p.name}</span>
                                    <span className="ml-2 shrink-0 font-mono text-xs text-muted-foreground">
                                      /product/{p.slug}
                                    </span>
                                  </div>
                                ))
                              )}
                            </div>
                          </div>
                        )}
                      </div>
                    )}

                    {/* Category Picker */}
                    {openScreen === "category" && (
                      <div className="mt-2 rounded-lg border bg-muted/20 p-3">
                        <Label className="mb-1.5 block text-xs font-medium">Select Category</Label>
                        {selectedCategory ? (
                          <div className="flex items-center justify-between rounded-md border bg-background p-2.5">
                            <div className="truncate">
                              <p className="text-sm font-semibold truncate">{selectedCategory.name}</p>
                              <p className="text-xs text-muted-foreground font-mono">
                                /category/{selectedCategory.slug}
                              </p>
                            </div>
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => setSelectedCategory(null)}
                              className="h-7 text-xs text-muted-foreground hover:text-foreground"
                            >
                              <X className="mr-1 size-3" />
                              Change
                            </Button>
                          </div>
                        ) : (
                          <div className="grid gap-2">
                            <div className="relative">
                              <Search className="absolute left-2.5 top-2.5 size-4 text-muted-foreground" />
                              <Input
                                placeholder="Search category by name..."
                                value={categorySearch}
                                onChange={(e) => setCategorySearch(e.target.value)}
                                className="pl-9 bg-background"
                              />
                            </div>
                            <div className="max-h-44 overflow-y-auto rounded-md border bg-background p-1 shadow-xs">
                              {categoryLoading ? (
                                <div className="flex items-center justify-center p-3 text-xs text-muted-foreground">
                                  <Loader2 className="mr-2 size-3 animate-spin" />
                                  Loading categories...
                                </div>
                              ) : categoryResults.length === 0 ? (
                                <p className="p-3 text-center text-xs text-muted-foreground">
                                  No categories found.
                                </p>
                              ) : (
                                categoryResults.map((c) => (
                                  <div
                                    key={c._id}
                                    onClick={() => setSelectedCategory({ _id: c._id, name: c.name, slug: c.slug || c._id })}
                                    className="flex cursor-pointer items-center justify-between rounded-sm p-2 text-sm hover:bg-accent"
                                  >
                                    <span className="truncate font-medium">{c.name}</span>
                                    <span className="ml-2 shrink-0 font-mono text-xs text-muted-foreground">
                                      /category/{c.slug || c._id}
                                    </span>
                                  </div>
                                ))
                              )}
                            </div>
                          </div>
                        )}
                      </div>
                    )}

                    {/* Custom Link Input */}
                    {openScreen === "custom" && (
                      <div className="mt-2 grid gap-1.5 rounded-lg border bg-muted/20 p-3">
                        <Label htmlFor="custom-link-input" className="text-xs">
                          Custom Path or Deep Link
                        </Label>
                        <Input
                          id="custom-link-input"
                          placeholder="e.g. /sale or /collections/summer"
                          value={customLink}
                          onChange={(e) => setCustomLink(e.target.value)}
                          className="bg-background"
                        />
                      </div>
                    )}

                    {/* Destination preview footer */}
                    <p className="mt-1 flex items-center gap-1 text-xs text-muted-foreground">
                      <ExternalLink className="size-3" />
                      <span>
                        Destination link: <code className="font-semibold text-foreground">{computedLink || "(none)"}</code>
                      </span>
                    </p>
                  </div>

                  {/* Channel Select */}
                  <div className="grid gap-2">
                    <Label htmlFor="channel-select">Channel</Label>
                    <Select value={channel} onValueChange={setChannel}>
                      <SelectTrigger id="channel-select" className="w-full">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="both">Both (Web Ticker + App Push)</SelectItem>
                        <SelectItem value="app">App Push only</SelectItem>
                        <SelectItem value="web">Website Ticker only</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>

                  {/* Ticker Duration (if channel is web or both) */}
                  {(channel === "web" || channel === "both") && (
                    <div className="grid gap-2">
                      <Label htmlFor="duration-select">Show on website bar for</Label>
                      <Select
                        value={String(tickerDurationHours)}
                        onValueChange={(val) => setTickerDurationHours(Number(val))}
                      >
                        <SelectTrigger id="duration-select" className="w-full">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="6">6 hours</SelectItem>
                          <SelectItem value="24">24 hours (1 day)</SelectItem>
                          <SelectItem value="72">3 days</SelectItem>
                          <SelectItem value="168">7 days</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                  )}

                  {/* Send Now / Schedule Radio */}
                  <div className="grid gap-3 pt-2">
                    <Label>Delivery Timing</Label>
                    <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
                      <label className="flex cursor-pointer items-center gap-2 rounded-lg border p-3 hover:bg-muted/50 has-checked:border-primary has-checked:bg-primary/5">
                        <input
                          type="radio"
                          name="sendMode"
                          value="now"
                          checked={sendMode === "now"}
                          onChange={() => setSendMode("now")}
                          className="size-4 accent-primary"
                        />
                        <span className="text-sm font-medium">Send immediately</span>
                      </label>

                      <label className="flex cursor-pointer items-center gap-2 rounded-lg border p-3 hover:bg-muted/50 has-checked:border-primary has-checked:bg-primary/5">
                        <input
                          type="radio"
                          name="sendMode"
                          value="schedule"
                          checked={sendMode === "schedule"}
                          onChange={() => setSendMode("schedule")}
                          className="size-4 accent-primary"
                        />
                        <span className="text-sm font-medium">Schedule for later</span>
                      </label>
                    </div>

                    {sendMode === "schedule" && (
                      <div className="mt-2 grid gap-1.5 rounded-lg border bg-muted/30 p-3">
                        <Label htmlFor="scheduledAt-input" className="text-xs">
                          Scheduled Time (Local)
                        </Label>
                        <input
                          type="datetime-local"
                          id="scheduledAt-input"
                          min={minScheduledAt}
                          value={scheduledAt}
                          onChange={(e) => setScheduledAt(e.target.value)}
                          className="flex h-9 w-full rounded-md border border-input bg-background px-3 py-1 text-sm shadow-sm transition-colors focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
                        />
                        <p className="text-xs text-muted-foreground">
                          Must be at least 1 minute in the future.
                        </p>
                      </div>
                    )}
                  </div>

                  {/* Warning if placeholders remain */}
                  {placeholdersRemaining && (
                    <div className="flex items-center gap-2 rounded-md border border-amber-500/30 bg-amber-500/10 p-3 text-xs text-amber-600 dark:text-amber-400">
                      <AlertCircle className="size-4 shrink-0" />
                      <span>
                        Please fill in all <code>{"{{variables}}"}</code> before sending or scheduling.
                      </span>
                    </div>
                  )}

                  {/* Submit Button */}
                  <Button
                    onClick={submitSend}
                    disabled={!canSubmitSend || sendLoading}
                    className="mt-2 w-full gap-2"
                  >
                    {sendLoading ? (
                      <>
                        <Loader2 className="size-4 animate-spin" />
                        Processing...
                      </>
                    ) : sendMode === "now" ? (
                      <>
                        <Send className="size-4" />
                        Send now
                      </>
                    ) : (
                      <>
                        <Calendar className="size-4" />
                        Schedule
                      </>
                    )}
                  </Button>
                </CardContent>
              </Card>
            </div>

            {/* Live Preview Column (Right) */}
            <div className="flex flex-col gap-6 lg:col-span-5">
              {/* Push Preview Card */}
              <Card>
                <CardHeader className="pb-3">
                  <div className="flex items-center justify-between">
                    <CardTitle className="text-sm font-medium">App Push Notification</CardTitle>
                    <Badge variant="outline" className="text-[10px]">
                      Live Preview
                    </Badge>
                  </div>
                  <CardDescription className="text-xs">
                    How it looks on iOS and Android lock screens
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="mx-auto max-w-sm rounded-2xl border bg-card/90 p-4 shadow-sm">
                    {/* Optional Image Banner (above title) */}
                    {imageUrl && /^https:\/\//i.test(imageUrl) && (
                      <div className="mb-3 overflow-hidden rounded-xl border bg-muted/30">
                        <img
                          src={imageUrl}
                          alt="Push Banner"
                          className="h-36 w-full object-cover"
                          onError={(e) => {
                            e.currentTarget.style.display = "none";
                          }}
                        />
                      </div>
                    )}

                    <div className="flex items-start gap-3">
                      {/* App Icon */}
                      <div className="flex size-9 shrink-0 items-center justify-center rounded-xl bg-black text-white shadow-xs">
                        <span className="text-sm font-black">F</span>
                      </div>
                      <div className="flex-1 overflow-hidden">
                        <div className="flex items-center justify-between">
                          <span className="text-xs font-semibold text-foreground">Fibio</span>
                          <span className="text-[10px] text-muted-foreground">now</span>
                        </div>
                        <p className="mt-0.5 truncate text-sm font-bold text-foreground">
                          {title || "Notification Title"}
                        </p>
                        <p className="mt-0.5 line-clamp-3 text-xs text-muted-foreground">
                          {body || "Notification body text will appear here."}
                        </p>
                        {computedLink && (
                          <div className="mt-2 flex items-center gap-1 text-[11px] text-primary">
                            <ExternalLink className="size-3" />
                            <span className="truncate">{computedLink}</span>
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>

              {/* Web Ticker Preview Card */}
              <Card>
                <CardHeader className="pb-3">
                  <div className="flex items-center justify-between">
                    <CardTitle className="text-sm font-medium">Website Ticker Bar</CardTitle>
                    <Badge variant="outline" className="text-[10px]">
                      Live Preview
                    </Badge>
                  </div>
                  <CardDescription className="text-xs">
                    Black announcement bar pinned to the top of the storefront
                  </CardDescription>
                </CardHeader>
                <CardContent className="grid gap-3">
                  <div className="relative flex min-h-9 items-center justify-between overflow-hidden rounded bg-black px-4 py-2 text-xs text-white">
                    <div className="truncate">
                      <span className="font-medium">
                        {title || "Store announcement"}
                      </span>
                      {body && (
                        <span className="text-white/80"> — {body}</span>
                      )}
                    </div>
                    <span className="ml-3 shrink-0 text-white/50">✕</span>
                  </div>
                  <div className="flex items-center justify-between text-[11px] text-muted-foreground">
                    <span>
                      Duration: <strong>{tickerDurationHours}h</strong> after dispatch
                    </span>
                    {computedLink && (
                      <span className="truncate max-w-[150px]">Links to: {computedLink}</span>
                    )}
                  </div>
                </CardContent>
              </Card>
            </div>
          </div>
        </TabsContent>

        {/* ======================================================== */}
        {/* TAB 2: TEMPLATES */}
        {/* ======================================================== */}
        <TabsContent value="templates" className="mt-6">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between">
              <div>
                <CardTitle className="text-lg">Notification Templates</CardTitle>
                <CardDescription>
                  Pre-configured messages with placeholders like <code>{"{{discount}}"}</code> or <code>{"{{event}}"}</code>.
                </CardDescription>
              </div>
              <Button onClick={openCreateTemplateDialog} className="gap-2">
                <Plus className="size-4" />
                New template
              </Button>
            </CardHeader>
            <CardContent>
              {templatesError && <ApiErrorSummary message={templatesError} />}

              {templatesLoading ? (
                <div className="flex items-center justify-center py-10 text-sm text-muted-foreground">
                  <Loader2 className="mr-2 size-4 animate-spin" />
                  Loading templates...
                </div>
              ) : (
                <div className="rounded-lg border">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Name</TableHead>
                        <TableHead>Type</TableHead>
                        <TableHead>Channel</TableHead>
                        <TableHead>Trigger</TableHead>
                        <TableHead>Title Template</TableHead>
                        <TableHead className="text-right">Actions</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {templates.length === 0 ? (
                        <TableRow>
                          <TableCell colSpan={6} className="py-8 text-center text-muted-foreground">
                            No templates configured yet.
                          </TableCell>
                        </TableRow>
                      ) : (
                        templates.map((tpl) => (
                          <TableRow key={tpl._id}>
                            <TableCell className="font-medium">
                              {tpl.name}
                              {tpl.isSystem && (
                                <span className="ml-2 text-[10px] text-muted-foreground font-normal">
                                  (System)
                                </span>
                              )}
                            </TableCell>
                            <TableCell>
                              <Badge variant="outline" className="capitalize text-[11px]">
                                {tpl.type}
                              </Badge>
                            </TableCell>
                            <TableCell>
                              <Badge
                                variant={tpl.channel === "both" ? "outline" : "secondary"}
                                className="text-[11px] capitalize"
                              >
                                {tpl.channel === "both" ? "Web + App" : tpl.channel}
                              </Badge>
                            </TableCell>
                            <TableCell>
                              {tpl.auto ? (
                                <Badge className="bg-purple-500/15 text-purple-600 dark:text-purple-400 border-purple-500/30 text-[11px]">
                                  Automated
                                </Badge>
                              ) : (
                                <Badge variant="outline" className="text-[11px]">
                                  Manual
                                </Badge>
                              )}
                            </TableCell>
                            <TableCell className="max-w-xs truncate text-xs">
                              {tpl.titleTpl}
                            </TableCell>
                            <TableCell className="text-right">
                              <div className="flex items-center justify-end gap-1">
                                <Button
                                  variant="ghost"
                                  size="icon"
                                  onClick={() => openEditTemplateDialog(tpl)}
                                  title="Edit Template"
                                >
                                  <Pencil className="size-4" />
                                </Button>
                                {!tpl.isSystem && (
                                  <Button
                                    variant="ghost"
                                    size="icon"
                                    onClick={() => removeTemplate(tpl)}
                                    title="Delete Template"
                                    className="text-destructive hover:text-destructive"
                                  >
                                    <Trash2 className="size-4" />
                                  </Button>
                                )}
                              </div>
                            </TableCell>
                          </TableRow>
                        ))
                      )}
                    </TableBody>
                  </Table>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* ======================================================== */}
        {/* TAB 3: HISTORY */}
        {/* ======================================================== */}
        <TabsContent value="history" className="mt-6">
          <Card>
            <CardHeader className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
              <div>
                <CardTitle className="text-lg">Notification History</CardTitle>
                <CardDescription>
                  Review sent, scheduled, and cancelled notifications.
                </CardDescription>
              </div>

              {/* Status Filter */}
              <div className="flex items-center gap-2">
                <Label htmlFor="status-filter" className="text-xs text-muted-foreground whitespace-nowrap">
                  Status:
                </Label>
                <Select
                  value={historyStatusFilter}
                  onValueChange={(val) => {
                    setHistoryStatusFilter(val);
                    setHistoryPage(1);
                  }}
                >
                  <SelectTrigger id="status-filter" className="w-[140px] h-8 text-xs">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All statuses</SelectItem>
                    <SelectItem value="scheduled">Scheduled</SelectItem>
                    <SelectItem value="sent">Sent</SelectItem>
                    <SelectItem value="cancelled">Cancelled</SelectItem>
                    <SelectItem value="failed">Failed</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </CardHeader>
            <CardContent>
              {notificationsError && <ApiErrorSummary message={notificationsError} />}

              {notificationsLoading ? (
                <div className="flex items-center justify-center py-10 text-sm text-muted-foreground">
                  <Loader2 className="mr-2 size-4 animate-spin" />
                  Loading notifications...
                </div>
              ) : (
                <div className="rounded-lg border">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Title</TableHead>
                        <TableHead>Channel</TableHead>
                        <TableHead>Status</TableHead>
                        <TableHead>Date & Time</TableHead>
                        <TableHead>Web Ticker</TableHead>
                        <TableHead className="text-right">Actions</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {notifications.length === 0 ? (
                        <TableRow>
                          <TableCell colSpan={6} className="py-8 text-center text-muted-foreground">
                            No notifications found.
                          </TableCell>
                        </TableRow>
                      ) : (
                        notifications.map((n) => (
                          <TableRow key={n._id}>
                            <TableCell className="max-w-[260px]">
                              <div className="flex items-start gap-2">
                                {n.imageUrl && (
                                  <img
                                    src={n.imageUrl}
                                    alt=""
                                    className="size-8 rounded object-cover shrink-0 border"
                                    onError={(e) => {
                                      e.currentTarget.style.display = "none";
                                    }}
                                  />
                                )}
                                <div className="truncate">
                                  <p className="truncate font-medium text-foreground">{n.title}</p>
                                  {n.body && (
                                    <p className="truncate text-xs text-muted-foreground">{n.body}</p>
                                  )}
                                  {n.link && (
                                    <p className="truncate text-[10px] text-muted-foreground/80 font-mono">
                                      {n.link}
                                    </p>
                                  )}
                                </div>
                              </div>
                            </TableCell>
                            <TableCell>
                              <Badge
                                variant={n.channel === "both" ? "outline" : "secondary"}
                                className="text-[11px] capitalize"
                              >
                                {n.channel === "both" ? "Web + App" : n.channel}
                              </Badge>
                            </TableCell>
                            <TableCell>
                              {n.status === "sent" && (
                                <Badge className="bg-emerald-500/15 text-emerald-600 dark:text-emerald-400 border-emerald-500/30 text-[11px]">
                                  Sent
                                </Badge>
                              )}
                              {n.status === "scheduled" && (
                                <Badge className="bg-amber-500/15 text-amber-600 dark:text-amber-400 border-amber-500/30 text-[11px]">
                                  Scheduled
                                </Badge>
                              )}
                              {n.status === "sending" && (
                                <Badge className="bg-blue-500/15 text-blue-600 dark:text-blue-400 border-blue-500/30 text-[11px]">
                                  Sending...
                                </Badge>
                              )}
                              {n.status === "cancelled" && (
                                <Badge variant="outline" className="text-muted-foreground text-[11px]">
                                  Cancelled
                                </Badge>
                              )}
                              {n.status === "failed" && (
                                <Badge variant="destructive" className="text-[11px]">
                                  Failed
                                </Badge>
                              )}
                            </TableCell>
                            <TableCell className="text-xs text-muted-foreground whitespace-nowrap">
                              {n.status === "scheduled"
                                ? `Due: ${new Date(n.scheduledAt).toLocaleString()}`
                                : n.sentAt
                                ? new Date(n.sentAt).toLocaleString()
                                : new Date(n.createdAt).toLocaleString()}
                            </TableCell>
                            <TableCell>
                              {n.isTickerLive ? (
                                <Badge className="bg-emerald-600 text-white text-[11px]">
                                  ● Live
                                </Badge>
                              ) : (
                                <span className="text-xs text-muted-foreground">—</span>
                              )}
                            </TableCell>
                            <TableCell className="text-right">
                              <div className="flex items-center justify-end gap-1">
                                {n.status === "scheduled" && (
                                  <Button
                                    variant="outline"
                                    size="sm"
                                    onClick={() => cancelScheduledNotification(n)}
                                    className="h-7 text-xs text-destructive hover:bg-destructive/10"
                                  >
                                    <XCircle className="mr-1 size-3" />
                                    Cancel
                                  </Button>
                                )}
                                {n.isTickerLive && (
                                  <Button
                                    variant="outline"
                                    size="sm"
                                    onClick={() => endTickerNotification(n)}
                                    className="h-7 text-xs text-amber-600 hover:bg-amber-500/10 dark:text-amber-400"
                                  >
                                    <StopCircle className="mr-1 size-3" />
                                    End ticker
                                  </Button>
                                )}
                                <Button
                                  variant="ghost"
                                  size="sm"
                                  onClick={() => reuseNotification(n)}
                                  className="h-7 text-xs gap-1"
                                  title="Copy to Send form"
                                >
                                  <Copy className="size-3" />
                                  Reuse
                                </Button>
                              </div>
                            </TableCell>
                          </TableRow>
                        ))
                      )}
                    </TableBody>
                  </Table>
                </div>
              )}

              {/* Pagination */}
              {historyPagination.pages > 1 && (
                <div className="mt-4 flex items-center justify-between text-xs text-muted-foreground">
                  <span>
                    Showing page {historyPagination.page} of {historyPagination.pages} ({historyPagination.total} total)
                  </span>
                  <div className="flex items-center gap-1">
                    <Button
                      variant="outline"
                      size="sm"
                      disabled={historyPage <= 1}
                      onClick={() => setHistoryPage((p) => Math.max(1, p - 1))}
                      className="h-8 gap-1 text-xs"
                    >
                      <ChevronLeft className="size-3" />
                      Prev
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      disabled={historyPage >= historyPagination.pages}
                      onClick={() => setHistoryPage((p) => p + 1)}
                      className="h-8 gap-1 text-xs"
                    >
                      Next
                      <ChevronRight className="size-3" />
                    </Button>
                  </div>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      {/* ======================================================== */}
      {/* TEMPLATE CREATE / EDIT DIALOG */}
      {/* ======================================================== */}
      <Dialog
        open={templateDialogOpen}
        onOpenChange={(open) => {
          if (!open) closeTemplateDialog();
          else setTemplateDialogOpen(true);
        }}
      >
        <DialogContent className="sm:max-w-lg">
          <DialogHeader>
            <DialogTitle>
              {editingTemplate ? "Edit Template" : "New Template"}
            </DialogTitle>
            <DialogDescription>
              Create or edit a notification template. Use <code>{"{{variable}}"}</code> for parts you want to fill in later (e.g. <code>{"{{discount}}"}</code> or <code>{"{{event}}"}</code>).
            </DialogDescription>
          </DialogHeader>

          {templateFormError && <ApiErrorSummary message={templateFormError} />}

          <div className="grid gap-4 py-2">
            <div className="grid gap-1.5">
              <Label htmlFor="tpl-name">Template Name *</Label>
              <Input
                id="tpl-name"
                placeholder="e.g. Weekend Flash Sale"
                value={templateFormData.name}
                onChange={(e) =>
                  setTemplateFormData({ ...templateFormData, name: e.target.value })
                }
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="grid gap-1.5">
                <Label htmlFor="tpl-type">Type</Label>
                <Select
                  value={templateFormData.type}
                  onValueChange={(val) =>
                    setTemplateFormData({ ...templateFormData, type: val })
                  }
                >
                  <SelectTrigger id="tpl-type" className="w-full">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="sale">Sale</SelectItem>
                    <SelectItem value="flash_sale">Flash Sale</SelectItem>
                    <SelectItem value="tagline">Tagline</SelectItem>
                    <SelectItem value="free_shipping">Free Shipping</SelectItem>
                    <SelectItem value="new_arrival">New Arrival</SelectItem>
                    <SelectItem value="festive">Festive</SelectItem>
                    <SelectItem value="coupon">Coupon</SelectItem>
                    <SelectItem value="win_back">Win Back</SelectItem>
                    <SelectItem value="custom">Custom</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="grid gap-1.5">
                <Label htmlFor="tpl-channel">Channel</Label>
                <Select
                  value={templateFormData.channel}
                  onValueChange={(val) =>
                    setTemplateFormData({ ...templateFormData, channel: val })
                  }
                >
                  <SelectTrigger id="tpl-channel" className="w-full">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="both">Both (Web + App)</SelectItem>
                    <SelectItem value="app">App Push only</SelectItem>
                    <SelectItem value="web">Website Ticker only</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="grid gap-1.5">
              <Label htmlFor="tpl-title">Title Template *</Label>
              <Input
                id="tpl-title"
                placeholder="e.g. 🔥 {{event}} is live! Up to {{discount}}% off"
                value={templateFormData.titleTpl}
                onChange={(e) =>
                  setTemplateFormData({ ...templateFormData, titleTpl: e.target.value })
                }
              />
            </div>

            <div className="grid gap-1.5">
              <Label htmlFor="tpl-body">Body Template (optional)</Label>
              <Textarea
                id="tpl-body"
                placeholder="e.g. Check out {{category}} specials before {{endDate}}."
                value={templateFormData.bodyTpl}
                onChange={(e) =>
                  setTemplateFormData({ ...templateFormData, bodyTpl: e.target.value })
                }
                rows={3}
              />
              <p className="text-xs text-muted-foreground">
                Tip: Leave empty for title-only ticker announcements.
              </p>
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={closeTemplateDialog} disabled={templateSubmitting}>
              Cancel
            </Button>
            <Button onClick={submitTemplate} disabled={templateSubmitting} className="gap-2">
              {templateSubmitting && <Loader2 className="size-4 animate-spin" />}
              {editingTemplate ? "Save changes" : "Create template"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Reusable Confirm Dialog */}
      <ConfirmDialog {...confirmState} onConfirm={handleConfirm} onCancel={handleCancel} />
    </div>
  );
}
