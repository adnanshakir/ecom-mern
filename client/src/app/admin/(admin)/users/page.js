"use client";

import { useSelector } from "react-redux";
import { Loader2, Pencil, Plus, Trash2 } from "lucide-react";

import { useCreateUser } from "@/hooks/admin/useCreateUser";
import { useUsers } from "@/hooks/admin/useUsers";
import { userRoles } from "@/schemas/admin/user";
import { ApiErrorSummary } from "@/components/shared/ApiErrorSummary";
import { RoleGate } from "@/components/admin/RoleGate";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Switch } from "@/components/ui/switch";
import { Select, SelectTrigger, SelectValue, SelectContent, SelectItem } from "@/components/ui/select";
import { Table, TableHeader, TableBody, TableHead, TableRow, TableCell } from "@/components/ui/table";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import { Form, FormField, FormItem, FormLabel, FormControl, FormMessage } from "@/components/ui/form";

export default function UsersPage() {
  return (
    <RoleGate allow={["super_admin"]}>
      <UsersTable />
    </RoleGate>
  );
}

function UsersTable() {
  const currentUserId = useSelector((state) => state.auth.user?.id);

  const {
    users,
    pagination,
    loading,
    error,
    filters,
    setFilter,
    setPage,
    dialogOpen,
    setDialogOpen,
    editingUser,
    form,
    formError,
    submitting,
    fetchUsers,
    openEditDialog,
    submit,
    remove,
  } = useUsers();

  const {
    dialogOpen: createDialogOpen,
    setDialogOpen: setCreateDialogOpen,
    form: createForm,
    formError: createFormError,
    submitting: creating,
    openCreateDialog,
    submit: submitCreate,
  } = useCreateUser(fetchUsers);

  return (
    <div className="grid gap-4">
      <div className="flex items-center justify-between">
        <h1 className="text-xl font-semibold">Users</h1>
        <Button onClick={openCreateDialog}>
          <Plus className="size-4" />
          Create user
        </Button>
      </div>

      <div className="flex flex-wrap gap-2">
        <Input
          placeholder="Search users..."
          defaultValue={filters.search}
          className="w-56"
          onKeyDown={(e) => {
            if (e.key === "Enter") setFilter("search", e.currentTarget.value);
          }}
        />

        <Select value={filters.role || "all"} onValueChange={(v) => setFilter("role", v === "all" ? "" : v)}>
          <SelectTrigger className="w-40">
            <SelectValue placeholder="Role">{filters.role || "All roles"}</SelectValue>
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All roles</SelectItem>
            {userRoles.map((r) => (
              <SelectItem key={r} value={r} className="capitalize">
                {r}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>

        <Select value={filters.isActive || "all"} onValueChange={(v) => setFilter("isActive", v === "all" ? "" : v)}>
          <SelectTrigger className="w-36">
            <SelectValue placeholder="Status">
              {filters.isActive === "true" ? "Active" : filters.isActive === "false" ? "Inactive" : "All statuses"}
            </SelectValue>
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All statuses</SelectItem>
            <SelectItem value="true">Active</SelectItem>
            <SelectItem value="false">Inactive</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {loading && (
        <div className="flex items-center gap-2 text-muted-foreground">
          <Loader2 className="size-4 animate-spin" />
          Loading users...
        </div>
      )}

      {!loading && error && <p className="text-sm text-destructive">{error}</p>}

      {!loading && !error && (
        <>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Name</TableHead>
                <TableHead>Email</TableHead>
                <TableHead>Role</TableHead>
                <TableHead>Status</TableHead>
                <TableHead className="text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {users.length === 0 && (
                <TableRow>
                  <TableCell colSpan={5} className="text-muted-foreground">
                    No users found.
                  </TableCell>
                </TableRow>
              )}
              {users.map((user) => {
                const isSelf = user._id === currentUserId;
                return (
                  <TableRow key={user._id}>
                    <TableCell>
                      {user.name}
                      {isSelf && <span className="ml-2 text-xs text-muted-foreground">(you)</span>}
                    </TableCell>
                    <TableCell className="text-muted-foreground">{user.email}</TableCell>
                    <TableCell className="capitalize">{user.role}</TableCell>
                    <TableCell>
                      <span className={user.isActive ? "text-emerald-500" : "text-muted-foreground"}>
                        {user.isActive ? "Active" : "Inactive"}
                      </span>
                    </TableCell>
                    <TableCell className="text-right">
                      <Button variant="ghost" size="icon" onClick={() => openEditDialog(user)}>
                        <Pencil className="size-4" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="icon"
                        disabled={isSelf}
                        title={isSelf ? "You can't delete your own account" : undefined}
                        onClick={() => remove(user)}
                      >
                        <Trash2 className="size-4" />
                      </Button>
                    </TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>

          <div className="flex items-center justify-between text-sm text-muted-foreground">
            <span>
              Page {pagination.page} of {pagination.pages || 1} ({pagination.total} total)
            </span>
            <div className="flex gap-2">
              <Button
                variant="outline"
                size="sm"
                disabled={filters.page <= 1}
                onClick={() => setPage(filters.page - 1)}
              >
                Previous
              </Button>
              <Button
                variant="outline"
                size="sm"
                disabled={filters.page >= (pagination.pages || 1)}
                onClick={() => setPage(filters.page + 1)}
              >
                Next
              </Button>
            </div>
          </div>
        </>
      )}

      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Edit user</DialogTitle>
            <DialogDescription>
              {editingUser?._id === currentUserId
                ? "You can't change your own role or deactivate your own account."
                : `Update ${editingUser?.name}'s account.`}
            </DialogDescription>
          </DialogHeader>

          <Form {...form}>
            <form onSubmit={form.handleSubmit(submit)} className="grid gap-4" noValidate>
              <FormField
                control={form.control}
                name="name"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Name</FormLabel>
                    <FormControl>
                      <Input {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="role"
                render={({ field }) => {
                  const isSelf = editingUser?._id === currentUserId;
                  return (
                    <FormItem>
                      <FormLabel>Role</FormLabel>
                      <Select value={field.value} onValueChange={field.onChange} disabled={isSelf}>
                        <FormControl>
                          <SelectTrigger className="w-full">
                            <SelectValue className="capitalize" />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          {userRoles.map((r) => (
                            <SelectItem key={r} value={r} className="capitalize">
                              {r}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                      <FormMessage />
                    </FormItem>
                  );
                }}
              />

              <FormField
                control={form.control}
                name="isActive"
                render={({ field }) => {
                  const isSelf = editingUser?._id === currentUserId;
                  return (
                    <FormItem className="flex flex-row items-center justify-between">
                      <FormLabel>Active</FormLabel>
                      <FormControl>
                        <Switch checked={field.value} onCheckedChange={field.onChange} disabled={isSelf} />
                      </FormControl>
                    </FormItem>
                  );
                }}
              />

              <ApiErrorSummary message={formError} />

              <DialogFooter>
                <Button type="submit" disabled={submitting}>
                  {submitting && <Loader2 className="animate-spin" />}
                  Save changes
                </Button>
              </DialogFooter>
            </form>
          </Form>
        </DialogContent>
      </Dialog>

      <Dialog open={createDialogOpen} onOpenChange={setCreateDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Create user</DialogTitle>
            <DialogDescription>Add a new admin or staff account.</DialogDescription>
          </DialogHeader>

          <Form {...createForm}>
            <form onSubmit={createForm.handleSubmit(submitCreate)} className="grid gap-4" noValidate>
              <FormField
                control={createForm.control}
                name="name"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Name</FormLabel>
                    <FormControl>
                      <Input autoComplete="name" placeholder="Jane Doe" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={createForm.control}
                name="email"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Email</FormLabel>
                    <FormControl>
                      <Input type="email" autoComplete="email" placeholder="user@company.com" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={createForm.control}
                name="password"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Password</FormLabel>
                    <FormControl>
                      <Input type="password" autoComplete="new-password" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={createForm.control}
                name="role"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Role</FormLabel>
                    <Select value={field.value} onValueChange={field.onChange}>
                      <FormControl>
                        <SelectTrigger className="w-full">
                          <SelectValue />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        <SelectItem value="admin">Admin</SelectItem>
                        <SelectItem value="staff">Staff</SelectItem>
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <ApiErrorSummary message={createFormError} />

              <DialogFooter>
                <Button type="submit" disabled={creating}>
                  {creating && <Loader2 className="animate-spin" />}
                  Create user
                </Button>
              </DialogFooter>
            </form>
          </Form>
        </DialogContent>
      </Dialog>
    </div>
  );
}
