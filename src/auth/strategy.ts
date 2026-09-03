import type { AuthRequestContext, CustomAuthStrategy } from '../types.js'

/** The mutable request an {@link AuthStrategy} decorates before it is sent. */
export type RequestContext = AuthRequestContext

/** Decorates outgoing requests with authentication. */
export type AuthStrategy = CustomAuthStrategy
