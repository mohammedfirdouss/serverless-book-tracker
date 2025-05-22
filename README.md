# Serverless-Book-Tracker

A serverless GraphQL API to let users track their reading list. It supports basic CRUD operations plus three intermediate features: tagging, reading progress analytics, and custom collections.

## Features

- **CRUD Operations:** Add, update, delete, and view books in your reading list.
- **Tagging:** Organize books with custom tags for easy filtering.
- **Reading Progress Analytics:** Track and visualize your reading progress over time.
- **Custom Collections:** Group books into personalized collections.

## Architecture

This project is built using AWS serverless technologies:

- **AppSync:** Managed GraphQL API endpoint.
- **Lambda:** Business logic and resolvers.
- **DynamoDB:** NoSQL database for storing user and book data.
- **Cognito:** User authentication and authorization.
- **AWS CDK (TypeScript):** Infrastructure as code for provisioning all resources.

## Getting Started

### Prerequisites

- [Node.js](https://nodejs.org/)
- [AWS CLI](https://aws.amazon.com/cli/)
- [AWS CDK](https://docs.aws.amazon.com/cdk/latest/guide/getting_started.html)
- AWS account with appropriate permissions

### Installation

1. **Clone the repository:**
   ```sh
   git clone https://github.com/your-username/serverless-book-tracker.git
   cd serverless-book-tracker


2. **Install dependencies:**

   npm install

3. **Bootstrap your AWS environment (if not already done):**   

   cdk bootsrap

4. **Deploy the stack:**

   cdk deploy
