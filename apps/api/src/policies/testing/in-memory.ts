import type { StorePolicies } from "@mini-galu/contracts";
import type { PoliciesStore } from "../application/ports";

export class MemoryPolicies implements PoliciesStore {
  constructor(public value: StorePolicies | null = null) {}
  async get() {
    return this.value;
  }
  async save(p: StorePolicies) {
    this.value = p;
  }
}
