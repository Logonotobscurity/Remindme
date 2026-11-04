import { createFileRoute } from "@tanstack/react-router";
import { OmiRemindApp } from "@/components/omi/OmiRemindApp";

export const Route = createFileRoute("/")({ component: Home });

function Home() {
  return <OmiRemindApp />;
}
