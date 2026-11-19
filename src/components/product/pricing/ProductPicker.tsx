"use client";

import { useEffect, useState } from "react";
import Input from "@/components/ui/Input";
import Badge from "@/components/ui/Badge";
import { useProducts } from "@/hooks/product/use-products";
import { getErrorMessage } from "@/lib/api/api-error";
import type { Product } from "@/types/product/product";

type ProductPickerProps = {
  /** Called with the chosen product. */
  onSelect: (product: Product) => void;
};

function SearchIcon() {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" className="h-4 w-4" aria-hidden="true">
      <circle cx="11" cy="11" r="7" />
      <path d="M21 21l-4.3-4.3" />
    </svg>
  );
}

/** Search-as-you-type product chooser. Prices only exist inside a product, so this is the page's entry point. */
export default function ProductPicker({ onSelect }: ProductPickerProps) {
  const [text, setText] = useState("");
  const [debounced, setDebounced] = useState("");
  const [open, setOpen] = useState(false);

  useEffect(() => {
    const timer = setTimeout(() => setDebounced(text.trim()), 300);
    return () => clearTimeout(timer);
  }, [text]);

  const query = useProducts({ search: debounced, size: 8 }, { enabled: open });
  const products = query.data?.content ?? [];

  function choose(product: Product) {
    setText(`${product.name} (${product.code})`);
    setOpen(false);
    onSelect(product);
  }

  return (
    <div
      className="relative max-w-xl"
      onBlur={(e) => {
        if (!e.currentTarget.contains(e.relatedTarget)) setOpen(false);
      }}
    >
      <Input
        type="search"
        value={text}
        onChange={(e) => {
          setText(e.target.value);
          setOpen(true);
        }}
        onFocus={() => setOpen(true)}
        placeholder="Search a product by name, code or SKU"
        startIcon={<SearchIcon />}
        aria-label="Product"
        autoComplete="off"
      />

      {open && (
        <ul className="absolute inset-x-0 top-full z-20 mt-1 max-h-72 overflow-y-auto border border-border bg-background shadow-md">
          {query.isLoading ? (
            <li className="px-3 py-2.5 text-sm text-muted-foreground">Searching...</li>
          ) : query.isError ? (
            <li role="alert" className="px-3 py-2.5 text-sm text-red-600">
              {getErrorMessage(query.error, "Could not load products.")}
            </li>
          ) : products.length === 0 ? (
            <li className="px-3 py-2.5 text-sm text-muted-foreground">No product found.</li>
          ) : (
            products.map((product) => (
              <li key={product.id}>
                <button
                  type="button"
                  onClick={() => choose(product)}
                  className="flex w-full items-center justify-between gap-3 px-3 py-2.5 text-left text-sm transition hover:bg-accent focus-visible:bg-accent focus-visible:outline-none"
                >
                  <span className="min-w-0 truncate">
                    <span className="font-medium text-foreground">{product.name}</span>
                    <span className="ml-2 text-muted-foreground">{product.code}</span>
                  </span>
                  {product.status === "INACTIVE" && <Badge>Inactive</Badge>}
                </button>
              </li>
            ))
          )}
        </ul>
      )}
    </div>
  );
}