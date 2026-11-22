# Germany MVP scope

The owner set Denmark and Germany as the initial European launch countries on 2026-11-17. The older walkthrough PDF
remains a product reference for its ten-step workflow; current owner instructions control scope.

Germany uses country code `DE`, metric areas, sample cadastral parcels/districts, federal state, land use, local building
authority, zoning and heritage/flood review overlays. Four sample properties cover Berlin, Hamburg and Munich. All
property values, designations, suppliers and EPDs are fictional demo records, including when street names are real.

`backend/src/modules/compliance/engine/rules/germany.ts` is a **demonstration documentation checklist**, not a complete
German legal pack. `DE-DEMO-2024` selects a checklist version from application dates in 2024 onward; it does not resolve
legal amendments. Authority/legal-edition review remains required evidence. Earlier dates are unmodelled.

- Energy: request an assessment and compare demand with an optional, user-declared design target. No nationwide
  numeric statutory energy/climate threshold is asserted by this check.
- Fire: request a state-specific strategy and product documentation. The illustrative insulation target is Euroclass
  A1/A2; passing that material criterion does not establish assembly or building compliance.
- Heritage: a Berlin-only demo overlay triggers consent review. Requirements outside Berlin remain undecided.
- Flood: flagged demo sites request a local assessment; absence of a demo overlay is not a live risk clearance.
- Funding: no German programs are implemented. The funding screen explicitly reports this. Denmark retains
  Landsbyggefonden; German funding eligibility needs separate design and validated sources.

Primary references consulted on 2026-11-17 (orientation for manual review, not certification of this demo pack):

- [Federal building-energy legislation](https://www.gesetze-im-internet.de/geg/).
- [Berlin building application form](https://www.berlin.de/sen/sbw/_assets/service/formular-center/bereich-bauen/bauaufsicht/bau_100.pdf): building application and fire documentation context.
- [Berlin heritage consent](https://www.berlin.de/landesdenkmalamt/service/antrag-auf-denkmalrechtliche-genehmigung/): authority review of work to monuments and their surroundings.

Next product work: expert-reviewed federal/state legal editions, verified registry adapters, professional sign-off rules,
German funding eligibility, and German/Danish language support. A completed demo evidence pack is not regulatory approval.
