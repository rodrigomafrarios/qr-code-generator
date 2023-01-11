import * as cdk from "aws-cdk-lib";
import { QrCodeGeneratorStack } from "../infrastructure/qr-code-generator-stack";

const app = new cdk.App();

new QrCodeGeneratorStack(app, "QrCodeGeneratorStack", {
  env: {
    account: process.env.CDK_DEFAULT_ACCOUNT,
    region: process.env.CDK_DEFAULT_REGION,
  },
});
