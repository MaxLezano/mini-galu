import { createHash, createHmac } from "node:crypto";

export type SigV4Credentials = { accessKeyId: string; secretAccessKey: string; region: string; service: string };

export const sha256Hex = (data: string | Uint8Array) => createHash("sha256").update(data).digest("hex");
const hmac = (key: string | Buffer, data: string) => createHmac("sha256", key).update(data).digest();

/** "20130524T000000Z": el formato de fecha de AWS. */
export const amzDate = (now: Date) =>
  now
    .toISOString()
    .replace(/[-:]/g, "")
    .replace(/\.\d{3}/, "");

/**
 * Firma AWS Signature V4 (S3, R2 y compatibles) de un pedido sin query string. `headers` tiene que traer
 * `x-amz-date` y `x-amz-content-sha256`; se firman todos, más `host`. Devuelve el header Authorization.
 */
export function signV4(
  creds: SigV4Credentials,
  req: { method: string; url: URL; headers: Record<string, string> },
): string {
  const headers = Object.fromEntries(
    Object.entries({ ...req.headers, host: req.url.host }).map(([k, v]) => [k.toLowerCase(), v.trim()]),
  );
  const names = Object.keys(headers).sort();
  const signedHeaders = names.join(";");
  const date = headers["x-amz-date"] as string;
  const day = date.slice(0, 8);
  const canonical = [
    req.method,
    req.url.pathname,
    "",
    ...names.map((n) => `${n}:${headers[n]}`),
    "",
    signedHeaders,
    headers["x-amz-content-sha256"],
  ].join("\n");
  const scope = `${day}/${creds.region}/${creds.service}/aws4_request`;
  const toSign = ["AWS4-HMAC-SHA256", date, scope, sha256Hex(canonical)].join("\n");
  const key = hmac(hmac(hmac(hmac(`AWS4${creds.secretAccessKey}`, day), creds.region), creds.service), "aws4_request");
  const signature = createHmac("sha256", key).update(toSign).digest("hex");
  return `AWS4-HMAC-SHA256 Credential=${creds.accessKeyId}/${scope}, SignedHeaders=${signedHeaders}, Signature=${signature}`;
}
