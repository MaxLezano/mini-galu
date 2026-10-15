import type { StorePolicies } from "@mini-galu/contracts";

/** Dónde quedan guardadas las políticas del panel (null: nunca se guardaron). */
export interface PoliciesStore {
  get(): Promise<StorePolicies | null>;
  save(p: StorePolicies): Promise<void>;
}
