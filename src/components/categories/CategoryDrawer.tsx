"use client";

import { useEffect, useId, useState, type FormEvent, type ReactNode } from "react";
import Button from "@/components/ui/Button";
import Drawer from "@/components/ui/Drawer";
import Input, { inputBaseClass } from "@/components/ui/Input";
import { getErrorMessage, isApiError } from "@/lib/api/api-error";
import { cn } from "@/lib/cn";
import {
  CATEGORY_DESCRIPTION_MAX_LENGTH,
  CATEGORY_NAME_MAX_LENGTH,
  type Category,
} from "@/types/business/category";
import type { CreateCategoryRequest, UpdateCategoryRequest } from "@/types/business/category-dto";

type CategoryDrawerProps = {
  open: boolean;
  /** Must be a stable function (useCallback): Drawer re-focuses its close button whenever this changes. */
  onClose: () => void;
  /** The category being edited, or null to create a new one. */
  category: Category | null;
  /** Should reject on failure; the error is shown in the form. */
  onCreate: (request: CreateCategoryRequest) => Promise<unknown>;
  /** Should reject on failure; the error is shown in the form. */
  onUpdate: (categoryId: string, request: UpdateCategoryRequest) => Promise<unknown>;
};

type Field = "categoryName" | "description";
type Errors = Partial<Record<Field | "form", string>>;

function FormField({
  id,
  label,
  error,
  hint,
  children,
}: {
  id: string;
  label: string;
  error?: string;
  hint?: string;
  children: ReactNode;
}) {
  return (
    <div className="flex flex-col gap-1.5">
      <label htmlFor={id} className="text-sm font-medium text-foreground">
        {label}
      </label>
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

export default function CategoryDrawer({ open, onClose, category, onCreate, onUpdate }: CategoryDrawerProps) {
  const formId = useId();
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [errors, setErrors] = useState<Errors>({});
  const [submitting, setSubmitting] = useState(false);

  const isEdit = category !== null;

  // Fill the form when the drawer opens (with the category's values when editing); start fresh when it closes.
  useEffect(() => {
    setName(open ? (category?.name ?? "") : "");
    setDescription(open ? (category?.description ?? "") : "");
    setErrors({});
    setSubmitting(false);
  }, [open, category]);

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();

    const trimmedName = name.trim();
    const trimmedDescription = description.trim();

    const next: Errors = {};
    if (!trimmedName) next.categoryName = "Enter the category name.";
    setErrors(next);
    if (Object.keys(next).length > 0) return;

    setSubmitting(true);
    try {
      if (category) {
        // Send only what changed. An empty description ("") clears it on the backend.
        const request: UpdateCategoryRequest = {};
        if (trimmedName !== category.name) request.categoryName = trimmedName;
        if (trimmedDescription !== (category.description ?? "")) request.description = trimmedDescription;

        if (Object.keys(request).length > 0) await onUpdate(category.id, request);
      } else {
        await onCreate({
          categoryName: trimmedName,
          description: trimmedDescription || undefined,
        });
      }
      onClose();
    } catch (error) {
      if (isApiError(error) && error.isValidation) {
        setErrors({
          categoryName: error.fieldError("categoryName"),
          description: error.fieldError("description"),
          form: error.message,
        });
      } else if (isApiError(error) && error.isConflict) {
        // 409: another category already uses this name.
        setErrors({ categoryName: error.message });
      } else {
        setErrors({ form: getErrorMessage(error, "Could not save the category.") });
      }
    } finally {
      setSubmitting(false);
    }
  }

  const nameId = `${formId}-name`;
  const descriptionId = `${formId}-description`;

  return (
    <Drawer
      open={open}
      onClose={onClose}
      title={isEdit ? "Edit category" : "New category"}
      footer={
        <div className="flex justify-end gap-2">
          <Button variant="secondary" onClick={onClose} disabled={submitting}>
            Cancel
          </Button>
          <Button type="submit" form={formId} loading={submitting}>
            {isEdit ? "Save changes" : "Create category"}
          </Button>
        </div>
      }
    >
      <form id={formId} onSubmit={handleSubmit} noValidate className="flex flex-col gap-4">
        <FormField
          id={nameId}
          label="Name"
          error={errors.categoryName}
          hint="Must be unique. Capital letters are ignored when names are compared."
        >
          <Input
            id={nameId}
            value={name}
            onChange={(e) => setName(e.target.value)}
            autoComplete="off"
            maxLength={CATEGORY_NAME_MAX_LENGTH}
            invalid={!!errors.categoryName}
            aria-describedby={errors.categoryName ? `${nameId}-error` : undefined}
          />
        </FormField>

        <FormField
          id={descriptionId}
          label="Description (optional)"
          error={errors.description}
          hint={`${description.length}/${CATEGORY_DESCRIPTION_MAX_LENGTH} characters`}
        >
          <textarea
            id={descriptionId}
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            rows={4}
            maxLength={CATEGORY_DESCRIPTION_MAX_LENGTH}
            aria-invalid={!!errors.description || undefined}
            aria-describedby={errors.description ? `${descriptionId}-error` : undefined}
            className={cn(
              inputBaseClass,
              "resize-y",
              errors.description && "border-red-600 focus:border-red-600 focus:ring-red-600/30",
            )}
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