import Link from "next/link";
import { ImageIcon, Star, Trash2 } from "lucide-react";
import { StatusBadge } from "@/components/products/StatusBadge";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";

export function ProductCard({ product, categoryName, brandName, canWrite, onDelete }) {
  const thumbnail = product.images?.[0]?.url;

  return (
    <Card className="overflow-hidden p-0">
      <Link href={`/products/${product._id}`} className="block">
        <div className="flex aspect-square items-center justify-center bg-muted">
          {thumbnail ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={thumbnail} alt={product.name} className="size-full object-cover" />
          ) : (
            <ImageIcon className="size-8 text-muted-foreground" />
          )}
        </div>
        <div className="grid gap-1 p-3">
          <div className="flex items-start justify-between gap-2">
            <p className="truncate font-medium">{product.name}</p>
            {product.featured && <Star className="size-3.5 shrink-0 fill-amber-500 text-amber-500" />}
          </div>
          <p className="truncate text-xs text-muted-foreground">
            {brandName} · {categoryName}
          </p>
          <StatusBadge status={product.status} />
        </div>
      </Link>

      {canWrite && (
        <div className="flex justify-end border-t px-2 py-1.5">
          <Button variant="ghost" size="icon" onClick={() => onDelete(product)}>
            <Trash2 className="size-4" />
          </Button>
        </div>
      )}
    </Card>
  );
}