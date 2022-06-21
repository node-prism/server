/// <reference types="node" />
export interface JWTPayload {
    /** expiration */
    exp?: number;
    /** subject */
    sub?: string | number;
    /** issued at */
    iat?: number;
    /** not before */
    nbf?: number;
    /** jwt id */
    jti?: number;
    /** issuer */
    iss?: string;
    /** audience */
    aud?: string | number;
    /** whatever */
    [k: string]: any;
}
export interface JWTHeader {
    /** encoding alg used */
    alg: string;
    /** token type */
    type: "JWT";
    /** key id */
    kid?: string;
}
export interface JWTToken {
    header: JWTHeader;
    payload: JWTPayload;
    signature: Buffer;
}
export interface VerifyOptions {
    sig?: boolean;
    alg?: string;
    exp?: boolean;
    sub?: string | number;
    iat?: number;
    nbf?: boolean;
    jti?: number;
    iss?: string;
    aud?: string | number;
}
export interface VerifyResult {
    sig?: boolean;
    iat?: boolean;
    nbf?: boolean;
    exp?: boolean;
    jti?: boolean;
    iss?: boolean;
    sub?: boolean;
    aud?: boolean;
    decoded: JWTToken;
}
declare const algorithms: readonly ["HS256", "HS384", "HS512", "RS256", "RS384", "RS512"];
declare type Algorithm = typeof algorithms[number];
declare function encode(payload: JWTPayload, key: string | Buffer, alg?: Algorithm): string;
declare function decode(encoded: string): JWTToken;
declare function verify(encoded: string, key: string | Buffer, opts?: VerifyOptions): VerifyResult;
export { encode, decode, verify, };
