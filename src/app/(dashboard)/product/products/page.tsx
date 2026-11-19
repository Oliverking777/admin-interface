"use client";

// app/.../product/products/page.tsx
import { useCallback, useEffect, useState } from "react";
import ProductModal, { type ProductChanges } from "@/components/product/products/ProductModal";
import ProductsTable, { type ProductAbilities } from "@/components/product/products/ProductsTable";
import ProductsToolbar, { type ProductStatusFilter } from "@/components/product/products/ProductsToolbar";
import Card from "@/components/ui/Card";
import ConfirmDialog from "@/components/ui/ConfirmDialog";
import Pagination from "@/components/ui/Pagination";
import { useToast } from "@/components/ui/ToastProvider";
import { useAuth } from "@/hooks/iam/use-auth";
import { useProductSetup, type ProductSetup, type SetupProgress } from "@/hooks/product/use-product-setup";
import {
  useActivateProduct,
  useChangeProductCategory,
  useDeactivateProduct,
  useProducts,
  useUpdateProduct,
} from "@/hooks/product/use-products";
import { getErrorMessage } from "@/lib/api/api-error";
import { PERMISSIONS } from "@/lib/iam/permission-codes";
import type { Product } from "@/types/product/product";

const PAGE_SIZE = 20;

export default function ProductsPage() {
  const { toast } = useToast();
  const auth = useAuth();

  const canRead = auth.hasPermission(PERMISSIONS.PRODUCT_READ);
  const canCreate = auth.hasPermission(PERMISSIONS.PRODUCT_CREATE);
  // Activate, deactivate, edit and change category all need PRODUCT_UPDATE on the backend.
  const canUpdate = auth.hasPermission(PERMISSIONS.PRODUCT_UPDATE);
  const abilities: ProductAbilities = { update: canUpdate, activate: canUpdate, deactivate: canUpdate };
  // The new-product form takes every variant with its units (PRODUCT_CREATE covers them) and, when allowed,
  // one price per unit.
  const canSetPrices = auth.hasPermission(PERMISSIONS.PRICE_RULE_CREATE);

  const [search, setSearch] = useState("");
  const [debouncedSearch, setDebouncedSearch] = useState("");
  const [filter, setFilter] = useState<ProductStatusFilter>("ALL");
  const [page, setPage] = useState(0);

  const [drawerOpen, setDrawerOpen] = useState(false);
  const [editing, setEditing] = useState<Product | null>(null);
  const [productToDeactivate, setProductToDeactivate] = useState<Product | null>(null);
  const [activatingId, setActivatingId] = useState<string | null>(null);

  // Wait for a pause in typing before asking the server, and go back to the first page.
  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedSearch(search.trim());
      setPage(0);
    }, 300);
    return () => clearTimeout(timer);
  }, [search]);

  const query = useProducts(
    { page, size: PAGE_SIZE, search: debouncedSearch, status: filter === "ALL" ? undefined : filter },
    { enabled: canRead },
  );
  const productSetup = useProductSetup();
  const updateProduct = useUpdateProduct();
  const changeCategory = useChangeProductCategory();
  const activateProduct = useActivateProduct();
  const deactivateProduct = useDeactivateProduct();

  // Stable identities: Drawer and ConfirmDialog re-run effects when these change.
  const closeDrawer = useCallback(() => setDrawerOpen(false), []);
  const closeDeactivate = useCallback(() => setProductToDeactivate(null), []);

  function openCreate() {
    setEditing(null);
    setDrawerOpen(true);
  }

  function openEdit(product: Product) {
    setEditing(product);
    setDrawerOpen(true);
  }

  /** Creates the product with its variants and units, then their prices. Throws ProductSetupError if a step fails: the form handles it. */
  async function handleCreate(setup: ProductSetup, progress: SetupProgress) {
    const done = await productSetup.run(setup, progress);
    const name = done.product?.name ?? "The product";
    const code = done.product ? ` (${done.product.code})` : "";
    const variantCount = done.product && !done.product.simple ? done.product.variants.length : 0;
    const variants = variantCount > 0 ? ` with ${variantCount} variants` : "";
    toast({
      title: "Product created",
      description:
        canSetPrices && done.pricedKeys.length === 0
          ? `${name}${code} is ready${variants}. Set its prices on the Pricing page.`
          : `${name}${code} is ready${variants}.`,
    });
    return done;
  }

  async function handleUpdate(productId: string, { request, categoryId }: ProductChanges) {
    let saved: Product | undefined;
    if (Object.keys(request).length > 0) saved = await updateProduct.mutateAsync({ productId, request });
    if (categoryId) saved = await changeCategory.mutateAsync({ productId, categoryId });
    toast({ title: "Product updated", description: `${saved?.name ?? "The product"} was saved.` });
  }

  async function handleToggleStatus(product: Product) {
    if (product.status === "ACTIVE") {
      setProductToDeactivate(product);
      return;
    }
    setActivatingId(product.id);
    try {
      await activateProduct.mutateAsync(product.id);
      toast({ title: "Product activated", description: `${product.name} can be used again.` });
    } catch (error) {
      toast({ title: "Could not activate product", description: getErrorMessage(error), variant: "error" });
    } finally {
      setActivatingId(null);
    }
  }

  async function confirmDeactivate() {
    if (!productToDeactivate) return;
    try {
      await deactivateProduct.mutateAsync(productToDeactivate.id);
      toast({ title: "Product deactivated", description: `${productToDeactivate.name} is disabled.` });
      setProductToDeactivate(null);
    } catch (error) {
      toast({ title: "Could not deactivate product", description: getErrorMessage(error), variant: "error" });
    }
  }

  if (!auth.isLoading && !canRead) {
    return (
      <Card>
        <p className="text-sm font-medium text-foreground">You do not have access to products</p>
        <p className="mt-1 text-sm text-muted-foreground">
          Ask an administrator to give your role the PRODUCT_READ permission.
        </p>
      </Card>
    );
  }

  const data = query.data;

  return (
    <div className="flex flex-col gap-4">
      <ProductsToolbar
        search={search}
        onSearchChange={setSearch}
        filter={filter}
        onFilterChange={(next) => {
          setFilter(next);
          setPage(0);
        }}
        onAdd={openCreate}
        canAdd={canCreate}
      />

      <Card padded={false}>
        <ProductsTable
          products={data?.content ?? []}
          loading={auth.isLoading || query.isLoading}
          error={query.isError ? getErrorMessage(query.error, "Could not load products.") : null}
          filtered={debouncedSearch !== "" || filter !== "ALL"}
          abilities={abilities}
          busyId={activatingId}
          onRetry={() => void query.refetch()}
          onEdit={openEdit}
          onToggleStatus={handleToggleStatus}
        />
        {data && (
          <Pagination
            page={page}
            totalPages={data.totalPages}
            totalElements={data.totalElements}
            noun="products"
            onPageChange={setPage}
            disabled={query.isFetching}
          />
        )}
      </Card>

      <ProductModal
        open={drawerOpen}
        onClose={closeDrawer}
        product={editing}
        onCreate={handleCreate}
        onUpdate={handleUpdate}
        canSetPrices={canSetPrices}
      />

      <ConfirmDialog
        open={productToDeactivate !== null}
        onClose={closeDeactivate}
        onConfirm={confirmDeactivate}
        title="Deactivate this product?"
        description={
          productToDeactivate
            ? `${productToDeactivate.name} will be disabled: its units and prices can no longer be changed. You can activate it again at any time.`
            : undefined
        }
        confirmLabel="Deactivate"
        destructive
        loading={deactivateProduct.isPending}
      />
    </div>
  );
}