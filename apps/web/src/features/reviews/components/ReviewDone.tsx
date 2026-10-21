import type { ReviewPoints, SubmittedReview } from "@mini-galu/contracts";
import { Heart } from "lucide-react";
import { Stars } from "@/ui/atoms/Stars";

/** La reseña que ya dejó: en lugar del form, con lo que escribió y, si espera, los puntos que va a sumar. */
export function ReviewDone({ review, rules }: { review: SubmittedReview; rules: ReviewPoints | null }) {
  const earn = rules ? rules.perReview + (review.photoUrl ? rules.perPhoto : 0) : 0;
  return (
    <div className="rv-done">
      <Stars n={review.rating} />
      <p>{review.body}</p>
      {review.photoUrl && <img src={review.photoUrl} alt="Tu foto" loading="lazy" />}
      <span className="rv-thanks">
        <Heart className="i-sm" />
        {review.published
          ? "¡Gracias! Ya se ve en la tienda."
          : earn
            ? `¡Gracias! La leemos y, cuando la publiquemos, sumás ${earn} puntos.`
            : "¡Gracias! La leemos y la sumamos a la tienda."}
      </span>
    </div>
  );
}
