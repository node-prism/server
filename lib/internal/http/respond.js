import { isNativeError } from "node:util/types";
var Status;
(function (Status) {
    Status[Status["OK"] = 200] = "OK";
    Status[Status["Created"] = 201] = "Created";
    Status[Status["Accepted"] = 202] = "Accepted";
    Status[Status["NonAuthoritativeInformation"] = 203] = "NonAuthoritativeInformation";
    Status[Status["NoContent"] = 204] = "NoContent";
    Status[Status["ResetContent"] = 205] = "ResetContent";
    Status[Status["PartialContent"] = 206] = "PartialContent";
    Status[Status["BadRequest"] = 400] = "BadRequest";
    Status[Status["Unauthorized"] = 401] = "Unauthorized";
    Status[Status["PaymentRequired"] = 402] = "PaymentRequired";
    Status[Status["Forbidden"] = 403] = "Forbidden";
    Status[Status["NotFound"] = 404] = "NotFound";
    Status[Status["MethodNotAllowed"] = 405] = "MethodNotAllowed";
    Status[Status["NotAcceptable"] = 406] = "NotAcceptable";
    Status[Status["ProxyAuthenticationRequired"] = 407] = "ProxyAuthenticationRequired";
    Status[Status["ImATeapot"] = 418] = "ImATeapot";
    Status[Status["UnprocessableEntity"] = 422] = "UnprocessableEntity";
    Status[Status["TooManyRequests"] = 429] = "TooManyRequests";
    Status[Status["InternalServerError"] = 500] = "InternalServerError";
})(Status || (Status = {}));
const Respond = {
    paginatedOK: createPaginatedResponder(),
    OK: createSuccessResponder(Status.OK),
    Created: createSuccessResponder(Status.Created),
    Accepted: createSuccessResponder(Status.Accepted),
    NonAuthoritativeInformation: createSuccessResponder(Status.NonAuthoritativeInformation),
    NoContent: createSuccessResponder(Status.NoContent),
    ResetContent: createSuccessResponder(Status.ResetContent),
    PartialContent: createSuccessResponder(Status.PartialContent),
    BadRequest: createErrorResponder(Status.BadRequest),
    Unauthorized: createErrorResponder(Status.Unauthorized),
    PaymentRequired: createErrorResponder(Status.PaymentRequired),
    Forbidden: createErrorResponder(Status.Forbidden),
    NotFound: createErrorResponder(Status.NotFound),
    MethodNotAllowed: createErrorResponder(Status.MethodNotAllowed),
    NotAcceptable: createErrorResponder(Status.NotAcceptable),
    ProxyAuthenticationRequired: createErrorResponder(Status.ProxyAuthenticationRequired),
    ImATeapot: createErrorResponder(Status.ImATeapot),
    UnprocessableEntity: createErrorResponder(Status.UnprocessableEntity),
    TooManyRequests: createErrorResponder(Status.TooManyRequests),
    InternalServerError: createErrorResponder(Status.InternalServerError),
};
export default Respond;
// function generateResponses() {
//   Object.keys(Status)
//     .filter(str => Status[str] >= 200 && Status[str] < 300)
//     .map(str => respond[str] = createSuccessResponder(Status[str]));
//
//   Object.keys(Status)
//     .filter(str => Status[str] >= 400 && Status[str] < 500)
//     .map(str => respond[str] = createErrorResponder(Status[str]));
// }
function createPaginatedResponder() {
    const status = 200;
    return function (context, data) {
        context.res.status(status);
    };
}
function createSuccessResponder(status) {
    return function (context, data) {
        context.res.status(status);
        context.res.json({ code: status, data });
        return { code: status, data };
    };
}
function createErrorResponder(status) {
    return function (context, error) {
        context.res.status(status);
        if (error) {
            if (isNativeError(error)) {
                error = error.message;
            }
            // else if (error !== null && typeof error === "object") {
            //   error = JSON.stringify(error);
            // }
        }
        // error = error?.toString();
        context.res.json({ code: status, error });
        return { code: status, error };
    };
}
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
//# sourceMappingURL=respond.js.map