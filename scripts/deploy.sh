#!/bin/bash

set -e

echo "🚀 PixelForge Production Deployment"
echo "===================================="

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Check prerequisites
check_prerequisites() {
    echo -e "${BLUE}📋 Checking prerequisites...${NC}"
    
    if ! command -v node &> /dev/null; then
        echo -e "${RED}❌ Node.js not found${NC}"
        exit 1
    fi
    
    if ! command -v npm &> /dev/null; then
        echo -e "${RED}❌ npm not found${NC}"
        exit 1
    fi
    
    if ! command -v wrangler &> /dev/null; then
        echo -e "${RED}❌ Wrangler CLI not found. Install with: npm install -g wrangler${NC}"
        exit 1
    fi
    
    echo -e "${GREEN}✅ All prerequisites met${NC}"
}

# Install dependencies
install_dependencies() {
    echo -e "${BLUE}📦 Installing dependencies...${NC}"
    npm ci
    echo -e "${GREEN}✅ Dependencies installed${NC}"
}

# Run tests and type checking
run_tests() {
    echo -e "${BLUE}🧪 Running tests and type checking...${NC}"
    
    npm run lint || {
        echo -e "${RED}❌ Linting failed${NC}"
        exit 1
    }
    
    npm run check || {
        echo -e "${RED}❌ Type checking failed${NC}"
        exit 1
    }
    
    echo -e "${GREEN}✅ All checks passed${NC}"
}

# Build application
build_app() {
    echo -e "${BLUE}🏗️  Building application...${NC}"
    
    npm run clean
    npm run build || {
        echo -e "${RED}❌ Build failed${NC}"
        exit 1
    }
    
    echo -e "${GREEN}✅ Build completed${NC}"
}

# Check environment
check_environment() {
    echo -e "${BLUE}🔍 Checking environment configuration...${NC}"
    
    # Check if required secrets exist
    local required_secrets=(
        "MOCHA_USERS_SERVICE_API_URL"
        "MOCHA_USERS_SERVICE_API_KEY"
        "GOOGLE_PROJECT_ID"
        "STRIPE_SECRET_KEY"
        "JWT_SECRET"
    )
    
    for secret in "${required_secrets[@]}"; do
        if ! wrangler secret list | grep -q "$secret"; then
            echo -e "${YELLOW}⚠️  Secret $secret not found. Please set it with: wrangler secret put $secret${NC}"
        fi
    done
    
    echo -e "${GREEN}✅ Environment check completed${NC}"
}

# Deploy to staging
deploy_staging() {
    echo -e "${BLUE}🚀 Deploying to staging...${NC}"
    
    wrangler deploy --env staging || {
        echo -e "${RED}❌ Staging deployment failed${NC}"
        exit 1
    }
    
    # Test staging deployment
    echo -e "${BLUE}🧪 Testing staging deployment...${NC}"
    sleep 5
    
    local staging_url="https://staging.pixelforge.com/api/health"
    if curl -f -s "$staging_url" > /dev/null; then
        echo -e "${GREEN}✅ Staging deployment successful${NC}"
    else
        echo -e "${RED}❌ Staging health check failed${NC}"
        exit 1
    fi
}

# Deploy to production
deploy_production() {
    echo -e "${BLUE}🚀 Deploying to production...${NC}"
    
    read -p "Are you sure you want to deploy to production? (y/N) " -n 1 -r
    echo
    if [[ ! $REPLY =~ ^[Yy]$ ]]; then
        echo -e "${YELLOW}Deployment cancelled${NC}"
        exit 0
    fi
    
    wrangler deploy --env production || {
        echo -e "${RED}❌ Production deployment failed${NC}"
        exit 1
    }
    
    # Test production deployment
    echo -e "${BLUE}🧪 Testing production deployment...${NC}"
    sleep 10
    
    local prod_url="https://pixelforge.com/api/health"
    if curl -f -s "$prod_url" > /dev/null; then
        echo -e "${GREEN}✅ Production deployment successful${NC}"
    else
        echo -e "${RED}❌ Production health check failed${NC}"
        exit 1
    fi
}

# Main execution
main() {
    check_prerequisites
    install_dependencies
    run_tests
    build_app
    check_environment
    
    if [[ "${1:-}" == "--staging" ]]; then
        deploy_staging
    elif [[ "${1:-}" == "--production" ]]; then
        deploy_staging
        deploy_production
    else
        echo -e "${YELLOW}Usage: $0 [--staging|--production]${NC}"
        echo -e "${YELLOW}  --staging: Deploy to staging only${NC}"
        echo -e "${YELLOW}  --production: Deploy to staging, then production${NC}"
        exit 1
    fi
    
    echo -e "${GREEN}🎉 Deployment completed successfully!${NC}"
}

main "$@"
