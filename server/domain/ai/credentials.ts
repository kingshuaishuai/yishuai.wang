/** @param secret - Deployment-only 256-bit encryption key. @returns Whether encryption is configured. */
export function encryptionReady(secret: string): boolean { return /^[a-f0-9]{64}$/i.test(secret); }
/** @param secret - Deployment-only hex key. @returns A non-extractable AES key. */
async function importKey(secret: string): Promise<CryptoKey> {
  if (!encryptionReady(secret)) throw new Error('AI settings encryption is not configured.');
  const bytes = Uint8Array.from(secret.match(/../g)!, pair => parseInt(pair, 16));
  return crypto.subtle.importKey('raw', bytes, 'AES-GCM', false, ['encrypt', 'decrypt']);
}
const additionalData = new TextEncoder().encode('yishuai:deepseek-key:v1');
/** @param value - New API credential. @param secret - Deployment encryption key. @returns Authenticated ciphertext. */
export async function encryptKey(value: string, secret: string): Promise<string> {
  const iv = crypto.getRandomValues(new Uint8Array(12));
  const encrypted = await crypto.subtle.encrypt({ name: 'AES-GCM', iv, additionalData }, await importKey(secret), new TextEncoder().encode(value));
  return `v1.${Buffer.from(iv).toString('base64')}.${Buffer.from(encrypted).toString('base64')}`;
}
/** @param value - Stored authenticated ciphertext. @param secret - Deployment encryption key. @returns Credential for one server request. */
export async function decryptKey(value: string, secret: string): Promise<string> {
  const [version, nonce, ciphertext] = value.split('.');
  if (version !== 'v1' || !nonce || !ciphertext) throw new Error('Invalid encrypted credential.');
  const decrypted = await crypto.subtle.decrypt({ name: 'AES-GCM', iv: Buffer.from(nonce, 'base64'), additionalData }, await importKey(secret), Buffer.from(ciphertext, 'base64'));
  return new TextDecoder().decode(decrypted);
}
