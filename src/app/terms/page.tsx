import Link from "next/link";
import Image from "next/image";
import { CaretLeft } from "@/components/ui/icons";

export default function TermsOfServicePage() {
  return (
    <div className="mx-auto max-w-2xl px-4 py-16">
      <Link
        href="/"
        className="inline-flex items-center gap-1 text-sm text-muted-foreground transition-colors hover:text-foreground"
      >
        <CaretLeft className="size-4" />
        Home
      </Link>

      <Image
        src="/therapybook-logo.png"
        alt="therapybook"
        width={160}
        height={36}
        className="mt-6 h-6 w-auto"
      />

      <h1 className="mt-8 text-2xl font-semibold text-foreground">
        Terms of Service
      </h1>
      <p className="mt-1 text-sm text-muted-foreground">
        Last updated: March 2026
      </p>

      <div className="mt-8 space-y-8 text-sm leading-relaxed text-muted-foreground">
        <section>
          <h2 className="text-base font-medium text-foreground">
            About the service
          </h2>
          <p className="mt-2">
            therapybook is a bookkeeping and practice management tool designed
            for therapists practising in India. It helps you track sessions,
            manage client payments, and organise your practice finances.
          </p>
        </section>

        <section>
          <h2 className="text-base font-medium text-foreground">
            Your account
          </h2>
          <p className="mt-2">
            You sign in using your Google account. You are responsible for
            maintaining the security of your Google credentials and for all
            activity that occurs under your account. You must notify us
            immediately if you suspect any unauthorised access.
          </p>
        </section>

        <section>
          <h2 className="text-base font-medium text-foreground">
            Your data
          </h2>
          <p className="mt-2">
            You retain full ownership of the data you enter into therapybook,
            including client information, session records, and financial data.
            We do not claim any rights over your content. You are responsible
            for ensuring that you have the necessary consent from your clients
            to store their information in the service.
          </p>
        </section>

        <section>
          <h2 className="text-base font-medium text-foreground">
            Acceptable use
          </h2>
          <p className="mt-2">
            You agree to use therapybook only for lawful purposes related to
            managing your therapy practice. You must not attempt to access other
            users&apos; data, interfere with the service, or use automated tools
            to scrape or extract data from the platform.
          </p>
        </section>

        <section>
          <h2 className="text-base font-medium text-foreground">
            Limitation of liability
          </h2>
          <p className="mt-2">
            therapybook is provided &quot;as is&quot; without warranties of any
            kind. While we make every effort to keep the service reliable and
            your data secure, we are not liable for any indirect, incidental, or
            consequential damages arising from your use of the service. You
            should maintain your own backups of critical financial records.
          </p>
        </section>

        <section>
          <h2 className="text-base font-medium text-foreground">
            Changes to these terms
          </h2>
          <p className="mt-2">
            We may update these terms from time to time. If we make significant
            changes, we will notify you through the app. Continued use of the
            service after changes constitutes acceptance of the updated terms.
          </p>
        </section>

        <section>
          <h2 className="text-base font-medium text-foreground">
            Contact
          </h2>
          <p className="mt-2">
            For any questions about these terms, please reach out to{" "}
            <a
              href="mailto:gyan@publicknowledge.co"
              className="text-foreground underline underline-offset-2"
            >
              gyan@publicknowledge.co
            </a>
            .
          </p>
        </section>
      </div>

      <div className="mt-12 border-t border-border pt-6 text-xs text-muted-foreground">
        <Link href="/privacy" className="transition-colors hover:text-foreground">
          Privacy Policy
        </Link>
      </div>
    </div>
  );
}
