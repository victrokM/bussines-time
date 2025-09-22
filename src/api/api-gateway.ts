import * as apigateway from "aws-cdk-lib/aws-apigateway";

import { Construct } from "constructs";
import { addBusinessTimeRoute } from "./routes/business-time.route";
import { ApiGatewayProps } from "../interface/ApiGateWay.interface";



export function createApiGateway(scope: Construct, props: ApiGatewayProps) {
  const api = new apigateway.RestApi(scope, "BusinessTimeApi", {
    restApiName: "Business Time Service",
  });

  addBusinessTimeRoute(api, props.businessTimeFn);

  return api;
}
