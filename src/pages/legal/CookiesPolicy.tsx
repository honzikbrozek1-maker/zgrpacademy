import LegalPage from './LegalPage';
import { cookiesDoc } from './legalContent';

export default function CookiesPolicy() {
  return <LegalPage doc={cookiesDoc} path="/cookies" />;
}
