"use client";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectTrigger,
  SelectValue,
  SelectContent,
  SelectItem,
} from "@/components/ui/select";
import { Pencil, ChevronUp, ChevronDown, Search, X, Loader2 } from "lucide-react";
import { cn } from "@/lib/utils";
import { varLabel, varPlaceholder, SCREEN_LABELS } from "@/lib/notificationTpl";

export function SendStep2Message({
  template,
  varNames,
  editText,
  vars,
  handleVarChange,
  startEditText,
  finalTitle,
  finalBody,
  titleTpl,
  setTitleTpl,
  bodyTpl,
  setBodyTpl,
  isTitleTooLong,
  isBodyTooLong,
  showMore,
  setShowMore,
  imageUrl,
  setImageUrl,
  isImageUrlInvalid,
  openScreen,
  setOpenScreen,
  productSearch,
  setProductSearch,
  selectedProduct,
  setSelectedProduct,
  productLoading,
  productResults,
  categorySearch,
  setCategorySearch,
  selectedCategory,
  setSelectedCategory,
  categoryLoading,
  categoryResults,
  customLink,
  setCustomLink,
  setStep,
  canNext2,
}) {
  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-base font-semibold">
            {template ? template.name : "Write notification"}
          </h2>
          <p className="text-xs text-muted-foreground">
            {template
              ? "Fill in template variables and customize your message."
              : "Compose your notification text."}
          </p>
        </div>
      </div>

      {/* Variables Inputs (if template has variables and not editing directly) */}
      {template && varNames.length > 0 && !editText && (
        <div className="space-y-3 rounded-lg border bg-card p-4">
          <h3 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
            Template Variables
          </h3>
          <div className="grid gap-3 sm:grid-cols-2">
            {varNames.map((v) => (
              <div key={v} className="space-y-1.5">
                <Label htmlFor={`var-${v}`} className="text-xs font-medium">
                  {varLabel(v)}
                </Label>
                <Input
                  id={`var-${v}`}
                  placeholder={varPlaceholder(v)}
                  value={vars[v] || ""}
                  onChange={(e) => handleVarChange(v, e.target.value)}
                  className="h-9"
                />
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Final Message Read-Only Box OR Direct Inputs */}
      {!editText ? (
        <div className="space-y-3 rounded-lg border bg-muted/30 p-4">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
              Message
            </span>
            <Button
              type="button"
              variant="ghost"
              size="sm"
              onClick={startEditText}
              className="h-7 text-xs font-medium text-primary hover:text-primary hover:bg-primary/10"
            >
              <Pencil className="mr-1.5 size-3" /> Edit text
            </Button>
          </div>
          <div className="space-y-1">
            <p className="text-sm font-semibold text-foreground">
              {finalTitle || <span className="italic text-muted-foreground">No title</span>}
            </p>
            {finalBody && <p className="text-xs text-muted-foreground">{finalBody}</p>}
          </div>
        </div>
      ) : (
        <div className="space-y-4 rounded-lg border bg-card p-4">
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <Label htmlFor="msg-title" className="text-xs font-medium">
                Title <span className="text-destructive">*</span>
              </Label>
              <span
                className={cn(
                  "text-[11px]",
                  isTitleTooLong ? "text-destructive font-bold" : "text-muted-foreground"
                )}
              >
                {finalTitle.length}/65
              </span>
            </div>
            <Input
              id="msg-title"
              value={titleTpl}
              onChange={(e) => setTitleTpl(e.target.value)}
              maxLength={65}
              placeholder="e.g. Flash Sale is Live!"
              className={cn("h-9", isTitleTooLong && "border-destructive")}
            />
          </div>

          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <Label htmlFor="msg-body" className="text-xs font-medium">
                Body <span className="text-muted-foreground font-normal">(optional)</span>
              </Label>
              <span
                className={cn(
                  "text-[11px]",
                  isBodyTooLong ? "text-destructive font-bold" : "text-muted-foreground"
                )}
              >
                {finalBody.length}/240
              </span>
            </div>
            <Textarea
              id="msg-body"
              rows={3}
              value={bodyTpl}
              onChange={(e) => setBodyTpl(e.target.value)}
              maxLength={240}
              placeholder="Short description or promo details..."
              className={cn(isBodyTooLong && "border-destructive")}
            />
            <p className="text-[11px] text-muted-foreground">Title only is fine.</p>
          </div>
        </div>
      )}

      {/* Collapsible More Options */}
      <div className="rounded-lg border bg-card p-4">
        <button
          type="button"
          onClick={() => setShowMore(!showMore)}
          className="flex w-full items-center justify-between text-left text-xs font-medium text-muted-foreground hover:text-foreground"
        >
          <span>More options (optional)</span>
          {showMore ? <ChevronUp className="size-4" /> : <ChevronDown className="size-4" />}
        </button>

        {showMore && (
          <div className="mt-4 space-y-4 pt-4 border-t">
            {/* Image URL */}
            <div className="space-y-1.5">
              <Label htmlFor="msg-image" className="text-xs font-medium">
                Image URL
              </Label>
              <Input
                id="msg-image"
                placeholder="https://..."
                value={imageUrl}
                onChange={(e) => setImageUrl(e.target.value)}
                className={cn("h-9", isImageUrlInvalid && "border-destructive")}
              />
              <p className="text-[11px] text-muted-foreground">
                https only, 2:1 ratio, under 1 MB.
              </p>
              {isImageUrlInvalid && (
                <p className="text-xs text-destructive">Image URL must start with https://</p>
              )}
            </div>

            {/* Open Screen Selection */}
            <div className="space-y-2">
              <Label className="text-xs font-medium">Open screen</Label>
              <Select
                value={openScreen}
                onValueChange={(val) => {
                  setOpenScreen(val);
                  if (val === "home") {
                    setSelectedProduct(null);
                    setSelectedCategory(null);
                    setCustomLink("");
                  }
                }}
              >
                <SelectTrigger className="h-9">
                  <SelectValue>{SCREEN_LABELS[openScreen]}</SelectValue>
                </SelectTrigger>
                <SelectContent position="popper">
                  <SelectItem value="home">Home</SelectItem>
                  <SelectItem value="product">A product</SelectItem>
                  <SelectItem value="category">A category</SelectItem>
                  <SelectItem value="orders">My orders</SelectItem>
                  <SelectItem value="custom">Custom link</SelectItem>
                </SelectContent>
              </Select>

              {/* Product picker */}
              {openScreen === "product" && (
                <div className="space-y-1.5 pt-1">
                  <Label className="text-xs text-muted-foreground">Select Product</Label>
                  <div className="relative">
                    <Search className="absolute left-2.5 top-2.5 size-3.5 text-muted-foreground" />
                    <Input
                      placeholder="Search product by name..."
                      value={productSearch}
                      onChange={(e) => setProductSearch(e.target.value)}
                      className="h-8 pl-8 text-xs"
                    />
                  </div>
                  {selectedProduct && (
                    <div className="flex items-center justify-between rounded border bg-muted/40 px-2.5 py-1.5 text-xs">
                      <span className="font-medium truncate">{selectedProduct.name}</span>
                      <Button
                        type="button"
                        variant="ghost"
                        size="sm"
                        aria-label={`Remove ${selectedProduct.name}`}
                        onClick={() => setSelectedProduct(null)}
                        className="h-5 px-1 text-[10px]"
                      >
                        <X className="size-3" />
                      </Button>
                    </div>
                  )}
                  {productLoading && (
                    <div className="flex items-center gap-1.5 text-xs text-muted-foreground py-1">
                      <Loader2 className="size-3 animate-spin" /> Searching products...
                    </div>
                  )}
                  {!selectedProduct && productResults.length > 0 && (
                    <div className="max-h-40 overflow-y-auto rounded-md border bg-popover p-1 shadow-sm">
                      {productResults.map((p) => (
                        <button
                          key={p._id}
                          type="button"
                          onClick={() => {
                            setSelectedProduct({ _id: p._id, name: p.name, slug: p.slug });
                            setProductSearch("");
                          }}
                          className="flex w-full items-center justify-between rounded px-2 py-1.5 text-left text-xs hover:bg-accent focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                        >
                          <span className="truncate">{p.name}</span>
                          <span className="text-[10px] text-muted-foreground shrink-0 ml-2">
                            /product/{p.slug}
                          </span>
                        </button>
                      ))}
                    </div>
                  )}
                </div>
              )}

              {/* Category picker */}
              {openScreen === "category" && (
                <div className="space-y-1.5 pt-1">
                  <Label className="text-xs text-muted-foreground">Select Category</Label>
                  <div className="relative">
                    <Search className="absolute left-2.5 top-2.5 size-3.5 text-muted-foreground" />
                    <Input
                      placeholder="Filter categories..."
                      value={categorySearch}
                      onChange={(e) => setCategorySearch(e.target.value)}
                      className="h-8 pl-8 text-xs"
                    />
                  </div>
                  {selectedCategory && (
                    <div className="flex items-center justify-between rounded border bg-muted/40 px-2.5 py-1.5 text-xs">
                      <span className="font-medium truncate">{selectedCategory.name}</span>
                      <Button
                        type="button"
                        variant="ghost"
                        size="sm"
                        aria-label={`Remove ${selectedCategory.name}`}
                        onClick={() => setSelectedCategory(null)}
                        className="h-5 px-1 text-[10px]"
                      >
                        <X className="size-3" />
                      </Button>
                    </div>
                  )}
                  {categoryLoading && (
                    <div className="flex items-center gap-1.5 text-xs text-muted-foreground py-1">
                      <Loader2 className="size-3 animate-spin" /> Loading categories...
                    </div>
                  )}
                  {!selectedCategory && categoryResults.length > 0 && (
                    <div className="max-h-40 overflow-y-auto rounded-md border bg-popover p-1 shadow-sm">
                      {categoryResults.map((c) => (
                        <button
                          key={c._id}
                          type="button"
                          onClick={() => {
                            setSelectedCategory({ _id: c._id, name: c.name, slug: c.slug });
                            setCategorySearch("");
                          }}
                          className="flex w-full items-center justify-between rounded px-2 py-1.5 text-left text-xs hover:bg-accent focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                        >
                          <span className="truncate">{c.name}</span>
                          <span className="text-[10px] text-muted-foreground shrink-0 ml-2">
                            /category/{c.slug}
                          </span>
                        </button>
                      ))}
                    </div>
                  )}
                </div>
              )}

              {/* Custom link */}
              {openScreen === "custom" && (
                <div className="space-y-1.5 pt-1">
                  <Label htmlFor="custom-link-input" className="text-xs text-muted-foreground">
                    URL or path
                  </Label>
                  <Input
                    id="custom-link-input"
                    placeholder="/deals or https://..."
                    value={customLink}
                    onChange={(e) => setCustomLink(e.target.value)}
                    className="h-8 text-xs"
                  />
                </div>
              )}
            </div>
          </div>
        )}
      </div>

      {/* Navigation Buttons for Step 2 */}
      <div className="flex items-center justify-between pt-2">
        <Button
          type="button"
          variant="outline"
          onClick={() => setStep(1)}
          className="h-9"
        >
          Back
        </Button>
        <Button
          type="button"
          onClick={() => setStep(3)}
          disabled={!canNext2}
          className="h-9"
        >
          Next
        </Button>
      </div>
    </div>
  );
}

