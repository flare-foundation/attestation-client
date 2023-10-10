import { createHash } from "crypto";

export function base58Checksum(decodedAddress: Buffer): boolean {
  const preChecksum = decodedAddress.subarray(-4);
  const hash1 = createHash("sha256").update(decodedAddress.subarray(0, -4)).digest();
  const hash2 = createHash("sha256").update(hash1).digest();
  const newChecksum = hash2.subarray(0, 4);
  return preChecksum.equals(newChecksum);
}
