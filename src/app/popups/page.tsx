import { PageHeader, ComingBadge } from "@/components/ui";

export default function PopupsPage() {
  return (
    <>
      <PageHeader eyebrow="Popups & Images" title="Popup copy + on-brand images." />
      <div className="card max-w-2xl p-8">
        <ComingBadge />
        <p className="mt-4 text-muted">
          Generate popup copy and on-brand email images: headline + offer variations tuned to
          lift opt-in rate, plus reusable hero/section art in the Peak Primal Wellness palette.
        </p>
      </div>
    </>
  );
}
