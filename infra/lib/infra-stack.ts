import * as cdk from "aws-cdk-lib/core";
import { Construct } from "constructs";
import { DynamoDbResources } from "./dynamodb";
import { UserPoolResources } from "./userpool";

type DeployEnv = "dev" | "prod";
type VercelEnvironment = "preview" | "production";

interface InfraStackProps extends cdk.StackProps {
  deployEnv: DeployEnv;
  vercelEnvironment: VercelEnvironment;
}

export class InfraStack extends cdk.Stack {
  constructor(scope: Construct, id: string, props: InfraStackProps) {
    super(scope, id, props);

    const dynamodb = new DynamoDbResources(this, "DynamoDb", {
      deployEnv: props.deployEnv,
    });

    new UserPoolResources(this, "UserPool", {
      deployEnv: props.deployEnv,
      vercelEnvironment: props.vercelEnvironment,
      tables: {
        settings: dynamodb.settingsTable,
        clientsMaster: dynamodb.clientsMasterTable,
      },
    });
  }
}
