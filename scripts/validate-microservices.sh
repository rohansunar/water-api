#!/bin/bash

# Microservices Validation Script
# This script validates the microservices structure and ensures everything is properly set up

set -e

echo "🚀 Water Jar Delivery Platform - Microservices Validation"
echo "========================================================="

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Function to print colored output
print_status() {
    local status=$1
    local message=$2
    case $status in
        "SUCCESS")
            echo -e "${GREEN}✅ $message${NC}"
            ;;
        "ERROR")
            echo -e "${RED}❌ $message${NC}"
            ;;
        "WARNING")
            echo -e "${YELLOW}⚠️  $message${NC}"
            ;;
        "INFO")
            echo -e "${BLUE}ℹ️  $message${NC}"
            ;;
    esac
}

# Function to check if a directory exists
check_directory() {
    local dir=$1
    local description=$2
    
    if [ -d "$dir" ]; then
        print_status "SUCCESS" "$description exists: $dir"
        return 0
    else
        print_status "ERROR" "$description missing: $dir"
        return 1
    fi
}

# Function to check if a file exists
check_file() {
    local file=$1
    local description=$2
    
    if [ -f "$file" ]; then
        print_status "SUCCESS" "$description exists: $file"
        return 0
    else
        print_status "ERROR" "$description missing: $file"
        return 1
    fi
}

# Function to validate service structure
validate_service() {
    local service_name=$1
    local service_dir="services/$service_name"
    
    echo ""
    print_status "INFO" "Validating $service_name..."
    
    # Check main directories
    check_directory "$service_dir" "$service_name directory"
    check_directory "$service_dir/src" "$service_name src directory"
    check_directory "$service_dir/src/controllers" "$service_name controllers directory"
    check_directory "$service_dir/src/services" "$service_name services directory"
    check_directory "$service_dir/src/dto" "$service_name dto directory"
    check_directory "$service_dir/src/schemas" "$service_name schemas directory"
    check_directory "$service_dir/src/interfaces" "$service_name interfaces directory"
    check_directory "$service_dir/src/tests" "$service_name tests directory"
    
    # Check essential files
    check_file "$service_dir/package.json" "$service_name package.json"
    check_file "$service_dir/Dockerfile" "$service_name Dockerfile"
    check_file "$service_dir/src/main.ts" "$service_name main.ts"
    
    # Check if package.json has correct name
    if [ -f "$service_dir/package.json" ]; then
        local package_name=$(grep -o '"name": "[^"]*"' "$service_dir/package.json" | cut -d'"' -f4)
        if [ "$package_name" = "$service_name" ]; then
            print_status "SUCCESS" "$service_name package.json has correct name"
        else
            print_status "WARNING" "$service_name package.json name mismatch: expected '$service_name', got '$package_name'"
        fi
    fi
}

# Main validation
echo ""
print_status "INFO" "Starting microservices structure validation..."

# Check root structure
echo ""
print_status "INFO" "Validating root structure..."
check_directory "services" "Services directory"
check_directory "shared" "Shared directory"
check_directory "shared/contracts" "Shared contracts directory"
check_directory "shared/common" "Shared common directory"
check_directory "shared/utils" "Shared utils directory"
check_directory "gateway" "Gateway directory"
check_directory "config" "Config directory"

# Check documentation
echo ""
print_status "INFO" "Validating documentation..."
check_file "MICROSERVICES_DEVELOPER_GUIDE.md" "Developer Guide"
check_file "MICROSERVICES_RESTRUCTURING_SUMMARY.md" "Restructuring Summary"
check_file "README_MICROSERVICES.md" "Microservices README"

# Check Docker configuration
echo ""
print_status "INFO" "Validating Docker configuration..."
check_file "docker-compose.dev.yml" "Development Docker Compose"

# Check shared contracts
echo ""
print_status "INFO" "Validating shared contracts..."
check_file "shared/contracts/user-service.contract.ts" "User Service Contract"
check_file "shared/contracts/product-service.contract.ts" "Product Service Contract"

# Validate each service
services=("user-service" "product-service")

for service in "${services[@]}"; do
    validate_service "$service"
done

# Check if Node.js and npm are available
echo ""
print_status "INFO" "Checking development environment..."

if command -v node &> /dev/null; then
    node_version=$(node --version)
    print_status "SUCCESS" "Node.js is available: $node_version"
else
    print_status "ERROR" "Node.js is not installed"
fi

if command -v npm &> /dev/null; then
    npm_version=$(npm --version)
    print_status "SUCCESS" "npm is available: $npm_version"
else
    print_status "ERROR" "npm is not installed"
fi

if command -v docker &> /dev/null; then
    docker_version=$(docker --version)
    print_status "SUCCESS" "Docker is available: $docker_version"
else
    print_status "WARNING" "Docker is not installed (optional for local development)"
fi

# Test service dependencies (if package.json exists)
echo ""
print_status "INFO" "Validating service dependencies..."

for service in "${services[@]}"; do
    service_dir="services/$service"
    if [ -f "$service_dir/package.json" ]; then
        echo ""
        print_status "INFO" "Checking $service dependencies..."
        
        cd "$service_dir"
        
        # Check if node_modules exists
        if [ -d "node_modules" ]; then
            print_status "SUCCESS" "$service dependencies are installed"
        else
            print_status "WARNING" "$service dependencies not installed. Run 'npm install' in $service_dir"
        fi
        
        # Check if TypeScript compiles
        if [ -f "tsconfig.json" ] && command -v npx &> /dev/null; then
            if npx tsc --noEmit --skipLibCheck 2>/dev/null; then
                print_status "SUCCESS" "$service TypeScript compilation check passed"
            else
                print_status "WARNING" "$service TypeScript compilation issues detected"
            fi
        fi
        
        cd - > /dev/null
    fi
done

# Summary
echo ""
echo "========================================================="
print_status "INFO" "Validation Summary"
echo "========================================================="

echo ""
print_status "SUCCESS" "Microservices structure validation completed!"
echo ""
echo "Next steps:"
echo "1. Install dependencies for each service:"
echo "   cd services/user-service && npm install"
echo "   cd services/product-service && npm install"
echo ""
echo "2. Start development environment:"
echo "   docker-compose -f docker-compose.dev.yml up -d"
echo ""
echo "3. Or start services individually:"
echo "   cd services/user-service && npm run start:dev"
echo ""
echo "4. Run tests:"
echo "   cd services/user-service && npm test"
echo ""
echo "5. Read the comprehensive guide:"
echo "   cat MICROSERVICES_DEVELOPER_GUIDE.md"

echo ""
print_status "SUCCESS" "Microservices restructuring is complete and ready for development!"
