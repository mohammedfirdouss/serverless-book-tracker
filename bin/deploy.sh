#!/bin/bash

echo "Building the project..."
npm run build

echo "Running tests..."
npm run test

echo "Deploying the stack..."
npx cdk deploy