import type { SubmittedReview } from "@mini-galu/contracts";
import { Heart } from "lucide-react";
import { Stars } from "@/ui/atoms/Stars";

/** La reseña que ya dejó: en lugar del form, con lo que escribió. */
export function ReviewDone({ review }: { review: SubmittedReview }) {
  return (
    <div className="rv-done">
      <Stars n={review.rating} />
      <p>{review.body}</p>
      {review.photoUrl && <img src={review.photoUrl} alt="Tu foto" loading="lazy" />}
      <span className="rv-thanks">
        <Heart className="i-sm" />
        {review.published ? "¡Gracias! Ya se ve en la tienda." : "¡Gracias! La leemos y la sumamos a la tienda."}
      </span>
    </div>
  );
}
