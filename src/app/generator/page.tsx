import { PageHeader, ComingBadge } from "@/components/ui";

export default function GeneratorPage() {
  return (
    <>
      <PageHeader eyebrow="Generator" title="Email & flow HTML generator." />
      <div className="card max-w-2xl p-8">
        <ComingBadge />
        <p className="mt-4 text-muted">
          Port the email/flow HTML generator from the existing app: paste content or pick a
          template, and get clean, on-brand (navy/blue) HTML ready to drop into Klaviyo
          campaigns and flows.
        </p>
      </div>
    </>
  );
}
