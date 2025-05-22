import * as cdk from "aws-cdk-lib";
import { Construct } from "constructs";
import * as cognito from "aws-cdk-lib/aws-cognito";
import * as dynamodb from "aws-cdk-lib/aws-dynamodb";
import * as iam from "aws-cdk-lib/aws-iam";
import * as appsync from 'aws-cdk-lib/aws-appsync';
import * as lambda from 'aws-cdk-lib/aws-lambda';


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

    // Shared Lambda Configuration
    // This configuration is shared across multiple Lambda functions to ensure consistency and reduce redundancy.
    const sharedLambdaConfig = {
      runtime: lambda.Runtime.NODEJS_18_X, // Using Node.js 18.x runtime for modern JavaScript/TypeScript support.
      handler: 'index.handler', // Entry point for the Lambda function.
      memorySize: 256, // Allocating 256 MB of memory to balance cost and performance for typical workloads.
      timeout: cdk.Duration.seconds(30), // Setting a 30-second timeout to handle longer-running operations without exceeding limits.
    };

    // Lambda Functions for Resolvers
    // Book CRUD Lambda
    const bookCrudLambda = new lambda.Function(this, 'BookCrudLambda', {
      ...sharedLambdaConfig,
      code: lambda.Code.fromAsset('lambda/book-crud'),
      environment: {
        BOOKS_TABLE: booksTable.tableName,
      },
    });

    // Tag Management Lambda
    const tagManagementLambda = new lambda.Function(this, 'TagManagementLambda', {
      ...sharedLambdaConfig,
      code: lambda.Code.fromAsset('lambda/tag-management'),
      environment: {
        TAGS_TABLE: tagsTable.tableName,
        BOOK_TAGS_TABLE: bookTagsTable.tableName,
      },
    });

    // Reading Progress Lambda
    const readingProgressLambda = new lambda.Function(this, 'ReadingProgressLambda', {
      ...sharedLambdaConfig,
      code: lambda.Code.fromAsset('lambda/reading-progress'),
      environment: {
        PROGRESS_TABLE: progressTable.tableName,
      },
    });

    // Collections Lambda
    const collectionsLambda = new lambda.Function(this, 'CollectionsLambda', {
      ...sharedLambdaConfig,
      code: lambda.Code.fromAsset('lambda/collections'),
      environment: {
        COLLECTIONS_TABLE: collectionsTable.tableName,
        COLLECTION_BOOKS_TABLE: collectionBooksTable.tableName,
      },
    });

    // Analytics Lambda
    const analyticsLambda = new lambda.Function(this, 'AnalyticsLambda', {
      ...sharedLambdaConfig,
      code: lambda.Code.fromAsset('lambda/analytics'),
      environment: {
        PROGRESS_TABLE: progressTable.tableName,
      },
    });

    booksTable.grantReadWriteData(bookCrudLambda); // Book CRUD requires full access to BooksTable
    tagsTable.grantReadWriteData(tagManagementLambda); // Tag Management requires full access to TagsTable
    bookTagsTable.grantReadWriteData(tagManagementLambda); // Tag Management requires full access to BookTagsTable
    progressTable.grantReadWriteData(readingProgressLambda); // Reading Progress requires full access to ProgressTable
    collectionsTable.grantReadWriteData(collectionsLambda); // Collections require full access to CollectionsTable
    collectionBooksTable.grantReadWriteData(collectionsLambda); // Collections require full access to CollectionBooksTable
    progressTable.grantReadData(analyticsLambda); // Analytics only requires read access to ProgressTable

    // AppSync Data Sources
    const bookCrudDS = api.addLambdaDataSource('BookCrudDataSource', bookCrudLambda);
    const tagManagementDS = api.addLambdaDataSource('TagManagementDataSource', tagManagementLambda);
    const readingProgressDS = api.addLambdaDataSource('ReadingProgressDataSource', readingProgressLambda);
    const collectionsDS = api.addLambdaDataSource('CollectionsDataSource', collectionsLambda);
    const analyticsDS = api.addLambdaDataSource('AnalyticsDataSource', analyticsLambda);
  }
}
