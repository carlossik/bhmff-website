import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'

export default defineConfig({
    plugins: [
        react(),
        tailwindcss(),
    ],
    input: [
        'index.html',
        'bhmff/index.html',
        'bhmff-domain/index.html',
    ],
})