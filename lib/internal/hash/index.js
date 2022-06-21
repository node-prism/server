import crypto from "crypto";
export class Hasher {
    constructor(algorithm = "sha256", saltLength = 64) {
        this.algorithm = algorithm;
        this.saltLength = saltLength;
    }
    verify(encoded, string) {
        const { algorithm, salt } = this.parse(encoded);
        const _encoded = this.hash(string, algorithm, salt);
        return _encoded === encoded;
    }
    encode(string) {
        const salt = crypto.randomBytes(this.saltLength).toString("base64");
        return this.hash(string, this.algorithm, salt);
    }
    hash(string, algorithm, salt) {
        const hash = crypto.createHash(algorithm);
        hash.update(string);
        hash.update(salt, "utf8");
        const digest = hash.digest("base64");
        return `${algorithm}:${salt}:${digest}`;
    }
    parse(encoded) {
        const parts = encoded.split(":");
        if (parts.length !== 3) {
            throw new Error(`Invalid hash string. Expected 3 parts, got ${parts.length}`);
        }
        const algorithm = parts[0];
        const salt = parts[1];
        const digest = parts[2];
        return {
            algorithm,
            salt,
            digest,
        };
    }
}
export const hash = new Hasher();
//# sourceMappingURL=index.js.map