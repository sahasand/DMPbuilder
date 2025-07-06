# Clinical Research Management Platform

## Project Overview
This is a comprehensive Clinical Research Management Platform that has evolved from a specialized DMP Builder into a full-featured modular platform supporting the entire clinical research lifecycle.

## Platform Architecture
- **Modular Design**: Plugin-based architecture with self-contained modules
- **Platform Core Services**: Workflow engine, data management, user management, audit/compliance
- **Module System**: Standardized `ClinicalModule` interface with automatic discovery and registration
- **Event-Driven Communication**: Modules communicate through platform event system
- **Workflow Integration**: Modules participate in clinical research workflows

## Technologies
- **Backend**: Node.js/TypeScript with Express API
- **Module System**: Dynamic module loading with TypeScript interfaces
- **AI Integration**: Claude and Gemini for content generation and analysis
- **Data Standards**: CDISC, CDASH compliance and validation
- **Document Processing**: PDF/Word protocol and CRF parsing
- **Architecture**: RESTful API with comprehensive error handling and logging

## Documentation
Comprehensive documentation is available in `/docs/`:

### 📖 Getting Started
- [`/docs/README.md`](docs/README.md) - Platform overview and quick start guide
- [`/docs/PLATFORM_ARCHITECTURE.md`](docs/PLATFORM_ARCHITECTURE.md) - Complete platform architecture and design

### 🔧 Module Development
- [`/docs/MODULE_SYSTEM.md`](docs/MODULE_SYSTEM.md) - How modules work within the platform
- [`/docs/MODULE_ARCHITECTURE.md`](docs/MODULE_ARCHITECTURE.md) - Module system design patterns and integration
- [`/docs/MODULE_DEVELOPMENT.md`](docs/MODULE_DEVELOPMENT.md) - Step-by-step guide for creating new modules
- [`/docs/EXISTING_MODULES.md`](docs/EXISTING_MODULES.md) - Documentation of current modules and capabilities

### 🗺️ Project Planning
- [`/docs/ROADMAP.md`](docs/ROADMAP.md) - 3-year development roadmap and strategic goals

## Current Modules
- **Protocol Analyzer** ✅ - Analyzes clinical protocols for complexity, risk factors, and regulatory requirements
- **DMP Builder** ✅ - Generates comprehensive data management plans with AI enhancement
- **CRF Validator** ✅ - Validates CRF specifications for completeness, protocol alignment, and CDISC compliance with PDF/JSON reporting
- **Data Validator** 📋 - CDISC compliance and data quality validation (planned)
- **Risk Assessor** 📋 - Comprehensive risk analysis and mitigation (planned)
- **Timeline Planner** 📋 - Study timeline and resource planning (planned)

## Key Files
- `/src/modules/` - Module implementations and registry
- `/src/core/` - Core platform services and application logic
- `/src/types/module-types.ts` - TypeScript interfaces for module system
- `/src/generators/` - DMP and AI content generation logic
- `dmpeg.pdf` - DMP template and structure reference
- `.env` - External clinical AI API credentials

## Build Commands
- `npm run build` - Build TypeScript to production
- `npm test` - Run clinical validation tests and module tests
- `npm run generate-dmp` - Generate sample DMP using modules
- `npm start` - Start the platform API server
- `npm run dev` - Start development server with hot reload

## API Endpoints

### Module Management
- `GET /api/v1/modules` - List all available modules
- `GET /api/v1/modules/:id` - Get specific module details and statistics
- `PATCH /api/v1/modules/:id/toggle` - Enable/disable modules at runtime
- `GET /api/v1/modules/stats` - Get module performance statistics

### DMP Builder
- `POST /api/v1/dmp/generate` - Generate DMP with module enhancement

### Protocol Analyzer
- `POST /api/v1/protocol-analyzer/analyze` - Analyze protocol complexity and requirements
- `GET /api/v1/protocol-analyzer/reports/:id` - Get detailed protocol analysis reports

### CRF Validator
- `POST /api/v1/crf-validator/validate` - Validate CRF against protocol requirements
- `GET /api/v1/crf-validator/reports/:id` - Get CRF validation reports
- `POST /api/v1/crf-validator/export` - Export validation reports (PDF/JSON)
- `GET /api/v1/crf-validator/status` - Get validation service status

## Platform Features
- **Module Hot-Swapping**: Enable/disable modules without restart
- **Workflow Engine**: Orchestrate complex clinical research workflows
- **Performance Monitoring**: Track module execution metrics and statistics
- **Compliance Framework**: Built-in GCP, 21 CFR Part 11, and GDPR compliance
- **API Integration**: RESTful API for platform and module management
- **Error Handling**: Robust error handling with graceful degradation

## Development Guidelines
- Follow the `ClinicalModule` interface for all new modules
- Use platform services for data access, workflow management, and audit logging
- Implement comprehensive error handling and performance monitoring
- Write tests for module functionality and integration
- Document module capabilities and configuration options

For detailed development instructions, see [`/docs/MODULE_DEVELOPMENT.md`](docs/MODULE_DEVELOPMENT.md).