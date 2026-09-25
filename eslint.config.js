import { config } from '@fohte/eslint-config'

export default [
  { ignores: ['dist/**'] },
  ...config({
    typescript: { typeChecked: true },
    errorHandling: {},
  }),
]
