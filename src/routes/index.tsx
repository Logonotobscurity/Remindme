import { createFileRoute } from "@tanstack/react-router";
import { EnglishReminderApp } from "@/components/EnglishReminderApp";

export const Route = createFileRoute("/")({ component: Home });

function Home() {
  return <EnglishReminderApp />;
}
