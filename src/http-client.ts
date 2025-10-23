import axios, { AxiosInstance, AxiosRequestConfig, AxiosResponse } from 'axios';
import axiosRetry from 'axios-retry';
import { ClientOptions, ApiResponse, ListOptions, RequestOptions } from './types';
import { createError } from './errors';
import { RateLimitTracker } from './rate-limit';
import { ApiKeyAuth } from './auth/api-key';
import { OAuthAuth } from './auth/oauth';
import { SingleUseTokenAuth } from './auth/single-use-token';
import { JsonApiSerializer } from './json-api-serializer';

export class HttpClient {
  private axios: AxiosInstance;
  private auth: ApiKeyAuth | OAuthAuth | SingleUseTokenAuth | null = null;
  private rateLimitTracker = new RateLimitTracker();
  public lastResponse: AxiosResponse | null = null;

  constructor(private options: ClientOptions) {
    this.axios = this.createAxiosInstance();
    this.setupAuth();
    this.setupRetry();
  }

  private createAxiosInstance(): AxiosInstance {
    const instance = axios.create({
      baseURL: this.options.apiEndpoint,
      timeout: this.options.timeout || 30000,
      headers: {
        'Content-Type': this.options.defaultMediaType || 'application/vnd.api+json',
        'Accept': this.options.defaultMediaType || 'application/vnd.api+json',
        'User-Agent': this.options.userAgent || 'Booqable Node.js Client/1.0.0',
      },
      proxy: this.options.proxy ? this.parseProxy(this.options.proxy) : undefined,
    });

    // Request interceptor for authentication
    instance.interceptors.request.use(
      async (config) => {
        if (this.auth) {
          const updatedConfig = await this.auth.apply(config as any);
          return updatedConfig as any;
        }
        return config;
      },
      (error) => Promise.reject(error)
    );

    // Response interceptor for rate limiting and error handling
    instance.interceptors.response.use(
      (response) => {
        this.lastResponse = response;
        this.rateLimitTracker.update(this.normalizeHeaders(response.headers));
        return response;
      },
      (error) => {
        if (error.response) {
          this.lastResponse = error.response;
          this.rateLimitTracker.update(this.normalizeHeaders(error.response.headers));

          const rateLimit = error.response.status === 429 ? this.rateLimitTracker.get() : undefined;
          throw createError(
            error.response.status,
            this.normalizeHeaders(error.response.headers),
            error.response.data,
            rateLimit
          );
        }
        throw error;
      }
    );

    return instance;
  }

  private setupAuth(): void {
    // OAuth takes precedence
    if (this.options.clientId && this.options.clientSecret) {
      this.auth = new OAuthAuth({
        clientId: this.options.clientId,
        clientSecret: this.options.clientSecret,
        apiEndpoint: this.options.apiEndpoint!,
        readToken: this.options.readToken,
        writeToken: this.options.writeToken,
      });
    } else if (this.options.apiKey) {
      this.auth = new ApiKeyAuth(this.options.apiKey);
    } else if (this.options.singleUseToken || this.options.singleUseTokenSecret || this.options.singleUseTokenPrivateKey) {
      this.auth = new SingleUseTokenAuth({
        token: this.options.singleUseToken,
        algorithm: this.options.singleUseTokenAlgorithm || 'HS256',
        secret: this.options.singleUseTokenSecret,
        privateKey: this.options.singleUseTokenPrivateKey,
        companyId: this.options.singleUseTokenCompanyId,
        userId: this.options.singleUseTokenUserId,
        expirationPeriod: this.options.singleUseTokenExpirationPeriod || 600,
      });
    }
  }

  private setupRetry(): void {
    if (!this.options.noRetries) {
      axiosRetry(this.axios, {
        retries: this.options.maxRetries ?? 2,
        retryDelay: (retryCount) => {
          return axiosRetry.exponentialDelay(retryCount, undefined, 2000);
        },
        retryCondition: (error) => {
          // Retry on network errors and 5xx errors
          return axiosRetry.isNetworkOrIdempotentRequestError(error) ||
            (error.response?.status ? error.response.status >= 500 : false);
        },
      });
    }
  }

  async get<T = any>(path: string, options: RequestOptions = {}): Promise<T> {
    const response = await this.axios.get(path, this.buildConfig(options));
    return this.processResponse(response);
  }

  async post<T = any>(path: string, data?: any, options: RequestOptions = {}): Promise<T> {
    const serializedData = data ? this.serializeRequest(data) : undefined;
    const response = await this.axios.post(path, serializedData, this.buildConfig(options));
    return this.processResponse(response);
  }

  async put<T = any>(path: string, data?: any, options: RequestOptions = {}): Promise<T> {
    const serializedData = data ? this.serializeRequest(data) : undefined;
    const response = await this.axios.put(path, serializedData, this.buildConfig(options));
    return this.processResponse(response);
  }

  async patch<T = any>(path: string, data?: any, options: RequestOptions = {}): Promise<T> {
    const serializedData = data ? this.serializeRequest(data) : undefined;
    const response = await this.axios.patch(path, serializedData, this.buildConfig(options));
    return this.processResponse(response);
  }

  async delete<T = any>(path: string, options: RequestOptions = {}): Promise<T> {
    const response = await this.axios.delete(path, this.buildConfig(options));
    return this.processResponse(response);
  }

  async head(path: string, options: RequestOptions = {}): Promise<void> {
    await this.axios.head(path, this.buildConfig(options));
  }

  async *paginate<T = any>(path: string, options: ListOptions = {}): AsyncGenerator<T[], void, unknown> {
    let nextUrl: string | null = path;
    const config = this.buildConfig(options);

    while (nextUrl) {
      const response: AxiosResponse<ApiResponse> = await this.axios.get(nextUrl, config);
      this.lastResponse = response;
      this.rateLimitTracker.update(this.normalizeHeaders(response.headers));

      const data = JsonApiSerializer.deserialize(response.data);
      yield Array.isArray(data) ? data : [data];

      // Check if we've hit the rate limit
      if (this.rateLimitTracker.isLimitReached()) {
        break;
      }

      // Get next page URL
      nextUrl = response.data.links?.next || null;

      // If not auto-paginating, stop after first page
      if (!this.options.autoPaginate) {
        break;
      }
    }
  }

  async paginateAll<T = any>(path: string, options: ListOptions = {}): Promise<T[]> {
    const results: T[] = [];

    for await (const page of this.paginate<T>(path, options)) {
      results.push(...page);
    }

    return results;
  }

  private buildConfig(options: RequestOptions): AxiosRequestConfig {
    const config: AxiosRequestConfig = {
      headers: options.headers,
      timeout: options.timeout,
    };

    if (options.params) {
      config.params = this.buildParams(options.params);
    }

    return config;
  }

  private buildParams(params: Record<string, any>): Record<string, string> {
    const result: Record<string, string> = {};

    for (const [key, value] of Object.entries(params)) {
      if (value === undefined || value === null) {
        continue;
      }

      if (Array.isArray(value)) {
        result[key] = value.join(',');
      } else if (typeof value === 'object') {
        // Handle nested objects like filter[status]=active
        for (const [nestedKey, nestedValue] of Object.entries(value)) {
          if (nestedValue !== undefined && nestedValue !== null) {
            result[`${key}[${nestedKey}]`] = String(nestedValue);
          }
        }
      } else {
        result[key] = String(value);
      }
    }

    return result;
  }

  private serializeRequest(data: any): any {
    if (data.type && data.attributes) {
      // Already in JSON:API format
      return { data };
    }

    // For now, return as-is and let the API handle it
    // In a more complete implementation, you'd serialize to JSON:API format
    return { data };
  }

  private processResponse<T>(response: AxiosResponse): T {
    if (!response.data) {
      return null as T;
    }

    // If response is JSON:API format, deserialize it
    if (response.data.data !== undefined) {
      return JsonApiSerializer.deserialize(response.data);
    }

    return response.data;
  }

  private normalizeHeaders(headers: any): Record<string, string> {
    const normalized: Record<string, string> = {};

    for (const [key, value] of Object.entries(headers)) {
      if (typeof value === 'string') {
        normalized[key.toLowerCase()] = value;
      }
    }

    return normalized;
  }

  private parseProxy(proxyUrl: string): any {
    try {
      const url = new URL(proxyUrl);
      return {
        host: url.hostname,
        port: parseInt(url.port, 10),
        protocol: url.protocol.replace(':', ''),
        auth: url.username && url.password ? {
          username: url.username,
          password: url.password,
        } : undefined,
      };
    } catch {
      return false;
    }
  }

  getRateLimit() {
    return this.rateLimitTracker.get();
  }

  getOAuthClient(): OAuthAuth | null {
    return this.auth instanceof OAuthAuth ? this.auth : null;
  }
}
