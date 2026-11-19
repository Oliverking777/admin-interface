"use client";

import { useEffect, useId, useState, type FormEvent } from "react";
import Button from "@/components/ui/Button";
import Drawer from "@/components/ui/Drawer";
import FormField from "@/components/ui/FormField";
import Input, { inputBaseClass } from "@/components/ui/Input";
import { getErrorMessage, isApiError } from "@/lib/api/api-error";
import { cn } from "@/lib/cn";
import {
  SUPPLIER_ADDRESS_MAX_LENGTH,
  SUPPLIER_CONTACT_PERSON_MAX_LENGTH,
  SUPPLIER_EMAIL_MAX_LENGTH,
  SUPPLIER_EMAIL_PATTERN,
  SUPPLIER_NAME_MAX_LENGTH,
  SUPPLIER_PHONE_PATTERN,
  normalizeSupplierPhone,
  type Supplier,
} from "@/types/purchase/supplier";
import type { CreateSupplierRequest, UpdateSupplierRequest } from "@/types/purchase/supplier-dto";

type SupplierDrawerProps = {
  open: boolean;
  /** Must be a stable function (useCallback): Drawer re-focuses its close button whenever this changes. */
  onClose: () => void;
  /** The supplier being edited, or null to create a new one. */
  supplier: Supplier | null;
  /** Needed to create. Should reject on failure; the error is shown in the form. */
  onCreate?: (request: CreateSupplierRequest) => Promise<unknown>;
  /** Should reject on failure; the error is shown in the form. */
  onUpdate: (supplierId: string, request: UpdateSupplierRequest) => Promise<unknown>;
};

type Field = "name" | "contactPerson" | "phone" | "email" | "address";
type Errors = Partial<Record<Field | "form", string>>;

export default function SupplierDrawer({ open, onClose, supplier, onCreate, onUpdate }: SupplierDrawerProps) {
  const formId = useId();
  const [name, setName] = useState("");
  const [contactPerson, setContactPerson] = useState("");
  const [phone, setPhone] = useState("");
  const [email, setEmail] = useState("");
  const [address, setAddress] = useState("");
  const [errors, setErrors] = useState<Errors>({});
  const [submitting, setSubmitting] = useState(false);

  const isEdit = supplier !== null;

  // Fill the form when the drawer opens (with the supplier's values when editing); start fresh when it closes.
  useEffect(() => {
    setName(open ? (supplier?.name ?? "") : "");
    setContactPerson(open ? (supplier?.contactPerson ?? "") : "");
    setPhone(open ? (supplier?.phone ?? "") : "");
    setEmail(open ? (supplier?.email ?? "") : "");
    setAddress(open ? (supplier?.address ?? "") : "");
    setErrors({});
    setSubmitting(false);
  }, [open, supplier]);

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();

    const trimmedName = name.trim();
    const trimmedContact = contactPerson.trim();
    const rawPhone = phone.trim();
    const normalizedPhone = rawPhone ? normalizeSupplierPhone(rawPhone) : "";
    const normalizedEmail = email.trim().toLowerCase();
    const trimmedAddress = address.trim();

    const next: Errors = {};
    if (!trimmedName) next.name = "Enter the supplier name.";
    if (rawPhone && !SUPPLIER_PHONE_PATTERN.test(normalizedPhone)) {
      next.phone = "Use 8 to 15 digits, with an optional + at the start.";
    }
    if (normalizedEmail) {
      if (normalizedEmail.length > SUPPLIER_EMAIL_MAX_LENGTH || !SUPPLIER_EMAIL_PATTERN.test(normalizedEmail)) {
        next.email = "Enter a valid email address.";
      }
    }
    setErrors(next);
    if (Object.keys(next).length > 0) return;

    setSubmitting(true);
    try {
      if (supplier) {
        // Send only what changed. The code can never be changed.
        // An empty string clears contact person, phone, email or address.
        const request: UpdateSupplierRequest = {};
        if (trimmedName !== supplier.name) request.supplierName = trimmedName;
        if (trimmedContact !== (supplier.contactPerson ?? "")) request.contactPerson = trimmedContact;
        if (normalizedPhone !== (supplier.phone ?? "")) request.phoneNumber = normalizedPhone;
        if (normalizedEmail !== (supplier.email ?? "")) request.email = normalizedEmail;
        if (trimmedAddress !== (supplier.address ?? "")) request.address = trimmedAddress;

        if (Object.keys(request).length > 0) await onUpdate(supplier.id, request);
      } else {
        await onCreate?.({
          supplierName: trimmedName,
          ...(trimmedContact && { contactPerson: trimmedContact }),
          ...(normalizedPhone && { phoneNumber: normalizedPhone }),
          ...(normalizedEmail && { email: normalizedEmail }),
          ...(trimmedAddress && { address: trimmedAddress }),
        });
      }
      onClose();
    } catch (error) {
      if (isApiError(error) && error.isValidation) {
        setErrors({
          name: error.fieldError("supplierName"),
          contactPerson: error.fieldError("contactPerson"),
          phone: error.fieldError("phoneNumber"),
          email: error.fieldError("email"),
          address: error.fieldError("address"),
          form: error.message,
        });
      } else if (isApiError(error) && error.isConflict) {
        // 409 on create or update: another supplier already uses this name.
        setErrors({ name: error.message });
      } else {
        setErrors({ form: getErrorMessage(error, "Could not save the supplier.") });
      }
    } finally {
      setSubmitting(false);
    }
  }

  const nameId = `${formId}-name`;
  const contactId = `${formId}-contact`;
  const phoneId = `${formId}-phone`;
  const emailId = `${formId}-email`;
  const addressId = `${formId}-address`;

  return (
    <Drawer
      open={open}
      onClose={onClose}
      title={isEdit ? "Edit supplier" : "New supplier"}
      footer={
        <div className="flex justify-end gap-2">
          <Button variant="secondary" onClick={onClose} disabled={submitting}>
            Cancel
          </Button>
          <Button type="submit" form={formId} loading={submitting}>
            {isEdit ? "Save changes" : "Create supplier"}
          </Button>
        </div>
      }
    >
      <form id={formId} onSubmit={handleSubmit} noValidate className="flex flex-col gap-4">
        {isEdit && (
          <p className="text-sm text-muted-foreground">
            Code <span className="font-medium text-foreground">{supplier.code}</span>
          </p>
        )}

        <FormField id={nameId} label="Name" error={errors.name} hint="Each supplier needs a different name.">
          <Input
            id={nameId}
            value={name}
            onChange={(e) => setName(e.target.value)}
            autoComplete="off"
            maxLength={SUPPLIER_NAME_MAX_LENGTH}
            invalid={!!errors.name}
            aria-describedby={errors.name ? `${nameId}-error` : undefined}
          />
        </FormField>

        <FormField id={contactId} label="Contact person (optional)" error={errors.contactPerson}>
          <Input
            id={contactId}
            value={contactPerson}
            onChange={(e) => setContactPerson(e.target.value)}
            autoComplete="off"
            maxLength={SUPPLIER_CONTACT_PERSON_MAX_LENGTH}
            invalid={!!errors.contactPerson}
            aria-describedby={errors.contactPerson ? `${contactId}-error` : undefined}
          />
        </FormField>

        <FormField
          id={phoneId}
          label="Phone number (optional)"
          error={errors.phone}
          hint="8 to 15 digits, with an optional + at the start, for example +237600000001."
        >
          <Input
            id={phoneId}
            type="tel"
            inputMode="tel"
            value={phone}
            onChange={(e) => setPhone(e.target.value)}
            autoComplete="off"
            invalid={!!errors.phone}
            aria-describedby={errors.phone ? `${phoneId}-error` : undefined}
          />
        </FormField>

        <FormField id={emailId} label="Email (optional)" error={errors.email}>
          <Input
            id={emailId}
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            autoComplete="off"
            maxLength={SUPPLIER_EMAIL_MAX_LENGTH}
            invalid={!!errors.email}
            aria-describedby={errors.email ? `${emailId}-error` : undefined}
          />
        </FormField>

        <FormField
          id={addressId}
          label="Address (optional)"
          error={errors.address}
          hint={`${address.length}/${SUPPLIER_ADDRESS_MAX_LENGTH} characters`}
        >
          <textarea
            id={addressId}
            value={address}
            onChange={(e) => setAddress(e.target.value)}
            rows={3}
            maxLength={SUPPLIER_ADDRESS_MAX_LENGTH}
            aria-invalid={!!errors.address || undefined}
            aria-describedby={errors.address ? `${addressId}-error` : undefined}
            className={cn(
              inputBaseClass,
              "resize-y",
              errors.address && "border-red-600 focus:border-red-600 focus:ring-red-600/30",
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