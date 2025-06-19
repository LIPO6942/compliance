import { AppLayout } from "@/components/layout/AppLayout";

export default function ApplicationGroupLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return <AppLayout>{children}</AppLayout>;
}
