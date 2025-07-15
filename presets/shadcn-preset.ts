import { definePreset } from 'unocss';

export default definePreset(() => ({
	name: 'shadcn-preset',

	theme: {
		container: {
			center: true,
			padding: '2rem',
			screens: {
				'2xl': '1400px',
			},
		},
		colors: {
			border: 'hsl(var(--border))',
			input: 'hsl(var(--input))',
			ring: 'hsl(var(--ring))',
			background: 'hsl(var(--background))',
			foreground: 'hsl(var(--foreground))',
			primary: {
				DEFAULT: 'hsl(var(--primary))',
				foreground: 'hsl(var(--primary-foreground))',
			},
			secondary: {
				DEFAULT: 'hsl(var(--secondary))',
				foreground: 'hsl(var(--secondary-foreground))',
			},
			destructive: {
				DEFAULT: 'hsl(var(--destructive))',
				foreground: 'hsl(var(--destructive-foreground))',
			},
			muted: {
				DEFAULT: 'hsl(var(--muted))',
				foreground: 'hsl(var(--muted-foreground))',
			},
			accent: {
				DEFAULT: 'hsl(var(--accent))',
				foreground: 'hsl(var(--accent-foreground))',
			},
			popover: {
				DEFAULT: 'hsl(var(--popover))',
				foreground: 'hsl(var(--popover-foreground))',
			},
			card: {
				DEFAULT: 'hsl(var(--card))',
				foreground: 'hsl(var(--card-foreground))',
			},
			sidebar: {
				DEFAULT: 'hsl(var(--sidebar-background))',
				foreground: 'hsl(var(--sidebar-foreground))',
				primary: 'hsl(var(--sidebar-primary))',
				'primary-foreground': 'hsl(var(--sidebar-primary-foreground))',
				accent: 'hsl(var(--sidebar-accent))',
				'accent-foreground': 'hsl(var(--sidebar-accent-foreground))',
				border: 'hsl(var(--sidebar-border))',
				ring: 'hsl(var(--sidebar-ring))',
			},
		},
		borderRadius: {
			xl: 'calc(var(--radius) + 4px)',
			lg: 'var(--radius)',
			md: 'calc(var(--radius) - 2px)',
			sm: 'calc(var(--radius) - 4px)',
		},
		fontFamily: {
			// sans: ["Inter", ...fontFamily.sans],
		},
		animation: {
			keyframes: {
				'accordion-down': '{from {height: 0;} to {height: var(--bits-accordion-content-height);}}',
				'accordion-up': '{from {height: var(--bits-accordion-content-height);} to {height: 0;}}',
				'caret-blink': '{0%,70%,100%{opacity: 1;} 20%,50%{opacity: 0;}}',
			},
			durations: {
				'accordion-down': '0.2s',
				'accordion-up': '0.2s',
				'caret-blink': '1.25s',
			},
			easings: {
				'accordion-down': 'ease-out',
				'accordion-up': 'ease-out',
				'caret-blink': 'ease-out',
			},
			counts: {
				'caret-blink': 'infinite',
			},
		},
	},

	preflights: [
		// commented out because I put the CSS in app.css
		// also, I'm making use of this extension https://marketplace.visualstudio.com/items?itemName=dexxiez.shadcn-color-preview#:~:text=The%20shadcn%20HSL%20Preview%20extension,directly%20in%20your%20CSS%20files.
		//   {
		//     layer: 'default',
		//     getCSS: () => `:root {
		//   --background: 0 0% 100%;
		//   --foreground: 224 71.4% 4.1%;
		//   --muted: 220 14.3% 95.9%;
		//   --muted-foreground: 220 8.9% 46.1%;
		//   --popover: 0 0% 100%;
		//   --popover-foreground: 224 71.4% 4.1%;
		//   --card: 0 0% 100%;
		//   --card-foreground: 224 71.4% 4.1%;
		//   --border: 220 13% 91%;
		//   --input: 220 13% 91%;
		//   --primary: 220.9 39.3% 11%;
		//   --primary-foreground: 210 20% 98%;
		//   --secondary: 220 14.3% 95.9%;
		//   --secondary-foreground: 220.9 39.3% 11%;
		//   --accent: 220 14.3% 95.9%;
		//   --accent-foreground: 220.9 39.3% 11%;
		//   --destructive: 0 72.2% 50.6%;
		//   --destructive-foreground: 210 20% 98%;
		//   --ring: 224 71.4% 4.1%;
		//   --radius: 0.5rem;
		// }`,
		//   },
	],
}));
