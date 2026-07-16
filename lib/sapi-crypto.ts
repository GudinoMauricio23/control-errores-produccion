import crypto from 'crypto';

const ALGORITHM = 'aes-256-gcm';

function getKey(): Buffer {
  const secret = process.env.SAPI_ENCRYPTION_KEY;

  if (!secret || secret.length < 32) {
    throw new Error(
      'SAPI_ENCRYPTION_KEY no está configurada o tiene menos de 32 caracteres.'
    );
  }

  return crypto.createHash('sha256').update(secret).digest();
}

export function encryptSecret(value?: string | null): string | null {
  const plainText = value?.trim();
  if (!plainText) return null;

  const iv = crypto.randomBytes(12);
  const cipher = crypto.createCipheriv(ALGORITHM, getKey(), iv);

  const encrypted = Buffer.concat([
    cipher.update(plainText, 'utf8'),
    cipher.final(),
  ]);

  const authTag = cipher.getAuthTag();

  return [
    iv.toString('base64'),
    authTag.toString('base64'),
    encrypted.toString('base64'),
  ].join('.');
}

export function decryptSecret(value?: string | null): string | null {
  if (!value) return null;

  try {
    const [ivBase64, authTagBase64, encryptedBase64] = value.split('.');
    if (!ivBase64 || !authTagBase64 || !encryptedBase64) return null;

    const decipher = crypto.createDecipheriv(
      ALGORITHM,
      getKey(),
      Buffer.from(ivBase64, 'base64')
    );

    decipher.setAuthTag(Buffer.from(authTagBase64, 'base64'));

    const decrypted = Buffer.concat([
      decipher.update(Buffer.from(encryptedBase64, 'base64')),
      decipher.final(),
    ]);

    return decrypted.toString('utf8');
  } catch {
    return null;
  }
}
