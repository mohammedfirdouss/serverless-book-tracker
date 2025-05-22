import * as cdk from "aws-cdk-lib";
import { Construct } from "constructs";
import * as cognito from "aws-cdk-lib/aws-cognito";
import * as dynamodb from "aws-cdk-lib/aws-dynamodb";
import * as iam from "aws-cdk-lib/aws-iam";
import * as appsync from 'aws-cdk-lib/aws-appsync';


export class BookTrackerCdkStack extends cdk.Stack {
  constructor(scope: Construct, id: string, props?: cdk.StackProps) {
    super(scope, id, props);

    // Cognito User Pool for Authentication
    const userPool = new cognito.UserPool(this, "BookTrackerUserPool", {
      selfSignUpEnabled: true,
      autoVerify: { email: true },
      standardAttributes: {
        email: { required: true, mutable: true },
        fullname: { required: true, mutable: true },
      },
      passwordPolicy: {
        minLength: 8,
        requireLowercase: true,
        requireUppercase: true,
        requireDigits: true,
        requireSymbols: false,
      },
      removalPolicy: cdk.RemovalPolicy.DESTROY, // For demo purposes only
    });

    // App Client for the User Pool
    const userPoolClient = new cognito.UserPoolClient(
      this,
      "BookTrackerUserPoolClient",
      {
        userPool,
        generateSecret: false,
        authFlows: {
          userPassword: true,
          userSrp: true,
        },
      },
    );

    // Identity Pool for AWS Service Access
    const identityPool = new cognito.CfnIdentityPool(
      this,
      "BookTrackerIdentityPool",
      {
        allowUnauthenticatedIdentities: false,
        cognitoIdentityProviders: [
          {
            clientId: userPoolClient.userPoolClientId,
            providerName: userPool.userPoolProviderName,
          },
        ],
      },
    );

    // IAM Roles for Identity Pool
    const authenticatedRole = new iam.Role(
      this,
      "BookTrackerAuthenticatedRole",
      {
        assumedBy: new iam.FederatedPrincipal(
          "cognito-identity.amazonaws.com",
          {
            StringEquals: {
              "cognito-identity.amazonaws.com:aud": identityPool.ref,
            },
            "ForAnyValue:StringLike": {
              "cognito-identity.amazonaws.com:amr": "authenticated",
            },
          },
          "sts:AssumeRoleWithWebIdentity",
        ),
      },
    );

    // Attach role to identity pool
    new cognito.CfnIdentityPoolRoleAttachment(
      this,
      "BookTrackerIdentityPoolRoleAttachment",
      {
        identityPoolId: identityPool.ref,
        roles: {
          authenticated: authenticatedRole.roleArn,
        },
      },
    );

    // DynamoDB Tables
    // Books Table
    const booksTable = new dynamodb.Table(this, "BooksTable", {
      partitionKey: { name: "id", type: dynamodb.AttributeType.STRING },
      sortKey: { name: "userId", type: dynamodb.AttributeType.STRING },
      billingMode: dynamodb.BillingMode.PAY_PER_REQUEST,
      removalPolicy: cdk.RemovalPolicy.DESTROY, // For demo purposes only
    });

    // Tags Table
    const tagsTable = new dynamodb.Table(this, "TagsTable", {
      partitionKey: { name: "id", type: dynamodb.AttributeType.STRING },
      sortKey: { name: "userId", type: dynamodb.AttributeType.STRING },
      billingMode: dynamodb.BillingMode.PAY_PER_REQUEST,
      removalPolicy: cdk.RemovalPolicy.DESTROY, // For demo purposes only
    });

    // BookTags Table (for many-to-many relationship)
    const bookTagsTable = new dynamodb.Table(this, "BookTagsTable", {
      partitionKey: {
        name: "bookId_tagId",
        type: dynamodb.AttributeType.STRING,
      },
      sortKey: { name: "userId", type: dynamodb.AttributeType.STRING },
      billingMode: dynamodb.BillingMode.PAY_PER_REQUEST,
      removalPolicy: cdk.RemovalPolicy.DESTROY, // For demo purposes only
    });

    // Progress Table
    const progressTable = new dynamodb.Table(this, "ProgressTable", {
      partitionKey: { name: "bookId", type: dynamodb.AttributeType.STRING },
      sortKey: { name: "userId", type: dynamodb.AttributeType.STRING },
      billingMode: dynamodb.BillingMode.PAY_PER_REQUEST,
      removalPolicy: cdk.RemovalPolicy.DESTROY, // For demo purposes only
    });

    // Collections Table
    const collectionsTable = new dynamodb.Table(this, "CollectionsTable", {
      partitionKey: { name: "id", type: dynamodb.AttributeType.STRING },
      sortKey: { name: "userId", type: dynamodb.AttributeType.STRING },
      billingMode: dynamodb.BillingMode.PAY_PER_REQUEST,
      removalPolicy: cdk.RemovalPolicy.DESTROY, // For demo purposes only
    });

    // CollectionBooks Table (for many-to-many relationship)
    const collectionBooksTable = new dynamodb.Table(
      this,
      "CollectionBooksTable",
      {
        partitionKey: {
          name: "collectionId_bookId",
          type: dynamodb.AttributeType.STRING,
        },
        sortKey: { name: "userId", type: dynamodb.AttributeType.STRING },
        billingMode: dynamodb.BillingMode.PAY_PER_REQUEST,
        removalPolicy: cdk.RemovalPolicy.DESTROY, // For demo purposes only
      },
    );

    // AppSync GraphQL API
    const api = new appsync.GraphqlApi(this, 'BookTrackerAPI', {
      name: 'BookTrackerAPI',
      definition: appsync.Definition.fromFile(
        'graphql/schema.graphql',
      ),
      authorizationConfig: {
        defaultAuthorization: {
          authorizationType: appsync.AuthorizationType.USER_POOL,
          userPoolConfig: {
            userPool,
          },
        },
        additionalAuthorizationModes: [
          {
            authorizationType: appsync.AuthorizationType.IAM,
          },
        ],
      },
      logConfig: {
        fieldLogLevel: appsync.FieldLogLevel.ALL,
      },
      xrayEnabled: true,
    });
  }
}
