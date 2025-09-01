#!/usr/bin/env python3
import json
import os

def load_roster():
    data_path = os.path.join(os.path.dirname(__file__), "..", "data", "house_roster_enriched.json")
    with open(data_path, "r") as f:
        roster = json.load(f)
    return roster

if __name__ == "__main__":
    roster = load_roster()
    print(f"Loaded {len(roster)} delegate records.")
