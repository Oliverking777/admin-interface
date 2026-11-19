"use client";

import { useEffect, useId, useState, type FormEvent } from "react";
import Button from "@/components/ui/Button";
import Drawer from "@/components/ui/Drawer";
import FormField from "@/components/ui/FormField";
import Input, { inputBaseClass } from "@/components/ui/Input";
import Select from "@/components/ui/Select";
import { getErrorMessage, isApiError } from "@/lib/api/api-error";
import { cn } from "@/lib/cn";
import {
  CUSTOMER_ADDRESS_MAX_LENGTH,
  CUSTOMER_EMAIL_MAX_LENGTH,
  CUSTOMER_EMAIL_PATTERN,
  CUSTOMER_NAME_MAX_LENGTH,
  CUSTOMER_PHONE_PATTERN,
  normalizeCustomerPhone,
  type Customer,
  type CustomerType,
} from "@/types/customer/customer";
import type { CreateCustomerRequest, UpdateCustomerRequest } from "@/types/customer/customer-dto";

type CustomerDrawerProps = {
  open: boolean;
  /** Must be a stable function (useCallback): Drawer re-focuses its close button whenever this changes. */
  onClose: () => void;
  /** The customer being edited, or null to create a new one. Never pass the walk-in customer (it is protected). */
  customer: Customer | null;
  /** Needed to create. Should reject on failure; the error is shown in the form. */
  onCreate?: (request: CreateCustomerRequest) => Promise<unknown>;
  /** Should reject on failure; the error is shown in the form. */
  onUpdate: (customerId: string, request: UpdateCustomerRequest) => Promise<unknown>;
};

type Field = "name" | "type" | "phone" | "email" | "address";
type Errors = Partial<Record<Field | "form", string>>;

export default function CustomerDrawer({ open, onClose, customer, onCreate, onUpdate }: CustomerDrawerProps) {
  const formId = useId();
  const [name, setName] = useState("");
  const [type, setType] = useState<CustomerType | "">("");
  const [phone, setPhone] = useState("");
  const [email, setEmail] = useState("");
  const [address, setAddress] = useState("");
  const [errors, setErrors] = useState<Errors>({});
  const [submitting, setSubmitting] = useState(false);

  const isEdit = customer !== null;

  // Fill the form when the drawer opens (with the customer's values when editing); start fresh when it closes.
  useEffect(() => {
    setName(open ? (customer?.name ?? "") : "");
    setType(open ? (customer?.type ?? "") : "");
    setPhone(open ? (customer?.phone ?? "") : "");
    setEmail(open ? (customer?.email ?? "") : "");
    setAddress(open ? (customer?.address ?? "") : "");
    setErrors({});
    setSubmitting(false);
  }, [open, customer]);

  const isBusiness = type === "BUSINESS";

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();

    const trimmedName = name.trim();
    const rawPhone = phone.trim();
    const normalizedPhone = rawPhone ? normalizeCustomerPhone(rawPhone) : "";
    const normalizedEmail = email.trim().toLowerCase();
    const trimmedAddress = address.trim();

    const next: Errors = {};
    if (!trimmedName) next.name = "Enter the customer name.";
    if (!type) next.type = "Choose a type.";
    if (rawPhone) {
      if (!CUSTOMER_PHONE_PATTERN.test(normalizedPhone)) {
        next.phone = "Use 8 to 15 digits, with an optional + at the start.";
      }
    } else if (isBusiness) {
      next.phone = "Enter a phone number for a business customer.";
    }
    if (normalizedEmail) {
      if (normalizedEmail.length > CUSTOMER_EMAIL_MAX_LENGTH || !CUSTOMER_EMAIL_PATTERN.test(normalizedEmail)) {
        next.email = "Enter a valid email address.";
      }
    }
    setErrors(next);
    if (Object.keys(next).length > 0 || !type) return;

    setSubmitting(true);
    try {
      if (customer) {
        // Send only what changed. The code and the type can never be changed.
        // An empty string clears phone, email or address.
        const request: UpdateCustomerRequest = {};
        if (trimmedName !== customer.name) request.customerName = trimmedName;
        if (normalizedPhone !== (customer.phone ?? "")) request.phoneNumber = normalizedPhone;
        if (normalizedEmail !== (customer.email ?? "")) request.email = normalizedEmail;
        if (trimmedAddress !== (customer.address ?? "")) request.address = trimmedAddress;

        if (Object.keys(request).length > 0) await onUpdate(customer.id, request);
      } else {
        await onCreate?.({
          customerName: trimmedName,
          customerType: type,
          ...(normalizedPhone && { phoneNumber: normalizedPhone }),
          ...(normalizedEmail && { email: normalizedEmail }),
          ...(trimmedAddress && { address: trimmedAddress }),
        });
      }
      onClose();
    } catch (error) {
      if (isApiError(error) && error.isValidation) {
        setErrors({
          name: error.fieldError("customerName"),
          type: error.fieldError("customerType"),
          phone: error.fieldError("phoneNumber"),
          email: error.fieldError("email"),
          address: error.fieldError("address"),
          form: error.message,
        });
      } else {
        // 400 (invalid value), 404 (customer gone) or 409 (e.g. the walk-in customer): shown as a form error.
        setErrors({ form: getErrorMessage(error, "Could not save the customer.") });
      }
    } finally {
      setSubmitting(false);
    }
  }

  const nameId = `${formId}-name`;
  const typeId = `${formId}-type`;
  const phoneId = `${formId}-phone`;
  const emailId = `${formId}-email`;
  const addressId = `${formId}-address`;

  return (
    <Drawer
      open={open}
      onClose={onClose}
      title={isEdit ? "Edit customer" : "New customer"}
      footer={
        <div className="flex justify-end gap-2">
          <Button variant="secondary" onClick={onClose} disabled={submitting}>
            Cancel
          </Button>
          <Button type="submit" form={formId} loading={submitting}>
            {isEdit ? "Save changes" : "Create customer"}
          </Button>
        </div>
      }
    >
      <form id={formId} onSubmit={handleSubmit} noValidate className="flex flex-col gap-4">
        {isEdit && (
          <p className="text-sm text-muted-foreground">
            Code <span className="font-medium text-foreground">{customer.code}</span>
          </p>
        )}

        <FormField id={nameId} label="Name" error={errors.name}>
          <Input
            id={nameId}
            value={name}
            onChange={(e) => setName(e.target.value)}
            autoComplete="off"
            maxLength={CUSTOMER_NAME_MAX_LENGTH}
            invalid={!!errors.name}
            aria-describedby={errors.name ? `${nameId}-error` : undefined}
          />
        </FormField>

        <FormField
          id={typeId}
          label="Type"
          error={errors.type}
          hint={isEdit ? "The type cannot be changed." : "A business customer needs a phone number. The type cannot be changed later."}
        >
          <Select
            id={typeId}
            value={type}
            onChange={(e) => setType(e.target.value as CustomerType | "")}
            disabled={isEdit}
            invalid={!!errors.type}
            aria-describedby={errors.type ? `${typeId}-error` : undefined}
          >
            <option value="">Select a type</option>
            <option value="INDIVIDUAL">Individual</option>
            <option value="BUSINESS">Business</option>
          </Select>
        </FormField>

        <FormField
          id={phoneId}
          label={isBusiness ? "Phone number" : "Phone number (optional)"}
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
            maxLength={CUSTOMER_EMAIL_MAX_LENGTH}
            invalid={!!errors.email}
            aria-describedby={errors.email ? `${emailId}-error` : undefined}
          />
        </FormField>

        <FormField
          id={addressId}
          label="Address (optional)"
          error={errors.address}
          hint={`${address.length}/${CUSTOMER_ADDRESS_MAX_LENGTH} characters`}
        >
          <textarea
            id={addressId}
            value={address}
            onChange={(e) => setAddress(e.target.value)}
            rows={3}
            maxLength={CUSTOMER_ADDRESS_MAX_LENGTH}
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