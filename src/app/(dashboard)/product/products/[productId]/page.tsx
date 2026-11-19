"use client";

// app/.../product/products/[productId]/page.tsx
import Link from "next/link";
import { useParams } from "next/navigation";
import { useCallback, useState, type ReactNode } from "react";
import { useCategoryName } from "@/components/product/products/CategorySelect";
import ProductModal, { type ProductChanges } from "@/components/product/products/ProductModal";
import ProductVariantsPanel from "@/components/product/products/ProductVariantsPanel";
import Badge from "@/components/ui/Badge";
import Button from "@/components/ui/Button";
import Card from "@/components/ui/Card";
import ConfirmDialog from "@/components/ui/ConfirmDialog";
import { useToast } from "@/components/ui/ToastProvider";
import { useAuth } from "@/hooks/iam/use-auth";
import {
  useActivateProduct,
  useChangeProductCategory,
  useDeactivateProduct,
  useProduct,
  useUpdateProduct,
} from "@/hooks/product/use-products";
import { getErrorMessage } from "@/lib/api/api-error";
import { PERMISSIONS } from "@/lib/iam/permission-codes";
import { firstVariant } from "@/types/product/product";

const dateTimeFormat = new Intl.DateTimeFormat("en-GB", {
  day: "2-digit",
  month: "short",
  year: "numeric",
  hour: "2-digit",
  minute: "2-digit",
});

function BackLink() {
  return (
    <Link
      href="/product/products"
      className="inline-flex w-fit items-center gap-1 text-sm text-muted-foreground transition hover:text-foreground focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary"
    >
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" className="h-4 w-4" aria-hidden="true">
        <path d="M15 6l-6 6 6 6" />
      </svg>
      Back to products
    </Link>
  );
}

function Detail({ label, children }: { label: string; children: ReactNode }) {
  return (
    <div className="flex flex-col gap-1">
      <dt className="text-xs font-medium text-muted-foreground">{label}</dt>
      <dd className="text-sm text-foreground">{children}</dd>
    </div>
  );
}

export default function ProductDetailPage() {
  const { productId } = useParams<{ productId: string }>();
  const { toast } = useToast();
  const auth = useAuth();

  const canRead = auth.hasPermission(PERMISSIONS.PRODUCT_READ);
  const canUpdate = auth.hasPermission(PERMISSIONS.PRODUCT_UPDATE);
  const canAssignUnits = auth.hasPermission(PERMISSIONS.UNIT_CREATE);
  const canUpdateUnits = auth.hasPermission(PERMISSIONS.UNIT_UPDATE);
  const canDeactivateUnits = auth.hasPermission(PERMISSIONS.UNIT_DEACTIVATE);
  const canSeePricing = auth.hasPermission(PERMISSIONS.PRICE_RULE_READ);
  const canSetPrices = auth.hasPermission(PERMISSIONS.PRICE_RULE_CREATE);

  const query = useProduct(productId, { enabled: canRead });
  const updateProduct = useUpdateProduct();
  const changeCategory = useChangeProductCategory();
  const activateProduct = useActivateProduct();
  const deactivateProduct = useDeactivateProduct();

  const [editOpen, setEditOpen] = useState(false);
  const [deactivateOpen, setDeactivateOpen] = useState(false);

  // Stable identities: Drawer and ConfirmDialog re-run effects when these change.
  const closeEdit = useCallback(() => setEditOpen(false), []);
  const closeDeactivate = useCallback(() => setDeactivateOpen(false), []);

  const product = query.data;
  const categoryName = useCategoryName(product?.categoryId);

  async function handleUpdate(id: string, { request, categoryId }: ProductChanges) {
    let saved;
    if (Object.keys(request).length > 0) saved = await updateProduct.mutateAsync({ productId: id, request });
    if (categoryId) saved = await changeCategory.mutateAsync({ productId: id, categoryId });
    toast({ title: "Product updated", description: `${saved?.name ?? "The product"} was saved.` });
  }

  async function handleActivate() {
    if (!product) return;
    try {
      await activateProduct.mutateAsync(product.id);
      toast({ title: "Product activated", description: `${product.name} can be used again.` });
    } catch (error) {
      toast({ title: "Could not activate product", description: getErrorMessage(error), variant: "error" });
    }
  }

  async function confirmDeactivate() {
    if (!product) return;
    try {
      await deactivateProduct.mutateAsync(product.id);
      toast({ title: "Product deactivated", description: `${product.name} is disabled.` });
      setDeactivateOpen(false);
    } catch (error) {
      toast({ title: "Could not deactivate product", description: getErrorMessage(error), variant: "error" });
    }
  }

  if (!auth.isLoading && !canRead) {
    return (
      <div className="flex flex-col gap-4">
        <BackLink />
        <Card>
          <p className="text-sm font-medium text-foreground">You do not have access to products</p>
          <p className="mt-1 text-sm text-muted-foreground">
            Ask an administrator to give your role the PRODUCT_READ permission.
          </p>
        </Card>
      </div>
    );
  }

  if (auth.isLoading || query.isLoading) {
    return (
      <div className="flex flex-col gap-4" aria-busy="true">
        <BackLink />
        <Card>
          <div className="flex flex-col gap-3">
            <div className="h-6 w-56 animate-pulse bg-muted motion-reduce:animate-none" />
            <div className="h-4 w-80 animate-pulse bg-muted motion-reduce:animate-none" />
            <div className="h-4 w-64 animate-pulse bg-muted motion-reduce:animate-none" />
          </div>
        </Card>
      </div>
    );
  }

  if (query.isError || !product) {
    const notFound = query.error?.isNotFound ?? false;
    return (
      <div className="flex flex-col gap-4">
        <BackLink />
        <Card>
          <p role="alert" className="text-sm font-medium text-foreground">
            {notFound ? "This product does not exist" : getErrorMessage(query.error, "Could not load the product.")}
          </p>
          {!notFound && (
            <Button variant="secondary" size="sm" onClick={() => void query.refetch()} className="mt-3">
              Try again
            </Button>
          )}
        </Card>
      </div>
    );
  }

  const isActive = product.status === "ACTIVE";
  const only = firstVariant(product);

  return (
    <div className="flex flex-col gap-4">
      <BackLink />

      <Card className="flex flex-col gap-5 p-5">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div className="flex min-w-0 items-start gap-4">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={product.imageUrl} alt="" className="h-16 w-16 shrink-0 border border-border bg-muted object-cover" />
            <div className="min-w-0">
              <h2 className="truncate text-xl font-semibold text-foreground">{product.name}</h2>
              <div className="mt-2 flex flex-wrap items-center gap-2">
                <Badge>{product.code}</Badge>
                <Badge variant={isActive ? "success" : "neutral"}>{isActive ? "Active" : "Inactive"}</Badge>
              </div>
            </div>
          </div>

          <div className="flex gap-2">
            {canSeePricing && (
              <Link
                href="/product/pricing"
                className="inline-flex items-center justify-center border border-border bg-background px-4 py-2.5 text-base font-medium text-foreground transition hover:bg-accent focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary"
              >
                Prices
              </Link>
            )}
            {canUpdate && (
              <Button variant="secondary" onClick={() => setEditOpen(true)}>
                Edit
              </Button>
            )}
            {canUpdate && isActive && (
              <Button variant="secondary" onClick={() => setDeactivateOpen(true)}>
                Deactivate
              </Button>
            )}
            {canUpdate && !isActive && (
              <Button onClick={handleActivate} loading={activateProduct.isPending}>
                Activate
              </Button>
            )}
          </div>
        </div>

        <dl className="grid gap-4 sm:grid-cols-2">
          <Detail label="Code">{product.code}</Detail>
          <Detail label="Category">{categoryName ?? "-"}</Detail>
          {/* with variants, each variant's SKU is in the Variants table below */}
          {product.simple && <Detail label="SKU">{only.sku}</Detail>}
          <div className="sm:col-span-2">
            <Detail label="Description">{product.description || "No description"}</Detail>
          </div>
          <Detail label="Created">{dateTimeFormat.format(new Date(product.createdAt))}</Detail>
          <Detail label="Last updated">{dateTimeFormat.format(new Date(product.updatedAt))}</Detail>
        </dl>
      </Card>

      <ProductVariantsPanel
        product={product}
        abilities={{
          update: canUpdate,
          setPrices: canSetPrices,
          assignUnits: canAssignUnits,
          updateUnits: canUpdateUnits,
          deactivateUnits: canDeactivateUnits,
        }}
      />

      <ProductModal open={editOpen} onClose={closeEdit} product={product} onUpdate={handleUpdate} />

      <ConfirmDialog
        open={deactivateOpen}
        onClose={closeDeactivate}
        onConfirm={confirmDeactivate}
        title="Deactivate this product?"
        description={`${product.name} will be disabled: its variants can no longer be bought or sold, and its units and prices can no longer be changed. You can activate it again at any time.`}
        confirmLabel="Deactivate"
        destructive
        loading={deactivateProduct.isPending}
      />
    </div>
  );
}