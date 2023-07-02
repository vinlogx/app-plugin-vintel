import {
  S3Client,
  GetObjectCommand,
  S3,
  PutBucketCorsCommand,
  ListObjectsCommand,
  ListObjectsV2Command,
} from '@aws-sdk/client-s3';
import { AWSModes, AWSOptions } from './definitions';

export default class AWSS3 {
  private configFileName: string;
  private s3Client: any;
  private bucketName: string;
  constructor(opts: AWSOptions) {
    if (opts.mode && opts.mode === AWSModes.DEV) {
      this.configFileName = 'Resources_Plugin_Test.json';
    } else {
      this.configFileName = 'Resources_Plugin.json';
    }
    this.bucketName = 'dev.govintel.io';
    opts.aws.endpoint = `https://s3.us-east-2.amazonaws.com`; //`https://${this.bucketName}.s3.us-east-2.amazonaws.com`;
    this.s3Client = new S3Client(opts.aws);
  }

  getConfig() {
    return this.getFile(this.configFileName, `app/config`);
    // return this.listFiles();
  }

  getFirmwareFile() {
    return this.getFile(`02.01.cyacd2`, `app/config`);
  }

  async getFile(fileName: string, filePath: string) {
    const payload = {
      Bucket: this.bucketName,
      Key: `${filePath}/${fileName}`,
    };
    const command = new GetObjectCommand(payload);

    try {
      const response = await this.s3Client.send(command);
      // const response = await this.s3Client.getObject(payload);
      // The Body object also has 'transformToByteArray' and 'transformToWebStream' methods.
      const str = await response.Body.transformToString();
      return str;
    } catch (err: any) {
      console.error(err);
      throw new Error(err);
      //return null;
    }
  }

  async listFiles() {
    const payload = {
      Bucket: this.bucketName,
    };
    const command = new ListObjectsV2Command(payload);

    try {
      const response = await this.s3Client.send(command);
      // const response = await this.s3Client.getObject(payload);
      // The Body object also has 'transformToByteArray' and 'transformToWebStream' methods.
      const str = await response.Body.transformToString();
      return str;
    } catch (err: any) {
      console.log(err.message);

      console.error(err);
      return null;
    }
  }
}
