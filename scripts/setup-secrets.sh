#!/bin/bash

set -e

echo "🔐 Setting up Cloudflare Workers secrets"
echo "======================================="

# Colors
GREEN='\033[0;32m'
BLUE='\033[0;34m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
NC='\033[0m'

# Function to set secret
set_secret() {
    local key=$1
    local description=$2
    local required=${3:-true}
    
    echo -e "${BLUE}Setting $key...${NC}"
    echo "$description"
    
    if [[ "$required" == "true" ]]; then
        read -p "Enter $key: " -s value
        echo
        if [[ -z "$value" ]]; then
            echo -e "${RED}❌ $key is required${NC}"
            exit 1
        fi
    else
        read -p "Enter $key (optional, press Enter to skip): " -s value
        echo
        if [[ -z "$value" ]]; then
            echo -e "${YELLOW}⏭️  Skipping $key${NC}"
            return
        fi
    fi
    
    echo "$value" | wrangler secret put "$key"
    echo -e "${GREEN}✅ $key set successfully${NC}"
    echo
}

# Main secrets setup
main() {
    echo -e "${YELLOW}🔑 This script will help you set up all required secrets${NC}"
    echo -e "${YELLOW}Please have the following information ready:${NC}"
    echo "- Mocha Users Service credentials"
    echo "- Google Cloud Service Account credentials"
    echo "- Stripe API keys"
    echo "- JWT secret (32+ characters)"
    echo
    
    read -p "Press Enter to continue..."
    echo
    
    # Authentication service
    set_secret "MOCHA_USERS_SERVICE_API_URL" "The API URL for Mocha Users Service"
    set_secret "MOCHA_USERS_SERVICE_API_KEY" "The API key for Mocha Users Service"
    
    # Google Cloud
    set_secret "GOOGLE_PROJECT_ID" "Your Google Cloud Project ID"
    set_secret "GOOGLE_CLIENT_EMAIL" "Service account email from Google Cloud"
    set_secret "GOOGLE_PRIVATE_KEY_ID" "Private key ID from service account JSON"
    
    echo -e "${BLUE}Setting GOOGLE_PRIVATE_KEY...${NC}"
    echo "Paste the entire private key including -----BEGIN PRIVATE KEY----- and -----END PRIVATE KEY-----"
    echo "Press Ctrl+D when finished:"
    wrangler secret put "GOOGLE_PRIVATE_KEY"
    echo -e "${GREEN}✅ GOOGLE_PRIVATE_KEY set successfully${NC}"
    echo
    
    # Stripe
    set_secret "STRIPE_SECRET_KEY" "Your Stripe secret key (sk_live_... or sk_test_...)"
    set_secret "STRIPE_WEBHOOK_SECRET" "Your Stripe webhook endpoint secret (whsec_...)"
    
    # Security
    set_secret "JWT_SECRET" "A strong JWT secret (minimum 32 characters)"
    
    # Optional secrets
    set_secret "SENTRY_DSN" "Sentry DSN for error tracking" false
    set_secret "SENDGRID_API_KEY" "SendGrid API key for emails" false
    
    echo -e "${GREEN}🎉 All secrets configured successfully!${NC}"
    echo -e "${YELLOW}Next steps:${NC}"
    echo "1. Verify secrets with: wrangler secret list"
    echo "2. Test configuration with: npm run dev"
    echo "3. Deploy with: ./scripts/deploy.sh --staging"
}

main
