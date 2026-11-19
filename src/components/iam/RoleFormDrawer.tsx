"use client";

import { useId, useState, type FormEvent } from "react";

import FormField from "@/components/iam/FormField";
import Button from "@/components/ui/Button";
import Drawer from "@/components/ui/Drawer";
import Input, { inputBaseClass } from "@/components/ui/Input";
import Select from "@/components/ui/Select";
import { useToast } from "@/components/ui/ToastProvider";
import { useCreateRole, useUpdateRole } from "@/hooks/iam/use-roles";
import { LOCATION_SCOPE_HELP, LOCATION_SCOPE_LABELS } from "@/lib/iam/role-labels";
import type { RoleResponse, UpdateRoleRequest } from "@/types/iam/role-dto";
import { LocationScope } from "@/types/iam/user";

type RoleFormDrawerProps = {
  open: boolean;
  /** The role to edit, or null/undefined to create a new one. */
  role?: RoleResponse | null;
  /** Pass a stable function (useCallback): the Drawer re-focuses itself whenever this changes. */
  onClose: () => void;
  onSaved?: (role: RoleResponse) => void;
};

/**
 * Create or edit a role. The form only exists while the drawer is open,
 * so every opening starts with fresh fields and no old errors.
 */
export default function RoleFormDrawer({ open, role = null, onClose, onSaved }: RoleFormDrawerProps) {
  if (!open) return null;
  return <RoleForm key={role?.roleId ?? "new"} role={role} onClose={onClose} onSaved={onSaved} />;
}

function RoleForm({
  role,
  onClose,
  onSaved,
}: {
  role: RoleResponse | null;
  onClose: () => void;
  onSaved?: (role: RoleResponse) => void;
}) {
  const formId = useId();
  const { toast } = useToast();
  const createRole = useCreateRole();
  const updateRole = useUpdateRole();

  const [roleName, setRoleName] = useState(role?.roleName ?? "");
  const [description, setDescription] = useState(role?.description ?? "");
  const [locationScope, setLocationScope] = useState<LocationScope>(
    role?.locationScope ?? LocationScope.ASSIGNED,
  );

  const isEdit = role !== null;
  const pending = createRole.isPending || updateRole.isPending;
  const error = isEdit ? updateRole.error : createRole.error;
  const fieldErrors = error?.fieldErrors;
  // Validation problems show under their fields; anything else (duplicate name, protected role...) shows on top.
  const generalError = error && !error.isValidation ? error.message : null;
  const lockIdentity = role?.system ?? false;

  function finish(saved: RoleResponse, title: string) {
    toast({ title, description: saved.roleName });
    onSaved?.(saved);
    onClose();
  }

  function handleSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const name = roleName.trim();
    const text = description.trim();

    if (!role) {
      createRole.mutate(
        { roleName: name, description: text || null, locationScope },
        { onSuccess: (created) => finish(created, "Role created") },
      );
      return;
    }

    // Send only what changed. The backend stores names in upper case, so compare that way.
    const request: UpdateRoleRequest = {};
    if (!role.system && name.toUpperCase() !== role.roleName) request.roleName = name;
    if ((role.description ?? "") !== text) request.description = text; // "" clears it
    if (!role.system && locationScope !== role.locationScope) request.locationScope = locationScope;

    if (Object.keys(request).length === 0) {
      onClose();
      return;
    }
    updateRole.mutate(
      { roleId: role.roleId, request },
      { onSuccess: (updated) => finish(updated, "Role updated") },
    );
  }

  return (
    <Drawer
      open
      onClose={onClose}
      title={isEdit ? "Edit role" : "New role"}
      footer={
        <div className="flex justify-end gap-2">
          <Button variant="secondary" onClick={onClose} disabled={pending}>
            Cancel
          </Button>
          <Button type="submit" form={formId} loading={pending}>
            {isEdit ? "Save changes" : "Create role"}
          </Button>
        </div>
      }
    >
      <form id={formId} onSubmit={handleSubmit} className="space-y-5">
        {lockIdentity && (
          <p className="border border-border px-3 py-2 text-sm text-muted-foreground">
            This is a built-in role. Its name and location scope cannot be changed.
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
          label="Role name"
          htmlFor={`${formId}-name`}
          hint="3 to 50 letters, digits or underscores. Saved in upper case."
          error={fieldErrors?.roleName}
        >
          <Input
            id={`${formId}-name`}
            value={roleName}
            onChange={(e) => setRoleName(e.target.value)}
            invalid={!!fieldErrors?.roleName}
            disabled={lockIdentity}
            maxLength={50}
            autoComplete="off"
            required
          />
        </FormField>

        <FormField
          label="Location scope"
          htmlFor={`${formId}-scope`}
          hint={LOCATION_SCOPE_HELP[locationScope]}
          error={fieldErrors?.locationScope}
        >
          <Select
            id={`${formId}-scope`}
            value={locationScope}
            onChange={(e) => setLocationScope(e.target.value as LocationScope)}
            disabled={lockIdentity}
          >
            {Object.values(LocationScope).map((scope) => (
              <option key={scope} value={scope}>
                {LOCATION_SCOPE_LABELS[scope]}
              </option>
            ))}
          </Select>
        </FormField>

        <FormField
          label="Description (optional)"
          htmlFor={`${formId}-description`}
          error={fieldErrors?.description}
        >
          <textarea
            id={`${formId}-description`}
            rows={3}
            maxLength={255}
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            aria-invalid={fieldErrors?.description ? true : undefined}
            className={inputBaseClass}
          />
        </FormField>
      </form>
    </Drawer>
  );
}