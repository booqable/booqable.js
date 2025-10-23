import { ErrorResponse, RateLimit } from './types';

export class BooqableError extends Error {
  public responseStatus?: number;
  public responseHeaders?: Record<string, string>;
  public responseBody?: any;
  public errors?: ErrorResponse['errors'];

  constructor(message: string, responseStatus?: number, responseHeaders?: Record<string, string>, responseBody?: any) {
    super(message);
    this.name = this.constructor.name;
    this.responseStatus = responseStatus;
    this.responseHeaders = responseHeaders;
    this.responseBody = responseBody;

    if (responseBody?.errors) {
      this.errors = responseBody.errors;
    }

    Error.captureStackTrace(this, this.constructor);
  }
}

// 4xx Client Errors
export class ClientError extends BooqableError {}

export class BadRequest extends ClientError {}
export class ReadOnlyAttribute extends BadRequest {}
export class UnknownAttribute extends BadRequest {}
export class InvalidFilter extends BadRequest {}
export class InvalidFilterSyntax extends BadRequest {}
export class FilterFieldNotPresent extends BadRequest {}
export class SortFieldNotPresent extends BadRequest {}
export class InvalidSort extends BadRequest {}
export class InvalidInclude extends BadRequest {}
export class InvalidIncludeSyntax extends BadRequest {}
export class InvalidJWT extends BadRequest {}
export class MissingScope extends BadRequest {}
export class InvalidDateTimeFormat extends BadRequest {}
export class InvalidDateFormat extends BadRequest {}

export class Unauthorized extends ClientError {}

export class PaymentRequired extends ClientError {}
export class FeatureNotEnabled extends PaymentRequired {}
export class TrialExpired extends PaymentRequired {}
export class SubscriptionExpired extends PaymentRequired {}

export class Forbidden extends ClientError {}

export class NotFound extends ClientError {}
export class CompanyNotFound extends NotFound {}

export class MethodNotAllowed extends ClientError {}
export class NotAcceptable extends ClientError {}
export class ProxyAuthenticationRequired extends ClientError {}
export class RequestTimeout extends ClientError {}
export class Conflict extends ClientError {}
export class Gone extends ClientError {}
export class LengthRequired extends ClientError {}
export class PreconditionFailed extends ClientError {}
export class RequestEntityTooLarge extends ClientError {}
export class RequestUriTooLong extends ClientError {}
export class UnsupportedMediaType extends ClientError {}

export class UnprocessableEntity extends ClientError {}

export class UpgradeRequired extends ClientError {}

export class TooManyRequests extends ClientError {
  public context?: RateLimit;

  constructor(message: string, responseStatus?: number, responseHeaders?: Record<string, string>, responseBody?: any, context?: RateLimit) {
    super(message, responseStatus, responseHeaders, responseBody);
    this.context = context;
  }
}

// 5xx Server Errors
export class ServerError extends BooqableError {}

export class InternalServerError extends ServerError {}
export class NotImplemented extends ServerError {}
export class BadGateway extends ServerError {}
export class ServiceUnavailable extends ServerError {}
export class GatewayTimeout extends ServerError {}

// Error mapping
const ERROR_MAP: Record<number, typeof BooqableError> = {
  400: BadRequest,
  401: Unauthorized,
  402: PaymentRequired,
  403: Forbidden,
  404: NotFound,
  405: MethodNotAllowed,
  406: NotAcceptable,
  407: ProxyAuthenticationRequired,
  408: RequestTimeout,
  409: Conflict,
  410: Gone,
  411: LengthRequired,
  412: PreconditionFailed,
  413: RequestEntityTooLarge,
  414: RequestUriTooLong,
  415: UnsupportedMediaType,
  422: UnprocessableEntity,
  426: UpgradeRequired,
  429: TooManyRequests,
  500: InternalServerError,
  501: NotImplemented,
  502: BadGateway,
  503: ServiceUnavailable,
  504: GatewayTimeout,
};

const ERROR_CODE_MAP: Record<string, typeof BooqableError> = {
  'read_only_attribute': ReadOnlyAttribute,
  'unknown_attribute': UnknownAttribute,
  'invalid_filter': InvalidFilter,
  'invalid_filter_syntax': InvalidFilterSyntax,
  'filter_field_not_present': FilterFieldNotPresent,
  'sort_field_not_present': SortFieldNotPresent,
  'invalid_sort': InvalidSort,
  'invalid_include': InvalidInclude,
  'invalid_include_syntax': InvalidIncludeSyntax,
  'invalid_jwt': InvalidJWT,
  'missing_scope': MissingScope,
  'invalid_date_time_format': InvalidDateTimeFormat,
  'invalid_date_format': InvalidDateFormat,
  'feature_not_enabled': FeatureNotEnabled,
  'trial_expired': TrialExpired,
  'subscription_expired': SubscriptionExpired,
  'company_not_found': CompanyNotFound,
};

export function createError(
  status: number,
  headers: Record<string, string>,
  body: any,
  context?: RateLimit
): BooqableError {
  let ErrorClass = ERROR_MAP[status] || (status >= 500 ? ServerError : ClientError);

  // Check for specific error codes in response body
  if (body?.errors?.[0]?.code) {
    const errorCode = body.errors[0].code;
    ErrorClass = ERROR_CODE_MAP[errorCode] || ErrorClass;
  }

  const message = body?.errors?.[0]?.detail || body?.errors?.[0]?.title || `HTTP ${status} Error`;

  if (ErrorClass === TooManyRequests && context) {
    return new TooManyRequests(message, status, headers, body, context);
  }

  return new ErrorClass(message, status, headers, body);
}
