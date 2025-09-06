#!/bin/bash

set -e

echo "🏥 PixelForge Health Check"
echo "========================="

# Colors
GREEN='\033[0;32m'
BLUE='\033[0;34m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
NC='\033[0m'

# Configuration
STAGING_URL="https://staging.pixelforge.com"
PRODUCTION_URL="https://pixelforge.com"
TIMEOUT=30

# Test endpoint
test_endpoint() {
    local url=$1
    local endpoint=$2
    local expected_status=${3:-200}
    local description=$4
    
    echo -n "  Testing $endpoint... "
    
    local response=$(curl -s -w "%{http_code}" -m $TIMEOUT "$url$endpoint" -o /tmp/health_response.json)
    local status_code="${response: -3}"
    
    if [[ "$status_code" == "$expected_status" ]]; then
        echo -e "${GREEN}✅ $status_code${NC}"
        if [[ "$description" ]]; then
            echo "    $description"
        fi
        return 0
    else
        echo -e "${RED}❌ $status_code${NC}"
        if [[ -f "/tmp/health_response.json" ]]; then
            echo "    Response: $(cat /tmp/health_response.json)"
        fi
        return 1
    fi
}

# Comprehensive health check
run_health_check() {
    local env=$1
    local base_url=$2
    
    echo -e "${BLUE}🔍 Testing $env environment: $base_url${NC}"
    
    local failed=0
    
    # Health endpoint
    test_endpoint "$base_url" "/api/health" 200 "Basic health check" || failed=$((failed + 1))
    
    # Auth endpoints
    test_endpoint "$base_url" "/api/oauth/google/redirect_url" 200 "OAuth redirect URL" || failed=$((failed + 1))
    
    # Protected endpoint (should return 401)
    test_endpoint "$base_url" "/api/users/me" 401 "Protected endpoint authentication" || failed=$((failed + 1))
    
    # Static assets
    test_endpoint "$base_url" "/" 200 "Frontend application" || failed=$((failed + 1))
    
    if [[ $failed -eq 0 ]]; then
        echo -e "${GREEN}✅ All tests passed for $env${NC}"
        return 0
    else
        echo -e "${RED}❌ $failed test(s) failed for $env${NC}"
        return 1
    fi
}

# Main execution
main() {
    local env=${1:-"staging"}
    local failed=0
    
    case $env in
        "staging")
            echo -e "${BLUE}🧪 Running health checks for STAGING${NC}"
            run_health_check "staging" "$STAGING_URL" || failed=$((failed + 1))
            ;;
        "production")
            echo -e "${BLUE}🚀 Running health checks for PRODUCTION${NC}"
            run_health_check "production" "$PRODUCTION_URL" || failed=$((failed + 1))
            ;;
        "both")
            echo -e "${BLUE}🔄 Running health checks for BOTH environments${NC}"
            main "staging" || failed=$((failed + 1))
            echo
            main "production" || failed=$((failed + 1))
            ;;
        *)
            echo -e "${YELLOW}Usage: $0 [staging|production|both]${NC}"
            exit 1
            ;;
    esac
    
    echo
    echo "================================="
    if [[ $failed -eq 0 ]]; then
        echo -e "${GREEN}🎉 All health checks passed!${NC}"
        exit 0
    else
        echo -e "${RED}❌ $failed health check(s) failed${NC}"
        exit 1
    fi
}

main "$@"
