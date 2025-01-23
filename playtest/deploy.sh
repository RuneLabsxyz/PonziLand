set -ex

# Load environment variables from the appropriate file
ENV_FILE=".env.sepolia"

if [ -f "$ENV_FILE" ]; then
  echo "Loading environment variables from $ENV_FILE..."
  export $(grep -v '^#' "$ENV_FILE" | xargs)
else
  echo "Environment file $ENV_FILE not found!"
  exit 1
fi

# Define a cleanup function to clear environment variables
cleanup_env() {
  echo "Cleaning up environment variables..."
  unset STARKNET_RPC_URL
  unset DOJO_ACCOUNT_ADDRESS
  unset DOJO_PRIVATE_KEY
  echo "Environment variables cleared."
}

# Set the trap to execute cleanup on script exit or error
trap cleanup_env EXIT

ACCOUNT_ADDRESS=$(cat ${STARKNET_ACCOUNT/'~'/$HOME} | jq -r '.deployment.address')

function build_declare() {
    echo "⏳ Building contract..."
    scarb build
    echo "⏳ Declaring contract..."
    CONTRACT_CLASS=$(starkli declare ./target/dev/testerc20_PlayTestToken.contract_class.json --account $STARKNET_ACCOUNT --keystore $STARKNET_KEYSTORE --rpc $STARKNET_RPC)
    echo "🚀 Declared contract at address: $CONTRACT_CLASS"
}

function convert_value() {
    DECIMALS_HEX=$(starkli call --rpc $STARKNET_RPC $1 decimals | jq -r '.[0]')
    AMOUNT=$(bun repl -p 'const BigNumber = require("bignumber.js").default; new BigNumber('$2') * new BigNumber(10).pow(new BigNumber('$DECIMALS_HEX'))' | ansi2txt)
    echo $AMOUNT
}

## Parameters:
## $1: token address
## $2: account that will recieve the tokens
## $3: amount of tokens to mint (relative to decimals)
function mint() {
    MINT_AMOUNT=$(convert_value $1 $3)
    starkli invoke --account $STARKNET_ACCOUNT --keystore $STARKNET_KEYSTORE --rpc $STARKNET_RPC $1 mint $2 u256:$MINT_AMOUNT
    echo "☑  Minted $3 tokens (raw: $MINT_AMOUNT) to $2"
}

function create_token() {
    TOKEN_INFO=$(cat ./tokens.json | jq '.tokens[] | select(.symbol == "eSTRK")')
    if [ ! -z "$TOKEN_INFO" ]; then
        echo "Token already exists in tokens.json"
        return
    fi

    echo "⏳ Deploying token..."
    local TOKEN_ADDRESS=$(starkli deploy $CONTRACT_CLASS --account $STARKNET_ACCOUNT --keystore $STARKNET_KEYSTORE --rpc $STARKNET_RPC $ACCOUNT_ADDRESS "bytearray:str:$2" "bytearray:str:$1")
    echo "🚀 Deployed token at address: $TOKEN_ADDRESS"

    # Write the contract into the token json
    jq '.tokens += [{
        "name": "'$2'",
        "symbol": "'$1'",
        "address": "'$TOKEN_ADDRESS'"
    }]' > ./tokens.json

    # Mint an initial supply for the liquidity pool (1 million tokens to have some legroom)
    mint $TOKEN_ADDRESS $ACCOUNT_ADDRESS 1000000
}

function find_token() {
    TOKEN_ADDRESS=$(cat ./tokens.json | jq -r '.tokens[] | select(.symbol == "'$1'") | .address')
    if [ -z "$TOKEN_ADDRESS" ]; then
        echo "unknown token!" > /dev/stderr
        exit 1
    fi
    echo $TOKEN_ADDRESS
    return 0
}

function register_token() {
    echo "⏳  Registering token $1 on ekubo..."
    starkli invoke --account $STARKNET_ACCOUNT --keystore $STARKNET_KEYSTORE --rpc $STARKNET_RPC \
         $1 transfer $EKUBO_CORE_ADDRESS u256:$(convert_value $1 1) / \
         $EKUBO_CORE_ADDRESS register_token "$1"
    echo "☑  Registered token on ekubo!"
}

function create_pool() {
    echo "⏳  Creating pool..."

    echo "☑  Pool created!"
}

case $1 in
  build)
    build_declare
    ;;

  create)
    create_token "$1" "$2"
    ;;

  mint)
    # Mint tokens to the account that deployed the contract
    TOKEN_ADDRESS=$(find_token $2)
    mint $TOKEN_ADDRESS $3 $4
    ;;

  mint-self)
    TOKEN_ADDRESS=$(find_token $2)
    mint $TOKEN_ADDRESS $ACCOUNT_ADDRESS $3
    ;;

  setup-pool)
    TOKEN_ADDRESS=$(find_token $2)
    register_token $TOKEN_ADDRESS
    ;;

  *)
  echo "UNKNOWN!"
    ;;
esac
