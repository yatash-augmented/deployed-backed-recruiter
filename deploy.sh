#!/bin/bash
# Simple deployment script for SmartTalent Backend

echo " Deploying SmartTalent Backend to AWS"

# Set region
export AWS_DEFAULT_REGION=eu-west-3

# Create ECR repository
aws ecr create-repository --repository-name smarttalent-backend --region eu-west-3 2>/dev/null || echo "Repository exists"

# Get ECR URI
ECR_URI=$(aws ecr describe-repositories --repository-names smarttalent-backend --region eu-west-3 --query 'repositories[0].repositoryUri' --output text)

# Login to ECR
aws ecr get-login-password --region eu-west-3 | docker login --username AWS --password-stdin $ECR_URI

# Build and push image
docker build -t smarttalent-backend:latest .
docker tag smarttalent-backend:latest $ECR_URI:latest
docker push $ECR_URI:latest

echo " Image pushed to ECR: $ECR_URI:latest"
echo " Next: Create App Runner service with this image"
