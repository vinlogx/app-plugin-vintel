export interface callback {
  (args?: any): void;
}

export enum AWSModes {
  DEV = 'dev',
  PROD = 'prod',
}

export interface awsConfig {
  endpoint?: string;
  signatureVersion?: string;
  region: string;
  accessKeyId: string;
  secretAccessKey: string;
}

export interface AWSOptions {
  mode?: string;
  aws: awsConfig;
}

export type VintelEvent = {
  name: string;
  callback: (args?: object | string) => void;
};

export interface vintelConfig {
  mode?: string;
  aws: awsConfig;
  returnConfig: boolean
}
