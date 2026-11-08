// Allow Next.js static HTML export to render a dynamic placeholder page
export function generateStaticParams() {
  return [{ id: "placeholder" }];
}
