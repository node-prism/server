import crypto from "crypto";

type Algorithm = "sha256" | "sha512";

export class Hasher {
  private algorithm: "sha256" | "sha512";
  private saltLength: number;

  constructor(algorithm: Algorithm = "sha256", saltLength: number = 64) {
    this.algorithm = algorithm;
    this.saltLength = saltLength;
  }

  verify(encoded: string, string: string): boolean {
    const { algorithm, salt } = this.parse(encoded);
    const _encoded = this.hash(string, algorithm, salt);
    return _encoded === encoded;
  }

  encode(string: string): string {
    const salt = crypto.randomBytes(this.saltLength).toString("base64");
    return this.hash(string, this.algorithm, salt);
  }

  hash(string: string, algorithm: Algorithm, salt: string): string {
    const hash = crypto.createHash(algorithm);

    hash.update(string);
    hash.update(salt, "utf8");

    const digest = hash.digest("base64");

    return `${algorithm}:${salt}:${digest}`;
  }

  parse(encoded: string): { algorithm: Algorithm, salt: string, digest: string } {
    const parts = encoded.split(":");

    if (parts.length !== 3) {
      throw new Error(`Invalid hash string. Expected 3 parts, got ${parts.length}`);
    }

    const algorithm: Algorithm = parts[0] as Algorithm;
    const salt: string = parts[1];
    const digest: string = parts[2];

    return {
      algorithm,
      salt,
      digest,
    };
  }
}

export const hash = new Hasher();
