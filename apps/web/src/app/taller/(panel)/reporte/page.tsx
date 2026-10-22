import { reportMonthLabel, reportMonthOf, shiftReportMonth } from "@mini-galu/contracts";
import type { Metadata } from "next";
import Link from "next/link";
import { Channels, ReportKpis, SoldOut, TopProducts, TopSizes } from "@/features/taller/report/components/ReportBlocks";
import { MonthPicker } from "@/features/taller/report/containers/MonthPicker";
import { pickReportMonth, reportMonths } from "@/features/taller/report/report-view";
import { adminServer } from "@/lib/admin-server";
import "@/features/taller/report/report.css";

export const metadata: Metadata = { title: "Reporte del mes" };

/** Mockup: design/mockups/admin-reporte.html */
export default async function Page({ searchParams }: PageProps<"/taller/reporte">) {
  const current = reportMonthOf(new Date());
  const report = await adminServer.report(pickReportMonth((await searchParams).mes, current));
  const name = reportMonthLabel(report.month);
  const previous = reportMonthLabel(shiftReportMonth(report.month, -1));
  return (
    <main className="adm-content" id="adm-page">
      <div className="adm-head">
        <div>
          <span className="eyebrow is-in">Reporte del mes</span>
          <h1 className="display">
            {name.charAt(0).toUpperCase() + name.slice(1)} <em>{report.month.slice(0, 4)}</em>
          </h1>
          <span className="hand greet-note">{report.closed ? "así cerró el mes ♡" : "en curso: llega hasta hoy"}</span>
        </div>
        <MonthPicker month={report.month} months={reportMonths(current)} />
      </div>

      <ReportKpis sales={report.sales} month={name} previous={previous} />

      <div className="cols-2">
        <TopProducts top={report.top} />
        <Channels channels={report.channels} />
      </div>

      <div className="cols-2e">
        <SoldOut sizes={report.soldOut} />
        <TopSizes sizes={report.sizes} />
      </div>

      <p className="muted" style={{ fontSize: 12.5, margin: 0 }}>
        El día 1 te llega este reporte por mail (regla &quot;Reporte del mes&quot; en{" "}
        <Link className="link" href="/taller/automatizaciones">
          Automatizaciones
        </Link>
        ).
      </p>
    </main>
  );
}
