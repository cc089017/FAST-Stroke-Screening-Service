import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

export default defineConfig({
  plugins: [react()],
  server: {
    proxy: {
      // 프론트에서 /api 로 호출하면 내부에서 백엔드(127.0.0.1:8000)로 프록시
      '/api': {
        target: 'http://127.0.0.1:8000',
        changeOrigin: true,
      },
      // 정적 리소스도 백엔드에서 서빙하므로 /static 도 프록시 필요
      '/static': {
        target: 'http://127.0.0.1:8000',
        changeOrigin: true,
      },
    },
  },
  resolve: {
    // "@/..." 를 "/src/..." 로 인식
    alias: { '@': '/src' },
  },
})
