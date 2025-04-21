#!/usr/bin/env bash

# Stop script on error
set -e

# Load environment variables from the appropriate file
ENV_FILE=".env.mainnet"

# Define a cleanup function to clear environment variables
cleanup_env() {
  echo "Cleaning up environment variables..."
  unset STARKNET_RPC_URL
  unset DOJO_ACCOUNT_ADDRESS
  unset DOJO_KEYSTORE_PATH
  unset DOJO_KEYSTORE_PASSWORD
  echo "Environment variables cleared."
}

# Set the trap to execute cleanup on script exit or error
trap cleanup_env EXIT

# Load environment variables
if [ -f "$ENV_FILE" ]; then
  echo "Loading environment variables from $ENV_FILE..."
  export $(grep -v '^#' "$ENV_FILE" | xargs)
else
  echo "Environment file $ENV_FILE not found!"
  exit 1
fi


# Grant editor to the DOJO_ACCOUNT_ADDRESS
../playtest/script.ts owner grant $DOJO_ACCOUNT_ADDRESS
echo "Author granted for $DOJO_ACCOUNT_ADDRESS!"

# Build the project
echo "Building the project..."
sozo -P mainnet build

# Deploy the project
echo "Deploying to Mainnet..."
sozo -P mainnet migrate

# Deployment succeeded message
echo "Deployment completed successfully."

# Revoke owner role from the DOJO_ACCOUNT_ADDRESS
../playtest/script.ts owner revoke $DOJO_ACCOUNT_ADDRESS
echo "Owner role revoked for $DOJO_ACCOUNT_ADDRESS!"

echo "Validating for walnut"
sozo -P mainnet walnut verify
echo "Validation completed successfully."


# Re-deploy torii
echo "Skip redeployment"
exit 1

# One day
echo "Deleting torii deployment"
slot deployments delete ponziland-mainnet torii -f
echo "Creating new torii deployment"
slot deployments create --tier insane ponziland-mainnet-recovery torii --config ./slot-torii.toml
