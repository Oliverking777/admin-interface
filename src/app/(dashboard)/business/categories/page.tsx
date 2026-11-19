"use client";

import { useCallback, useMemo, useState } from "react";
import CategoriesTable, {
  type CategoryAbilities,
  type CategorySortKey,
  type CategorySortState,
} from "@/components/categories/CategoriesTable";
import CategoriesToolbar, { type CategoryStatusFilter } from "@/components/categories/CategoriesToolbar";
import CategoryDrawer from "@/components/categories/CategoryDrawer";
import Card from "@/components/ui/Card";
import ConfirmDialog from "@/components/ui/ConfirmDialog";
import { useToast } from "@/components/ui/ToastProvider";
import {
  useActivateCategory,
  useAllCategories,
  useCreateCategory,
  useDeactivateCategory,
  useUpdateCategory,
} from "@/hooks/business/use-categories";
import { useAuth } from "@/hooks/iam/use-auth";
import { getErrorMessage } from "@/lib/api/api-error";
import { PERMISSIONS } from "@/lib/iam/permission-codes";
import type { Category } from "@/types/business/category";
import type { CreateCategoryRequest, UpdateCategoryRequest } from "@/types/business/category-dto";

export default function CategoriesPage() {
  const { toast } = useToast();
  const auth = useAuth();

  const canRead = auth.hasPermission(PERMISSIONS.CATEGORY_READ);
  const canCreate = auth.hasPermission(PERMISSIONS.CATEGORY_CREATE);
  const abilities: CategoryAbilities = {
    update: auth.hasPermission(PERMISSIONS.CATEGORY_UPDATE),
    activate: auth.hasPermission(PERMISSIONS.CATEGORY_ACTIVATE),
    deactivate: auth.hasPermission(PERMISSIONS.CATEGORY_DEACTIVATE),
  };

  const query = useAllCategories({ enabled: canRead });
  const createCategory = useCreateCategory();
  const updateCategory = useUpdateCategory();
  const activateCategory = useActivateCategory();
  const deactivateCategory = useDeactivateCategory();

  const [search, setSearch] = useState("");
  const [filter, setFilter] = useState<CategoryStatusFilter>("ALL");
  const [sort, setSort] = useState<CategorySortState>({ key: "name", direction: "asc" });

  const [drawerOpen, setDrawerOpen] = useState(false);
  const [editing, setEditing] = useState<Category | null>(null);
  const [categoryToDeactivate, setCategoryToDeactivate] = useState<Category | null>(null);
  const [activatingId, setActivatingId] = useState<string | null>(null);

  // Stable identities: Drawer and ConfirmDialog re-run effects when these change.
  const closeDrawer = useCallback(() => setDrawerOpen(false), []);
  const closeDeactivate = useCallback(() => setCategoryToDeactivate(null), []);

  const toggleSort = useCallback((key: CategorySortKey) => {
    setSort((cur) =>
      cur.key === key
        ? { key, direction: cur.direction === "asc" ? "desc" : "asc" }
        : { key, direction: "asc" },
    );
  }, []);

  const visibleCategories = useMemo(() => {
    const term = search.trim().toLowerCase();

    const filtered = (query.data ?? []).filter((c) => {
      if (filter !== "ALL" && c.status !== filter) return false;
      if (!term) return true;
      return c.name.toLowerCase().includes(term) || (c.description ?? "").toLowerCase().includes(term);
    });

    const factor = sort.direction === "asc" ? 1 : -1;
    // Both sortable fields are strings (an ISO date-time sorts correctly as text).
    return [...filtered].sort(
      (a, b) => a[sort.key].localeCompare(b[sort.key], undefined, { sensitivity: "base" }) * factor,
    );
  }, [query.data, search, filter, sort]);

  function openCreate() {
    setEditing(null);
    setDrawerOpen(true);
  }

  function openEdit(category: Category) {
    setEditing(category);
    setDrawerOpen(true);
  }

  async function handleCreate(request: CreateCategoryRequest) {
    const created = await createCategory.mutateAsync(request);
    toast({ title: "Category created", description: `${created.name} is now available.` });
  }

  async function handleUpdate(categoryId: string, request: UpdateCategoryRequest) {
    const updated = await updateCategory.mutateAsync({ categoryId, request });
    toast({ title: "Category updated", description: `${updated.name} was saved.` });
  }

  async function handleToggleStatus(category: Category) {
    if (category.status === "ACTIVE") {
      setCategoryToDeactivate(category);
      return;
    }
    setActivatingId(category.id);
    try {
      await activateCategory.mutateAsync(category.id);
      toast({ title: "Category activated", description: `${category.name} is available again.` });
    } catch (error) {
      toast({
        title: "Could not activate category",
        description: getErrorMessage(error),
        variant: "error",
      });
    } finally {
      setActivatingId(null);
    }
  }

  async function confirmDeactivate() {
    if (!categoryToDeactivate) return;
    try {
      await deactivateCategory.mutateAsync(categoryToDeactivate.id);
      toast({
        title: "Category deactivated",
        description: `${categoryToDeactivate.name} was retired. It is kept, not deleted.`,
      });
      setCategoryToDeactivate(null);
    } catch (error) {
      toast({
        title: "Could not deactivate category",
        description: getErrorMessage(error),
        variant: "error",
      });
    }
  }

  if (!auth.isLoading && !canRead) {
    return (
      <Card>
        <p className="text-sm font-medium text-foreground">You do not have access to categories</p>
        <p className="mt-1 text-sm text-muted-foreground">
          Ask an administrator to give your role the CATEGORY_READ permission.
        </p>
      </Card>
    );
  }

  return (
    <div className="flex flex-col gap-4">
      <CategoriesToolbar
        search={search}
        onSearchChange={setSearch}
        filter={filter}
        onFilterChange={setFilter}
        onAdd={openCreate}
        canAdd={canCreate}
      />

      <Card padded={false}>
        <CategoriesTable
          categories={visibleCategories}
          loading={auth.isLoading || query.isLoading}
          error={query.isError ? getErrorMessage(query.error, "Could not load categories.") : null}
          filtered={search.trim() !== "" || filter !== "ALL"}
          sort={sort}
          abilities={abilities}
          busyId={activatingId}
          onSort={toggleSort}
          onRetry={() => void query.refetch()}
          onEdit={openEdit}
          onToggleStatus={handleToggleStatus}
        />
      </Card>

      <CategoryDrawer
        open={drawerOpen}
        onClose={closeDrawer}
        category={editing}
        onCreate={handleCreate}
        onUpdate={handleUpdate}
      />

      <ConfirmDialog
        open={categoryToDeactivate !== null}
        onClose={closeDeactivate}
        onConfirm={confirmDeactivate}
        title="Deactivate this category?"
        description={
          categoryToDeactivate
            ? `${categoryToDeactivate.name} will be retired. It is kept, not deleted, because products may still use it. You can activate it again at any time.`
            : undefined
        }
        confirmLabel="Deactivate"
        destructive
        loading={deactivateCategory.isPending}
      />
    </div>
  );
}