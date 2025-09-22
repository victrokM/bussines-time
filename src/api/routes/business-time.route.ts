import * as apigateway from "aws-cdk-lib/aws-apigateway";
import * as lambda from "aws-cdk-lib/aws-lambda";

export function addBusinessTimeRoute(api: apigateway.RestApi, fn: lambda.IFunction) {
  const resource = api.root.addResource("business-time");
  resource.addMethod("GET", new apigateway.LambdaIntegration(fn));
}