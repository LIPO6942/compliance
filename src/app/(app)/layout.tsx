
import { AppLayout } from "@/components/layout/AppLayout";
import { PlanDataProvider } from "@/contexts/PlanDataContext";
import { DocumentsProvider } from "@/contexts/DocumentsContext";
import { IdentifiedRegulationsProvider } from "@/contexts/IdentifiedRegulationsContext";
import { TrainingDataProvider } from "@/contexts/TrainingDataContext";
import { RiskMappingProvider } from "@/contexts/RiskMappingContext";
import { UserProvider } from "@/contexts/UserContext";
import { ThemeProvider } from "@/contexts/ThemeContext";
import { KeywordsProvider } from "@/contexts/KeywordsContext";

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
                  <KeywordsProvider>
                    <AppLayout>{children}</AppLayout>
                  </KeywordsProvider>
                </RiskMappingProvider>
              </TrainingDataProvider>
            </IdentifiedRegulationsProvider>
          </DocumentsProvider>
        </PlanDataProvider>
      </UserProvider>
    </ThemeProvider>
  );
}
