// One-off helper that documents how data/resources.json was assembled.
// Every record below comes from a source the project spec cites. Contact
// fields stay null because the source pages could not be loaded from the
// build environment; a verifier must open each source_url and fill them.
import { writeFileSync } from "node:fs";

const NOT_LOADED =
  "Seeded from the project spec's citation. The source page was not loaded during the build (network blocked), so contact fields are empty on purpose. Verifier: open the source, fill only what it states, then verify.";

const base = {
  eligibility_text: "Not stated by source. Call to confirm.",
  cost_type: "unknown",
  address: null,
  phone: null,
  website: null,
  hours: null,
  how_to_apply: "Call to ask how to apply.",
  languages: [],
  accessibility: [],
  source_checked_at: null,
  source_notes: NOT_LOADED,
  additional_sources: [],
  last_verified_at: null,
  verified_by: null,
  status: "unverified",
};

const records = [
  {
    id: "healthy-generations-mobility-options",
    name: "Mobility Options",
    organization: "Healthy Generations",
    categories: ["transportation"],
    description:
      "Transportation help for seniors and people with disabilities. Listed on 211 Virginia for Fredericksburg, Spotsylvania and Stafford.",
    eligibility_text: "Listed by source as serving seniors and people with disabilities. Call to confirm.",
    service_area: ["fredericksburg", "spotsylvania", "stafford"],
    source_name: "211 Virginia",
    source_url: "https://search.211virginia.org/search/46ebcd54-8e12-5bd0-b30c-e93bc6e6a50e",
  },
  {
    id: "fxbgo-regional-transit",
    name: "FXBGO! regional transit",
    organization: "FXBGO!",
    categories: ["transportation"],
    description: "Public bus service in the Fredericksburg area. Call or check the source for routes.",
    service_area: ["fredericksburg"],
    source_name: "Virginia Veterans Navigator",
    source_url: "https://veteransnavigator.org/print/pdf/node/78129",
    source_notes: NOT_LOADED + " Service area outside the City of Fredericksburg is not confirmed.",
  },
  {
    id: "legal-aid-works-fxbg",
    name: "Legal Aid Works",
    organization: "Legal Aid Works",
    categories: ["legal"],
    description:
      "Civil legal aid. Civil means non-criminal problems, such as housing or landlord issues. Income limits are set by the provider.",
    service_area: ["fredericksburg"],
    source_name: "211 Virginia",
    source_url: "https://search.211virginia.org/search/57dca12a-e8d5-5a03-aebd-874845a3fbef",
    source_notes: NOT_LOADED + " Only the Fredericksburg location is confirmed; other localities not yet checked.",
  },
  {
    id: "lsnv-fredericksburg",
    name: "Legal Services of Northern Virginia, Fredericksburg",
    organization: "Legal Services of Northern Virginia",
    categories: ["legal"],
    description:
      "Civil legal aid office in Fredericksburg. Civil means non-criminal problems, such as housing or landlord issues. Income limits are set by the provider.",
    service_area: ["fredericksburg"],
    source_name: "211 Virginia",
    source_url: "https://search.211virginia.org/search/9231397e-ebac-510d-b04e-fcea14693201",
    additional_sources: [
      {
        name: "Virginia Legal Aid (valegalaid.org)",
        url: "https://www.valegalaid.org/organization/legal-services-of-northern-virginia-frederick",
      },
    ],
    source_notes:
      "ADDRESS CONFLICT: 211 Virginia and valegalaid.org list different street addresses for this office. Address is left empty until a person calls the office and records the correct one. " +
      NOT_LOADED,
  },
  {
    id: "dvs-fredericksburg-office",
    name: "Virginia Department of Veterans Services, Fredericksburg office",
    organization: "Virginia Department of Veterans Services",
    categories: ["benefits"],
    description:
      "State office that helps veterans with VA benefits and claims. Ask about filing or appealing a claim.",
    service_area: ["fredericksburg"],
    source_name: "Virginia Veterans Navigator",
    source_url: "https://veteransnavigator.org/node/53612",
  },
  {
    id: "va-national-guard-family-assistance-center",
    name: "Family Assistance Center",
    organization: "Virginia National Guard",
    categories: ["public_services", "benefits"],
    description: "Support for Virginia National Guard members and their families.",
    service_area: [],
    source_name: "211 Virginia",
    source_url: "https://search.211virginia.org/search/138933d1-19fb-52b1-9c83-33e8bfb12447",
    source_notes: NOT_LOADED + " Service area not yet confirmed.",
  },
  {
    id: "virginia-veterans-navigator",
    name: "Virginia Veterans Navigator",
    organization: "Virginia Veterans Navigator",
    categories: ["benefits", "public_services"],
    description: "An online directory of services for Virginia veterans and families.",
    service_area: ["statewide"],
    website: "https://veteransnavigator.org/",
    how_to_apply: "Search the website.",
    source_name: "Virginia Veterans Navigator",
    source_url: "https://veteransnavigator.org/",
    source_notes: "Website field is the source itself. " + NOT_LOADED,
  },
  {
    id: "211-virginia",
    name: "211 Virginia",
    organization: "211 Virginia",
    categories: ["public_services"],
    description: "A statewide directory of health and human services. Search it online for more local options.",
    service_area: ["statewide"],
    website: "https://search.211virginia.org/",
    how_to_apply: "Search the website.",
    source_name: "211 Virginia",
    source_url: "https://search.211virginia.org/",
    source_notes: "Website field is the source itself. " + NOT_LOADED,
  },
  {
    id: "veterans-crisis-line",
    name: "Veterans Crisis Line",
    organization: "U.S. Department of Veterans Affairs",
    categories: ["mental_health"],
    description: "Crisis support for veterans. Dial 988 then press 1, or text 838255.",
    service_area: ["statewide"],
    phone: "988, then press 1",
    how_to_apply: "Dial 988 then press 1, or text 838255.",
    source_name: "Veterans Crisis Line",
    source_url: "https://www.veteranscrisisline.net/",
    source_notes:
      "Phone and text numbers are the ones the project spec requires on every page. Verifier: confirm on the source page.",
  },
];

const out = records.map((r) => ({ ...base, ...r }));
writeFileSync(new URL("../data/resources.json", import.meta.url), JSON.stringify(out, null, 2) + "\n");
writeFileSync(new URL("../data/verification_log.json", import.meta.url), "[]\n");
console.log(`wrote ${out.length} records`);
