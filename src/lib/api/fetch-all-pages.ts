/**
 * Reads every page of a paged endpoint and returns all items.
 * The backend caps the page size at 100, so lists that must be complete
 * (e.g. every permission for a checklist) are fetched page by page.
 */

import type { PageResponse } from "@/types/iam/common-dto";

export const MAX_PAGE_SIZE = 100;

export async function fetchAllPages<T>(
  fetchPage: (page: number, size: number) => Promise<PageResponse<T>>,
  pageSize: number = MAX_PAGE_SIZE,
): Promise<T[]> {
  const items: T[] = [];
  let page = 0;

  for (;;) {
    const result = await fetchPage(page, pageSize);
    items.push(...result.content);
    // An empty page also stops the loop, so a misbehaving backend cannot make it run forever.
    if (!result.hasNext || result.content.length === 0) return items;
    page += 1;
  }
}