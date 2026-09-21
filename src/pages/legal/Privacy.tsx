import LegalPage from './LegalPage';
import { privacyDoc } from './legalContent';

export default function Privacy() {
  return <LegalPage doc={privacyDoc} path="/ochrana-osobnich-udaju" />;
}
