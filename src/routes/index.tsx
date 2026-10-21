import { createFileRoute } from "@tanstack/react-router";
import { EnglishUi } from "@/components/EnglishUi";
import { RemindApp } from "@/components/RemindApp";

export const Route = createFileRoute("/")({ component: Home });

function Home() {
  return (
    <>
      <EnglishUi />
      <RemindApp />
    </>
  );
}
