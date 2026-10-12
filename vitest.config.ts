import path from "node:path"
import react from "@vitejs/plugin-react"
import { defineConfig } from "vitest/config"

export default defineConfig({
    plugins: [react()],
    resolve: {
        alias: {
            "@": path.resolve(__dirname, "./src"),
        },
    },
    test: {
        environment: "node",
        env: { TZ: "America/New_York" },
        setupFiles: ["./tests/setup.ts"],
        include: ["tests/**/*.test.{ts,tsx}"],
        coverage: {
            provider: "v8",
            // Measure every source file, not only the ones a test happens to import, so untested files show up as 0%
            include: ["src/**/*.{ts,tsx}"],
            reporter: ["text", "html"],
        },
    },
})
