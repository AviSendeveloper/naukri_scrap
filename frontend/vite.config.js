import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

export default defineConfig({
    plugins: [react()],
    server: {
        watch: {
            usePolling: true, // Forces Vite to manually check for file changes
        },
        host: true, // Necessary for Docker to expose the port
        strictPort: true,
        port: 5001,
        open: !process.env.DOCKER
    }
})
