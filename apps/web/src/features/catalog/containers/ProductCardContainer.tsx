"use client";

import type { ProductSummary } from "@mini-galu/contracts";
import { type CSSProperties, useState } from "react";
import { useAddToCart } from "@/features/cart/use-add-to-cart";
import { useInstallmentPlan } from "@/features/checkout/installments-store";
import { useIsFavorite, useToggleFavorite } from "@/features/favorites/use-toggle-favorite";
import { type CardPick, ProductCard } from "../components/ProductCard";

type Props = {
  product: ProductSummary;
  arch?: boolean;
  index?: number;
  reveal?: boolean;
  className?: string;
  style?: CSSProperties;
  pick?: CardPick;
};

/** Conecta la tarjeta con la bolsa y favoritos. */
export function ProductCardContainer({ product, ...rest }: Props) {
  const isFavorite = useIsFavorite(product.slug);
  const toggleFavorite = useToggleFavorite();
  const addToCart = useAddToCart();
  const [quick, setQuick] = useState(false);
  const plan = useInstallmentPlan(product.priceCents);

  return (
    <ProductCard
      {...rest}
      product={product}
      isFavorite={isFavorite}
      interestFree={plan?.interestFree ?? 1}
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
