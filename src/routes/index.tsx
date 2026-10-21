import { createFileRoute } from "@tanstack/react-router";
import { ActivityDashboard } from "@/components/ActivityDashboard";

export const Route = createFileRoute("/")({ component: Home });

function Home() {
  return <ActivityDashboard />;
}
