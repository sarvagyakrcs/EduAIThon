import { ThemeToggle } from "@/components/global/mode-toggle";
import SignUpForm from "@/modules/auth/components/sign-up-component";

export default function Page() {
  return (
    <div className="flex h-screen w-screen items-center justify-center w-screen gap-3">
      <ThemeToggle />
      <SignUpForm type="modal" modalLabel="icon" />
    </div>
  )
}