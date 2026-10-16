import type { Metadata } from "next";
import { DaySummary } from "@/features/taller/summary/containers/DaySummary";
import { greeting, lowStock, nextLaunch } from "@/features/taller/summary/summary-view";
import { adminServer, getAdminSession } from "@/lib/admin-server";
import { arHour, daysUntil, dayTitle, launchWhen, monthName } from "@/lib/date";

export const metadata: Metadata = { title: "Resumen" };

/** Mockup: design/mockups/admin.html */
export default async function Page() {
  const [summary, orders, launches, products, galu, session] = await Promise.all([
    adminServer.summary(),
    adminServer.orders(),
    adminServer.launches(),
    adminServer.products(),
    adminServer.assistantOverview(),
    getAdminSession(),
  ]);
  const now = new Date();
  const iso = now.toISOString();
  const launch = nextLaunch(launches, now.getTime());
  const prev = new Date(summary.months.at(-2)?.start ?? iso).toISOString();
  return (
    <DaySummary
      summary={summary}
      orders={orders}
      low={lowStock(products)}
      launch={launch}
      galu={galu}
      name={session?.name.split(" ")[0] ?? ""}
      today={{
        title: dayTitle(iso),
        greeting: greeting(arHour(iso)),
        month: monthName(iso),
        prevMonth: monthName(prev),
        launchWhen: launch ? launchWhen(launch.startsAt) : null,
        launchDays: launch ? daysUntil(launch.startsAt, now.getTime()) : null,
      }}
    />
  );
}
