import DiplomaCertificate from '@/components/DiplomaCertificate';

export default function CertPreviewTmp() {
  return (
    <div className="p-6 bg-muted min-h-screen">
      <DiplomaCertificate
        title="CERTIFIKÁT"
        subtitle="ZGRP Academy"
        introText="o absolvování kurzu zakončeného odbornou zkouškou a získání titulu"
        awardTitle="SPECIALISTA ZDRAVOTNÍHO PROTOKOLU"
        noteText=""
        issuer="SPOLEK V ROVNOVÁZE Z.S."
        signatory="MUDr. Gabriela Hanslianová"
        validityYears={1}
        userName="Jan Brožek"
        groupTitle="zdravotní protokol"
        score={95}
        issuedAt={new Date().toISOString()}
      />
    </div>
  );
}
