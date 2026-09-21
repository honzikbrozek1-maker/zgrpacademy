import LegalPage from './LegalPage';
import { termsDoc } from './legalContent';

export default function Terms() {
  return <LegalPage doc={termsDoc} path="/obchodni-podminky" />;
}
