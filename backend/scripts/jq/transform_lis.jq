# --- amount resolver ---
def amountfix:
  (.amount
  // ((.amount_thousands // .AmountThousands // .Amount_Thousands // 0) * 1000)
  // .Appropriation // .value // 0);

# --- textual fields (try several commonly-seen keys) ---
def text:
  (.purpose // .description // .item_description // .text // .amendment // .summary // "");

# --- direct locality fields (more variants) ---
def direct_loc:
  (.locality
  // .recipient_locality
  // .recipientLocation
  // .recipient_location
  // .location
  // .Location
  // .locality_name
  // .city
  // .county
  // .jurisdiction
  // .beneficiary_locality
  // .beneficiary_location
  // null);

# --- single capture helper ---
def gcap(re):
  ( try (text | match(re; "i").captures[0].string) catch null );

# --- agency/company/org field to mine locality from ---
def org:
  (.agency // .recipient // .recipient_name // .organization // .org // "");

# --- try to parse locality out of org or text ---
def parse_loc:
  ( gcap("City of\\s+([A-Za-z .'\\-]+)")
  // gcap("Town of\\s+([A-Za-z .'\\-]+)")
  // gcap("County of\\s+([A-Za-z .'\\-]+)")
  // gcap("([A-Za-z .'\\-]+)\\s+County")
  // ( try (org | match("City of\\s+([A-Za-z .'\\-]+)"; "i").captures[0].string) catch null )
  // ( try (org | match("Town of\\s+([A-Za-z .'\\-]+)"; "i").captures[0].string) catch null )
  // ( try (org | match("([A-Za-z .'\\-]+)\\s+County"; "i").captures[0].string) catch null )
  );

# --- final locality guess: prefer explicit fields, else parse, then tidy ---
def guess_loc:
  (direct_loc // parse_loc)
  | if . == null then null
    else
      (. | gsub("^\\s+|\\s+$";"")
         | gsub(",\\s*Virginia$";"")
         | gsub("\\s+VA$";"")
         | gsub("\\s+";" "))
    end;

map({
  locality: (guess_loc // null),
  amount: amountfix,
  purpose: text,
  member:   (.member // .sponsor // .delegate // .senator // ""),
  agency:   (org),
  year:     (.year // 2025),
  source:   "lis"
})
