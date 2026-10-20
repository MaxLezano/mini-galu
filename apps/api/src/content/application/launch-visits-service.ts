import { isPreviewOpen, previewDay } from "../domain/launch";
import type { LaunchVisitRepository, LaunchVisitTarget } from "./launch-ports";

/**
 * "Visitas al adelanto" (admin-lanzamientos): una por visitante y día mientras el lanzamiento no salió.
 * El visitante no se guarda: `hash` recibe el día + la huella (IP y navegador) y se queda solo con el resultado,
 * así una misma persona no se puede seguir de un día a otro.
 */
export class LaunchVisitsService {
  constructor(
    private readonly repo: LaunchVisitRepository,
    private readonly hash: (value: string) => string,
    private readonly now: () => Date = () => new Date(),
  ) {}

  async record(target: LaunchVisitTarget, fingerprint: string): Promise<boolean> {
    const now = this.now();
    const launch = await this.repo.findPreview(target);
    if (!launch || !isPreviewOpen(launch, now)) return false;
    const day = previewDay(now);
    return this.repo.add(launch.id, day, this.hash(`${day}|${fingerprint}`));
  }
}
