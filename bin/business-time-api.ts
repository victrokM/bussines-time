import * as cdk from 'aws-cdk-lib';
import { ApiStack } from '../lib/api-stack';

const app = new cdk.App();
new ApiStack(app, 'ApiStack', {
  env: {
    account: '131676642144',
    region: process.env.CDK_DEFAULT_REGION,
  },
});