import Link from "next/link";
import Image from "next/image";
import { CaretLeft } from "@/components/ui/icons";

export default function PrivacyPolicyPage() {
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
        Privacy Policy
      </h1>
      <p className="mt-1 text-sm text-muted-foreground">
        Last updated: March 2026
      </p>

      <div className="mt-8 space-y-8 text-sm leading-relaxed text-muted-foreground">
        <section>
          <h2 className="text-base font-medium text-foreground">
            What we collect
          </h2>
          <p className="mt-2">
            When you sign in with Google, we receive your name, email address,
            and profile picture. If you grant optional permissions, we also
            access your Google Calendar events and Google Contacts to help you
            set up your practice.
          </p>
          <p className="mt-2">
            Within the app you may enter client names, contact details, session
            records, payment information, and bank statement data. All of this
            is stored securely and is only accessible to your account.
          </p>
        </section>

        <section>
          <h2 className="text-base font-medium text-foreground">
            How we use your data
          </h2>
          <p className="mt-2">
            Your data is used solely to provide the therapybook service:
            tracking sessions, managing payments, generating invoices, and
            syncing with your calendar. We do not sell, rent, or share your data
            with any third party for marketing or advertising purposes.
          </p>
        </section>

        <section>
          <h2 className="text-base font-medium text-foreground">
            Data storage and security
          </h2>
          <p className="mt-2">
            Your data is stored on Supabase infrastructure with encryption at
            rest and in transit. Access is authenticated via Google OAuth and
            secured with row-level security policies, ensuring that only you can
            access your own data.
          </p>
        </section>

        <section>
          <h2 className="text-base font-medium text-foreground">
            Google API usage
          </h2>
          <p className="mt-2">
            therapybook&apos;s use of information received from Google APIs
            adheres to the{" "}
            <a
              href="https://developers.google.com/terms/api-services-user-data-policy"
              target="_blank"
              rel="noopener noreferrer"
              className="text-foreground underline underline-offset-2"
            >
              Google API Services User Data Policy
            </a>
            , including the Limited Use requirements. We only request the
            permissions necessary for the features you choose to use, and you
            can revoke access at any time from your Google account settings.
          </p>
        </section>

        <section>
          <h2 className="text-base font-medium text-foreground">
            Your rights
          </h2>
          <p className="mt-2">
            To request deletion of your data, email{" "}
            <a
              href="mailto:gyan@publicknowledge.co"
              className="text-foreground underline underline-offset-2"
            >
              gyan@publicknowledge.co
            </a>
            . Once processed, all associated data is permanently removed from
            our systems within 30 days.
          </p>
        </section>

        <section>
          <h2 className="text-base font-medium text-foreground">
            Contact
          </h2>
          <p className="mt-2">
            For any privacy-related questions, please reach out to{" "}
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
        <Link href="/terms" className="transition-colors hover:text-foreground">
          Terms of Service
        </Link>
      </div>
    </div>
  );
}
