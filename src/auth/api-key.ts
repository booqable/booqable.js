import { AxiosRequestConfig } from 'axios';

export class ApiKeyAuth {
  constructor(private apiKey: string) {}

  async apply(config: AxiosRequestConfig): Promise<AxiosRequestConfig> {
    config.headers = config.headers || {};
    config.headers['Authorization'] = `Bearer ${this.apiKey}`;
    return config;
  }
}
