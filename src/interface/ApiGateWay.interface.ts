import * as lambda from "aws-cdk-lib/aws-lambda";

export interface ApiGatewayProps {
  businessTimeFn: lambda.IFunction;
}
