# Water Jar Delivery Platform - Microservices Developer Guide

## Table of Contents
1. [Architecture Overview](#architecture-overview)
2. [Service Structure](#service-structure)
3. [Development Setup](#development-setup)
4. [Adding New Features](#adding-new-features)
5. [Creating New Services](#creating-new-services)
6. [Inter-Service Communication](#inter-service-communication)
7. [Database Management](#database-management)
8. [Testing Guidelines](#testing-guidelines)
9. [Deployment Process](#deployment-process)
10. [Best Practices](#best-practices)

## Architecture Overview

The Water Jar Delivery Platform has been restructured into a microservices architecture with the following services:

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

## Service Structure

Each service follows a consistent directory structure:

```
services/{service-name}/
├── src/
│   ├── controllers/          # HTTP controllers
│   ├── services/            # Business logic
│   ├── dto/                 # Data Transfer Objects
│   ├── schemas/             # Database schemas
│   ├── interfaces/          # TypeScript interfaces
│   ├── tests/               # Unit and integration tests
│   ├── {service}.module.ts  # NestJS module
│   └── main.ts              # Application entry point
├── package.json             # Service dependencies
├── Dockerfile              # Container configuration
├── .env.example            # Environment variables template
└── README.md               # Service-specific documentation
```

## Development Setup

### Prerequisites
- Node.js 20+
- MongoDB 6+
- Docker & Docker Compose
- Git

### Initial Setup

1. **Clone the repository:**
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
# Repeat for all services
```

3. **Set up environment variables:**
```bash
# Copy environment templates
cp .env.example .env
cp services/user-service/.env.example services/user-service/.env
# Repeat for all services
```

4. **Start MongoDB:**
```bash
# Using Docker
docker run -d -p 27017:27017 --name mongodb mongo:6

# Or use Docker Compose
docker-compose up -d mongodb
```

5. **Start services in development mode:**
```bash
# Start all services
npm run dev:all

# Or start individual services
cd services/user-service && npm run start:dev
```

### Environment Variables

Each service requires the following environment variables:

```env
# Database
MONGODB_URI=mongodb://localhost:27017/{service-name}-db
{SERVICE_NAME}_MONGODB_URI=mongodb://localhost:27017/{service-name}-db

# Service Configuration
{SERVICE_NAME}_PORT=300X
NODE_ENV=development

# Inter-Service Communication
USER_SERVICE_URL=http://localhost:3001
PRODUCT_SERVICE_URL=http://localhost:3002
# ... other service URLs

# Security
JWT_SECRET=your-jwt-secret
JWT_EXPIRES_IN=24h

# CORS
CORS_ORIGIN=http://localhost:3000
```

## Adding New Features

### To an Existing Service

1. **Create/Update DTOs:**
```typescript
// services/{service}/src/dto/new-feature.dto.ts
export class CreateFeatureDto {
  @IsString()
  @IsNotEmpty()
  name: string;
  
  // ... other validations
}
```

2. **Update Database Schema:**
```typescript
// services/{service}/src/schemas/feature.schema.ts
@Schema({ timestamps: true })
export class Feature {
  @Prop({ required: true })
  name: string;
  
  // ... other properties
}
```

3. **Implement Business Logic:**
```typescript
// services/{service}/src/services/feature.service.ts
@Injectable()
export class FeatureService {
  constructor(
    @InjectModel(Feature.name) private featureModel: Model<FeatureDocument>
  ) {}
  
  async create(dto: CreateFeatureDto): Promise<FeatureDocument> {
    // Implementation
  }
}
```

4. **Create Controller:**
```typescript
// services/{service}/src/controllers/feature.controller.ts
@Controller('features')
export class FeatureController {
  constructor(private featureService: FeatureService) {}
  
  @Post()
  async create(@Body() dto: CreateFeatureDto) {
    return this.featureService.create(dto);
  }
}
```

5. **Update Module:**
```typescript
// services/{service}/src/{service}.module.ts
@Module({
  imports: [
    MongooseModule.forFeature([
      { name: Feature.name, schema: FeatureSchema }
    ])
  ],
  controllers: [FeatureController],
  providers: [FeatureService],
  exports: [FeatureService]
})
```

6. **Write Tests:**
```typescript
// services/{service}/src/tests/feature.service.spec.ts
describe('FeatureService', () => {
  // Unit tests
});
```

## Creating New Services

### 1. Generate Service Structure

```bash
# Create directory structure
mkdir -p services/new-service/src/{controllers,services,dto,schemas,interfaces,tests}

# Copy template files from existing service
cp services/user-service/package.json services/new-service/
cp services/user-service/Dockerfile services/new-service/
cp services/user-service/src/main.ts services/new-service/src/
```

### 2. Update Configuration

1. **Update package.json:**
   - Change service name
   - Update description
   - Adjust port in scripts if needed

2. **Create service module:**
```typescript
// services/new-service/src/new-service.module.ts
@Module({
  imports: [
    ConfigModule.forRoot({ isGlobal: true }),
    MongooseModule.forRoot(process.env.NEW_SERVICE_MONGODB_URI),
    // ... feature modules
  ],
  controllers: [NewServiceController],
  providers: [NewServiceService],
})
export class NewServiceModule {}
```

3. **Update main.ts:**
   - Import the new service module
   - Set appropriate port
   - Configure service-specific middleware

### 3. Define Service Contracts

Create API contracts in `shared/contracts/`:

```typescript
// shared/contracts/new-service.contract.ts
export interface NewServiceContract {
  createEntity(data: CreateEntityRequest): Promise<EntityResponse>;
  findById(id: string): Promise<EntityResponse | null>;
}

export interface CreateEntityRequest {
  // Define request structure
}

export interface EntityResponse {
  // Define response structure
}
```

### 4. Register with API Gateway

Update the API Gateway configuration to route requests to the new service.

## Inter-Service Communication

### HTTP Client Pattern

Services communicate via HTTP using a standardized client pattern:

```typescript
// shared/clients/user-service.client.ts
@Injectable()
export class UserServiceClient {
  private readonly baseUrl: string;
  
  constructor(private httpService: HttpService) {
    this.baseUrl = process.env.USER_SERVICE_URL;
  }
  
  async findUserById(id: string): Promise<UserResponse | null> {
    try {
      const response = await this.httpService
        .get(`${this.baseUrl}/api/v1/users/${id}`)
        .toPromise();
      return response.data.data;
    } catch (error) {
      if (error.response?.status === 404) {
        return null;
      }
      throw error;
    }
  }
}
```

### Service Discovery

Services are discovered through environment variables:

```typescript
// shared/config/service-discovery.ts
export const SERVICE_URLS = {
  USER_SERVICE: process.env.USER_SERVICE_URL || 'http://localhost:3001',
  PRODUCT_SERVICE: process.env.PRODUCT_SERVICE_URL || 'http://localhost:3002',
  // ... other services
};
```

### Error Handling

Implement circuit breaker pattern for resilience:

```typescript
// shared/utils/circuit-breaker.ts
export class CircuitBreaker {
  // Implementation for fault tolerance
}
```

## Database Management

### Database per Service

Each service has its own MongoDB database:

- `water-jar-user-service`
- `water-jar-product-service`
- `water-jar-vendor-service`
- etc.

### Migration Strategy

1. **Schema Changes:**
   - Update Mongoose schemas
   - Create migration scripts in `scripts/migrations/`
   - Run migrations before deployment

2. **Data Consistency:**
   - Use eventual consistency model
   - Implement compensating transactions for critical operations
   - Use event sourcing for audit trails

### Example Migration Script

```typescript
// scripts/migrations/001-add-user-preferences.ts
import { MongoClient } from 'mongodb';

export async function up(client: MongoClient) {
  const db = client.db('water-jar-user-service');
  await db.collection('users').updateMany(
    {},
    { $set: { preferences: { notifications: true } } }
  );
}

export async function down(client: MongoClient) {
  const db = client.db('water-jar-user-service');
  await db.collection('users').updateMany(
    {},
    { $unset: { preferences: 1 } }
  );
}
```

## Testing Guidelines

### Unit Testing

Each service should have comprehensive unit tests:

```typescript
// services/{service}/src/tests/{feature}.service.spec.ts
describe('FeatureService', () => {
  let service: FeatureService;
  let model: Model<FeatureDocument>;

  beforeEach(async () => {
    const module = await Test.createTestingModule({
      providers: [
        FeatureService,
        {
          provide: getModelToken(Feature.name),
          useValue: mockModel,
        },
      ],
    }).compile();

    service = module.get<FeatureService>(FeatureService);
    model = module.get<Model<FeatureDocument>>(getModelToken(Feature.name));
  });

  describe('create', () => {
    it('should create a feature successfully', async () => {
      // Test implementation
    });
  });
});
```

### Integration Testing

Test service interactions:

```typescript
// services/{service}/src/tests/integration/{feature}.integration.spec.ts
describe('Feature Integration', () => {
  let app: INestApplication;

  beforeAll(async () => {
    const moduleFixture = await Test.createTestingModule({
      imports: [FeatureModule],
    }).compile();

    app = moduleFixture.createNestApplication();
    await app.init();
  });

  it('/features (POST)', () => {
    return request(app.getHttpServer())
      .post('/features')
      .send(createFeatureDto)
      .expect(201);
  });
});
```

### Running Tests

```bash
# Run tests for specific service
cd services/user-service
npm run test

# Run tests with coverage
npm run test:cov

# Run integration tests
npm run test:e2e

# Run all service tests
npm run test:all
```

### Test Database Setup

Use separate test databases:

```typescript
// test/test-database.setup.ts
export const getTestDatabaseConfig = (serviceName: string) => ({
  uri: `mongodb://localhost:27017/test-${serviceName}`,
  useNewUrlParser: true,
  useUnifiedTopology: true,
});
```

## Deployment Process

### Development Deployment

1. **Local Development:**
```bash
# Start all services
npm run dev:all

# Or use Docker Compose
docker-compose -f docker-compose.dev.yml up
```

2. **Service-Specific Deployment:**
```bash
cd services/user-service
npm run start:dev
```

### Production Deployment

1. **Build Services:**
```bash
# Build all services
npm run build:all

# Or build specific service
cd services/user-service && npm run build
```

2. **Docker Deployment:**
```bash
# Build Docker images
docker build -t water-jar/user-service:latest services/user-service/
docker build -t water-jar/product-service:latest services/product-service/

# Or use Docker Compose
docker-compose -f docker-compose.prod.yml up -d
```

3. **Kubernetes Deployment:**
```yaml
# k8s/user-service-deployment.yaml
apiVersion: apps/v1
kind: Deployment
metadata:
  name: user-service
spec:
  replicas: 3
  selector:
    matchLabels:
      app: user-service
  template:
    metadata:
      labels:
        app: user-service
    spec:
      containers:
      - name: user-service
        image: water-jar/user-service:latest
        ports:
        - containerPort: 3001
        env:
        - name: MONGODB_URI
          valueFrom:
            secretKeyRef:
              name: mongodb-secret
              key: uri
```

### Environment-Specific Configuration

1. **Development:**
   - Local MongoDB instances
   - Debug logging enabled
   - Hot reload enabled

2. **Staging:**
   - Shared MongoDB cluster
   - Production-like configuration
   - Performance monitoring

3. **Production:**
   - Dedicated MongoDB clusters
   - Load balancing
   - Auto-scaling
   - Comprehensive monitoring

### Deployment Checklist

- [ ] All tests passing
- [ ] Database migrations applied
- [ ] Environment variables configured
- [ ] Service dependencies available
- [ ] Health checks configured
- [ ] Monitoring and logging setup
- [ ] Backup procedures in place

## Best Practices

### Code Organization

1. **Follow consistent naming conventions**
2. **Use TypeScript strictly**
3. **Implement proper error handling**
4. **Add comprehensive logging**
5. **Write meaningful tests**

### Service Design

1. **Keep services focused and cohesive**
2. **Design for failure and resilience**
3. **Implement proper authentication and authorization**
4. **Use versioned APIs**
5. **Document all endpoints**

### Database Design

1. **Design for service boundaries**
2. **Avoid cross-service transactions**
3. **Use appropriate indexes**
4. **Plan for data migration**
5. **Implement proper backup strategies**

### Security

1. **Validate all inputs**
2. **Use HTTPS in production**
3. **Implement rate limiting**
4. **Secure inter-service communication**
5. **Regular security audits**

### Performance

1. **Implement caching strategies**
2. **Use connection pooling**
3. **Monitor service metrics**
4. **Optimize database queries**
5. **Implement proper pagination**

### Monitoring

1. **Health check endpoints**
2. **Application metrics**
3. **Error tracking**
4. **Performance monitoring**
5. **Log aggregation**

## Troubleshooting

### Common Issues

1. **Service Discovery Problems:**
   - Check environment variables
   - Verify service URLs
   - Test network connectivity

2. **Database Connection Issues:**
   - Verify MongoDB is running
   - Check connection strings
   - Review authentication credentials

3. **Inter-Service Communication:**
   - Check service health endpoints
   - Verify API contracts
   - Review error logs

### Debugging Tools

1. **Service Logs:**
```bash
# View service logs
docker logs water-jar-user-service

# Follow logs in real-time
docker logs -f water-jar-user-service
```

2. **Database Monitoring:**
```bash
# MongoDB shell
mongo mongodb://localhost:27017/water-jar-user-service

# Check collections
db.users.find().limit(5)
```

3. **API Testing:**
```bash
# Test service endpoints
curl -X GET http://localhost:3001/api/v1/users/health

# Test with authentication
curl -H "Authorization: Bearer <token>" \
     -X GET http://localhost:3001/api/v1/users/profile
```

## Support and Resources

- **Documentation:** `/docs` endpoint on each service
- **API Documentation:** Swagger UI available at `/api/docs`
- **Health Checks:** `/health` endpoint on each service
- **Metrics:** `/metrics` endpoint for monitoring

For additional support, refer to the individual service README files or contact the development team.
