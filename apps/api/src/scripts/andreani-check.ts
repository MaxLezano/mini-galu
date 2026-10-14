/**
 * Prueba las credenciales de Andreani del .env sin mostrarlas: login, cotización a un CP y sucursales.
 * Uso: pnpm andreani:check [codigoPostal]
 */
import { loadConfig } from "../config";
import { AndreaniClient } from "../shipping/infrastructure/andreani/andreani-client";

const VARS = [
  "ANDREANI_USER",
  "ANDREANI_PASSWORD",
  "ANDREANI_CLIENT",
  "ANDREANI_CONTRACT_DOMICILIO",
  "ANDREANI_CONTRACT_SUCURSAL",
] as const;

async function main() {
  const config = loadConfig();
  const cfg = config.andreani;
  if (!cfg) {
    const missing = VARS.filter((v) => !process.env[v]);
    console.log(`✗ Faltan en el .env: ${missing.join(", ")} (ANDREANI_ENV=qa|produccion, por defecto qa)`);
    process.exitCode = 1;
    return;
  }
  const cp = process.argv[2] ?? "1414";
  const api = new AndreaniClient(cfg);
  console.log(`Andreani ${cfg.env === "produccion" ? "PRODUCCIÓN" : "QA (pruebas)"} · ${api.baseUrl}`);
  try {
    await api.json(`/v2/sucursales?codigoPostal=${cp}`);
    console.log("✓ Login y token: ok");
  } catch (e) {
    console.log(`✗ Login: ${e instanceof Error ? e.message : e}`);
    process.exitCode = 1;
    return;
  }
  for (const [label, contrato] of Object.entries(cfg.contracts)) {
    const q = new URLSearchParams({
      cpDestino: cp,
      contrato,
      cliente: cfg.client,
      "bultos[0][volumen]": "6000",
      "bultos[0][kilos]": "0.5",
    });
    try {
      const r = await api.json<{ tarifaConIva?: { total?: string } }>(`/v1/tarifas?${q}`);
      console.log(`✓ Tarifa a ${label} (CP ${cp}, bolsa de 500 g): $${r.tarifaConIva?.total ?? "?"} con IVA`);
    } catch (e) {
      console.log(`✗ Tarifa a ${label}: ${e instanceof Error ? e.message : e}`);
      process.exitCode = 1;
    }
  }
}

main();
