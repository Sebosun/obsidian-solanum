import { useMemo, useState } from "react";
import { useAppStore, useServices } from "@/state/hooks";
import { harvestFilterOptions } from "@/lib/harvest/filters";
import { monthInsights, yearInsights } from "@/lib/harvest/insights";
import { layoutHarvestBlocks, summarizeMonth } from "@/lib/harvest/month";
import { layoutYearStacks, summarizeYear, summarizeYearTotal } from "@/lib/harvest/year";
import { MONTHS_PER_YEAR } from "@/lib/scene/constants";
import { resolveSeason } from "@/lib/scene/seasons";
import { HarvestFilters } from "@/components/harvest/HarvestFilters";
import { HarvestHeader } from "@/components/harvest/HarvestHeader";
import { HarvestMonthBody } from "@/components/harvest/HarvestMonthBody";
import type { HarvestView } from "@/components/harvest/HarvestViewToggle";
import { HarvestYearBody } from "@/components/harvest/HarvestYearBody";

interface HarvestPanelProps {
  initialMonth?: Date;
}

export function HarvestPanel({ initialMonth }: HarvestPanelProps) {
  const services = useServices();
  const history = useAppStore((state) => state.sessions);
  const conflicts = useAppStore((state) => state.conflicts);
  const seasonChoice = useAppStore((state) => state.season);
  const sessions = useMemo(
    () =>
      history.filter(
        (session) => !conflicts.some((conflict) => conflict.sessionId === session.sessionId),
      ),
    [history, conflicts],
  );
  const [view, setView] = useState<HarvestView>("month");
  const [today] = useState(() => new Date());
  const [month, setMonth] = useState(initialMonth ?? today);
  const [tag, setTag] = useState("");
  const [notePath, setNotePath] = useState("");
  const filter = useMemo(() => ({ tag, notePath }), [tag, notePath]);
  const year = month.getFullYear();

  // Only the view on show is worked out; the other one is not looked at.
  const monthData = useMemo(() => {
    if (view !== "month") return null;
    return {
      layout: layoutHarvestBlocks(sessions, month, filter),
      summary: summarizeMonth(sessions, month, filter),
      insights: monthInsights(sessions, month, filter),
    };
  }, [view, sessions, month, filter]);
  const yearData = useMemo(() => {
    if (view !== "year") return null;
    const months = summarizeYear(sessions, year, filter);
    return {
      months,
      layout: layoutYearStacks(months),
      summary: summarizeYearTotal(sessions, year, filter),
      previous: summarizeYearTotal(sessions, year - 1, filter),
      insights: yearInsights(sessions, year, filter),
    };
  }, [view, sessions, year, filter]);
  const { tags, notes } = useMemo(() => harvestFilterOptions(sessions), [sessions]);

  let minutes = 0;
  if (monthData) minutes = monthData.summary.minutes;
  else if (yearData) minutes = yearData.months.reduce((sum, item) => sum + item.minutes, 0);

  function step(direction: number) {
    const delta = view === "year" ? direction * MONTHS_PER_YEAR : direction;
    setMonth(new Date(month.getFullYear(), month.getMonth() + delta, 1));
  }
  function previous() {
    step(-1);
  }
  function next() {
    step(1);
  }
  function backToToday() {
    setMonth(new Date(today.getFullYear(), today.getMonth(), 1));
  }
  function openMonth(index: number) {
    setMonth(new Date(year, index, 1));
    setView("month");
  }
  function openTimer() {
    services.navigate("timer");
  }
  function clearFilters() {
    setTag("");
    setNotePath("");
  }

  return (
    <section className="solanum-harvest">
      <HarvestHeader
        view={view}
        month={month}
        today={today}
        minutes={minutes}
        onView={setView}
        onPrevious={previous}
        onNext={next}
        onToday={backToToday}
        filters={
          <HarvestFilters
            tags={tags}
            notes={notes}
            tag={tag}
            notePath={notePath}
            onTag={setTag}
            onNote={setNotePath}
          />
        }
      />
      {monthData && (
        <HarvestMonthBody
          month={month}
          layout={monthData.layout}
          summary={monthData.summary}
          insights={monthData.insights}
          season={resolveSeason(seasonChoice, month)}
          filtered={!!tag || !!notePath}
          onClearFilters={clearFilters}
          onStartFocus={openTimer}
        />
      )}
      {yearData && (
        <HarvestYearBody
          year={year}
          months={yearData.months}
          summary={yearData.summary}
          previous={yearData.previous}
          insights={yearData.insights}
          layout={yearData.layout}
          filtered={!!tag || !!notePath}
          onClearFilters={clearFilters}
          onOpenMonth={openMonth}
        />
      )}
    </section>
  );
}
