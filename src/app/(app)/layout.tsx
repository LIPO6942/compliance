
import { AppLayout } from "@/components/layout/AppLayout";
import { PlanDataProvider } from "@/contexts/PlanDataContext";
import { DocumentsProvider } from "@/contexts/DocumentsContext";
import { IdentifiedRegulationsProvider } from "@/contexts/IdentifiedRegulationsContext";
import { TrainingDataProvider } from "@/contexts/TrainingDataContext";
import { RiskMappingProvider } from "@/contexts/RiskMappingContext";
import { UserProvider } from "@/contexts/UserContext";
import { ThemeProvider } from "@/contexts/ThemeContext";
import { KeywordsProvider } from "@/contexts/KeywordsContext";
import { DocumentTypesProvider } from "@/contexts/DocumentTypesContext";
import { NewsProvider } from "@/contexts/NewsContext";

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
            <DocumentTypesProvider>
              <IdentifiedRegulationsProvider>
                <TrainingDataProvider>
                  <RiskMappingProvider>
                    <KeywordsProvider>
                      <NewsProvider>
                        <AppLayout>{children}</AppLayout>
                      </NewsProvider>
                    </KeywordsProvider>
                  </RiskMappingProvider>
                </TrainingDataProvider>
              </IdentifiedRegulationsProvider>
            </DocumentTypesProvider>
          </DocumentsProvider>
        </PlanDataProvider>
      </UserProvider>
    </ThemeProvider>
  );
}

    