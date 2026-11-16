"use client";

import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
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
import { ApiErrorSummary } from "@/components/shared/ApiErrorSummary";
import {
  Copy,
  ChevronLeft,
  ChevronRight,
  StopCircle,
  XCircle,
  Loader2,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { CHANNEL_LABELS } from "@/lib/notificationTpl";

export function HistoryTab({ notif }) {
  const {
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
  } = notif;

  return (
    <Card>
      <CardHeader className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <div className="flex items-center gap-2">
            <CardTitle className="text-lg">Notification History</CardTitle>
            {notificationsLoading && notifications.length > 0 && (
              <Loader2 className="size-4 animate-spin text-primary" />
            )}
          </div>
          <p className="text-xs text-muted-foreground">
            Review sent, scheduled, and cancelled notifications.
          </p>
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
              <SelectValue>
                {historyStatusFilter === "all"
                  ? "All statuses"
                  : historyStatusFilter.charAt(0).toUpperCase() + historyStatusFilter.slice(1)}
              </SelectValue>
            </SelectTrigger>
            <SelectContent position="popper">
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

        <div
          className={cn(
            "rounded-lg border transition-opacity",
            notificationsLoading && notifications.length > 0 && "opacity-60 pointer-events-none"
          )}
        >
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
              {notificationsLoading && notifications.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={6} className="py-12 text-center text-muted-foreground">
                    <div className="flex items-center justify-center gap-2 text-sm">
                      <Loader2 className="size-4 animate-spin text-primary" />
                      <span>Loading notifications...</span>
                    </div>
                  </TableCell>
                </TableRow>
              ) : notifications.length === 0 ? (
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
                        className="text-[11px]"
                      >
                        {CHANNEL_LABELS[n.channel] || n.channel}
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

        {/* Pagination */}
        {(historyPagination.pages > 1 || historyPage > 1) && (
          <div
            className={cn(
              "mt-4 flex items-center justify-between text-xs text-muted-foreground",
              notificationsLoading && "pointer-events-none opacity-50"
            )}
          >
            <span>
              Showing page {historyPagination.page} of {historyPagination.pages} ({historyPagination.total} total)
            </span>
            <div className="flex items-center gap-1">
              <Button
                variant="outline"
                size="sm"
                disabled={historyPage <= 1 || notificationsLoading}
                onClick={() => setHistoryPage((p) => Math.max(1, p - 1))}
                className="h-8 gap-1 text-xs"
              >
                <ChevronLeft className="size-3" />
                Prev
              </Button>
              <Button
                variant="outline"
                size="sm"
                disabled={historyPage >= historyPagination.pages || notificationsLoading}
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
  );
}
