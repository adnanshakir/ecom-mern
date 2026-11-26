"use client";

import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
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
import { ApiErrorSummary } from "@/components/shared/ApiErrorSummary";
import { Loader2 } from "lucide-react";
import { fillTpl, TYPE_LABELS, CHANNEL_LABELS } from "@/lib/notificationTpl";

const COMMON_VARS = [
  "discount",
  "hours",
  "endDate",
  "code",
  "category",
  "name",
  "product",
  "count",
  "amount",
  "festival",
];

export function TemplateFormDialog({ notif }) {
  const {
    templateDialogOpen,
    closeTemplateDialog,
    editingTemplate,
    templateFormError,
    templateFormData,
    setTemplateFormData,
    activeTemplateField,
    setActiveTemplateField,
    insertVariableInTemplateForm,
    templateSubmitting,
    submitTemplate,
  } = notif;

  return (
    <Dialog
      open={templateDialogOpen}
      onOpenChange={(open) => {
        if (!open) closeTemplateDialog();
      }}
    >
      <DialogContent className="sm:max-w-lg max-h-[85vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>
            {editingTemplate ? "Edit Template" : "New Template"}
          </DialogTitle>
          <DialogDescription>
            Create or edit a notification template. Click variable chips below to insert placeholders.
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
                  <SelectValue>{TYPE_LABELS[templateFormData.type] || templateFormData.type}</SelectValue>
                </SelectTrigger>
                <SelectContent position="popper">
                  {Object.entries(TYPE_LABELS).map(([k, label]) => (
                    <SelectItem key={k} value={k}>
                      {label}
                    </SelectItem>
                  ))}
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
                  <SelectValue>{CHANNEL_LABELS[templateFormData.channel] || templateFormData.channel}</SelectValue>
                </SelectTrigger>
                <SelectContent position="popper">
                  {Object.entries(CHANNEL_LABELS).map(([k, label]) => (
                    <SelectItem key={k} value={k}>
                      {label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="grid gap-1.5">
            <Label htmlFor="tpl-title">Title Template *</Label>
            <Input
              id="tpl-title"
              onFocus={() => setActiveTemplateField("titleTpl")}
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
              onFocus={() => setActiveTemplateField("bodyTpl")}
              placeholder="e.g. Check out {{category}} specials before {{endDate}}."
              value={templateFormData.bodyTpl}
              onChange={(e) =>
                setTemplateFormData({ ...templateFormData, bodyTpl: e.target.value })
              }
              rows={3}
            />
          </div>

          {/* Common Variable Chips */}
          <div className="space-y-1.5">
            <Label className="text-xs text-muted-foreground">
              Insert variable into {activeTemplateField === "bodyTpl" ? "Body" : "Title"}:
            </Label>
            <div className="flex flex-wrap gap-1.5">
              {COMMON_VARS.map((v) => (
                <button
                  key={v}
                  type="button"
                  onClick={() => insertVariableInTemplateForm(v)}
                  className="rounded-full border bg-muted/60 px-2.5 py-0.5 text-[11px] font-medium text-foreground/80 hover:bg-accent hover:text-foreground transition-colors"
                >
                  +{v}
                </button>
              ))}
            </div>
          </div>

          {/* Live Sample Preview Line */}
          <div className="rounded-md border bg-muted/30 p-2.5 text-xs">
            <div className="font-semibold text-muted-foreground text-[10px] uppercase tracking-wider mb-1">
              Sample Preview
            </div>
            <div className="font-medium text-foreground">
              {fillTpl(templateFormData.titleTpl, {}, "sample") || (
                <span className="italic text-muted-foreground">Title</span>
              )}
            </div>
            {templateFormData.bodyTpl && (
              <div className="text-muted-foreground text-[11px] mt-0.5">
                {fillTpl(templateFormData.bodyTpl, {}, "sample")}
              </div>
            )}
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
  );
}

