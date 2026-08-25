"use client";

import { MarketingHeader } from "@/components/marketing/MarketingHeader";
import { MarketingFooter } from "@/components/marketing/MarketingFooter";

export default function PrivacyPolicyPage() {
  return (
    <div className="flex min-h-screen flex-col bg-page-bg">
      <MarketingHeader />

      <main className="flex-1 px-5 py-16 md:px-10">
        <div className="mx-auto max-w-3xl">
          <h1 className="text-3xl font-bold tracking-tight text-heading">Privacy Policy</h1>
          <p className="mt-1 text-sm text-muted">Last updated: January 1, 2025</p>

          <div className="prose-legal mt-8 flex flex-col gap-6 text-sm leading-relaxed text-body">
            <p>
              PlanAmWell Ltd. (&ldquo;we&rdquo;, &ldquo;us&rdquo;, or &ldquo;our&rdquo;) is committed to protecting
              your privacy. This Privacy Policy explains how we collect, use, disclose, and safeguard your
              information when you use the PlanAmWell platform.
            </p>

            <section>
              <h2 className="text-lg font-bold text-heading">1. Information We Collect</h2>
              <p className="mt-2">We collect information that you provide directly to us, including:</p>
              <ul className="mt-2 list-disc space-y-1 pl-5">
                <li>Account registration details (name, email address, password)</li>
                <li>Profile information (profile photo, date of birth, gender)</li>
                <li>Medical and health information you voluntarily share with doctors</li>
                <li>Payment and order information for supplement purchases</li>
                <li>Communications with healthcare professionals on our platform</li>
                <li>Device information (push notification tokens, device type, OS version)</li>
                <li>Location data (city, state, LGA for delivery purposes — only when provided)</li>
              </ul>
            </section>

            <section>
              <h2 className="text-lg font-bold text-heading">2. How We Use Your Information</h2>
              <p className="mt-2">We use the information we collect to:</p>
              <ul className="mt-2 list-disc space-y-1 pl-5">
                <li>Provide, operate, and maintain the PlanAmWell platform</li>
                <li>Connect you with qualified healthcare professionals</li>
                <li>Process supplement orders and arrange delivery</li>
                <li>Send appointment confirmations, reminders, and health notifications</li>
                <li>Improve user experience and platform features</li>
                <li>Comply with legal obligations and enforce our Terms of Service</li>
                <li>Respond to your comments, questions, and requests</li>
              </ul>
            </section>

            <section>
              <h2 className="text-lg font-bold text-heading">3. Medical Information</h2>
              <p className="mt-2">
                Any health or medical information you share with doctors on PlanAmWell is treated with the highest
                level of confidentiality. Consultation records are accessible only to you and your treating doctor.
                We do not sell, rent, or share medical information with third parties except as required by law.
              </p>
            </section>

            <section>
              <h2 className="text-lg font-bold text-heading">4. Information Sharing</h2>
              <p className="mt-2">We do not sell your personal information. We may share your data with:</p>
              <ul className="mt-2 list-disc space-y-1 pl-5">
                <li>Healthcare providers you choose to consult with on our platform</li>
                <li>Delivery partners (name, address, phone number) solely to fulfill orders</li>
                <li>
                  Service providers that help us operate our platform (cloud hosting, analytics) under strict
                  confidentiality agreements
                </li>
                <li>Law enforcement or regulatory authorities when required by applicable law</li>
              </ul>
            </section>

            <section>
              <h2 className="text-lg font-bold text-heading">5. Data Security</h2>
              <p className="mt-2">
                We implement industry-standard security measures to protect your personal information, including
                encryption of data in transit (TLS/HTTPS), secure password hashing, and access controls. However,
                no method of transmission over the internet is 100% secure.
              </p>
            </section>

            <section>
              <h2 className="text-lg font-bold text-heading">6. Your Rights</h2>
              <p className="mt-2">You have the right to:</p>
              <ul className="mt-2 list-disc space-y-1 pl-5">
                <li>Access the personal information we hold about you</li>
                <li>Request correction of inaccurate or incomplete data</li>
                <li>
                  Request deletion of your account and personal data — in-app via Settings &rarr; Privacy Settings
                  &rarr; Delete My Account, or from your web profile page
                </li>
                <li>Withdraw consent for non-essential data processing at any time</li>
                <li>Receive a copy of your personal data in a portable format</li>
              </ul>
            </section>

            <section>
              <h2 className="text-lg font-bold text-heading">7. Cookies and Tracking</h2>
              <p className="mt-2">
                PlanAmWell&apos;s mobile app does not use browser cookies. The web app uses only the essential
                cookies required to keep you securely signed in. We may use analytics tools to understand how
                users interact with the platform — these tools collect anonymised usage data to help us improve
                the platform, and are off by default until you choose to enable them.
              </p>
            </section>

            <section>
              <h2 className="text-lg font-bold text-heading">8. Children&apos;s Privacy</h2>
              <p className="mt-2">
                PlanAmWell is not directed to individuals under the age of 18. We do not knowingly collect personal
                information from children. If you believe we have inadvertently collected such information, please
                contact us immediately.
              </p>
            </section>

            <section>
              <h2 className="text-lg font-bold text-heading">9. Changes to This Policy</h2>
              <p className="mt-2">
                We may update this Privacy Policy from time to time. We will notify you of any significant changes
                via the app or email. Your continued use of PlanAmWell after changes constitutes your acceptance of
                the updated policy.
              </p>
            </section>

            <section>
              <h2 className="text-lg font-bold text-heading">10. Contact Us</h2>
              <p className="mt-2">
                If you have questions about this Privacy Policy or wish to exercise your data rights, please
                contact our privacy team at{" "}
                <a href="mailto:privacy@planamwell.com" className="font-semibold text-primary">
                  privacy@planamwell.com
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
