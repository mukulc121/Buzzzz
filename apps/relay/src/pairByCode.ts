import { HttpError, readJson, tokenHash } from "./security.ts";
import { pairingInput } from "./pairingInput.ts";

export async function pairByCode(request: Request, env: Env): Promise<Response> {
  const limit = await env.PAIRING_RATE_LIMITER.limit({
    key: request.headers.get("CF-Connecting-IP") ?? "local",
  });
  if (!limit.success) throw new HttpError(429, "Too many pairing attempts. Try again later");
  const input = pairingInput(await readJson(request, 1024));
  const hash = await tokenHash(input.code);
  const roomId = await env.PAIRING_CODES.getByName(hash).lookup();
  if (!roomId) throw new HttpError(401, "Pairing code expired or invalid");
  const response = await env.ROOMS.getByName(roomId).pairByCode(
    input.code,
    input.device,
    request.headers.get("CF-Connecting-IP") ?? "local",
  );
  if (response.status === 410) throw new HttpError(401, "Pairing code expired or invalid");
  return response;
}
