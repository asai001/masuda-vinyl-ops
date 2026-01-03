import * as cdk from "aws-cdk-lib/core";
import { Construct } from "constructs";
// import * as sqs from 'aws-cdk-lib/aws-sqs';
import * as cognito from "aws-cdk-lib/aws-cognito";
import * as iam from "aws-cdk-lib/aws-iam";

export class InfraStack extends cdk.Stack {
  constructor(scope: Construct, id: string, props?: cdk.StackProps) {
    super(scope, id, props);

    // The code that defines your stack goes here

    // example resource
    // const queue = new sqs.Queue(this, 'InfraQueue', {
    //   visibilityTimeout: cdk.Duration.seconds(300)
    // });

    const userPool = new cognito.UserPool(this, "masuda-vinyl-ops-userpool", {
      userPoolName: "masuda-vinyl-ops-userpool",
      signInCaseSensitive: false,
      signInAliases: {
        email: true,
      },
    });

    const teamSlug = "asai001s-projects-3e71fbe6";
    const projectName = "masuda-vinyl-ops-app";
    const env = "production"; // preview なら "preview" など
    const aud = `https://vercel.com/${teamSlug}`;

    const vercelProvider = new iam.OpenIdConnectProvider(this, "VercelOidc", {
      url: "https://oidc.vercel.com",
      clientIds: [aud],
    });

    const assumedBy = new iam.OpenIdConnectPrincipal(vercelProvider, {
      StringEquals: {
        "oidc.vercel.com:aud": aud,
        "oidc.vercel.com:sub": `owner:${teamSlug}:project:${projectName}:environment:${env}`,
      },
    });

    const role = new iam.Role(this, "role", {
      assumedBy,
    });

    userPool.grant(role, "cognito-idp:AdminCreateUser");
  }
}
