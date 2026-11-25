import { RunSentinelButton } from "@/features/agents/AgentButtons";
import AgentsView from "@/features/agents/AgentsView";
import ErrorBanner from "@/features/dashboard/ErrorBanner";
import PageHeader from "@/features/dashboard/PageHeader";
import { loadAgents } from "@/features/dashboard/dashboard.data";

export const metadata = { title: "Agentes | Mail Guard" };

export default async function AgentsPage() {
  const { agents, error } = await loadAgents();
  return (
    <>
      <PageHeader
        title="Agentes inteligentes"
        description="El Analista revisa cada correo que escaneas; el Centinela vigila a toda la comunidad y le comparte lo que aprende."
        actions={
          <RunSentinelButton disabled={agents?.sentinel.enabled === false} />
        }
      />
      {error && <ErrorBanner message={error} />}
      <AgentsView agents={agents} />
    </>
  );
}
