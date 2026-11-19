"use client";

import { useEffect, useId, useState, type FormEvent, type ReactNode } from "react";
import Button from "@/components/ui/Button";
import Drawer from "@/components/ui/Drawer";
import Input from "@/components/ui/Input";
import Select from "@/components/ui/Select";
import { getErrorMessage, isApiError } from "@/lib/api/api-error";
import type { RoleOption } from "@/types/iam/member";
import type { CreateUserRequest } from "@/types/iam/member-dto";

type AddMemberDrawerProps = {
  open: boolean;
  /** Must be a stable function (useCallback): Drawer re-focuses its close button whenever this changes. */
  onClose: () => void;
  roles: RoleOption[];
  /** Should reject on failure; the error is shown in the form. */
  onCreate: (request: CreateUserRequest) => Promise<unknown>;
};

type Field = "firstName" | "lastName" | "roleId" | "password";
type Errors = Partial<Record<Field | "form", string>>;

/** Mirrors the backend rule: 8+ characters, at most 72 bytes, with a letter and a digit. */
function passwordProblem(password: string): string | null {
  if (password.length < 8) return "Use at least 8 characters.";
  if (new TextEncoder().encode(password).length > 72) return "The password is too long (72 bytes at most).";
  if (!/[A-Za-z]/.test(password)) return "Include at least one letter.";
  if (!/\d/.test(password)) return "Include at least one digit.";
  return null;
}

function FormField({
  id,
  label,
  error,
  hint,
  action,
  children,
}: {
  id: string;
  label: string;
  error?: string;
  hint?: string;
  action?: ReactNode;
  children: ReactNode;
}) {
  return (
    <div className="flex flex-col gap-1.5">
      <div className="flex items-center justify-between gap-2">
        <label htmlFor={id} className="text-sm font-medium text-foreground">
          {label}
        </label>
        {action}
      </div>
      {children}
      {hint && !error && <p className="text-sm text-muted-foreground">{hint}</p>}
      {error && (
        <p id={`${id}-error`} role="alert" className="text-sm text-red-600">
          {error}
        </p>
      )}
    </div>
  );
}

export default function AddMemberDrawer({ open, onClose, roles, onCreate }: AddMemberDrawerProps) {
  const formId = useId();
  const [firstName, setFirstName] = useState("");
  const [lastName, setLastName] = useState("");
  const [roleId, setRoleId] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [errors, setErrors] = useState<Errors>({});
  const [submitting, setSubmitting] = useState(false);

  // Start fresh every time the drawer is closed.
  useEffect(() => {
    if (open) return;
    setFirstName("");
    setLastName("");
    setRoleId("");
    setPassword("");
    setShowPassword(false);
    setErrors({});
    setSubmitting(false);
  }, [open]);

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();

    const next: Errors = {};
    if (!firstName.trim()) next.firstName = "Enter the first name.";
    if (!lastName.trim()) next.lastName = "Enter the last name.";
    if (!roleId) next.roleId = "Choose a role.";
    const problem = passwordProblem(password);
    if (problem) next.password = problem;
    setErrors(next);
    if (Object.keys(next).length > 0) return;

    setSubmitting(true);
    try {
      await onCreate({ firstName: firstName.trim(), lastName: lastName.trim(), roleId, password });
      onClose();
    } catch (error) {
      if (isApiError(error) && error.isValidation) {
        setErrors({
          firstName: error.fieldError("firstName"),
          lastName: error.fieldError("lastName"),
          roleId: error.fieldError("roleId"),
          password: error.fieldError("password"),
          form: error.message,
        });
      } else {
        setErrors({ form: getErrorMessage(error, "Could not create the member.") });
      }
    } finally {
      setSubmitting(false);
    }
  }

  const firstNameId = `${formId}-first`;
  const lastNameId = `${formId}-last`;
  const roleFieldId = `${formId}-role`;
  const passwordId = `${formId}-password`;

  return (
    <Drawer
      open={open}
      onClose={onClose}
      title="Add member"
      footer={
        <div className="flex justify-end gap-2">
          <Button variant="secondary" onClick={onClose} disabled={submitting}>
            Cancel
          </Button>
          <Button type="submit" form={formId} loading={submitting}>
            Add member
          </Button>
        </div>
      }
    >
      <form id={formId} onSubmit={handleSubmit} noValidate className="flex flex-col gap-4">
        <p className="text-sm text-muted-foreground">
          The username is generated from the name. Share it and the password below with the member so they can sign in.
        </p>

        <div className="grid gap-4 sm:grid-cols-2">
          <FormField id={firstNameId} label="First name" error={errors.firstName}>
            <Input
              id={firstNameId}
              value={firstName}
              onChange={(e) => setFirstName(e.target.value)}
              autoComplete="off"
              maxLength={100}
              invalid={!!errors.firstName}
              aria-describedby={errors.firstName ? `${firstNameId}-error` : undefined}
            />
          </FormField>

          <FormField id={lastNameId} label="Last name" error={errors.lastName}>
            <Input
              id={lastNameId}
              value={lastName}
              onChange={(e) => setLastName(e.target.value)}
              autoComplete="off"
              maxLength={100}
              invalid={!!errors.lastName}
              aria-describedby={errors.lastName ? `${lastNameId}-error` : undefined}
            />
          </FormField>
        </div>

        <FormField id={roleFieldId} label="Role" error={errors.roleId}>
          <Select
            id={roleFieldId}
            value={roleId}
            onChange={(e) => setRoleId(e.target.value)}
            invalid={!!errors.roleId}
            aria-describedby={errors.roleId ? `${roleFieldId}-error` : undefined}
          >
            <option value="">Select a role</option>
            {roles.map((role) => (
              <option key={role.id} value={role.id}>
                {role.name}
              </option>
            ))}
          </Select>
        </FormField>

        <FormField
          id={passwordId}
          label="Password"
          error={errors.password}
          hint="At least 8 characters, with a letter and a digit."
          action={
            <button
              type="button"
              onClick={() => setShowPassword((v) => !v)}
              aria-pressed={showPassword}
              className="text-sm text-primary hover:underline focus-visible:outline-2 focus-visible:outline-primary"
            >
              {showPassword ? "Hide" : "Show"}
            </button>
          }
        >
          <Input
            id={passwordId}
            type={showPassword ? "text" : "password"}
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            autoComplete="new-password"
            maxLength={200}
            invalid={!!errors.password}
            aria-describedby={errors.password ? `${passwordId}-error` : undefined}
          />
        </FormField>

        {errors.form && (
          <p role="alert" className="text-sm text-red-600">
            {errors.form}
          </p>
        )}
      </form>
    </Drawer>
  );
}