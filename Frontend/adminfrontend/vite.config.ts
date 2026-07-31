import { defineConfig, loadEnv } from 'vite'
import path from 'path'
import tailwindcss from '@tailwindcss/vite'
import react from '@vitejs/plugin-react'


function figmaAssetResolver() {
  return {
    name: 'figma-asset-resolver',
    resolveId(id) {
      if (id.startsWith('figma:asset/')) {
        const filename = id.replace('figma:asset/', '')
        return path.resolve(__dirname, 'src/assets', filename)
      }
    },
  }
}

// 프록시가 바라볼 백엔드 주소. 기본은 로컬, .env.local의 VITE_API_TARGET이 있으면 그걸 쓴다.
//   로컬 개발  → 아무것도 안 하면 http://localhost:8080
//   배포 백엔드 → .env.local 에 VITE_API_TARGET=http://3.35.218.209:8080
// .env.local은 gitignore 대상이라 각자 환경을 커밋 없이 바꿀 수 있다. (7/30 EC2 배포)
export default defineConfig(({ mode }) => {
  const apiTarget = loadEnv(mode, __dirname, '').VITE_API_TARGET || 'http://localhost:8080'

  // 어느 백엔드를 보고 있는지 기동 로그에 찍어둔다.
  // 프록시 대상이 조용히 localhost로 떨어지면 원인 찾기가 까다로워서 눈에 보이게 남긴다.
  console.log(`[vite.config] 백엔드 프록시 대상: ${apiTarget}`)

  return {
  plugins: [
    figmaAssetResolver(),
    // The React and Tailwind plugins are both required for Make, even if
    // Tailwind is not being actively used – do not remove them
    react(),
    tailwindcss(),
  ],
  resolve: {
    alias: {
      // Alias @ to the src directory
      '@': path.resolve(__dirname, './src'),
    },
  },

  // File types to support raw imports. Never add .css, .tsx, or .ts files to this.
  assetsInclude: ['**/*.svg', '**/*.csv'],

  // 백엔드(Spring Boot :8080)에 CORS 설정이 없으므로 개발 서버 프록시로 우회
  server: {
    // 소비자 5173 · 주최자(popupfrontend) 5174 · 관리자(이 앱) 5175 고정
    port: 5175,
    strictPort: true,
    proxy: {
      '/api': { target: apiTarget, changeOrigin: true },
      '/uploads': { target: apiTarget, changeOrigin: true },
    },
  },
  }
})
