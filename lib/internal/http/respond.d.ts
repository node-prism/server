import Context from "./context.js";
export interface ISuccessResponse {
    code: number;
    data: any;
}
export interface IErrorResponse {
    code: number;
    error: string | undefined;
}
declare const Respond: {
    paginatedOK: (context: Context, data: any) => void;
    OK: (context: Context, data?: any) => ISuccessResponse;
    Created: (context: Context, data?: any) => ISuccessResponse;
    Accepted: (context: Context, data?: any) => ISuccessResponse;
    NonAuthoritativeInformation: (context: Context, data?: any) => ISuccessResponse;
    NoContent: (context: Context, data?: any) => ISuccessResponse;
    ResetContent: (context: Context, data?: any) => ISuccessResponse;
    PartialContent: (context: Context, data?: any) => ISuccessResponse;
    BadRequest: (context: Context, error?: any) => IErrorResponse;
    Unauthorized: (context: Context, error?: any) => IErrorResponse;
    PaymentRequired: (context: Context, error?: any) => IErrorResponse;
    Forbidden: (context: Context, error?: any) => IErrorResponse;
    NotFound: (context: Context, error?: any) => IErrorResponse;
    MethodNotAllowed: (context: Context, error?: any) => IErrorResponse;
    NotAcceptable: (context: Context, error?: any) => IErrorResponse;
    ProxyAuthenticationRequired: (context: Context, error?: any) => IErrorResponse;
    ImATeapot: (context: Context, error?: any) => IErrorResponse;
    UnprocessableEntity: (context: Context, error?: any) => IErrorResponse;
    TooManyRequests: (context: Context, error?: any) => IErrorResponse;
    InternalServerError: (context: Context, error?: any) => IErrorResponse;
};
export default Respond;
/**
 * a `respond` must be returned from a handler. the object returned
 * by, e.g., `respond.OK` is sent via context. if it's not returned,
 * there's nothing to respond with.
 *
 * usage:
 *
 * async handler(c: Context, @from.path("id") id: number) {
 *   try {
 *     const thing = await service.GetThingById(id);
 *     return respond.OK(c, thing);
 *   } catch (e) {
 *     return respond.InternalServerError(c, e);
 *   }
 *
 * }
 */
