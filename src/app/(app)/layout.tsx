
import { AppLayout } from "@/components/layout/AppLayout";
import { PlanDataProvider } from "@/contexts/PlanDataContext";
import { DocumentsProvider } from "@/contexts/DocumentsContext";
import { IdentifiedRegulationsProvider } from "@/contexts/IdentifiedRegulationsContext";

export default function ApplicationGroupLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <PlanDataProvider>
      <DocumentsProvider>
        <IdentifiedRegulationsProvider>
          <AppLayout>{children}</AppLayout>
        </IdentifiedRegulationsProvider>
      </DocumentsProvider>
    </PlanDataProvider>
  );
}
