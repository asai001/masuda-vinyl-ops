import * as cdk from "aws-cdk-lib/core";
import { Construct } from "constructs";
import * as cognito from "aws-cdk-lib/aws-cognito";
import * as iam from "aws-cdk-lib/aws-iam";
import { Table } from "aws-cdk-lib/aws-dynamodb";

type DeployEnv = "dev" | "prod";
type VercelEnvironment = "preview" | "production";

interface UserPoolResourcesProps {
  deployEnv: DeployEnv;
  vercelEnvironment: VercelEnvironment;
  settingsTable: Table;
}

export class UserPoolResources extends Construct {
  constructor(scope: Construct, id: string, props: UserPoolResourcesProps) {
    super(scope, id);

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

      customAttributes: {
        departmentName: new cognito.StringAttribute({
          mutable: true,
        }),
        displayName: new cognito.StringAttribute({
          mutable: true,
        }),
        orgId: new cognito.StringAttribute({
          mutable: true,
        }),
      },
    });

    const readAttrs = new cognito.ClientAttributes().withCustomAttributes("departmentName", "displayName", "orgId");
    const writeAttrs = new cognito.ClientAttributes().withCustomAttributes("departmentName", "displayName");

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
      readAttributes: readAttrs,
      writeAttributes: writeAttrs,
    });

    const teamSlug = "asai001s-projects-3e71fbe6";
    const projectName = "masuda-vinyl-ops-app";
    const env = props.vercelEnvironment;
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

    const vercelRole = new iam.Role(this, "role", {
      roleName: `masuda-vinyl-ops-vercel-oidc-${props.deployEnv}-${props.vercelEnvironment}`,
      assumedBy,
    });

    props.settingsTable.grantReadWriteData(vercelRole);
  }
}
