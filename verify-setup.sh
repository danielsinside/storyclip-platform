#!/bin/bash

# StoryClip Monorepo - Setup Verification Script

echo "🔍 Verificando estructura del monorepo..."
echo ""

# Colors
GREEN='\033[0;32m'
RED='\033[0;31m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Check git
if [ -d ".git" ]; then
  echo -e "${GREEN}✓${NC} Git repository initialized"
  echo "  Commit: $(git log -1 --oneline)"
else
  echo -e "${RED}✗${NC} Git repository NOT found"
  exit 1
fi

echo ""

# Check frontend
if [ -d "frontend" ]; then
  echo -e "${GREEN}✓${NC} Frontend directory exists"

  if [ -f "frontend/package.json" ]; then
    echo -e "${GREEN}  ✓${NC} package.json found"
  else
    echo -e "${RED}  ✗${NC} package.json NOT found"
  fi

  if [ -f "frontend/vite.config.ts" ]; then
    echo -e "${GREEN}  ✓${NC} vite.config.ts found"
  else
    echo -e "${RED}  ✗${NC} vite.config.ts NOT found"
  fi

  if [ -d "frontend/src" ]; then
    echo -e "${GREEN}  ✓${NC} src directory found"
    echo "    Components: $(find frontend/src/components -name "*.tsx" 2>/dev/null | wc -l) files"
    echo "    Pages: $(find frontend/src/pages -name "*.tsx" 2>/dev/null | wc -l) files"
  else
    echo -e "${RED}  ✗${NC} src directory NOT found"
  fi
else
  echo -e "${RED}✗${NC} Frontend directory NOT found"
  exit 1
fi

echo ""

# Check backend
if [ -d "backend" ]; then
  echo -e "${GREEN}✓${NC} Backend directory exists"

  if [ -f "backend/package.json" ]; then
    echo -e "${GREEN}  ✓${NC} package.json found"
  else
    echo -e "${RED}  ✗${NC} package.json NOT found"
  fi

  if [ -f "backend/app.js" ]; then
    echo -e "${GREEN}  ✓${NC} app.js found"
  else
    echo -e "${RED}  ✗${NC} app.js NOT found"
  fi

  if [ -d "backend/routes" ]; then
    echo -e "${GREEN}  ✓${NC} routes directory found"
    echo "    Routes: $(find backend/routes -name "*.js" 2>/dev/null | wc -l) files"
  else
    echo -e "${RED}  ✗${NC} routes directory NOT found"
  fi

  if [ -d "backend/services" ]; then
    echo -e "${GREEN}  ✓${NC} services directory found"
    echo "    Services: $(find backend/services -name "*.js" 2>/dev/null | wc -l) files"
  else
    echo -e "${RED}  ✗${NC} services directory NOT found"
  fi
else
  echo -e "${RED}✗${NC} Backend directory NOT found"
  exit 1
fi

echo ""

# Check .gitignore
if [ -f ".gitignore" ]; then
  echo -e "${GREEN}✓${NC} .gitignore exists"
  echo "  Rules: $(grep -c "^[^#]" .gitignore) lines"
else
  echo -e "${RED}✗${NC} .gitignore NOT found"
fi

echo ""

# Check README
if [ -f "README.md" ]; then
  echo -e "${GREEN}✓${NC} README.md exists"
else
  echo -e "${YELLOW}⚠${NC} README.md NOT found"
fi

echo ""

# Size summary
echo "📊 Size Summary:"
echo "  Frontend: $(du -sh frontend | cut -f1)"
echo "  Backend:  $(du -sh backend | cut -f1)"
echo "  Total:    $(du -sh . | cut -f1)"

echo ""

# Files count
TOTAL_FILES=$(git ls-files | wc -l)
echo "📁 Total files tracked: $TOTAL_FILES"

echo ""
echo -e "${GREEN}✅ Verification complete!${NC}"
echo ""
echo "📚 Next steps:"
echo "  1. cd frontend && npm install"
echo "  2. cd backend && npm install"
echo "  3. Configure .env files"
echo "  4. Start development servers"
