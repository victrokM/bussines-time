#!/usr/bin/env node
import * as cdk from 'aws-cdk-lib';
import { BusinessTimeApiStack } from '../lib/business-time-api-stack';

const app = new cdk.App();
new BusinessTimeApiStack(app, 'BusinessTimeApiStack', {
  // env: { account: '152035962475', region: 'us-east-1' },
  env: { account: '131676642144', region: process.env.CDK_DEFAULT_REGION },
});