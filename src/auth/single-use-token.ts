import { AxiosRequestConfig } from 'axios';
import * as jwt from 'jsonwebtoken';
import * as crypto from 'crypto';

export interface SingleUseTokenOptions {
  token?: string;
  algorithm: 'HS256' | 'RS256' | 'ES256';
  secret?: string;
  privateKey?: string;
  companyId?: string;
  userId?: string;
  expirationPeriod: number; // in seconds
}

export class SingleUseTokenAuth {
  constructor(private options: SingleUseTokenOptions) {
    if (!options.token && !options.secret && !options.privateKey) {
      throw new Error('Single-use token authentication requires either token, secret, or privateKey');
    }
  }

  async apply(config: AxiosRequestConfig): Promise<AxiosRequestConfig> {
    const token = this.options.token || this.generateToken(config);

    config.headers = config.headers || {};
    config.headers['Authorization'] = `Bearer ${token}`;

    return config;
  }

  private generateToken(config: AxiosRequestConfig): string {
    const now = Math.floor(Date.now() / 1000);
    const method = (config.method || 'GET').toUpperCase();
    const path = this.extractPath(config.url || '');
    const bodyHash = this.hashBody(config.data);

    const payload: any = {
      alg: this.options.algorithm,
      iat: now,
      exp: now + this.options.expirationPeriod,
      aud: path,
      sub: method,
      iss: this.options.companyId || 'unknown',
      jti: this.generateJti(),
      request: {
        method,
        path,
        body_hash: bodyHash,
      },
    };

    if (this.options.userId) {
      payload.user_id = this.options.userId;
    }

    if (this.options.companyId) {
      payload.company_id = this.options.companyId;
    }

    const signOptions: jwt.SignOptions = {
      algorithm: this.options.algorithm,
    };

    const secret = this.options.secret || this.options.privateKey!;

    return jwt.sign(payload, secret, signOptions);
  }

  private extractPath(url: string): string {
    try {
      const urlObj = new URL(url);
      return urlObj.pathname + urlObj.search;
    } catch {
      // If URL is relative, return as is
      return url;
    }
  }

  private hashBody(data: any): string {
    if (!data) {
      return '';
    }

    const bodyString = typeof data === 'string' ? data : JSON.stringify(data);
    return crypto.createHash('sha256').update(bodyString).digest('hex');
  }

  private generateJti(): string {
    return crypto.randomBytes(16).toString('hex');
  }
}
