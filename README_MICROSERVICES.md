# Water Jar Delivery Platform - Microservices Architecture

A comprehensive backend platform for managing on-demand and subscription-based water jar delivery services, restructured as a microservices architecture for scalability and maintainability.

## 🏗️ Architecture Overview

This platform has been restructured from a monolithic NestJS application into a microservices architecture with the following services:

### Core Services
- **User Service** (Port 3001) - User management, authentication, addresses
- **Product Service** (Port 3002) - Product catalog, inventory management  
- **Vendor Service** (Port 3003) - Vendor management, store information
- **Order Service** (Port 3004) - Order processing, order lifecycle
- **Payment Service** (Port 3005) - Wallet, payments, monthly ledger
- **Delivery Service** (Port 3006) - Agent management, delivery tracking
- **Support Service** (Port 3007) - Complaints, admin functions

### Supporting Components
- **API Gateway** (Port 3000) - Single entry point, routing, authentication
- **Shared Libraries** - Common utilities, contracts, middleware

## 🚀 Features

- **Microservices Architecture**: Independent, scalable services
- **Service-Specific Databases**: Each service has its own MongoDB database
- **API Gateway Pattern**: Centralized routing and authentication
- **Inter-Service Communication**: HTTP-based service communication
- **Independent Deployment**: Each service can be deployed independently
- **Comprehensive Testing**: Unit and integration tests for each service
- **Docker Support**: Containerized services for easy deployment
- **Developer-Friendly**: Extensive documentation and development tools

## 🛠️ Technology Stack

- **Framework**: NestJS (Node.js) for each service
- **Database**: MongoDB with Mongoose ODM (database per service)
- **Authentication**: JWT with Passport
- **API Gateway**: Custom NestJS gateway with routing
- **Validation**: Class Validator & Class Transformer
- **Logging**: Winston with daily rotation
- **Testing**: Jest for unit and integration testing
- **Containerization**: Docker and Docker Compose
- **Documentation**: Swagger/OpenAPI for each service

## 📁 Project Structure

```
├── services/                    # Microservices
│   ├── user-service/           # User management service
│   │   ├── src/
│   │   │   ├── controllers/    # HTTP controllers
│   │   │   ├── services/       # Business logic
│   │   │   ├── dto/           # Data Transfer Objects
│   │   │   ├── schemas/       # Database schemas
│   │   │   ├── interfaces/    # TypeScript interfaces
│   │   │   ├── tests/         # Unit tests
│   │   │   └── main.ts        # Service entry point
│   │   ├── package.json       # Service dependencies
│   │   └── Dockerfile         # Container configuration
│   ├── product-service/        # Product catalog service
│   ├── vendor-service/         # Vendor management service
│   ├── order-service/          # Order processing service
│   ├── payment-service/        # Payment & wallet service
│   ├── delivery-service/       # Delivery management service
│   └── support-service/        # Support & admin service
├── gateway/                    # API Gateway
├── shared/                     # Shared libraries
│   ├── common/                # Common utilities
│   ├── contracts/             # API contracts
│   └── utils/                 # Shared utilities
├── config/                     # Configuration files
├── docker-compose.dev.yml      # Development environment
├── docker-compose.prod.yml     # Production environment
└── MICROSERVICES_DEVELOPER_GUIDE.md  # Comprehensive guide
```

## 🚀 Quick Start

### Prerequisites

- Node.js 20+
- MongoDB 6+
- Docker & Docker Compose (recommended)
- Git

### Option 1: Docker Compose (Recommended)

1. **Clone the repository:**
```bash
git clone <repository-url>
cd water-jar-delivery-api
```

2. **Start all services with Docker Compose:**
```bash
# Development environment
docker-compose -f docker-compose.dev.yml up -d

# Check service status
docker-compose -f docker-compose.dev.yml ps
```

3. **Access the services:**
- API Gateway: http://localhost:3000
- User Service: http://localhost:3001
- Product Service: http://localhost:3002
- Swagger Documentation: http://localhost:3000/api/docs

### Option 2: Local Development

1. **Clone and setup:**
```bash
git clone <repository-url>
cd water-jar-delivery-api
```

2. **Install dependencies for all services:**
```bash
# Install root dependencies
npm install

# Install service dependencies
cd services/user-service && npm install
cd ../product-service && npm install
# Repeat for other services
```

3. **Start MongoDB:**
```bash
# Using Docker
docker run -d -p 27017:27017 --name mongodb mongo:6
```

4. **Set up environment variables:**
```bash
cp .env.example .env
# Edit .env with your configuration
```

5. **Start services:**
```bash
# Start all services (requires multiple terminals)
cd services/user-service && npm run start:dev &
cd services/product-service && npm run start:dev &
# ... start other services

# Or use the development script
npm run dev:all
```

## 📚 Documentation

- **[Microservices Developer Guide](./MICROSERVICES_DEVELOPER_GUIDE.md)** - Comprehensive development guide
- **[API Documentation](./API_DOCUMENTATION.md)** - Complete API reference
- **[Changelog](./CHANGELOG.md)** - Version history and changes

### Service-Specific Documentation

Each service has its own documentation:
- User Service: `services/user-service/README.md`
- Product Service: `services/product-service/README.md`
- [... other services]

## 🧪 Testing

### Run Tests for All Services
```bash
# Unit tests
npm run test:all

# Integration tests
npm run test:e2e:all

# Coverage report
npm run test:cov:all
```

### Run Tests for Specific Service
```bash
cd services/user-service
npm run test
npm run test:cov
npm run test:e2e
```

## 🚀 Deployment

### Development
```bash
docker-compose -f docker-compose.dev.yml up -d
```

### Production
```bash
docker-compose -f docker-compose.prod.yml up -d
```

### Individual Service Deployment
```bash
cd services/user-service
docker build -t water-jar/user-service:latest .
docker run -p 3001:3001 water-jar/user-service:latest
```

## 🔧 Available Scripts

### Root Level Scripts
- `npm run dev:all` - Start all services in development mode
- `npm run build:all` - Build all services
- `npm run test:all` - Run tests for all services
- `npm run lint:all` - Lint all services

### Service Level Scripts (in each service directory)
- `npm run start:dev` - Start service in development mode
- `npm run build` - Build the service
- `npm run test` - Run unit tests
- `npm run test:e2e` - Run integration tests

## 🌐 API Endpoints

### API Gateway (Port 3000)
- All requests go through the API Gateway
- Routes are automatically forwarded to appropriate services
- Centralized authentication and rate limiting

### Service Endpoints
- **User Service**: `/api/v1/users/*`
- **Product Service**: `/api/v1/products/*`
- **Order Service**: `/api/v1/orders/*`
- **Payment Service**: `/api/v1/payments/*`
- **Vendor Service**: `/api/v1/vendors/*`
- **Delivery Service**: `/api/v1/delivery/*`
- **Support Service**: `/api/v1/support/*`

### Health Checks
Each service provides health check endpoints:
- `GET /health` - Service health status
- `GET /metrics` - Service metrics (for monitoring)

## 🔒 Security

- JWT-based authentication through API Gateway
- Service-to-service authentication
- Input validation on all endpoints
- Rate limiting and CORS protection
- Environment-based configuration

## 📊 Monitoring & Logging

- Centralized logging with Winston
- Health check endpoints for all services
- Metrics collection for monitoring
- Error tracking and alerting

## 🤝 Contributing

1. Fork the repository
2. Create a feature branch: `git checkout -b feature/new-feature`
3. Make changes following the microservices patterns
4. Add tests for new functionality
5. Update documentation as needed
6. Submit a pull request

### Development Guidelines

- Follow the established service structure
- Write comprehensive tests
- Update API contracts when changing interfaces
- Document all new endpoints
- Follow TypeScript best practices

## 📄 License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

## 🆘 Support

- **Documentation**: Comprehensive guides in `/docs`
- **API Reference**: Swagger UI at `/api/docs`
- **Developer Guide**: [MICROSERVICES_DEVELOPER_GUIDE.md](./MICROSERVICES_DEVELOPER_GUIDE.md)
- **Issues**: GitHub Issues for bug reports and feature requests

## 🔄 Migration from Monolith

This project has been restructured from a monolithic architecture to microservices. The original monolithic code is preserved in the `src/` directory for reference. Key changes include:

- **Service Separation**: Each business domain is now a separate service
- **Database per Service**: Each service has its own MongoDB database
- **API Contracts**: Defined interfaces for inter-service communication
- **Independent Deployment**: Services can be deployed and scaled independently
- **Improved Testing**: Each service has its own comprehensive test suite

For detailed migration information, see the [Developer Guide](./MICROSERVICES_DEVELOPER_GUIDE.md).
