import { ThemeToggle } from "@/components/global/mode-toggle";
import { Button } from "@/components/ui/button";

export default function Page() {
  return (
    <div className="flex h-screen items-center justify-center w-screen gap-3">
      <ThemeToggle />
      <Button>asds</Button>
    </div>
  )
}