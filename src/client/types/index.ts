export type HttpMethod = 'GET' | 'POST' | 'PUT' | 'PATCH' | 'DELETE' | 'HEAD' | 'OPTIONS';
export type BodyType = 'none' | 'raw' | 'form-data' | 'urlencoded';
export type RawContentType = 'application/json' | 'text/plain' | 'application/xml' | 'text/html';
export type AuthType = 'none' | 'bearer' | 'basic' | 'apikey';
export type ApiKeyLocation = 'header' | 'query';

export interface KeyValuePair {
  id: string;
  key: string;
  value: string;
  enabled: boolean;
}

export interface AuthConfig {
  type: AuthType;
  token?: string;
  username?: string;
  password?: string;
  apiKey?: string;
  apiKeyName?: string;
  apiKeyLocation?: ApiKeyLocation;
}

export interface RequestBody {
  type: BodyType;
  rawContent: string;
  rawContentType: RawContentType;
  formData: KeyValuePair[];
  urlencoded: KeyValuePair[];
}

export interface HttpRequest {
  method: HttpMethod;
  url: string;
  params: KeyValuePair[];
  headers: KeyValuePair[];
  body: RequestBody;
  auth: AuthConfig;
}

export interface HttpResponse {
  status: number;
  statusText: string;
  headers: Record<string, string>;
  body: string;
  duration: number;
  size: number;
  curlCommand: string;
}
