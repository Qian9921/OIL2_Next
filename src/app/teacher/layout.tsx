import { redirect } from "next/navigation";

export default function TeacherLayout({ children }: { children: React.ReactNode }) {
  void children;
  redirect("/");
}
