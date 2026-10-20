import type { StorePolicies } from "@mini-galu/contracts";

/** Dónde quedan guardados los ajustes del panel. Devuelve lo guardado tal cual (null: nunca se guardaron). */
export interface PoliciesStore {
  get(): Promise<unknown | null>;
  save(p: StorePolicies): Promise<void>;
}
