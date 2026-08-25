"use client";

import Link from "next/link";
import { MarketingHeader } from "@/components/marketing/MarketingHeader";
import { MarketingFooter } from "@/components/marketing/MarketingFooter";

export default function TermsOfServicePage() {
  return (
    <div className="flex min-h-screen flex-col bg-page-bg">
      <MarketingHeader />

      <main className="flex-1 px-5 py-16 md:px-10">
        <div className="mx-auto max-w-3xl">
          <h1 className="text-3xl font-bold tracking-tight text-heading">Terms of Service</h1>
          <p className="mt-1 text-sm text-muted">Last updated: January 1, 2025</p>

          <div className="mt-8 flex flex-col gap-6 text-sm leading-relaxed text-body">
            <p>
              Please read these Terms of Service carefully before using PlanAmWell. By accessing or using our
              platform, you agree to be bound by these terms. If you do not agree, please do not use PlanAmWell.
            </p>

            <section>
              <h2 className="text-lg font-bold text-heading">1. Acceptance of Terms</h2>
              <p className="mt-2">
                By creating an account or using PlanAmWell in any way, you confirm that you are at least 18 years
                of age and have the legal capacity to enter into this agreement with PlanAmWell Ltd.
              </p>
            </section>

            <section>
              <h2 className="text-lg font-bold text-heading">2. Description of Service</h2>
              <p className="mt-2">
                PlanAmWell is a digital health platform that connects users with licensed healthcare professionals
                for remote consultations. We also provide access to health advocacy content and an integrated
                health supplement marketplace.
              </p>
              <p className="mt-2 font-semibold text-heading">
                PlanAmWell is NOT an emergency medical service. In case of a medical emergency, please call your
                local emergency services immediately.
              </p>
            </section>

            <section>
              <h2 className="text-lg font-bold text-heading">3. Medical Disclaimer</h2>
              <p className="mt-2">
                Consultations on PlanAmWell are for informational and general healthcare advisory purposes only.
                They do not constitute a doctor-patient relationship in the traditional sense and are not a
                substitute for in-person medical care. Always seek in-person medical attention for serious or
                life-threatening conditions.
              </p>
              <p className="mt-2">
                PlanAmWell Ltd. is not liable for any medical decisions made based on advice received through the
                platform.
              </p>
            </section>

            <section>
              <h2 className="text-lg font-bold text-heading">4. User Responsibilities</h2>
              <p className="mt-2">As a user of PlanAmWell, you agree to:</p>
              <ul className="mt-2 list-disc space-y-1 pl-5">
                <li>Provide accurate and complete registration information</li>
                <li>Maintain the confidentiality of your account credentials</li>
                <li>Use the platform only for lawful purposes</li>
                <li>Not impersonate any person or entity</li>
                <li>Not submit false, misleading, or fraudulent health information</li>
                <li>Treat healthcare professionals and other users with respect</li>
                <li>Not attempt to reverse-engineer, hack, or misuse the platform</li>
              </ul>
            </section>

            <section>
              <h2 className="text-lg font-bold text-heading">5. Doctor Verification</h2>
              <p className="mt-2">
                All doctors on PlanAmWell undergo a verification process that includes review of medical licence
                credentials. However, PlanAmWell Ltd. does not guarantee the accuracy of a doctor&apos;s
                credentials beyond the information submitted during registration. Users should exercise their own
                judgement when engaging with any healthcare professional.
              </p>
            </section>

            <section>
              <h2 className="text-lg font-bold text-heading">6. Appointments and Consultations</h2>
              <p className="mt-2">
                Booking an appointment is subject to doctor availability. Cancellations should be made at least 2
                hours before a scheduled consultation. Repeated no-shows may result in account restrictions.
              </p>
            </section>

            <section>
              <h2 className="text-lg font-bold text-heading">7. Payments and Refunds</h2>
              <p className="mt-2">
                Consultation fees are displayed before booking and charged at the time of payment. Refunds may be
                issued at PlanAmWell Ltd.&apos;s sole discretion in cases of technical failure or where a
                consultation did not take place due to a doctor&apos;s failure to attend.
              </p>
              <p className="mt-2">
                Supplement purchases are processed by our partner pharmacy. Returns and refunds for supplements are
                subject to the partner&apos;s refund policy.
              </p>
            </section>

            <section>
              <h2 className="text-lg font-bold text-heading">8. Intellectual Property</h2>
              <p className="mt-2">
                All content on PlanAmWell, including text, graphics, logos, and software, is the property of
                PlanAmWell Ltd. or its content suppliers and is protected by applicable intellectual property laws.
              </p>
            </section>

            <section>
              <h2 className="text-lg font-bold text-heading">9. Privacy</h2>
              <p className="mt-2">
                Your use of PlanAmWell is also governed by our{" "}
                <Link href="/privacy" className="font-semibold text-primary">
                  Privacy Policy
                </Link>
                , which is incorporated into these Terms by reference.
              </p>
            </section>

            <section>
              <h2 className="text-lg font-bold text-heading">10. Termination</h2>
              <p className="mt-2">
                We reserve the right to suspend or terminate your account at any time for violation of these Terms
                or for any other reason at our sole discretion. You may also delete your account at any time —
                in-app via Settings &rarr; Privacy Settings &rarr; Delete My Account, or from your web profile page.
              </p>
            </section>

            <section>
              <h2 className="text-lg font-bold text-heading">11. Limitation of Liability</h2>
              <p className="mt-2">
                To the fullest extent permitted by law, PlanAmWell Ltd. shall not be liable for any indirect,
                incidental, special, consequential, or punitive damages arising from your use of PlanAmWell.
              </p>
            </section>

            <section>
              <h2 className="text-lg font-bold text-heading">12. Changes to Terms</h2>
              <p className="mt-2">
                We may update these Terms of Service at any time. We will notify you of material changes via the
                app or email. Continued use of PlanAmWell after changes constitutes acceptance of the updated
                Terms.
              </p>
            </section>

            <section>
              <h2 className="text-lg font-bold text-heading">13. Governing Law</h2>
              <p className="mt-2">
                These Terms are governed by the laws of the Federal Republic of Nigeria. Any disputes arising from
                these Terms shall be subject to the exclusive jurisdiction of Nigerian courts.
              </p>
            </section>

            <section>
              <h2 className="text-lg font-bold text-heading">14. Contact</h2>
              <p className="mt-2">
                For legal enquiries, please contact us at{" "}
                <a href="mailto:legal@planamwell.com" className="font-semibold text-primary">
                  legal@planamwell.com
                </a>
                .
              </p>
            </section>

            <p className="font-semibold text-heading">PlanAmWell Ltd.</p>
          </div>
        </div>
      </main>

      <MarketingFooter />
    </div>
  );
}
