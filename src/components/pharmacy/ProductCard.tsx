import Link from "next/link";
import { Icon, ICONS } from "@/components/ui/Icon";
import { Button } from "@/components/ui/Button";
import { Product } from "@/lib/types";

// Some partner product feeds send "N/A" (or an empty string) for
// uncategorized items instead of omitting the field — showing that
// placeholder verbatim reads as a bug to a customer, so treat it as "no
// category" rather than literal text worth displaying.
function realCategoryName(categoryName?: string): string | null {
  const trimmed = categoryName?.trim();
  if (!trimmed || trimmed.toLowerCase() === "n/a") return null;
  return trimmed;
}

export function ProductCard({
  product,
  adding,
  added,
  onAddToCart,
}: {
  product: Product;
  adding: boolean;
  added: boolean;
  onAddToCart: (product: Product) => void;
}) {
  const outOfStock = product.stockQuantity <= 0;
  const category = realCategoryName(product.categoryName);

  return (
    <div className="flex flex-col overflow-hidden rounded-card bg-card-bg shadow-atmospheric transition-shadow hover:shadow-md">
      <Link href={`/app/pharmacy/${product._id}`} className="relative block">
        {product.imageUrl ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={product.imageUrl} alt={product.name} className="h-36 w-full object-cover" />
        ) : (
          <div className="flex h-36 w-full items-center justify-center bg-accent-pink-bg text-xs text-muted">
            No image
          </div>
        )}
        {product.prescriptionRequired && (
          <span className="absolute left-2.5 top-2.5 rounded-full bg-accent-amber-bg px-2.5 py-1 text-[10px] font-bold uppercase tracking-wide text-accent-amber-fg shadow-sm">
            Rx
          </span>
        )}
      </Link>

      <div className="flex flex-1 flex-col p-3.5">
        <Link href={`/app/pharmacy/${product._id}`}>
          <p className="truncate text-sm font-semibold text-heading">{product.name}</p>
        </Link>
        {category && <p className="mt-0.5 truncate text-xs text-muted">{category}</p>}

        <p className="mt-2 text-lg font-bold text-heading">₦{product.price.toLocaleString()}</p>

        <div className="mt-auto pt-3">
          {outOfStock ? (
            <div className="flex h-14 w-full items-center justify-center rounded-full bg-input-bg text-sm font-semibold text-muted">
              Out of stock
            </div>
          ) : (
            <Button className="w-full text-sm" loading={adding} onClick={() => onAddToCart(product)}>
              {added ? (
                <>
                  <Icon path={ICONS.check} className="h-3.5 w-3.5" /> Added
                </>
              ) : (
                "Add to cart"
              )}
            </Button>
          )}
        </div>
      </div>
    </div>
  );
}
