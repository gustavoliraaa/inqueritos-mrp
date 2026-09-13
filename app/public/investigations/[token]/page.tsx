"use client";

import { AlertCircle, LoaderCircle } from "lucide-react";
import { useEffect, useState } from "react";
import InvestigationReport, { type InvestigationReportData } from "../../../../components/investigation-report";

type PublicData = InvestigationReportData;

export default function PublicInvestigationPage({ params }: { params: { token: string } }) {
  const [data, setData] = useState<PublicData | null>(null);
  const [error, setError] = useState("");

  useEffect(() => {
    void fetch(`/api/public/investigations/${params.token}`).then(async (response) => {
      const result = await response.json() as PublicData & { error?: string };
      if (!response.ok) setError(result.error || "Não foi possível carregar o inquérito.");
      else setData(result);
    }).catch(() => setError("Não foi possível carregar o inquérito."));
  }, [params.token]);

  if (error) return <main className="public-share-page"><div className="public-share-message"><AlertCircle size={30} /><h1>Link indisponível</h1><p>{error}</p></div></main>;
  if (!data) return <main className="public-share-page"><div className="public-share-message"><LoaderCircle className="spin" size={24} /> Carregando inquérito...</div></main>;

  return <main className="public-share-page"><InvestigationReport data={data} /></main>;
}
