import { auth, defineMcp } from "@lovable.dev/mcp-js";
import getMyProfileTool from "./tools/get-my-profile";
import getMyProgressTool from "./tools/get-my-progress";
import listLevelsTool from "./tools/list-levels";
import listMyCertificatesTool from "./tools/list-my-certificates";
import listMyReviewItemsTool from "./tools/list-my-review-items";

const projectRef = import.meta.env.VITE_SUPABASE_PROJECT_ID ?? "project-ref-unset";

export default defineMcp({
  name: "zgrp-academy",
  title: "ZGRP ACADEMY",
  version: "0.1.0",
  instructions:
    "Nástroje vzdělávací platformy ZGRP Academy. Umožňují číst profil přihlášeného uživatele, jeho pokrok v levelech a skupinách, položky k opakování a vydané certifikáty. Vše je omezeno na účet přihlášeného uživatele.",
  auth: auth.oauth.issuer({
    issuer: `https://${projectRef}.supabase.co/auth/v1`,
    acceptedAudiences: "authenticated",
  }),
  tools: [
    getMyProfileTool,
    listLevelsTool,
    getMyProgressTool,
    listMyReviewItemsTool,
    listMyCertificatesTool,
  ],
});
