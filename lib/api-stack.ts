import * as cdk from "aws-cdk-lib";
import { Construct } from "constructs";
import * as lambda from "aws-cdk-lib/aws-lambda";
import * as lambdaNodejs from "aws-cdk-lib/aws-lambda-nodejs";
import * as path from "path";
import { createApiGateway } from "../src/api/api-gateway";

export class ApiStack extends cdk.Stack {
  constructor(scope: Construct, id: string, props?: cdk.StackProps) {
    super(scope, id, props);

    const businessTimeFn = new lambdaNodejs.NodejsFunction(
      this,
      "BusinessTimeLambda",
      {
        runtime: lambda.Runtime.NODEJS_18_X,
        entry: path.join(__dirname, "../src/handlers/businessTime.ts"),
        handler: "handler",
      }
    );

    createApiGateway(this, {
      businessTimeFn,
    });
  }
}
