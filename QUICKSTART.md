# 🚀 Quick Start Guide - Clinical DMP Generator

## Prerequisites
- Node.js 18+ installed
- VSCode (recommended)
- An Anthropic API key

## 🏃‍♂️ Fastest Way to Start (VSCode)

1. **Open the project in VSCode**
   ```bash
   code /path/to/dmpbuilder
   ```

2. **Set up your API key**
   - Copy `.env.example` to `.env`
   - Add your Anthropic API key to the `.env` file

3. **Run the startup script**
   ```bash
   ./startup.sh
   ```
   
   This will:
   - Check dependencies
   - Install packages if needed
   - Start both backend (port 3000) and frontend (port 3001)
   - Open your browser automatically

## 🖥️ VSCode Debug Options

### Using Launch Configurations (F5)

1. **Full Stack Development**
   - Press `F5` and select "Full Stack"
   - This starts both backend and frontend with debugging

2. **Backend Only**
   - Press `F5` and select "Backend"
   - Debugger attaches to the backend server

3. **Frontend Only**
   - Press `F5` and select "Frontend"
   - Opens Chrome with React DevTools

4. **CLI Testing**
   - Press `F5` and select "CLI - Generate DMP"
   - Enter paths to your test PDF files when prompted

## 📁 Project Structure

```
dmpbuilder/
├── frontend/          # React UI application
├── src/              # Backend TypeScript source
├── .vscode/          # VSCode configurations
├── startup.sh        # One-click startup script
└── .env             # Your configuration (create from .env.example)
```

## 🌐 Access Points

- **Frontend UI**: http://localhost:3001
- **Backend API**: http://localhost:3000
- **API Health**: http://localhost:3000/health
- **API Docs**: http://localhost:3000/api/v1

## 🛠️ Common Commands

```bash
# Start everything
./startup.sh

# Or use npm scripts
npm run dev:all          # Start both frontend and backend
npm run dev:backend      # Backend only
npm run dev:frontend     # Frontend only

# Build for production
npm run build:all

# Run tests
npm test

# Generate a DMP via CLI
npm run generate-dmp -- -p protocol.pdf -c crf.pdf
```

## 🎯 Using the Web Interface

1. Open http://localhost:3001
2. Click "Generate DMP"
3. Upload your Protocol PDF
4. Upload your CRF PDF
5. Select optional features (Risk Assessment, Timeline)
6. Click "Generate"
7. Download your DMP in PDF, Word, or Markdown format

## 🔧 VSCode Tips

- **Auto-format on save**: Already configured
- **ESLint integration**: Errors show inline
- **Debugging**: Set breakpoints and use F5
- **Tasks**: Use `Cmd+Shift+B` to build all

## 🆘 Troubleshooting

1. **Port already in use**
   ```bash
   # Kill processes on ports
   lsof -ti:3000 | xargs kill -9
   lsof -ti:3001 | xargs kill -9
   ```

2. **Dependencies issues**
   ```bash
   rm -rf node_modules frontend/node_modules
   npm install
   cd frontend && npm install && cd ..
   ```

3. **API key not working**
   - Ensure your `.env` file has the correct key
   - No quotes around the API key value

## 📝 Next Steps

- Read the full [README.md](README.md) for detailed documentation
- Check [PROJECT_SUMMARY.md](PROJECT_SUMMARY.md) for architecture details
- Explore the API endpoints via the backend
- Customize the DMP templates in `src/generators/`

---

**Happy DMP Generating! 🎉**