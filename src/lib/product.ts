// Some partner product feeds send "N/A" (or an empty string) for
// uncategorized items instead of omitting the field — showing that
// placeholder verbatim (as a label, or as a selectable filter option) reads
// as a bug to a customer, so treat it as "no category" everywhere.
export function realCategoryName(categoryName?: string): string | null {
  const trimmed = categoryName?.trim();
  if (!trimmed || trimmed.toLowerCase() === "n/a") return null;
  return trimmed;
}
