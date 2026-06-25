import { useNavigate } from 'react-router-dom';
import { Layout } from '../components/layout/Layout';
import { Header } from '../components/layout/Header';

export function TermsScreen() {
  const navigate = useNavigate();

  return (
    <Layout>
      <Header title="Terms & Conditions" left={
        <button onClick={() => navigate(-1)} className="w-9 h-9 rounded-xl flex items-center justify-center text-[var(--text-secondary)]" style={{ background: 'var(--bg-card)', border: '1px solid var(--border)' }}>
          ‹
        </button>
      } />

      <div className="px-4 mt-3 pb-10 flex flex-col gap-5 text-sm text-[var(--text-secondary)] leading-relaxed">
        <p className="text-xs text-[var(--text-secondary)]">Last updated: April 2025</p>

        <section>
          <h2 className="font-semibold text-[var(--text-primary)] mb-1">1. About Us</h2>
          <p>MomManager is operated by <strong className="text-[var(--text-primary)]">SoldOut Digital LTD</strong>, a company registered in England and Wales. Registered address: United Kingdom. Company number: 16208774.</p>
        </section>

        <section>
          <h2 className="font-semibold text-[var(--text-primary)] mb-1">2. Acceptance of Terms</h2>
          <p>By downloading, installing, or using the MomManager application ("App"), you agree to be bound by these Terms and Conditions. If you do not agree to these terms, please do not use the App.</p>
        </section>

        <section>
          <h2 className="font-semibold text-[var(--text-primary)] mb-1">3. Subscription and Payments</h2>
          <p>MomManager offers subscription-based access to premium features. Subscriptions are billed on a recurring basis (monthly or annually) through the Apple App Store or Google Play Store. Payment will be charged to your account at confirmation of purchase. Subscriptions automatically renew unless cancelled at least 24 hours before the end of the current period. You can manage or cancel your subscription in your device's account settings. No refunds are provided for partial subscription periods, except as required by applicable law.</p>
        </section>

        <section>
          <h2 className="font-semibold text-[var(--text-primary)] mb-1">4. Free Trial</h2>
          <p>We may offer a free trial period for new users. At the end of the trial, your subscription will automatically begin and you will be charged the applicable subscription fee unless you cancel before the trial ends.</p>
        </section>

        <section>
          <h2 className="font-semibold text-[var(--text-primary)] mb-1">5. Use of the App</h2>
          <p>You agree to use MomManager only for lawful personal, non-commercial purposes. You must not misuse the App, attempt to gain unauthorised access to any part of it, or use it in a way that could damage, disable, or impair its functionality. You are responsible for maintaining the security of your account credentials.</p>
        </section>

        <section>
          <h2 className="font-semibold text-[var(--text-primary)] mb-1">6. AI Features</h2>
          <p>MomManager includes AI-powered features (such as meal suggestions, story generation, and chat assistance) powered by third-party AI providers. These features are provided for informational and entertainment purposes only. AI-generated content may not always be accurate, complete, or suitable for your specific situation. You should always use your own judgement and consult qualified professionals for medical, nutritional, financial, or legal advice.</p>
        </section>

        <section>
          <h2 className="font-semibold text-[var(--text-primary)] mb-1">7. Intellectual Property</h2>
          <p>All content, design, graphics, and software within the App are the intellectual property of SoldOut Digital LTD or its licensors and are protected by applicable copyright and intellectual property laws. You may not copy, modify, distribute, or reverse-engineer any part of the App without our prior written consent.</p>
        </section>

        <section>
          <h2 className="font-semibold text-[var(--text-primary)] mb-1">8. Limitation of Liability</h2>
          <p>To the fullest extent permitted by law, SoldOut Digital LTD shall not be liable for any indirect, incidental, special, consequential, or punitive damages arising from your use of the App. Our total liability to you shall not exceed the amount you paid for your subscription in the 12 months preceding the claim.</p>
        </section>

        <section>
          <h2 className="font-semibold text-[var(--text-primary)] mb-1">9. Changes to Terms</h2>
          <p>We reserve the right to modify these Terms at any time. We will notify you of significant changes via the App or by email. Continued use of the App after changes constitutes acceptance of the revised Terms.</p>
        </section>

        <section>
          <h2 className="font-semibold text-[var(--text-primary)] mb-1">10. Governing Law</h2>
          <p>These Terms are governed by the laws of England and Wales. Any disputes shall be subject to the exclusive jurisdiction of the courts of England and Wales.</p>
        </section>

        <section>
          <h2 className="font-semibold text-[var(--text-primary)] mb-1">11. Contact</h2>
          <p>If you have any questions about these Terms, please contact us at <strong className="text-[var(--text-primary)]">support@mommanager.co.uk</strong>.</p>
        </section>
      </div>
    </Layout>
  );
}
