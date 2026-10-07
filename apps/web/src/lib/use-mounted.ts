"use client";

import { useEffect, useState } from "react";

/** true después de hidratar: para lo que depende del reloj o de localStorage. */
export function useMounted() {
  const [m, setM] = useState(false);
  useEffect(() => setM(true), []);
  return m;
}
