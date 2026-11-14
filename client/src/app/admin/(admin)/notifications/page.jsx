"use client";

import { useNotifications } from "@/hooks/admin/useNotifications";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { Send, Radio, Clock } from "lucide-react";
import { ConfirmDialog } from "@/components/shared/ConfirmDialog";
import { SendTab } from "@/components/admin/notifications/SendTab";
import { TemplatesTab } from "@/components/admin/notifications/TemplatesTab";
import { HistoryTab } from "@/components/admin/notifications/HistoryTab";
import { TemplateFormDialog } from "@/components/admin/notifications/TemplateFormDialog";

export default function NotificationsPage() {
  const notif = useNotifications();

  return (
    <div className="grid gap-6">
      {/* Header */}
      <div className="flex flex-col gap-1">
        <h1 className="text-2xl font-bold tracking-tight">Notification Center</h1>
        <p className="text-sm text-muted-foreground">
          Broadcast push notifications to the mobile app, manage website ticker announcements, and schedule broadcasts.
        </p>
      </div>

      {/* Tabs */}
      <Tabs value={notif.activeTab} onValueChange={notif.setActiveTab} className="w-full">
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

        <TabsContent value="send" className="mt-6">
          <SendTab notif={notif} />
        </TabsContent>

        <TabsContent value="templates" className="mt-6">
          <TemplatesTab notif={notif} />
        </TabsContent>

        <TabsContent value="history" className="mt-6">
          <HistoryTab notif={notif} />
        </TabsContent>
      </Tabs>

      {/* Template Create / Edit Dialog */}
      <TemplateFormDialog notif={notif} />

      {/* Confirm Dialog */}
      <ConfirmDialog {...notif.confirmState} onConfirm={notif.handleConfirm} onCancel={notif.handleCancel} />
    </div>
  );
}
