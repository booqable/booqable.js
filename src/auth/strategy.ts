/** The mutable request an {@link AuthStrategy} decorates before it is sent. */
export interface RequestContext {
  method: string
  /** Fully-qualified request URL, including the query string. */
  url: string
  headers: Record<string, string>
  body?: string
}

/** Decorates outgoing requests with authentication. */
export interface AuthStrategy {
  apply(request: RequestContext): Promise<void>
}
