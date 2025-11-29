from database import prs_collection
from datetime import datetime

print("--- PR Data Inspection ---")
count = prs_collection.count_documents({})
print(f"Total PRs: {count}")

cursor = prs_collection.find()
for pr in cursor:
    print(f"ID: {pr['_id']}")
    print(f"User: {pr.get('username')}")
    print(f"Status: {pr.get('status')}")
    print(f"Created At: {pr.get('created_at')} (Type: {type(pr.get('created_at'))})")
    print("-" * 20)
