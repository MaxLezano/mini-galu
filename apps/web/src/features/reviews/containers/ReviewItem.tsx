"use client";

import type { ReviewableItem, ReviewPoints } from "@mini-galu/contracts";
import { imageThumb, type Size, sizeLabel } from "@mini-galu/contracts";
import Link from "next/link";
import { useEffect, useState } from "react";
import { ApiRequestError, api } from "@/lib/api";
import { ReviewDone } from "../components/ReviewDone";
import { ReviewForm } from "../components/ReviewForm";
import { draftError, draftForm, emptyDraft } from "../review-form";

type Props = {
  item: ReviewableItem;
  number: string;
  token: string;
  author: string;
  /** Reglas de los puntos (null si están apagados). */
  rules: ReviewPoints | null;
};

/** Una prenda del pedido: su form de reseña o, si ya la dejó, lo que escribió. */
export function ReviewItem({ item: initial, number, token, author, rules }: Props) {
  const [item, setItem] = useState(initial);
  const [draft, setDraft] = useState(emptyDraft);
  const [preview, setPreview] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [sending, setSending] = useState(false);

  useEffect(() => {
    if (!draft.photo) return setPreview(null);
    const url = URL.createObjectURL(draft.photo);
    setPreview(url);
    return () => URL.revokeObjectURL(url);
  }, [draft.photo]);

  const submit = async () => {
    const problem = draftError(draft);
    if (problem) return setError(problem);
    setError(null);
    setSending(true);
    try {
      setItem(await api.submitReview(number, token, item.id, draftForm(draft)));
    } catch (e) {
      setError(e instanceof ApiRequestError ? e.message : "No pudimos mandar la reseña. Probá de nuevo.");
    } finally {
      setSending(false);
    }
  };

  return (
    <article className="rv-item" aria-label={item.name}>
      <Link href={`/producto/${item.slug}`} className="rv-item-ph">
        {item.imageUrl && <img src={imageThumb(item.imageUrl)} alt="" loading="lazy" />}
      </Link>
      <div className="rv-item-head">
        <h2 className="display h3">{item.name}</h2>
        <span className="muted">Talle {sizeLabel(item.size as Size)}</span>
      </div>
      <div className="rv-item-main">
        {item.review ? (
          <ReviewDone review={item.review} rules={rules} />
        ) : (
          <ReviewForm
            id={item.id}
            draft={draft}
            photoPreview={preview}
            author={author}
            error={error}
            sending={sending}
            onChange={(d) => {
              setDraft(d);
              setError(null);
            }}
            onSubmit={submit}
          />
        )}
      </div>
    </article>
  );
}
