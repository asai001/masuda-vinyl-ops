import * as cdk from "aws-cdk-lib/core";
import { Construct } from "constructs";
// import * as sqs from 'aws-cdk-lib/aws-sqs';
import * as cognito from "aws-cdk-lib/aws-cognito";
import * as iam from "aws-cdk-lib/aws-iam";

type DeployEnv = "dev" | "prod";

interface InfraStackProps extends cdk.StackProps {
  deployEnv: DeployEnv;
  vercelEnvironment: "preview" | "production";
}

export class InfraStack extends cdk.Stack {
  constructor(scope: Construct, id: string, props: InfraStackProps) {
    super(scope, id, props);

    // The code that defines your stack goes here

    // example resource
    // const queue = new sqs.Queue(this, 'InfraQueue', {
    //   visibilityTimeout: cdk.Duration.seconds(300)
    // });

    const resourceSuffix = props.deployEnv === "prod" ? "" : `-${props.deployEnv}`;
    const userPool = new cognito.UserPool(this, `masuda-vinyl-ops-userpool${resourceSuffix}`, {
      userPoolName: `masuda-vinyl-ops-userpool${resourceSuffix}`,
      signInCaseSensitive: false,
      signInAliases: {
        email: true,
      },
      passwordPolicy: {
        minLength: 8,
        requireLowercase: false,
        requireUppercase: false,
        requireDigits: false,
        requireSymbols: false,
      },
    });

    userPool.addClient(`masuda-vinyl-ops-app-client${resourceSuffix}`, {
      userPoolClientName: `masuda-vinyl-ops-app-client${resourceSuffix}`,
      authFlows: {
        userSrp: true,
      },
      generateSecret: false,
      accessTokenValidity: cdk.Duration.hours(1),
      idTokenValidity: cdk.Duration.hours(1),
      refreshTokenValidity: cdk.Duration.days(14),
      preventUserExistenceErrors: true,
      disableOAuth: true,
    });

    const teamSlug = "asai001s-projects-3e71fbe6";
    const projectName = "masuda-vinyl-ops-app";
    const env = props.vercelEnvironment; // dev は preview / prod は production を想定
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
  }
}
