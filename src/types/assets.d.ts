/** Fonts are bundled into the plugin as data URLs, so nothing is fetched at runtime. */
declare module "*.woff2" {
  const url: string;
  export default url;
}
