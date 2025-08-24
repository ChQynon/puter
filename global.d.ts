declare module "katex/contrib/auto-render" {
  const render: (root: HTMLElement, options?: any) => void
  export default render
}

declare module "highlight.js/lib/core" {
  const hljs: any
  export default hljs
}

declare module "highlight.js/lib/languages/*" {
  const lang: any
  export default lang
}
