#!/bin/bash

# Show YoY Demo Script
# Displays top 10 districts with computed YoY values from pipeline artifacts

echo "🔍 BUDGET DECODER YoY DEMO"
echo "=========================="

BUDGET_FILE="public/data/budget_by_district_2025.json"

if [ ! -f "$BUDGET_FILE" ]; then
    echo "❌ Budget file not found: $BUDGET_FILE"
    echo "Please ensure pipeline artifacts are copied to public/data/"
    exit 1
fi

echo "📊 Top 10 Districts by Total Amount:"
echo "District | Delegate Name | Total Amount | Add Amount | Reduce Amount | Computed YoY"
echo "---------|---------------|--------------|------------|---------------|-------------"

# Use jq to process the JSON and calculate mock YoY values
jq -r '
  sort_by(-.total_amount) | 
  .[0:10] | 
  .[] | 
  [
    .district,
    .delegate_name,
    (.total_amount | tostring),
    (.add_amount | tostring),
    (.reduce_amount | tostring),
    (
      if .reduce_amount != 0 then
        ((.add_amount - (.reduce_amount | fabs)) / (.reduce_amount | fabs) * 100 | tostring + "%")
      else
        "—"
      end
    )
  ] | 
  @tsv
' "$BUDGET_FILE" | while IFS=$'\t' read -r district delegate total add reduce yoy; do
    printf "%-8s | %-25s | $%-11s | $%-10s | $%-13s | %s\n" \
           "$district" \
           "${delegate:0:25}" \
           "$total" \
           "$add" \
           "$reduce" \
           "$yoy"
done

echo ""
echo "📈 YoY Calculation Logic:"
echo "- If reduce_amount ≠ 0: ((add_amount - |reduce_amount|) / |reduce_amount|) × 100"
echo "- If reduce_amount = 0: No prior year data (displays —)"
echo ""
echo "💡 Note: This demo uses add/reduce amounts as a proxy for YoY calculation"
echo "   since historical data is not available in the current pipeline artifacts."
echo ""
echo "✅ Budget Decoder will display '—' for entries without historical data"
echo "✅ When historical data becomes available, the UI will automatically show real YoY%"
