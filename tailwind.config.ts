import type { Config } from 'tailwindcss'

export default <Partial<Config>>{
  content: [
    './app/components/**/*.{vue,js,ts}',
    './app/layouts/**/*.vue',
    './app/pages/**/*.vue',
    './app/plugins/**/*.{js,ts}',
    './app/app.vue',
    './app/data/**/*.ts'
  ],
  theme: {
    extend: {
      colors: {
        navy: '#1B3B5F',
        green: '#2F6F58',
        coral: '#E36656',
        cream: '#FBF3E3',
        tan: '#E9DAB8',
        'ink-muted': '#5B5347'
      },
      fontFamily: {
        heading: ['Fraunces', 'ui-serif', 'Georgia', 'serif'],
        body: ['Nunito', 'ui-sans-serif', 'system-ui', 'sans-serif']
      },
      borderRadius: {
        '4xl': '2rem'
      },
      boxShadow: {
        warm: '0 10px 30px -10px rgba(91, 83, 71, 0.25)',
        'warm-lg': '0 20px 45px -15px rgba(91, 83, 71, 0.3)'
      },
      keyframes: {
        float: {
          '0%, 100%': { transform: 'translateY(0px)' },
          '50%': { transform: 'translateY(-10px)' }
        },
        'pop-heart': {
          '0%': { transform: 'scale(1)' },
          '35%': { transform: 'scale(1.4)' },
          '60%': { transform: 'scale(0.9)' },
          '100%': { transform: 'scale(1)' }
        },
        sparkle: {
          '0%, 100%': { opacity: '0.4', transform: 'scale(0.9) rotate(0deg)' },
          '50%': { opacity: '1', transform: 'scale(1.1) rotate(15deg)' }
        },
        'fade-slide-up': {
          '0%': { opacity: '0', transform: 'translateY(16px)' },
          '100%': { opacity: '1', transform: 'translateY(0)' }
        }
      },
      animation: {
        float: 'float 5s ease-in-out infinite',
        'pop-heart': 'pop-heart 0.4s ease-out',
        sparkle: 'sparkle 3s ease-in-out infinite',
        'fade-slide-up': 'fade-slide-up 0.6s ease-out both'
      }
    }
  },
  plugins: []
}
