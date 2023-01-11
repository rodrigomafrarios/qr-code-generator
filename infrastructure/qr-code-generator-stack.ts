import * as path from "path";
import {
  CorsHttpMethod,
  HttpApi,
  HttpMethod,
} from "@aws-cdk/aws-apigatewayv2-alpha";
import { CfnOutput, Duration, Stack, StackProps } from "aws-cdk-lib";
import { NodejsFunction } from "aws-cdk-lib/aws-lambda-nodejs";
import { Construct } from "constructs";
import { HttpOrigin } from "aws-cdk-lib/aws-cloudfront-origins";
import * as cloudfront from "aws-cdk-lib/aws-cloudfront";
import { Runtime } from "aws-cdk-lib/aws-lambda";
import { HttpLambdaIntegration } from "@aws-cdk/aws-apigatewayv2-integrations-alpha";
import { ARecord, HostedZone, RecordTarget } from "aws-cdk-lib/aws-route53";
import { DnsValidatedCertificate } from "aws-cdk-lib/aws-certificatemanager";
import { CloudFrontTarget } from "aws-cdk-lib/aws-route53-targets";

export class QrCodeGeneratorStack extends Stack {
  constructor(scope: Construct, id: string, props: StackProps) {
    super(scope, id, props);

    const DOMAIN = "YOUR_DOMAIN";
    const SUBDOMAIN = "qr";

    const hostedZone = HostedZone.fromLookup(this, "HostedZone", {
      domainName: DOMAIN,
    });

    const cert = new DnsValidatedCertificate(this, "Certificate", {
      domainName: `${SUBDOMAIN}.${DOMAIN}`,
      hostedZone: hostedZone,
      region: "us-east-1",
    });

    const api = new HttpApi(this, "HttpApi", {
      corsPreflight: {
        allowMethods: [
          CorsHttpMethod.GET,
          CorsHttpMethod.HEAD,
          CorsHttpMethod.OPTIONS,
          CorsHttpMethod.POST,
        ],
        allowOrigins: ["*"],
        allowHeaders: ["Content-Type", "Authorization"],
      },
      apiName: "Qr-Code-Generator-Stack",
    });

    const handler = new NodejsFunction(this, "QrCodeGeneratorHandler", {
      entry: path.join(__dirname, "../src/handler.ts"),
      runtime: Runtime.NODEJS_14_X,
      memorySize: 512,
    });

    api.addRoutes({
      path: "/{payload}",
      methods: [HttpMethod.GET],
      integration: new HttpLambdaIntegration(
        "HttpLambdaIntegration",
        handler,
        {}
      ),
    });

    const distribution = new cloudfront.Distribution(
      this,
      "CloudfrontDistribution",
      {
        domainNames: [`${SUBDOMAIN}.${DOMAIN}`],
        certificate: cert,
        errorResponses: [
          {
            httpStatus: 403,
            ttl: Duration.seconds(5),
          },
        ],
        defaultBehavior: {
          origin: new HttpOrigin(
            api.apiId + ".execute-api.eu-central-1.amazonaws.com"
          ),
          allowedMethods: cloudfront.AllowedMethods.ALLOW_ALL,
          cachePolicy: new cloudfront.CachePolicy(this, "CachePolicy", {
            minTtl: Duration.days(1),
            maxTtl: Duration.days(365),
            defaultTtl: Duration.days(365),
            cookieBehavior: cloudfront.CacheCookieBehavior.none(),
            queryStringBehavior: cloudfront.CacheQueryStringBehavior.all(),
          }),
          viewerProtocolPolicy:
            cloudfront.ViewerProtocolPolicy.REDIRECT_TO_HTTPS,
          responseHeadersPolicy:
            cloudfront.ResponseHeadersPolicy
              .CORS_ALLOW_ALL_ORIGINS_WITH_PREFLIGHT,
          originRequestPolicy: new cloudfront.OriginRequestPolicy(
            this,
            "ApiPolicy",
            {
              headerBehavior: cloudfront.OriginRequestHeaderBehavior.allowList(
                "Origin",
                "Accept",
                "Access-Control-Request-Method",
                "Access-Control-Request-Headers"
              ),
            }
          ),
        },
      }
    );

    new ARecord(this, "SiteAliasRecord", {
      recordName: SUBDOMAIN,
      target: RecordTarget.fromAlias(new CloudFrontTarget(distribution)),
      zone: hostedZone,
    });

    new CfnOutput(this, "Out", {
      value: distribution.distributionDomainName,
    });
  }
}
