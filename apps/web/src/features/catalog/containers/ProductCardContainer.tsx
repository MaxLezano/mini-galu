"use client";

import type { ProductSummary } from "@mini-galu/contracts";
import { type CSSProperties, useState } from "react";
import { useAddToCart } from "@/features/cart/use-add-to-cart";
import { useIsFavorite, useToggleFavorite } from "@/features/favorites/use-toggle-favorite";
import { ProductCard } from "../components/ProductCard";

type Props = {
  product: ProductSummary;
  arch?: boolean;
  index?: number;
  reveal?: boolean;
  className?: string;
  style?: CSSProperties;
};

/** Conecta la tarjeta con la bolsa y favoritos. */
export function ProductCardContainer({ product, ...rest }: Props) {
  const isFavorite = useIsFavorite(product.slug);
  const toggleFavorite = useToggleFavorite();
  const addToCart = useAddToCart();
  const [quick, setQuick] = useState(false);

  return (
    <ProductCard
      {...rest}
      product={product}
      isFavorite={isFavorite}
      quickOpen={quick}
      onToggleFavorite={(btn) => toggleFavorite(product.slug, btn)}
      onQuickToggle={() => setQuick((q) => !q)}
      onAdd={(size, img) => {
        setQuick(false);
        addToCart(product, size, { from: img });
      }}
    />
  );
}
