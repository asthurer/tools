/** @type {import('tailwindcss').Config} */
export default {
    content: [
        "./index.html",
        "./src/**/*.{js,ts,jsx,tsx}",
    ],
    theme: {
        extend: {
            colors: {
                foundry: {
                    950: 'rgb(var(--c-foundry-950) / <alpha-value>)',
                    900: 'rgb(var(--c-foundry-900) / <alpha-value>)',
                    800: 'rgb(var(--c-foundry-800) / <alpha-value>)',
                    700: 'rgb(var(--c-foundry-700) / <alpha-value>)',
                    500: 'rgb(var(--c-foundry-500) / <alpha-value>)',
                    400: 'rgb(var(--c-foundry-400) / <alpha-value>)',
                    200: 'rgb(var(--c-foundry-200) / <alpha-value>)',
                    100: 'rgb(var(--c-foundry-100) / <alpha-value>)',
                },
                accent: {
                    500: '#2563eb', // Primary Blue
                    600: '#1d4ed8', // Darker Blue
                    400: '#3b82f6', // Lighter Blue
                    gold: '#d4af37', // Gold/Warning
                    danger: '#ef4444', // Red/Error
                    success: '#10b981', // Green/Success
                }
            },
            fontFamily: {
                sans: ['Inter', 'system-ui', 'sans-serif'],
                mono: ['JetBrains Mono', 'Menlo', 'monospace'],
            },
            fontSize: {
                'xxs': '0.625rem', // 10px
            },
            boxShadow: {
                'glow': '0 0 10px rgba(37, 99, 235, 0.2)',
            }
        },
    },
    plugins: [],
}
