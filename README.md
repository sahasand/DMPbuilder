# Clinical Data Management Plan Generator

A comprehensive solution for generating production-ready Clinical Data Management Plans (DMPs) for clinical studies. This system processes clinical study protocols and Case Report Forms (CRFs) to generate detailed, regulatory-compliant data management plans.

## 🌟 Features

- **Automated DMP Generation**: Transform protocol and CRF documents into comprehensive DMPs
- **AI-Powered Processing**: Leverages clinical AI for intelligent document analysis
- **Regulatory Compliance**: Ensures compliance with ICH-GCP, FDA 21 CFR Part 11, and EMA guidelines
- **Multiple Output Formats**: Generate DMPs in Markdown, PDF, and Word formats
- **Validation & Quality Checks**: Built-in data validation and compliance checking
- **Risk Assessment**: Optional risk assessment and timeline generation
- **Clinical Standards**: Supports CDISC (SDTM, CDASH), MedDRA, and WHODrug standards

## 📋 Prerequisites

- Node.js 18.0.0 or higher
- npm 9.0.0 or higher
- Anthropic API key (for clinical AI processing)

## 🚀 Installation

1. Clone the repository:
```bash
git clone https://github.com/your-org/clinical-dmp-generator.git
cd clinical-dmp-generator
```

2. Install dependencies:
```bash
npm install
```

3. Create a `.env` file in the project root:
```env
ANTHROPIC_API_KEY=your_api_key_here
```

4. Build the project:
```bash
npm run build
```

5. (Optional) Install globally for CLI access:
```bash
npm install -g .
```

## 💻 Usage

### Command Line Interface

Generate a DMP using the CLI:

```bash
generate-dmp --protocol path/to/protocol.pdf --crf path/to/crf.pdf
```

#### CLI Options

```
Options:
  -V, --version            output the version number
  -p, --protocol <file>    Path to protocol PDF file (required)
  -c, --crf <file>         Path to CRF specifications file (required)
  -o, --output <directory> Output directory (default: "./output")
  -f, --format <format>    Output format: md, pdf, word, all (default: "all")
  --no-validation          Skip validation checks
  --no-compliance          Skip compliance checks
  --include-risk           Include risk assessment
  --include-timeline       Include timeline estimation
  --watermark <text>       Add watermark to PDF (e.g., DRAFT)
  --verbose                Enable verbose logging
  -h, --help               display help for command
```

#### Examples

Generate all formats with risk assessment:
```bash
generate-dmp -p protocol.pdf -c crf.pdf --include-risk
```

Generate only PDF with DRAFT watermark:
```bash
generate-dmp -p protocol.pdf -c crf.pdf -f pdf --watermark DRAFT
```

### Programmatic API

```typescript
import { mainGenerator } from 'clinical-dmp-generator';

const result = await mainGenerator.generateFromFiles(
  'path/to/protocol.pdf',
  'path/to/crf.pdf',
  {
    includeRiskAssessment: true,
    includeTimeline: true,
  }
);

// Access the generated DMP
console.log(result.dmp.studyInfo);
console.log(result.metadata.recommendations);
```

### Web Server API

Start the API server:

```bash
npm start
```

The server will start on port 3000 (configurable via PORT environment variable).

#### API Endpoints

- `GET /health` - Health check
- `POST /api/v1/dmp/generate` - Generate DMP from uploaded files
- `POST /api/v1/parse/protocol` - Parse protocol document
- `POST /api/v1/parse/crf` - Parse CRF specifications
- `POST /api/v1/validate/dmp` - Validate DMP structure
- `GET /api/v1/standards` - Get supported clinical standards

## 📁 Project Structure

```
clinical-dmp-generator/
├── src/
│   ├── core/           # Core application components
│   ├── parsers/        # Document parsers for protocols and CRFs
│   ├── api/            # External API integrations
│   ├── generators/     # DMP generation logic
│   ├── validators/     # Validation and compliance checking
│   ├── exporters/      # Output format exporters
│   ├── types/          # TypeScript type definitions
│   ├── utils/          # Utility functions
│   └── cli/            # Command-line interface
├── test/               # Test suites
├── docs/               # Additional documentation
├── .env.example        # Environment variable template
├── package.json        # Project configuration
└── tsconfig.json       # TypeScript configuration
```

## 🔧 Configuration

### Environment Variables

| Variable | Description | Default |
|----------|-------------|---------|
| `ANTHROPIC_API_KEY` | API key for clinical AI processing | Required |
| `PORT` | Server port | 3000 |
| `NODE_ENV` | Environment (development/production) | development |
| `LOG_LEVEL` | Logging level | info |
| `OUTPUT_DIR` | Default output directory | ./output |
| `API_RATE_LIMIT` | API requests per minute | 10 |

### Clinical Standards Configuration

The system uses the following clinical standards by default:
- MedDRA version 27.0
- WHODrug version GLOBALB3Mar24
- CDISC SDTM 3.4, CDASH 2.1, ADAM 1.1

These can be configured in the environment variables or `src/core/config.ts`.

## 🏗️ Development

### Running in Development Mode

```bash
npm run dev
```

### Running Tests

```bash
npm test
```

### Code Quality

```bash
npm run lint        # Run ESLint
npm run format      # Format code with Prettier
npm run typecheck   # Check TypeScript types
```

## 📊 DMP Structure

Generated DMPs include the following sections:

1. **Study Information** - Protocol details, phase, sponsor
2. **Roles and Responsibilities** - Team roles and access rights
3. **Network Directories** - File structure and organization
4. **EDC System** - Electronic Data Capture details
5. **Data Cleaning Plan** - Validation rules and query management
6. **AE/SAE Reporting** - Safety reporting procedures
7. **Medical Coding Process** - MedDRA and WHODrug implementation
8. **Clinical Data Management Tasks** - CDM responsibilities
9. **Protocol Deviation** - Classification and management
10. **Database Lock** - Procedures for database closure
11. **Appendix** - Additional resources and references

## 🔒 Security

- API keys are stored securely in environment variables
- All clinical data is processed locally or through secure APIs
- Audit logging for all data processing activities
- Compliance with HIPAA/GDPR requirements

## 🤝 Contributing

1. Fork the repository
2. Create a feature branch (`git checkout -b feature/amazing-feature`)
3. Commit your changes (`git commit -m 'Add amazing feature'`)
4. Push to the branch (`git push origin feature/amazing-feature`)
5. Open a Pull Request

## 📄 License

This project is licensed under the MIT License - see the LICENSE file for details.

## 🆘 Support

For support, please:
- Check the [documentation](./docs)
- Open an issue on GitHub
- Contact the development team

## 🚦 Compliance Status

This system is designed to meet the following regulatory requirements:
- ✅ ICH-GCP E6(R2)
- ✅ FDA 21 CFR Part 11
- ✅ EMA Guidelines
- ✅ CDISC Standards

## 📈 Roadmap

- [ ] Support for additional document formats (Excel, CSV)
- [ ] Integration with clinical trial management systems
- [ ] Multi-language support
- [ ] Advanced timeline visualization
- [ ] Automated protocol amendment handling
- [ ] Real-time collaboration features

---

**Note**: This is a clinical software tool. Always review generated DMPs for accuracy and completeness before use in actual clinical trials.