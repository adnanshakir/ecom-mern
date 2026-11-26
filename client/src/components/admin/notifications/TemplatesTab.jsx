"use client";

import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import {
  Table,
  TableHeader,
  TableBody,
  TableHead,
  TableRow,
  TableCell,
} from "@/components/ui/table";
import { ApiErrorSummary } from "@/components/shared/ApiErrorSummary";
import { Plus, Pencil, Trash2, Loader2 } from "lucide-react";
import { TYPE_LABELS, CHANNEL_LABELS, AUTO_TEMPLATE_DESCRIPTIONS } from "@/lib/notificationTpl";

export function TemplatesTab({ notif }) {
  const {
    templates,
    templatesLoading,
    templatesError,
    openCreateTemplateDialog,
    openEditTemplateDialog,
    removeTemplate,
    toggleTemplateEnabled,
    pendingTemplateIds = [],
  } = notif;

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between">
        <div>
          <CardTitle className="text-lg">Notification Templates</CardTitle>
          <p className="text-xs text-muted-foreground">
            Templates with placeholders like <code>{"{{discount}}"}</code> or <code>{"{{event}}"}</code>.
          </p>
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
            <Loader2 className="mr-2 size-4 animate-spin text-primary" />
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
                        <div>
                          <span>{tpl.name}</span>
                          {tpl.isSystem && (
                            <span className="ml-2 text-[10px] text-muted-foreground font-normal">
                              (System)
                            </span>
                          )}
                        </div>
                        {AUTO_TEMPLATE_DESCRIPTIONS[tpl.key] && (
                          <p className="text-xs text-muted-foreground font-normal mt-0.5">
                            {AUTO_TEMPLATE_DESCRIPTIONS[tpl.key]}
                          </p>
                        )}
                      </TableCell>
                      <TableCell>
                        <Badge variant="outline" className="text-[11px]">
                          {TYPE_LABELS[tpl.type] || tpl.type}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        <Badge
                          variant={tpl.channel === "both" ? "outline" : "secondary"}
                          className="text-[11px]"
                        >
                          {CHANNEL_LABELS[tpl.channel] || tpl.channel}
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
                        <div className="flex items-center justify-end gap-2">
                          {tpl.auto && (
                            <label className="flex items-center gap-1.5 text-xs text-muted-foreground cursor-pointer mr-1">
                              <span>Active</span>
                              <Switch
                                size="sm"
                                checked={tpl.enabled !== false}
                                disabled={pendingTemplateIds.includes(tpl._id)}
                                onCheckedChange={(checked) => toggleTemplateEnabled(tpl, checked)}
                                aria-label={`Toggle ${tpl.name}`}
                              />
                            </label>
                          )}
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
  );
}

