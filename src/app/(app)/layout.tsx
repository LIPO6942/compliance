
import { AppLayout } from "@/components/layout/AppLayout";
import { PlanDataProvider } from "@/contexts/PlanDataContext";
import { DocumentsProvider } from "@/contexts/DocumentsContext";
import { IdentifiedRegulationsProvider } from "@/contexts/IdentifiedRegulationsContext";
import { TrainingDataProvider } from "@/contexts/TrainingDataContext";
import { RiskMappingProvider } from "@/contexts/RiskMappingContext";
import { KeywordsProvider } from "@/contexts/KeywordsContext";
import { DocumentTypesProvider } from "@/contexts/DocumentTypesContext";
import { NewsProvider } from "@/contexts/NewsContext";
import { TeamProvider } from "@/contexts/TeamContext";
import { TimelineProvider } from "@/contexts/TimelineContext";
import { EcosystemProvider } from "@/contexts/EcosystemContext";


import { AuthGuard } from "@/components/auth/AuthGuard";

export default function ApplicationGroupLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <AuthGuard>
      <PlanDataProvider>
        <DocumentsProvider>
          <DocumentTypesProvider>
            <IdentifiedRegulationsProvider>
              <TrainingDataProvider>
                <RiskMappingProvider>
                  <KeywordsProvider>
                    <NewsProvider>
                      <TeamProvider>
                        <TimelineProvider>
                          <EcosystemProvider>
                            <AppLayout>{children}</AppLayout>
                          </EcosystemProvider>
                        </TimelineProvider>
                      </TeamProvider>
                    </NewsProvider>
                  </KeywordsProvider>
                </RiskMappingProvider>
              </TrainingDataProvider>
            </IdentifiedRegulationsProvider>
          </DocumentTypesProvider>
        </DocumentsProvider>
      </PlanDataProvider>
    </AuthGuard>
  );
}

