#!/bin/bash

set -e

echo "🌩️  Setting up Cloudflare resources"
echo "=================================="

# Colors
GREEN='\033[0;32m'
BLUE='\033[0;34m'
YELLOW='\033[1;33m'
NC='\033[0m'

# Check if wrangler is authenticated
check_auth() {
    if ! wrangler whoami &> /dev/null; then
        echo -e "${YELLOW}🔐 Please authenticate with Cloudflare...${NC}"
        wrangler auth login
    fi
    echo -e "${GREEN}✅ Authenticated with Cloudflare${NC}"
}

# Create D1 database
create_database() {
    echo -e "${BLUE}📊 Creating D1 database...${NC}"
    
    # Check if database already exists
    if wrangler d1 list | grep -q "pixelforge-production"; then
        echo -e "${YELLOW}⚠️  Database already exists${NC}"
        return
    fi
    
    local db_output=$(wrangler d1 create pixelforge-production)
    local db_id=$(echo "$db_output" | grep "database_id" | cut -d'"' -f4)
    
    echo -e "${GREEN}✅ Database created with ID: $db_id${NC}"
    echo -e "${YELLOW}📝 Please update wrangler.toml with this database_id${NC}"
}

# Create R2 bucket
create_storage() {
    echo -e "${BLUE}📦 Creating R2 bucket...${NC}"
    
    # Check if bucket already exists
    if wrangler r2 bucket list | grep -q "pixelforge-images-prod"; then
        echo -e "${YELLOW}⚠️  Bucket already exists${NC}"
        return
    fi
    
    wrangler r2 bucket create pixelforge-images-prod
    echo -e "${GREEN}✅ R2 bucket created${NC}"
}

# Run database migrations
run_migrations() {
    echo -e "${BLUE}🔄 Running database migrations...${NC}"
    
    wrangler d1 migrations apply pixelforge-production --remote
    echo -e "${GREEN}✅ Migrations completed${NC}"
}

# Set up custom domains
setup_domains() {
    echo -e "${BLUE}🌐 Setting up custom domains...${NC}"
    
    echo -e "${YELLOW}📝 Manual steps required:${NC}"
    echo "1. Go to Cloudflare Dashboard"
    echo "2. Add domain: pixelforge.com"
    echo "3. Set up DNS records:"
    echo "   - A record: @ -> Worker route"
    echo "   - CNAME: images -> R2 custom domain"
    echo "4. Enable SSL/TLS"
}

# Main execution
main() {
    check_auth
    create_database
    create_storage
    run_migrations
    setup_domains
    
    echo -e "${GREEN}🎉 Cloudflare setup completed!${NC}"
    echo -e "${YELLOW}Next steps:${NC}"
    echo "1. Update wrangler.toml with the database ID"
    echo "2. Set up secrets with: npm run setup:secrets"
    echo "3. Configure custom domains in Cloudflare Dashboard"
    echo "4. Run deployment with: ./scripts/deploy.sh --staging"
}

main
