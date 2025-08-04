import type { Preview } from '@storybook/react-vite'
import { I18nextProvider } from 'react-i18next'
import i18n from './i18n'
import '../src/index.css' // Import your main CSS file

const preview: Preview = {
  parameters: {
    controls: {
      matchers: {
       color: /(background|color)$/i,
       date: /Date$/i,
      },
    },
  },
  decorators: [
    (Story) => (
      <I18nextProvider i18n={i18n}>
        <Story />
      </I18nextProvider>
    ),
  ],
}

export default preview