
import { AppLayout } from "@/components/layout/AppLayout";
import { PlanDataProvider } from "@/contexts/PlanDataContext";
import { DocumentsProvider } from "@/contexts/DocumentsContext";
import { IdentifiedRegulationsProvider } from "@/contexts/IdentifiedRegulationsContext";
import { TrainingDataProvider } from "@/contexts/TrainingDataContext";

export default function ApplicationGroupLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <PlanDataProvider>
      <DocumentsProvider>
        <IdentifiedRegulationsProvider>
          <TrainingDataProvider>
            <AppLayout>{children}</AppLayout>
          </TrainingDataProvider>
        </IdentifiedRegulationsProvider>
      </DocumentsProvider>
    </PlanDataProvider>
  );
}
