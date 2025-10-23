export interface ClientOptions {
  // Authentication options
  apiKey?: string;
  clientId?: string;
  clientSecret?: string;

  // Single-use token (JWT) authentication
  singleUseToken?: string;
  singleUseTokenAlgorithm?: 'HS256' | 'RS256' | 'ES256';
  singleUseTokenSecret?: string;
  singleUseTokenPrivateKey?: string;
  singleUseTokenCompanyId?: string;
  singleUseTokenUserId?: string;
  singleUseTokenExpirationPeriod?: number; // in seconds, default 600

  // OAuth token management
  readToken?: () => Promise<OAuthToken | null> | OAuthToken | null;
  writeToken?: (token: OAuthToken) => Promise<void> | void;

  // API configuration
  apiDomain?: string;
  apiVersion?: number | 'boomerang';
  apiEndpoint?: string;
  companyId?: string; // Required for most operations

  // Request configuration
  perPage?: number;
  autoPaginate?: boolean;
  defaultMediaType?: string;
  userAgent?: string;
  proxy?: string;
  timeout?: number;

  // Behavior
  debug?: boolean;
  noRetries?: boolean;
  maxRetries?: number;
}

export interface OAuthToken {
  access_token: string;
  refresh_token?: string;
  token_type: string;
  expires_in?: number;
  expires_at?: number;
  scope?: string;
}

export interface RequestOptions {
  params?: Record<string, any>;
  headers?: Record<string, string>;
  timeout?: number;
}

export interface ListOptions extends RequestOptions {
  include?: string | string[];
  filter?: Record<string, any>;
  sort?: string | string[];
  page?: {
    size?: number;
    number?: number;
  };
  stats?: string | string[];
}

export interface FindOptions extends RequestOptions {
  include?: string | string[];
}

export interface PaginationInfo {
  current_page: number;
  per_page: number;
  total_pages?: number;
  total_count?: number;
}

export interface RateLimit {
  limit: number;
  remaining: number;
  period: number; // in seconds
  resetsAt: Date;
  resetsIn: number; // seconds until reset
}

export interface ApiResponse<T = any> {
  data: T;
  meta?: {
    total_count?: number;
    [key: string]: any;
  };
  links?: {
    self?: string;
    first?: string;
    prev?: string;
    next?: string;
    last?: string;
  };
  included?: any[];
}

export interface JsonApiResource {
  id: string;
  type: string;
  attributes?: Record<string, any>;
  relationships?: Record<string, JsonApiRelationship>;
  meta?: Record<string, any>;
}

export interface JsonApiRelationship {
  data?: JsonApiResourceIdentifier | JsonApiResourceIdentifier[] | null;
  links?: {
    self?: string;
    related?: string;
  };
  meta?: Record<string, any>;
}

export interface JsonApiResourceIdentifier {
  id: string;
  type: string;
  meta?: Record<string, any>;
}

export interface ErrorResponse {
  errors: Array<{
    status?: string;
    code?: string;
    title?: string;
    detail?: string;
    source?: {
      pointer?: string;
      parameter?: string;
    };
    meta?: Record<string, any>;
  }>;
}
