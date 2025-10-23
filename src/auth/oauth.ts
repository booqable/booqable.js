import { AxiosRequestConfig } from 'axios';
import axios from 'axios';
import { OAuthToken } from '../types';

export interface OAuthOptions {
  clientId: string;
  clientSecret: string;
  apiEndpoint: string;
  readToken?: () => Promise<OAuthToken | null> | OAuthToken | null;
  writeToken?: (token: OAuthToken) => Promise<void> | void;
}

export class OAuthAuth {
  private token: OAuthToken | null = null;

  constructor(private options: OAuthOptions) {}

  async apply(config: AxiosRequestConfig): Promise<AxiosRequestConfig> {
    await this.ensureValidToken();

    if (this.token) {
      config.headers = config.headers || {};
      config.headers['Authorization'] = `Bearer ${this.token.access_token}`;
    }

    return config;
  }

  async authenticateWithCode(code: string, redirectUri: string): Promise<OAuthToken> {
    const tokenUrl = `${this.options.apiEndpoint}/oauth/token`;

    const response = await axios.post(tokenUrl, {
      grant_type: 'authorization_code',
      code,
      redirect_uri: redirectUri,
      client_id: this.options.clientId,
      client_secret: this.options.clientSecret,
    });

    const token: OAuthToken = response.data;

    // Calculate expires_at if not provided
    if (token.expires_in && !token.expires_at) {
      token.expires_at = Math.floor(Date.now() / 1000) + token.expires_in;
    }

    await this.saveToken(token);
    return token;
  }

  private async ensureValidToken(): Promise<void> {
    // Load token from storage if not in memory
    if (!this.token && this.options.readToken) {
      this.token = await Promise.resolve(this.options.readToken());
    }

    // Check if token is expired
    if (this.token && this.isTokenExpired(this.token)) {
      if (this.token.refresh_token) {
        await this.refreshToken();
      } else {
        this.token = null;
      }
    }
  }

  private isTokenExpired(token: OAuthToken): boolean {
    if (!token.expires_at) {
      return false; // If no expiry, assume it's valid
    }

    const now = Math.floor(Date.now() / 1000);
    // Consider token expired 60 seconds before actual expiry
    return token.expires_at - now < 60;
  }

  private async refreshToken(): Promise<void> {
    if (!this.token?.refresh_token) {
      throw new Error('No refresh token available');
    }

    const tokenUrl = `${this.options.apiEndpoint}/oauth/token`;

    try {
      const response = await axios.post(tokenUrl, {
        grant_type: 'refresh_token',
        refresh_token: this.token.refresh_token,
        client_id: this.options.clientId,
        client_secret: this.options.clientSecret,
      });

      const newToken: OAuthToken = response.data;

      // Calculate expires_at if not provided
      if (newToken.expires_in && !newToken.expires_at) {
        newToken.expires_at = Math.floor(Date.now() / 1000) + newToken.expires_in;
      }

      await this.saveToken(newToken);
    } catch (error) {
      // If refresh fails, clear token
      this.token = null;
      throw error;
    }
  }

  private async saveToken(token: OAuthToken): Promise<void> {
    this.token = token;

    if (this.options.writeToken) {
      await Promise.resolve(this.options.writeToken(token));
    }
  }

  getToken(): OAuthToken | null {
    return this.token;
  }
}
