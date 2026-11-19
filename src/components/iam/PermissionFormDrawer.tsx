"use client";

import { useId, useState, type FormEvent } from "react";

import FormField from "@/components/iam/FormField";
import Button from "@/components/ui/Button";
import Drawer from "@/components/ui/Drawer";
import Input from "@/components/ui/Input";
import { useToast } from "@/components/ui/ToastProvider";
import { useCreatePermission, useUpdatePermission } from "@/hooks/iam/use-permissions";
import type { PermissionResponse } from "@/types/iam/permission-dto";

type PermissionFormDrawerProps = {
  open: boolean;
  /** The permission to edit, or null/undefined to create a new one. */
  permission?: PermissionResponse | null;
  /** Pass a stable function (useCallback): the Drawer re-focuses itself whenever this changes. */
  onClose: () => void;
};

export default function PermissionFormDrawer({
  open,
  permission = null,
  onClose,
}: PermissionFormDrawerProps) {
  if (!open) return null;
  return <PermissionForm key={permission?.permissionId ?? "new"} permission={permission} onClose={onClose} />;
}

function PermissionForm({
  permission,
  onClose,
}: {
  permission: PermissionResponse | null;
  onClose: () => void;
}) {
  const formId = useId();
  const { toast } = useToast();
  const create = useCreatePermission();
  const update = useUpdatePermission();

  const [code, setCode] = useState(permission?.permissionCode ?? "");

  const isEdit = permission !== null;
  const pending = create.isPending || update.isPending;
  const error = isEdit ? update.error : create.error;
  const fieldError = error?.fieldErrors?.permissionCode;
  const generalError = error && !error.isValidation ? error.message : null;

  function handleSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const value = code.trim();

    if (!permission) {
      create.mutate(
        { permissionCode: value },
        {
          onSuccess: (created) => {
            toast({ title: "Permission created", description: created.permissionCode });
            onClose();
          },
        },
      );
      return;
    }

    if (value.toUpperCase() === permission.permissionCode) {
      onClose();
      return;
    }
    update.mutate(
      { permissionId: permission.permissionId, request: { permissionCode: value } },
      {
        onSuccess: (updated) => {
          toast({ title: "Permission updated", description: updated.permissionCode });
          onClose();
        },
      },
    );
  }

  return (
    <Drawer
      open
      onClose={onClose}
      title={isEdit ? "Edit permission" : "New permission"}
      footer={
        <div className="flex justify-end gap-2">
          <Button variant="secondary" onClick={onClose} disabled={pending}>
            Cancel
          </Button>
          <Button type="submit" form={formId} loading={pending}>
            {isEdit ? "Save changes" : "Create permission"}
          </Button>
        </div>
      }
    >
      <form id={formId} onSubmit={handleSubmit} className="space-y-5">
        {isEdit ? (
          <p className="border border-amber-500/30 bg-amber-500/15 px-3 py-2 text-sm text-amber-700 dark:text-amber-300">
            Parts of the system check this exact code. Renaming a code that is in use can stop those features
            from working for everyone.
          </p>
        ) : (
          <p className="border border-border px-3 py-2 text-sm text-muted-foreground">
            A new code does nothing until the backend checks it somewhere. Add it to the backend catalogue first.
          </p>
        )}

        {generalError && (
          <p
            role="alert"
            className="border border-red-600/30 bg-red-600/10 px-3 py-2 text-sm text-red-700 dark:text-red-400"
          >
            {generalError}
          </p>
        )}

        <FormField
          label="Permission code"
          htmlFor={`${formId}-code`}
          hint="3 to 100 letters, digits or single underscores, starting with a letter. Saved in upper case."
          error={fieldError}
        >
          <Input
            id={`${formId}-code`}
            value={code}
            onChange={(e) => setCode(e.target.value)}
            invalid={!!fieldError}
            maxLength={100}
            autoComplete="off"
            className="font-mono"
            required
          />
        </FormField>
      </form>
    </Drawer>
  );
}