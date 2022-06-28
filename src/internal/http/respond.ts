import { isNativeError } from "node:util/types";
import Context from "./context";

export interface ISuccessResponse {
  code: number;
  data: any;
}

export interface IErrorResponse {
  code: number;
  error: string | undefined;
}

interface IPaginatedResponse extends ISuccessResponse {
  page: number;
  total_pages: number;
  total_items: number;
}

enum Status {
  OK = 200,
  Created = 201,
  Accepted = 202,
  NonAuthoritativeInformation = 203,
  NoContent = 204,
  ResetContent = 205,
  PartialContent = 206,
  BadRequest = 400,
  Unauthorized = 401,
  PaymentRequired = 402,
  Forbidden = 403,
  NotFound = 404,
  MethodNotAllowed = 405,
  NotAcceptable = 406,
  ProxyAuthenticationRequired = 407,
  ImATeapot = 418,
  UnprocessableEntity = 422,
  TooManyRequests = 429,
  InternalServerError = 500,
}

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
  return function(context: Context, data: any) {
    context.res.status(status);
  }
}

function createSuccessResponder(status: Status) {
  return function(context: Context, data?: any): ISuccessResponse {
    context.res.status(status);

    context.res.json({ code: status, data });

    return { code: status, data };
  }
}

function createErrorResponder(status: Status) {
  return function(context: Context, error?: any): IErrorResponse {
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
  }
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

