
import { AppLayout } from "@/components/layout/AppLayout";
import { PlanDataProvider } from "@/contexts/PlanDataContext";
import { DocumentsProvider } from "@/contexts/DocumentsContext";
import { IdentifiedRegulationsProvider } from "@/contexts/IdentifiedRegulationsContext";
import { TrainingDataProvider } from "@/contexts/TrainingDataContext";
import { RiskMappingProvider } from "@/contexts/RiskMappingContext";
import { UserProvider } from "@/contexts/UserContext";
import { ThemeProvider } from "@/contexts/ThemeContext";

export default function ApplicationGroupLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <ThemeProvider>
      <UserProvider>
        <PlanDataProvider>
          <DocumentsProvider>
            <IdentifiedRegulationsProvider>
              <TrainingDataProvider>
                <RiskMappingProvider>
                  <AppLayout>{children}</AppLayout>
                </RiskMappingProvider>
              </TrainingDataProvider>
            </IdentifiedRegulationsProvider>
          </DocumentsProvider>
        </PlanDataProvider>
      </UserProvider>
    </ThemeProvider>
  );
}
