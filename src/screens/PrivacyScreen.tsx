import { useNavigate } from 'react-router-dom';
import { Layout } from '../components/layout/Layout';
import { Header } from '../components/layout/Header';

export function PrivacyScreen() {
  const navigate = useNavigate();

  return (
    <Layout>
      <Header title="Privacy Policy" left={
        <button onClick={() => navigate(-1)} className="w-9 h-9 rounded-xl flex items-center justify-center text-[var(--text-secondary)]" style={{ background: 'var(--bg-card)', border: '1px solid var(--border)' }}>
          ‹
        </button>
      } />

      <div className="px-4 mt-3 pb-10 flex flex-col gap-5 text-sm text-[var(--text-secondary)] leading-relaxed">
        <p className="text-xs text-[var(--text-secondary)]">Last updated: April 2025</p>

        <section>
          <h2 className="font-semibold text-[var(--text-primary)] mb-1">1. Who We Are</h2>
          <p><strong className="text-[var(--text-primary)]">SoldOut Digital LTD</strong> ("we", "us", "our") is the data controller for personal data collected through MomManager. Registered address: United Kingdom. Company number: 16208774. Contact: <strong className="text-[var(--text-primary)]">support@mommanager.co.uk</strong>.</p>
        </section>

        <section>
          <h2 className="font-semibold text-[var(--text-primary)] mb-1">2. Data We Collect</h2>
          <p>We collect the following types of personal data when you use MomManager:</p>
          <ul className="list-disc pl-5 mt-1 flex flex-col gap-1">
            <li><strong className="text-[var(--text-primary)]">Account data:</strong> email address, name, profile photo (if provided)</li>
            <li><strong className="text-[var(--text-primary)]">App data:</strong> tasks, children's information, meal plans, budget entries, and other content you create within the App — stored locally on your device or in your personal cloud storage</li>
            <li><strong className="text-[var(--text-primary)]">Usage data:</strong> app interactions, feature usage, and crash reports for improving the App</li>
            <li><strong className="text-[var(--text-primary)]">Payment data:</strong> subscription status (processed by Apple/Google — we do not store payment card details)</li>
          </ul>
        </section>

        <section>
          <h2 className="font-semibold text-[var(--text-primary)] mb-1">3. How We Use Your Data</h2>
          <p>We use your personal data to:</p>
          <ul className="list-disc pl-5 mt-1 flex flex-col gap-1">
            <li>Provide and maintain the MomManager service</li>
            <li>Manage your account and subscription</li>
            <li>Improve the App through anonymised analytics</li>
            <li>Send you important service communications</li>
            <li>Comply with legal obligations</li>
          </ul>
        </section>

        <section>
          <h2 className="font-semibold text-[var(--text-primary)] mb-1">4. AI Features and Data Processing</h2>
          <p>When you use AI-powered features (chat, meal suggestions, stories, etc.), your input text is sent to our AI provider (Anthropic, Inc.) to generate responses. We do not store AI conversations on our servers. Please do not share sensitive personal information such as passwords, financial account numbers, or medical records in AI chat.</p>
        </section>

        <section>
          <h2 className="font-semibold text-[var(--text-primary)] mb-1">5. Data Sharing</h2>
          <p>We do not sell your personal data. We may share data with:</p>
          <ul className="list-disc pl-5 mt-1 flex flex-col gap-1">
            <li><strong className="text-[var(--text-primary)]">Service providers</strong> who assist in operating the App (e.g., authentication, analytics), under strict confidentiality agreements</li>
            <li><strong className="text-[var(--text-primary)]">Legal authorities</strong> when required by law</li>
          </ul>
        </section>

        <section>
          <h2 className="font-semibold text-[var(--text-primary)] mb-1">6. Data Retention</h2>
          <p>We retain your account data for as long as your account is active. If you delete your account, we will delete your personal data within 30 days, except where we are required to retain it by law.</p>
        </section>

        <section>
          <h2 className="font-semibold text-[var(--text-primary)] mb-1">7. Your Rights</h2>
          <p>Under UK GDPR and applicable data protection law, you have the right to:</p>
          <ul className="list-disc pl-5 mt-1 flex flex-col gap-1">
            <li>Access the personal data we hold about you</li>
            <li>Correct inaccurate data</li>
            <li>Request deletion of your data ("right to be forgotten")</li>
            <li>Object to or restrict processing of your data</li>
            <li>Data portability</li>
            <li>Lodge a complaint with the Information Commissioner's Office (ICO) at ico.org.uk</li>
          </ul>
          <p className="mt-1">To exercise any of these rights, contact us at <strong className="text-[var(--text-primary)]">support@mommanager.co.uk</strong>.</p>
        </section>

        <section>
          <h2 className="font-semibold text-[var(--text-primary)] mb-1">8. Security</h2>
          <p>We implement appropriate technical and organisational measures to protect your personal data against unauthorised access, alteration, disclosure, or destruction. However, no internet transmission is completely secure, and we cannot guarantee absolute security.</p>
        </section>

        <section>
          <h2 className="font-semibold text-[var(--text-primary)] mb-1">9. Children's Privacy</h2>
          <p>MomManager is intended for use by adults (18+). We do not knowingly collect personal data from children under 13. If you believe a child has provided us with personal data, please contact us so we can delete it.</p>
        </section>

        <section>
          <h2 className="font-semibold text-[var(--text-primary)] mb-1">10. Changes to This Policy</h2>
          <p>We may update this Privacy Policy from time to time. We will notify you of significant changes via the App or by email. The latest version will always be available within the App.</p>
        </section>

        <section>
          <h2 className="font-semibold text-[var(--text-primary)] mb-1">11. Contact Us</h2>
          <p>For any privacy-related questions or requests, contact us at <strong className="text-[var(--text-primary)]">support@mommanager.co.uk</strong> or write to SoldOut Digital LTD, United Kingdom.</p>
        </section>
      </div>
    </Layout>
  );
}
