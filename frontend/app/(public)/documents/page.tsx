import type { Metadata } from "next";
import { DocumentBrowser } from "@/components/document-browser";

export const metadata: Metadata = {
  title: "Document Repository · OrdiSearch",
  description: "Browse the approved and indexed local ordinance corpus of the Municipality of Polangui, Albay.",
};

export default function DocumentsPage() {
  return <DocumentBrowser />;
}
