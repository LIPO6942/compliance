
import { AppLayout } from "@/components/layout/AppLayout";
import { PlanDataProvider } from "@/contexts/PlanDataContext";
import { DocumentsProvider } from "@/contexts/DocumentsContext";

export default function ApplicationGroupLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <PlanDataProvider>
      <DocumentsProvider>
        <AppLayout>{children}</AppLayout>
      </DocumentsProvider>
    </PlanDataProvider>
  );
}
