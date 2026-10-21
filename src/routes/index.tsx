import { createFileRoute } from "@tanstack/react-router";
import { RemindApp } from "@/components/RemindApp";

export const Route = createFileRoute("/")({ component: Home });

function Home() {
  return <RemindApp />;
}
