const fs = require('fs');
const p = 'package.json';
const j = JSON.parse(fs.readFileSync(p, 'utf8'));
j.scripts = j.scripts || {};
j.scripts["join:lis-district"] = "TS_NODE_TRANSPILE_ONLY=1 ts-node --files scripts/join/join_lis_by_member.ts --year $npm_package_config_year --lis out/staging/lis/$npm_package_config_year/lis.json --roster ./scripts/house_delegates_roster_enriched.json --out out/app/lis_by_district_$npm_package_config_year.json";
j.scripts["lis:district-totals"] = "jq -r '(\"district\",\"items\",\"total\"), (.[] | [ .district, (.items|tostring), (.total_amount|tostring) ]) | @csv' out/app/lis_by_district_$npm_package_config_year.json";
fs.writeFileSync(p, JSON.stringify(j, null, 2));
console.log("✅ added join:lis-district & lis:district-totals");
