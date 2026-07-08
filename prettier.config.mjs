/** @type {import('prettier').Config} */
const config = {
  semi: true,
  singleQuote: false,
  trailingComma: "all",
  printWidth: 100,
  // Ordena automáticamente las clases de Tailwind.
  plugins: ["prettier-plugin-tailwindcss"],
};

export default config;
