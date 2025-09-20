import * as cdk from "aws-cdk-lib";
import { Construct } from "constructs";
import * as apigateway from "aws-cdk-lib/aws-apigateway";
import * as lambda from "aws-cdk-lib/aws-lambda";
import * as path from "path";
import * as lambdaNodejs from "aws-cdk-lib/aws-lambda-nodejs";
// import * as sqs from 'aws-cdk-lib/aws-sqs';

export class BusinessTimeApiStack extends cdk.Stack {
  constructor(scope: Construct, id: string, props?: cdk.StackProps) {
    super(scope, id, props);

    const businessTimeFn = new lambdaNodejs.NodejsFunction(
      this,
      "BusinessTimeLambda",
      {
        runtime: lambda.Runtime.NODEJS_18_X,
        entry: path.join(__dirname, "../src/handlers/businessTime.ts"),
        handler: "handler",
        bundling: {
          externalModules: [],
          forceDockerBundling: false,
        },
      }
    );

    const healthFn = new lambda.Function(this, "HealthLambda", {
      runtime: lambda.Runtime.NODEJS_18_X,
      code: lambda.Code.fromAsset(path.join(__dirname, "../dist/handlers")),
      handler: "health.handler",
    });

    // API Gateway
    const api = new apigateway.RestApi(this, "BusinessTimeApi", {
      restApiName: "Business Time Service",
    });

    api.root
      .addResource("business-time")
      .addMethod("GET", new apigateway.LambdaIntegration(businessTimeFn));

    api.root
      .addResource("health")
      .addMethod("GET", new apigateway.LambdaIntegration(healthFn));
  }
}
