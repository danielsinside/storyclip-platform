# ⚙️ Configuración para Lovable

## 🎯 Setup Rápido

### **1. Variables de Entorno**
```typescript
// .env.local
NEXT_PUBLIC_STORY_API_URL=https://story.creatorsflow.app
NEXT_PUBLIC_STORY_API_TIMEOUT=30000
NEXT_PUBLIC_STORY_MAX_FILE_SIZE=500000000
```

### **2. Configuración de CORS**
```typescript
// config/cors.ts
export const CORS_CONFIG = {
  allowedOrigins: [
    'https://lovable.dev',
    'https://*.lovable.dev',
    'https://lovable.app',
    'https://*.lovable.app',
    'https://id-preview--*.lovable.app',
    'https://*.lovableproject.com',
    'http://localhost:3000',
    'http://localhost:5173',
    'http://127.0.0.1:3000',
    'http://127.0.0.1:5173'
  ],
  allowedMethods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
  allowedHeaders: [
    'Content-Type',
    'Authorization',
    'X-Requested-With',
    'X-Mc-Auth',
    'Idempotency-Key',
    'X-Flow-Id',
    'Accept',
    'Range'
  ],
  credentials: true,
  maxAge: 86400
};
```

### **3. Configuración de API**
```typescript
// lib/story-api.ts
import { API_CONFIG } from '../config/api';

class StoryAPI {
  private baseURL: string;
  private timeout: number;

  constructor() {
    this.baseURL = process.env.NEXT_PUBLIC_STORY_API_URL || 'https://story.creatorsflow.app';
    this.timeout = parseInt(process.env.NEXT_PUBLIC_STORY_API_TIMEOUT || '30000');
  }

  async uploadVideo(file: File): Promise<VideoUploadResponse> {
    const formData = new FormData();
    formData.append('file', file);

    const response = await fetch(`${this.baseURL}/api/videos/upload`, {
      method: 'POST',
      body: formData,
      signal: AbortSignal.timeout(this.timeout)
    });

    if (!response.ok) {
      throw new Error(`Upload failed: ${response.statusText}`);
    }

    return await response.json();
  }

  async processVideo(uploadId: string, options: VideoUploadOptions): Promise<ProcessingResponse> {
    const response = await fetch(`${this.baseURL}/api/v1/jobs`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        uploadId,
        options
      }),
      signal: AbortSignal.timeout(this.timeout)
    });

    if (!response.ok) {
      throw new Error(`Processing failed: ${response.statusText}`);
    }

    return await response.json();
  }

  async getJobStatus(jobId: string): Promise<ProcessingResponse> {
    const response = await fetch(`${this.baseURL}/api/v1/jobs/${jobId}/status`, {
      signal: AbortSignal.timeout(this.timeout)
    });

    if (!response.ok) {
      throw new Error(`Status check failed: ${response.statusText}`);
    }

    return await response.json();
  }
}

export const storyAPI = new StoryAPI();
```

### **4. Configuración de Next.js**
```typescript
// next.config.js
/** @type {import('next').NextConfig} */
const nextConfig = {
  experimental: {
    appDir: true,
  },
  images: {
    domains: ['story.creatorsflow.app'],
  },
  async headers() {
    return [
      {
        source: '/api/:path*',
        headers: [
          {
            key: 'Access-Control-Allow-Origin',
            value: '*',
          },
          {
            key: 'Access-Control-Allow-Methods',
            value: 'GET, POST, PUT, DELETE, OPTIONS',
          },
          {
            key: 'Access-Control-Allow-Headers',
            value: 'Content-Type, Authorization',
          },
        ],
      },
    ];
  },
};

module.exports = nextConfig;
```

### **5. Configuración de Tailwind CSS**
```css
/* tailwind.config.js */
module.exports = {
  content: [
    './pages/**/*.{js,ts,jsx,tsx,mdx}',
    './components/**/*.{js,ts,jsx,tsx,mdx}',
    './app/**/*.{js,ts,jsx,tsx,mdx}',
  ],
  theme: {
    extend: {
      colors: {
        story: {
          primary: '#007bff',
          secondary: '#28a745',
          accent: '#ffc107',
        },
      },
      animation: {
        'pulse-slow': 'pulse 3s cubic-bezier(0.4, 0, 0.6, 1) infinite',
      },
    },
  },
  plugins: [],
};
```

### **6. Configuración de TypeScript**
```json
// tsconfig.json
{
  "compilerOptions": {
    "target": "es5",
    "lib": ["dom", "dom.iterable", "es6"],
    "allowJs": true,
    "skipLibCheck": true,
    "strict": true,
    "noEmit": true,
    "esModuleInterop": true,
    "module": "esnext",
    "moduleResolution": "bundler",
    "resolveJsonModule": true,
    "isolatedModules": true,
    "jsx": "preserve",
    "incremental": true,
    "plugins": [
      {
        "name": "next"
      }
    ],
    "baseUrl": ".",
    "paths": {
      "@/*": ["./*"],
      "@/components/*": ["./components/*"],
      "@/hooks/*": ["./hooks/*"],
      "@/lib/*": ["./lib/*"],
      "@/types/*": ["./types/*"]
    }
  },
  "include": ["next-env.d.ts", "**/*.ts", "**/*.tsx", ".next/types/**/*.ts"],
  "exclude": ["node_modules"]
}
```

### **7. Configuración de ESLint**
```json
// .eslintrc.json
{
  "extends": ["next/core-web-vitals"],
  "rules": {
    "@typescript-eslint/no-unused-vars": "warn",
    "@typescript-eslint/no-explicit-any": "warn",
    "react-hooks/exhaustive-deps": "warn"
  }
}
```

### **8. Configuración de Prettier**
```json
// .prettierrc
{
  "semi": true,
  "trailingComma": "es5",
  "singleQuote": true,
  "printWidth": 80,
  "tabWidth": 2,
  "useTabs": false
}
```

### **9. Configuración de Package.json**
```json
{
  "name": "lovable-story-integration",
  "version": "1.0.0",
  "private": true,
  "scripts": {
    "dev": "next dev",
    "build": "next build",
    "start": "next start",
    "lint": "next lint",
    "type-check": "tsc --noEmit"
  },
  "dependencies": {
    "next": "^14.0.0",
    "react": "^18.0.0",
    "react-dom": "^18.0.0",
    "typescript": "^5.0.0",
    "@types/node": "^20.0.0",
    "@types/react": "^18.0.0",
    "@types/react-dom": "^18.0.0"
  },
  "devDependencies": {
    "eslint": "^8.0.0",
    "eslint-config-next": "^14.0.0",
    "prettier": "^3.0.0",
    "tailwindcss": "^3.0.0",
    "autoprefixer": "^10.0.0",
    "postcss": "^8.0.0"
  }
}
```

### **10. Configuración de Git**
```gitignore
# .gitignore
# Dependencies
node_modules/
.pnp
.pnp.js

# Testing
coverage/

# Next.js
.next/
out/

# Production
build/

# Misc
.DS_Store
*.pem

# Debug
npm-debug.log*
yarn-debug.log*
yarn-error.log*

# Local env files
.env*.local

# Vercel
.vercel

# TypeScript
*.tsbuildinfo
next-env.d.ts
```

---

## 🚀 Comandos de Instalación

### **1. Crear Proyecto**
```bash
npx create-next-app@latest lovable-story-app --typescript --tailwind --eslint --app
cd lovable-story-app
```

### **2. Instalar Dependencias**
```bash
npm install
# o
yarn install
```

### **3. Configurar Variables de Entorno**
```bash
echo "NEXT_PUBLIC_STORY_API_URL=https://story.creatorsflow.app" >> .env.local
echo "NEXT_PUBLIC_STORY_API_TIMEOUT=30000" >> .env.local
echo "NEXT_PUBLIC_STORY_MAX_FILE_SIZE=500000000" >> .env.local
```

### **4. Ejecutar en Desarrollo**
```bash
npm run dev
# o
yarn dev
```

### **5. Construir para Producción**
```bash
npm run build
# o
yarn build
```

---

## 🎯 Checklist de Configuración

- [ ] ✅ Variables de entorno configuradas
- [ ] ✅ CORS configurado para Lovable
- [ ] ✅ API client configurado
- [ ] ✅ TypeScript configurado
- [ ] ✅ Tailwind CSS configurado
- [ ] ✅ ESLint configurado
- [ ] ✅ Prettier configurado
- [ ] ✅ Git configurado
- [ ] ✅ Dependencias instaladas
- [ ] ✅ Proyecto ejecutándose

---

## 🔧 Troubleshooting

### **Error: CORS Policy**
```typescript
// Verificar que el dominio esté en la lista blanca
const origin = window.location.origin;
console.log('Current origin:', origin);
```

### **Error: File Too Large**
```typescript
// Verificar tamaño del archivo
const maxSize = 500 * 1024 * 1024; // 500MB
if (file.size > maxSize) {
  alert('File too large. Maximum size is 500MB.');
}
```

### **Error: Network Timeout**
```typescript
// Aumentar timeout para archivos grandes
const timeout = 60000; // 60 seconds
```

### **Error: Invalid File Format**
```typescript
// Verificar formato del archivo
const supportedFormats = ['video/mp4', 'video/webm', 'video/quicktime'];
if (!supportedFormats.includes(file.type)) {
  alert('Unsupported file format. Please use MP4, WebM, or MOV.');
}
```

---

**¡Configuración completa para Lovable! 🎬✨**










